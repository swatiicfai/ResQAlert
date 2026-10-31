var db = require('./db');

var LANDMARK_COORDINATES = {
  midtown: [-73.9851, 40.7484],
  broadway: [-73.9862, 40.7570],
  centralpark: [-73.9680, 40.7850],
  brooklyn: [-73.9930, 40.6920],
  queens: [-73.9352, 40.7282],
  downtown: [-74.0090, 40.7128],
  wallst: [-74.0090, 40.7070]
};
var DEFAULT_COORDS = [-73.9855, 40.7488];

function approximateCoordinates(address) {
  var lower = (address || '').toLowerCase();
  var keys = Object.keys(LANDMARK_COORDINATES);
  for (var i = 0; i < keys.length; i++) {
    if (lower.indexOf(keys[i]) !== -1) {
      var c = LANDMARK_COORDINATES[keys[i]];
      return [c[0] + (Math.random() - 0.5) * 0.008, c[1] + (Math.random() - 0.5) * 0.008];
    }
  }
  return [DEFAULT_COORDS[0] + (Math.random() - 0.5) * 0.015, DEFAULT_COORDS[1] + (Math.random() - 0.5) * 0.015];
}

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  try {
    var body = req.body || {};
    var bodyText = (body.text || body.Body || '').trim();
    var fromNumber = body.sender || body.From || '+1 (555) 000-0000';

    var replyMessage = '';
    var createdRecord = null;

    if (!bodyText || bodyText.toUpperCase() === 'HELP') {
      replyMessage = 'ResQAlert SMS: Text "NEED [CATEGORY] at [ADDRESS]" or "OFFER SHELTER at [ADDRESS]". Text STATUS [ID] to check progress.';
    } else if (bodyText.toUpperCase().indexOf('STATUS') === 0) {
      var parts = bodyText.split(' ');
      var reqId = parts[1] ? parts[1].toUpperCase().replace('#', '') : '';
      var all = db.getRequests();
      var found = null;
      for (var i = 0; i < all.length; i++) {
        if (all[i].id === reqId || all[i].id === 'REQ-' + reqId) { found = all[i]; break; }
      }
      if (found) {
        replyMessage = 'ResQAlert: ' + found.id + ' is currently ' + found.status + '. Category: ' + found.category + '. ' + (found.claimedBy ? 'Responder: ' + found.claimedBy : 'Awaiting responder dispatch.');
      } else {
        replyMessage = 'ResQAlert: Ticket #' + reqId + ' not found.';
      }
    } else {
      var isOffer = bodyText.toUpperCase().indexOf('OFFER') === 0;
      var type = isOffer ? 'OFFER' : 'NEED';
      var upper = bodyText.toUpperCase();

      var category = 'GENERAL';
      if (upper.indexOf('WATER') !== -1 || upper.indexOf('FOOD') !== -1 || upper.indexOf('RATION') !== -1) category = 'WATER_FOOD';
      else if (upper.indexOf('MED') !== -1 || upper.indexOf('INSULIN') !== -1 || upper.indexOf('OXYGEN') !== -1 || upper.indexOf('DOCTOR') !== -1) category = 'MEDICAL';
      else if (upper.indexOf('SHELTER') !== -1 || upper.indexOf('BED') !== -1 || upper.indexOf('POWER') !== -1 || upper.indexOf('GENERATOR') !== -1) category = 'SHELTER';
      else if (upper.indexOf('RESCUE') !== -1 || upper.indexOf('BOAT') !== -1 || upper.indexOf('FLOOD') !== -1 || upper.indexOf('STRANDED') !== -1) category = 'RESCUE';

      var urgency = 'MEDIUM';
      if (category === 'MEDICAL' || category === 'RESCUE' || upper.indexOf('URGENT') !== -1 || upper.indexOf('CRITICAL') !== -1) urgency = 'CRITICAL';
      else if (category === 'WATER_FOOD') urgency = 'HIGH';

      var address = 'Reported via SMS';
      var description = bodyText;
      var atIndex = bodyText.toLowerCase().lastIndexOf(' at ');
      if (atIndex !== -1) {
        address = bodyText.substring(atIndex + 4).trim();
        description = bodyText.substring(0, atIndex).trim();
      }

      var coordinates = approximateCoordinates(address);

      createdRecord = db.addRequest({
        type: type,
        category: category,
        urgency: urgency,
        title: '[SMS] ' + (type === 'NEED' ? 'SOS' : 'Aid Offer') + ': ' + category.replace('_', ' '),
        description: description,
        location: { type: 'Point', coordinates: coordinates, address: address },
        contact: fromNumber,
        channel: 'SMS'
      });

      replyMessage = 'ResQAlert Confirmed [' + createdRecord.id + ']: Your ' + (type === 'NEED' ? 'SOS' : 'aid offer') + ' (' + category + ') is pinned. Responders notified. Reply STATUS ' + createdRecord.id + ' for updates.';
    }

    var accept = req.headers['accept'] || '';
    var ct = req.headers['content-type'] || '';

    if (accept.indexOf('application/json') !== -1 || ct.indexOf('application/json') !== -1) {
      return res.status(200).json({ success: true, reply: replyMessage, record: createdRecord });
    }

    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response><Message>' + replyMessage + '</Message></Response>');
  } catch (err) {
    console.error('SMS error:', err);
    return res.status(500).end('Error processing SMS');
  }
};
