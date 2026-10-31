// ResQAlert Client-side Logic & Leaflet Map Controller

let map;
let markersLayer;
let allRequests = [];
let currentFilter = 'ALL';
let currentRole = 'CITIZEN'; // 'CITIZEN' or 'RESPONDER'
let mapCenter = [40.7484, -73.9851]; // Default: NYC Core
let currentRadiusKm = 25;

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  bindEvents();
  fetchRequests();
  fetchStats();
});

// Initialize Leaflet Map with Dark Tiles
function initMap() {
  map = L.map('map', {
    zoomControl: true,
  }).setView(mapCenter, 13);

  // OpenStreetMap with High-Contrast Dark Tactical Theme (100% Free, No API Key Required)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);

  // Add circle representing the geospatial search radius
  updateRadiusCircle();

  map.on('moveend', () => {
    const center = map.getCenter();
    mapCenter = [center.lat, center.lng];
  });
}

let radiusCircle;
function updateRadiusCircle() {
  if (radiusCircle) {
    map.removeLayer(radiusCircle);
  }
  radiusCircle = L.circle(mapCenter, {
    color: '#f43f5e',
    fillColor: '#f43f5e',
    fillOpacity: 0.05,
    weight: 1,
    dashArray: '4, 8',
    radius: currentRadiusKm * 1000,
  }).addTo(map);
}

// Fetch all requests from API
async function fetchRequests() {
  try {
    const res = await fetch(`/api/requests?lat=${mapCenter[0]}&lng=${mapCenter[1]}&radius=${currentRadiusKm}`);
    const data = await res.json();
    if (data.success) {
      allRequests = data.data || [];
      renderMapPins();
      renderFeed();
    }
  } catch (err) {
    console.error('Failed to load requests:', err);
  }
}

