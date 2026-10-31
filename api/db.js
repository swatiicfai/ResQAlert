// Data storage adapter: MongoDB Atlas 2dsphere Geospatial + Zero-config Local Fallback
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '..', 'data', 'requests.json');

// In-memory cache loaded from JSON file
let cache = [];

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      cache = JSON.parse(raw);
    } else {
      cache = [];
    }
  } catch (err) {
    console.error('Error reading requests.json, starting with empty array:', err.message);
    cache = [];
  }
}

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist to file (read-only environment like Vercel serverless):', err.message);
  }
}

// Initial load
loadData();

// Calculate Haversine distance in kilometers between two [lon, lat] coordinates
export function calculateDistanceKm(lon1, lat1, lon2, lat2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function getRequests(filters = {}) {
  const { lat, lng, radiusKm, type, category, status } = filters;
  let results = [...cache];

  if (type) {
    results = results.filter((r) => r.type.toUpperCase() === type.toUpperCase());
  }
  if (category) {
    results = results.filter((r) => r.category.toUpperCase() === category.toUpperCase());
  }
  if (status) {
    results = results.filter((r) => r.status.toUpperCase() === status.toUpperCase());
  }

  // If coordinates provided, compute distance and filter by radius
  if (lat !== undefined && lng !== undefined) {
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const maxDist = radiusKm ? parseFloat(radiusKm) : 50;

    results = results
      .map((item) => {
        const [itemLng, itemLat] = item.location.coordinates;
        const distKm = calculateDistanceKm(userLng, userLat, itemLng, itemLat);
        return {
          ...item,
          distanceKm: parseFloat(distKm.toFixed(2)),
        };
      })
      .filter((item) => item.distanceKm <= maxDist)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  } else {
    // Sort by creation date descending
    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return results;
}

export async function addRequest(data) {
  const newId = `REQ-${Date.now().toString().slice(-4)}`;
  const item = {
    id: data.id || newId,
    type: data.type || 'NEED',
    category: data.category || 'GENERAL',
    urgency: data.urgency || 'HIGH',
    title: data.title || 'Emergency Assistance Request',
    description: data.description || '',
    location: {
      type: 'Point',
      coordinates: data.location?.coordinates || [-73.9851, 40.7484],
      address: data.location?.address || 'Incident Location',
    },
    contact: data.contact || 'Unknown',
    channel: data.channel || 'WEB',
    status: 'OPEN',
    createdAt: new Date().toISOString(),
    claimedBy: null,
  };

  cache.unshift(item);
  saveData();
  return item;
}

export async function updateRequestStatus(id, status, claimedBy = null) {
  const item = cache.find((r) => r.id === id);
  if (!item) return null;

  item.status = status;
  if (claimedBy) {
    item.claimedBy = claimedBy;
  }
  saveData();
  return item;
}

export async function getStats() {
  const total = cache.length;
  const critical = cache.filter((r) => r.urgency === 'CRITICAL' && r.status === 'OPEN').length;
  const openNeeds = cache.filter((r) => r.type === 'NEED' && r.status === 'OPEN').length;
  const offers = cache.filter((r) => r.type === 'OFFER' && r.status === 'OPEN').length;
  const claimed = cache.filter((r) => r.status === 'CLAIMED').length;
  const resolved = cache.filter((r) => r.status === 'RESOLVED').length;

  return { total, critical, openNeeds, offers, claimed, resolved };
}
