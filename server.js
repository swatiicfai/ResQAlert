import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Route handlers
import requestsHandler from './api/requests.js';
import smsHandler from './api/sms.js';
import resolveHandler from './api/resolve.js';
import statsHandler from './api/stats.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // API Routes
  if (pathname.startsWith('/api/')) {
    if (pathname === '/api/requests') {
      return requestsHandler(req, res);
    }
    if (pathname === '/api/sms') {
      return smsHandler(req, res);
    }
    if (pathname === '/api/resolve') {
      return resolveHandler(req, res);
    }
    if (pathname === '/api/stats') {
      return statsHandler(req, res);
    }

    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
    return;
  }

  // Static File Serving
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

  // Security: prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    // Fallback to index.html for SPA feel
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.setHeader('Content-Type', 'text/html');
      fs.createReadStream(indexPath).pipe(res);
      return;
    }

    res.statusCode = 404;
    res.end('File Not Found');
  } catch (err) {
    res.statusCode = 500;
    res.end('Internal Server Error: ' + err.message);
  }
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚨 ResQAlert Server Running: http://localhost:${PORT}`);
  console.log(`📡 Twilio Inbound Webhook:   http://localhost:${PORT}/api/sms`);
  console.log(`🗺️  Geospatial API:          http://localhost:${PORT}/api/requests`);
  console.log(`======================================================\n`);
});
