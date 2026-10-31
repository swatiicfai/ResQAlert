import { addRequest, getRequests } from './db.js';

const LANDMARK_COORDINATES = {
  midtown: [-73.9851, 40.7484],
  broadway: [-73.9862, 40.7570],
  centralpark: [-73.9680, 40.7850],
  brooklyn: [-73.9930, 40.6920],
  queens: [-73.9352, 40.7282],
  downtown: [-74.0090, 40.7128],
  wallst: [-74.0090, 40.7070],
  default: [-73.9855, 40.7488],
};

function approximateCoordinates(address) {
  const lower = (address || '').toLowerCase();
  for (const [key, coords] of Object.entries(LANDMARK_COORDINATES)) {
    if (lower.includes(key)) {
      const jitterLng = (Math.random() - 0.5) * 0.008;
      const jitterLat = (Math.random() - 0.5) * 0.008;
      return [coords[0] + jitterLng, coords[1] + jitterLat];
    }
  }
  const def = LANDMARK_COORDINATES.default;
  return [def[0] + (Math.random() - 0.5) * 0.015, def[1] + (Math.random() - 0.5) * 0.015];
}

async function getRawBodyOrObject(req) {
  if (req.body) {
    return req.body;
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => resolve(raw));
    req.on('error', () => resolve(''));
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }

  try {
    const rawOrObj = await getRawBodyOrObject(req);
    let bodyText = '';
    let fromNumber = '+1 (555) 000-0000';

    if (typeof rawOrObj === 'object' && rawOrObj !== null) {
      bodyText = rawOrObj.text || rawOrObj.Body || '';
      fromNumber = rawOrObj.sender || rawOrObj.From || fromNumber;
    } else {
      const rawStr = String(rawOrObj || '');
      try {
        const json = JSON.parse(rawStr);
        bodyText = json.text || json.Body || '';
        fromNumber = json.sender || json.From || fromNumber;
      } catch {
        const params = new URLSearchParams(rawStr);
        bodyText = params.get('Body') || '';
        fromNumber = params.get('From') || fromNumber;
      }
    }

    bodyText = bodyText.trim();
    let replyMessage = '';
    let createdRecord = null;

    if (!bodyText || bodyText.toUpperCase() === 'HELP') {
      replyMessage =
        'ResQAlert SMS: Text "NEED [CATEGORY] at [ADDRESS]" (e.g. NEED WATER at 45 Elm St) or "OFFER SHELTER at [ADDRESS]". Text STATUS [ID] to check progress.';
    } else if (bodyText.toUpperCase().startsWith('STATUS')) {
      const parts = bodyText.split(' ');
      const reqId = parts[1] ? parts[1].toUpperCase().replace('#', '') : '';
      const all = await getRequests();
      const found = all.find((r) => r.id === reqId || r.id === `REQ-${reqId}`);
      if (found) {
        replyMessage = `ResQAlert: ${found.id} is currently ${found.status}. Category: ${found.category}. ${found.claimedBy ? 'Responder: ' + found.claimedBy : 'Awaiting responder dispatch.'}`;
      } else {
        replyMessage = `ResQAlert: Ticket #${reqId} not found. Please verify the 4-digit code.`;
      }
    } else {
      const isOffer = bodyText.toUpperCase().startsWith('OFFER');
      const type = isOffer ? 'OFFER' : 'NEED';

      let category = 'GENERAL';
      const upper = bodyText.toUpperCase();
      if (upper.includes('WATER') || upper.includes('FOOD') || upper.includes('RATION') || upper.includes('MILK')) {
        category = 'WATER_FOOD';
      } else if (upper.includes('MED') || upper.includes('INSULIN') || upper.includes('OXYGEN') || upper.includes('INJUR') || upper.includes('DOCTOR')) {
        category = 'MEDICAL';
      } else if (upper.includes('SHELTER') || upper.includes('BED') || upper.includes('POWER') || upper.includes('GENERATOR')) {
        category = 'SHELTER';
      } else if (upper.includes('RESCUE') || upper.includes('BOAT') || upper.includes('FLOOD') || upper.includes('STRANDED')) {
        category = 'RESCUE';
      }

      let urgency = 'MEDIUM';
      if (category === 'MEDICAL' || category === 'RESCUE' || upper.includes('URGENT') || upper.includes('CRITICAL') || upper.includes('DYING')) {
        urgency = 'CRITICAL';
      } else if (category === 'WATER_FOOD') {
        urgency = 'HIGH';
      }

      let address = 'Reported via SMS';
      let description = bodyText;
      const atIndex = bodyText.toLowerCase().lastIndexOf(' at ');
      if (atIndex !== -1) {
        address = bodyText.substring(atIndex + 4).trim();
        description = bodyText.substring(0, atIndex).trim();
      }

      const coordinates = approximateCoordinates(address);

      createdRecord = await addRequest({
        type,
        category,
        urgency,
        title: `[SMS] ${type === 'NEED' ? 'SOS' : 'Aid Offer'}: ${category.replace('_', ' ')}`,
        description: description,
        location: {
          type: 'Point',
          coordinates,
          address: address,
        },
        contact: fromNumber,
        channel: 'SMS',
      });

      replyMessage = `ResQAlert Confirmed [${createdRecord.id}]: Your ${type === 'NEED' ? 'SOS' : 'aid offer'} (${category}) is pinned to the live rescue grid at ${address}. Responders are notified. Reply STATUS ${createdRecord.id} for updates.`;
    }

    const contentType = req.headers['content-type'] || '';
    const accept = req.headers['accept'] || '';

    if (accept.includes('application/json') || contentType.includes('application/json')) {
      if (typeof res.status === 'function') {
        return res.status(200).json({ success: true, reply: replyMessage, record: createdRecord });
      }
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, reply: replyMessage, record: createdRecord }));
      return;
    }

    res.setHeader('Content-Type', 'text/xml');
    res.statusCode = 200;
    res.end(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${replyMessage}</Message></Response>`);
  } catch (err) {
    console.error('SMS processing error:', err);
    res.statusCode = 500;
    res.end('Error processing SMS');
  }
}
