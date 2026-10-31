// Data storage adapter: MongoDB Atlas 2dsphere Geospatial + Zero-config Embedded Fallback

const SEED_REQUESTS = [
  {
    id: "REQ-101",
    type: "NEED",
    category: "MEDICAL",
    urgency: "CRITICAL",
    title: "Elderly patient needs oxygen & insulin support",
    description: "Power grid failed 3 hours ago. Battery backup on portable oxygen concentrator has 45 mins left. Need generator or fresh tank.",
    location: {
      type: "Point",
      coordinates: [-73.9851, 40.7484],
      address: "350 5th Ave (Near 34th St Entrance), New York, NY"
    },
    contact: "+1 (555) 234-8901",
    channel: "SMS",
    status: "OPEN",
    createdAt: "2026-10-31T17:30:00Z",
    claimedBy: null
  },
  {
    id: "REQ-102",
    type: "NEED",
    category: "RESCUE",
    urgency: "HIGH",
    title: "Ground floor flooded, family of 4 stranded",
    description: "Water rising above knee level. Need evacuation assistance or high-clearance vehicle/boat.",
    location: {
      type: "Point",
      coordinates: [-73.9712, 40.7648],
      address: "68th St & York Ave, New York, NY"
    },
    contact: "+1 (555) 891-2345",
    channel: "WEB",
    status: "CLAIMED",
    createdAt: "2026-10-31T18:15:00Z",
    claimedBy: "Water Rescue Squad 4 (ETA: 15 mins)"
  },
  {
    id: "REQ-103",
    type: "NEED",
    category: "WATER_FOOD",
    urgency: "MEDIUM",
    title: "Clean drinking water & infant formula needed",
    description: "Tap water contaminated due to water main break. Infant formula supplies exhausted for 12-month-old.",
    location: {
      type: "Point",
      coordinates: [-73.9928, 40.7308],
      address: "Washington Square East, New York, NY"
    },
    contact: "+1 (555) 432-6789",
    channel: "SMS",
    status: "OPEN",
    createdAt: "2026-10-31T18:45:00Z",
    claimedBy: null
  },
  {
    id: "REQ-104",
    type: "OFFER",
    category: "SHELTER",
    urgency: "LOW",
    title: "Community Center Dry Shelter & Power Station",
    description: "Backup diesel generator active. Clean water, hot meals, 45 dry cots, and phone charging stations available.",
    location: {
      type: "Point",
      coordinates: [-73.9982, 40.7260],
      address: "Houston St Community Annex, New York, NY"
    },
    contact: "+1 (555) 765-4321",
    channel: "WEB",
    status: "OPEN",
    createdAt: "2026-10-31T16:00:00Z",
    claimedBy: null
  },
  {
    id: "REQ-105",
    type: "OFFER",
    category: "MEDICAL",
    urgency: "LOW",
    title: "Volunteer Paramedic Team with Mobile First-Aid",
    description: "Equipped with automated external defibrillator (AED), sterile dressings, burns treatment, and basic triage supplies.",
    location: {
      type: "Point",
      coordinates: [-73.9814, 40.7410],
      address: "Madison Square Park North, New York, NY"
    },
    contact: "+1 (555) 902-3456",
    channel: "WEB",
    status: "OPEN",
    createdAt: "2026-10-31T17:10:00Z",
    claimedBy: null
  }
];

// Persistent cache in memory across warm invocations
let cache = [...SEED_REQUESTS];

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
  if (lat !== undefined && lng !== undefined && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
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
  return item;
}

export async function updateRequestStatus(id, status, claimedBy = null) {
  const item = cache.find((r) => r.id === id);
  if (!item) return null;

  item.status = status;
  if (claimedBy) {
    item.claimedBy = claimedBy;
  }
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
