var db = require('./db');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    var q = req.query || {};
    var results = db.getRequests({ lat: q.lat, lng: q.lng, radiusKm: q.radius, type: q.type, category: q.category, status: q.status });
    return res.status(200).json({ success: true, count: results.length, data: results });
  }

  if (req.method === 'POST') {
    try {
      var payload = req.body || {};
      var created = db.addRequest(payload);
      return res.status(201).json({ success: true, data: created });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  res.status(405).end('Method Not Allowed');
};