// Fetch Stats
async function fetchStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    if (data.success && data.stats) {
      document.getElementById('statActiveSos').innerText = data.stats.openNeeds ?? 0;
      document.getElementById('statCritical').innerText = data.stats.critical ?? 0;
      document.getElementById('statOffers').innerText = data.stats.offers ?? 0;
      document.getElementById('statClaimed').innerText = data.stats.claimed ?? 0;
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

// Render Pins on Leaflet Map
function renderMapPins() {
  markersLayer.clearLayers();

  const filtered = filterRequests(allRequests);

  filtered.forEach((req) => {
    const [lng, lat] = req.location.coordinates;
    let pinClass = 'pin-high';
    let iconName = 'fa-triangle-exclamation';

    if (req.type === 'OFFER') {
      pinClass = 'pin-offer';
      iconName = req.category === 'SHELTER' ? 'fa-house-chimney' : 'fa-hand-holding-heart';
    } else if (req.status === 'CLAIMED') {
      pinClass = 'pin-claimed';
      iconName = 'fa-truck-medical';
    } else if (req.urgency === 'CRITICAL' || req.category === 'MEDICAL') {
      pinClass = 'pin-critical';
      iconName = 'fa-heart-pulse';
    } else if (req.category === 'WATER_FOOD') {
      pinClass = 'pin-high';
      iconName = 'fa-bottle-water';
    }

    const customIcon = L.divIcon({
      className: '',
      html: `<div class="custom-pin ${pinClass} w-8 h-8 shadow-lg"><i class="fa-solid ${iconName}"></i></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -18],
    });

    const marker = L.marker([lat, lng], { icon: customIcon });

    const popupHtml = `
      <div class="p-1 space-y-1.5 text-xs max-w-xs">
        <div class="flex items-center justify-between gap-2 border-b border-slate-700 pb-1">
          <span class="font-mono font-bold text-[11px] text-rose-400">${req.id}</span>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${
            req.type === 'OFFER' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
          }">${req.type} &bull; ${req.category}</span>
        </div>
        <p class="font-bold text-slate-100 text-sm leading-snug">${escapeHtml(req.title)}</p>
        <p class="text-slate-400 text-[11px] leading-relaxed">${escapeHtml(req.description)}</p>
        <div class="text-[10px] text-slate-400 flex items-center gap-1">
          <i class="fa-solid fa-location-dot text-rose-500"></i> ${escapeHtml(req.location.address)}
        </div>
        <div class="pt-1 flex items-center justify-between text-[10px]">
          <span class="text-slate-500 font-mono">Channel: ${req.channel}</span>
          ${
            currentRole === 'RESPONDER' && req.status === 'OPEN'
              ? `<button onclick="claimTicket('${req.id}')" class="bg-rose-600 hover:bg-rose-500 text-white px-2 py-1 rounded font-bold">Claim Dispatch</button>`
              : `<span class="font-bold ${req.status === 'CLAIMED' ? 'text-sky-400' : 'text-emerald-400'}">${req.status}</span>`
          }
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml);
    markersLayer.addLayer(marker);
  });
}

// Render Right Stream Feed
function renderFeed() {
  const container = document.getElementById('incidentList');
  const badge = document.getElementById('ticketCountBadge');
  const filtered = filterRequests(allRequests);

  badge.innerText = `${filtered.length} Records`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center text-slate-500 border border-slate-800 rounded-xl bg-slate-900/40">
        <i class="fa-solid fa-shield-cat text-3xl text-slate-600 mb-2"></i>
        <p class="font-semibold text-slate-400">No reports found for this filter.</p>
        <p class="text-xs text-slate-500 mt-1">Try expanding the search radius or choosing another category.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered
    .map((req) => {
      const isOffer = req.type === 'OFFER';
      const isClaimed = req.status === 'CLAIMED';
      const isCritical = req.urgency === 'CRITICAL';

      let borderClass = 'border-slate-800 hover:border-slate-700';
      if (isCritical && !isClaimed) borderClass = 'border-rose-900/70 bg-rose-950/10 hover:border-rose-600';
      else if (isOffer) borderClass = 'border-emerald-900/50 bg-emerald-950/10 hover:border-emerald-600';
      else if (isClaimed) borderClass = 'border-sky-900/50 bg-sky-950/10 hover:border-sky-600';

      return `
        <div class="border ${borderClass} rounded-xl p-3.5 bg-slate-900/80 transition-all shadow-sm">
          <div class="flex items-start justify-between gap-2 mb-1.5">
            <div class="flex items-center space-x-2">
              <span class="font-mono text-xs font-bold text-slate-300">${req.id}</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
                isOffer
                  ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                  : isCritical
                  ? 'bg-rose-900/60 text-rose-300 border border-rose-700/50 animate-pulse'
                  : 'bg-amber-900/60 text-amber-300 border border-amber-700/50'
              }">
                ${req.type} &bull; ${req.category}
              </span>
              <span class="text-[10px] text-slate-500 font-mono"><i class="fa-solid fa-tower-cell mr-0.5"></i> ${req.channel}</span>
            </div>
            <span class="text-[11px] font-mono ${isClaimed ? 'text-sky-400 font-semibold' : 'text-slate-400'}">
              ${isClaimed ? '<i class="fa-solid fa-truck-fast mr-1"></i> CLAIMED' : '● ' + req.status}
            </span>
          </div>

          <h3 class="text-sm font-bold text-white mb-1 leading-snug">${escapeHtml(req.title)}</h3>
          <p class="text-xs text-slate-400 mb-2.5 line-clamp-2 leading-relaxed">${escapeHtml(req.description)}</p>

          <div class="flex flex-wrap items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 gap-2">
            <div class="flex items-center space-x-2 truncate">
              <span class="text-rose-400"><i class="fa-solid fa-location-dot mr-1"></i> ${escapeHtml(req.location.address)}</span>
              ${req.distanceKm !== undefined ? `<span class="text-slate-500 font-mono">(${req.distanceKm} km away)</span>` : ''}
            </div>
            
            <div class="flex items-center space-x-2">
              <button onclick="focusOnMap(${req.location.coordinates[1]}, ${req.location.coordinates[0]})" class="text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded text-[10px]">
                <i class="fa-solid fa-crosshairs mr-1"></i> Locate
              </button>
              ${
                currentRole === 'RESPONDER' && req.status === 'OPEN'
                  ? `<button onclick="claimTicket('${req.id}')" class="bg-rose-600 hover:bg-rose-500 text-white font-bold px-2.5 py-1 rounded text-[10px] shadow-sm">
                      <i class="fa-solid fa-hand-holding-hand mr-1"></i> Claim Dispatch
                    </button>`
                  : ''
              }
              ${
                currentRole === 'RESPONDER' && req.status === 'CLAIMED'
                  ? `<button onclick="resolveTicket('${req.id}')" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1 rounded text-[10px]">
                      <i class="fa-solid fa-check mr-1"></i> Mark Resolved
                    </button>`
                  : ''
              }
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}

// Filter logic helper
function filterRequests(list) {
  if (currentFilter === 'ALL') return list;
  if (currentFilter === 'CRITICAL') return list.filter((r) => r.urgency === 'CRITICAL');
  if (currentFilter === 'OFFER') return list.filter((r) => r.type === 'OFFER');
  return list.filter((r) => r.category === currentFilter);
}

// Zoom map to specific pin
window.focusOnMap = function (lat, lng) {
  map.flyTo([lat, lng], 16, { duration: 1.2 });
};

// Responder claims ticket
window.claimTicket = async function (id) {
  const volunteerName = prompt('Enter Volunteer / Unit Name (e.g. Red Cross Mobile Unit 2):', 'Volunteer Dispatcher');
  if (!volunteerName) return;

  try {
    const res = await fetch('/api/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'CLAIMED', claimedBy: volunteerName }),
    });
    const result = await res.json();
    if (result.success) {
      await fetchRequests();
      await fetchStats();
    }
  } catch (err) {
    alert('Error claiming ticket: ' + err.message);
  }
};

// Responder marks ticket resolved
window.resolveTicket = async function (id) {
  if (!confirm(`Mark ticket ${id} as resolved and aid delivered?`)) return;

  try {
    const res = await fetch('/api/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'RESOLVED' }),
    });
    const result = await res.json();
    if (result.success) {
      await fetchRequests();
      await fetchStats();
    }
  } catch (err) {
    alert('Error updating ticket: ' + err.message);
  }
};

// Bind UI event listeners
function bindEvents() {
  // Role Switcher
  const btnCitizen = document.getElementById('roleCitizen');
  const btnResponder = document.getElementById('roleResponder');

  btnCitizen.addEventListener('click', () => {
    currentRole = 'CITIZEN';
    btnCitizen.className = 'px-3 py-1 rounded-md font-medium transition-all bg-rose-600 text-white shadow-sm';
    btnResponder.className = 'px-3 py-1 rounded-md font-medium transition-all text-slate-400 hover:text-white';
    renderMapPins();
    renderFeed();
  });

  btnResponder.addEventListener('click', () => {
    currentRole = 'RESPONDER';
    btnResponder.className = 'px-3 py-1 rounded-md font-medium transition-all bg-rose-600 text-white shadow-sm';
    btnCitizen.className = 'px-3 py-1 rounded-md font-medium transition-all text-slate-400 hover:text-white';
    renderMapPins();
    renderFeed();
  });

  // Radius Filter
  document.getElementById('radiusFilter').addEventListener('change', (e) => {
    currentRadiusKm = parseInt(e.target.value, 10);
    updateRadiusCircle();
    fetchRequests();
  });

  // Reset View
  document.getElementById('resetViewBtn').addEventListener('click', () => {
    map.setView([40.7484, -73.9851], 13);
  });

  // Filter Buttons
  document.querySelectorAll('.feed-filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.feed-filter-btn').forEach((b) => {
        b.className = 'feed-filter-btn px-2.5 py-1 rounded-md bg-slate-800 text-slate-400 hover:text-white font-medium';
      });
      btn.className = 'feed-filter-btn px-2.5 py-1 rounded-md bg-rose-600 text-white font-medium';
      currentFilter = btn.dataset.filter;
      renderMapPins();
      renderFeed();
    });
  });

  // SOS Modal Controls
  const sosModal = document.getElementById('sosModal');
  document.getElementById('openSosModalBtn').addEventListener('click', () => {
    sosModal.classList.remove('hidden');
  });
  document.getElementById('closeSosModalBtn').addEventListener('click', () => {
    sosModal.classList.add('hidden');
  });
  document.getElementById('cancelSosBtn').addEventListener('click', () => {
    sosModal.classList.add('hidden');
  });

  // SOS Form Submission
  document.getElementById('sosForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = document.querySelector('input[name="reportType"]:checked').value;
    const category = document.getElementById('formCategory').value;
    const urgency = document.getElementById('formUrgency').value;
    const title = document.getElementById('formTitle').value;
    const description = document.getElementById('formDescription').value;
    const address = document.getElementById('formAddress').value;
    const contact = document.getElementById('formContact').value;

    // Estimate coordinates around map center
    const jitterLng = (Math.random() - 0.5) * 0.02;
    const jitterLat = (Math.random() - 0.5) * 0.02;
    const coordinates = [mapCenter[1] + jitterLng, mapCenter[0] + jitterLat];

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          category,
          urgency,
          title,
          description,
          location: { type: 'Point', coordinates, address },
          contact,
          channel: 'WEB',
        }),
      });
      const data = await res.json();
      if (data.success) {
        sosModal.classList.add('hidden');
        document.getElementById('sosForm').reset();
        await fetchRequests();
        await fetchStats();
        map.flyTo([coordinates[1], coordinates[0]], 15);
      }
    } catch (err) {
      alert('Error broadcasting: ' + err.message);
    }
  });

  // Simulator Drawer Controls
  const simDrawer = document.getElementById('smsSimulatorDrawer');
  document.getElementById('openSimulatorBtn').addEventListener('click', () => {
    simDrawer.classList.remove('translate-x-full');
  });
  document.getElementById('closeSimulatorBtn').addEventListener('click', () => {
    simDrawer.classList.add('translate-x-full');
  });

  // Preset Buttons in Simulator
  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('smsInput').value = btn.dataset.msg;
      document.getElementById('smsForm').dispatchEvent(new Event('submit'));
    });
  });

  // Simulator SMS Form Submit
  const smsChat = document.getElementById('smsChatWindow');
  document.getElementById('smsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('smsInput');
    const msg = input.value.trim();
    if (!msg) return;

    // Append outgoing user message
    appendChatMessage('USER', msg);
    input.value = '';

    try {
      const res = await fetch('/api/sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          text: msg,
          sender: '+1 (555) 302-8841',
        }),
      });

      const data = await res.json();
      if (data.reply) {
        appendChatMessage('TWILIO', data.reply);
      }
      // Refresh map and data
      await fetchRequests();
      await fetchStats();

      // If a new record was pinned, zoom to it!
      if (data.record?.location?.coordinates) {
        const [lng, lat] = data.record.location.coordinates;
        map.flyTo([lat, lng], 15);
      }
    } catch (err) {
      appendChatMessage('TWILIO', 'Error reaching SMS gateway: ' + err.message);
    }
  });
}

function appendChatMessage(sender, text) {
  const smsChat = document.getElementById('smsChatWindow');
  const isUser = sender === 'USER';
  const div = document.createElement('div');
  div.className = `flex items-start space-x-2 ${isUser ? 'justify-end' : 'justify-start'}`;

  div.innerHTML = `
    ${
      !isUser
        ? `<div class="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px]">
             <i class="fa-solid fa-tower-broadcast"></i>
           </div>`
        : ''
    }
    <div class="${
      isUser ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-200'
    } rounded-lg p-2.5 max-w-[85%] text-xs leading-relaxed shadow-sm">
      ${escapeHtml(text)}
    </div>
    ${
      isUser
        ? `<div class="w-6 h-6 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center text-[10px]">
             <i class="fa-solid fa-user"></i>
           </div>`
        : ''
    }
  `;

  smsChat.appendChild(div);
  smsChat.scrollTop = smsChat.scrollHeight;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
