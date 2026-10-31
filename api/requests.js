import { getRequests, addRequest } from './db.js';

function sendJson(res, statusCode, data) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(data);
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function getQuery(req) {
  if (req.query) return req.query;
  const url = new URL(req.url, `http://${req.headers?.host || 'localhost'}`);
  return Object.fromEntries(url.searchParams.entries());
}

async function getBody(req) {
  if (req.body) {
    return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  }
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method === 'GET') {
    const query = getQuery(req);
    const { lat, lng, radius, type, category, status } = query;
    const results = await getRequests({ lat, lng, radiusKm: radius, type, category, status });
    return sendJson(res, 200, { success: true, count: results.length, data: results });
  }

  if (req.method === 'POST') {
    try {
      const payload = await getBody(req);
      const created = await addRequest(payload);
      return sendJson(res, 201, { success: true, data: created });
    } catch (err) {
      return sendJson(res, 400, { success: false, error: err.message });
    }
  }

  res.statusCode = 405;
  res.end('Method Not Allowed');
}
