var db = require('./db');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  try {
    var body = req.body || {};
    if (!body.id || !body.status) {
      return res.status(400).json({ success: false, error: 'Missing id or status' });
    }
    var updated = db.updateRequestStatus(body.id, body.status, body.claimedBy);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
