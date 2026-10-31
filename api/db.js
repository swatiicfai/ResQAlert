// Data storage adapter: Embedded fallback dataset for Vercel Serverless

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

let cache = [...SEED_REQUESTS];

function calculateDistanceKm(lon1, lat1, lon2, lat2) {
  const R = 6371;
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

function getRequests(filters) {
  filters = filters || {};
  const { lat, lng, radiusKm, type, category, status } = filters;
  let results = cache.slice();

  if (type) results = results.filter(function(r) { return r.type.toUpperCase() === type.toUpperCase(); });
  if (category) results = results.filter(function(r) { return r.category.toUpperCase() === category.toUpperCase(); });
  if (status) results = results.filter(function(r) { return r.status.toUpperCase() === status.toUpperCase(); });

  if (lat !== undefined && lat !== null && lng !== undefined && lng !== null && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
    var userLat = parseFloat(lat);
    var userLng = parseFloat(lng);
    var maxDist = radiusKm ? parseFloat(radiusKm) : 50;
    results = results.map(function(item) {
      var coords = item.location.coordinates;
      var distKm = calculateDistanceKm(userLng, userLat, coords[0], coords[1]);
      return Object.assign({}, item, { distanceKm: parseFloat(distKm.toFixed(2)) });
    }).filter(function(item) { return item.distanceKm <= maxDist; })
      .sort(function(a, b) { return a.distanceKm - b.distanceKm; });
  } else {
    results.sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  }
  return results;
}

function addRequest(data) {
  var newId = "REQ-" + Date.now().toString().slice(-4);
  var item = {
    id: data.id || newId,
    type: data.type || "NEED",
    category: data.category || "GENERAL",
    urgency: data.urgency || "HIGH",
    title: data.title || "Emergency Assistance Request",
    description: data.description || "",
    location: {
      type: "Point",
      coordinates: (data.location && data.location.coordinates) || [-73.9851, 40.7484],
      address: (data.location && data.location.address) || "Incident Location"
    },
    contact: data.contact || "Unknown",
    channel: data.channel || "WEB",
    status: "OPEN",
    createdAt: new Date().toISOString(),
    claimedBy: null
  };
  cache.unshift(item);
  return item;
}

function updateRequestStatus(id, status, claimedBy) {
  var item = null;
  for (var i = 0; i < cache.length; i++) {
    if (cache[i].id === id) { item = cache[i]; break; }
  }
  if (!item) return null;
  item.status = status;
  if (claimedBy) item.claimedBy = claimedBy;
  return item;
}

function getStats() {
  var total = cache.length;
  var critical = cache.filter(function(r) { return r.urgency === "CRITICAL" && r.status === "OPEN"; }).length;
  var openNeeds = cache.filter(function(r) { return r.type === "NEED" && r.status === "OPEN"; }).length;
  var offers = cache.filter(function(r) { return r.type === "OFFER" && r.status === "OPEN"; }).length;
  var claimed = cache.filter(function(r) { return r.status === "CLAIMED"; }).length;
  var resolved = cache.filter(function(r) { return r.status === "RESOLVED"; }).length;
  return { total: total, critical: critical, openNeeds: openNeeds, offers: offers, claimed: claimed, resolved: resolved };
}

module.exports = { getRequests: getRequests, addRequest: addRequest, updateRequestStatus: updateRequestStatus, getStats: getStats, calculateDistanceKm: calculateDistanceKm };
