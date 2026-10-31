_This is a submission for the [MLH x DEV Writing Challenge](https://dev.to/mlh-hackathon)_

<!-- Make sure you're signed in to DEV with the MLH account linked to your hackathon registration! -->

# ResQAlert: Offline-First Community Disaster & Mutual-Aid Resource Dispatcher

## What I Built

During extreme natural disasters—such as severe tropical storms, hurricanes, and power grid collapses—centralized 911 dispatch centers become overwhelmed within hours. Even worse, cellular data networks (4G/5G) and home Wi-Fi frequently go dark, cutting stranded families off from rescue coordination.

Yet, basic cellular signal (2G voice/SMS) often remains operational across cell towers even when data throughput drops to zero. 

**ResQAlert** is an offline-first emergency mutual-aid platform engineered to bridge this communication breakdown. It allows individuals stranded in crisis zones to broadcast urgent distress signals (medical emergencies, trapped flood victims, drinking water shortages) or volunteer resource offers using either a modern web dashboard or plain **offline SMS text messages**.

### Key Highlights:
- **Dual-Channel Ingestion**: File rescue requests through a responsive web app or by sending a plain text SMS (`NEED WATER at 450 Lexington Ave`) with zero data connectivity.
- **Geospatial Discovery & Proximity Matching**: Volunteers and emergency squads can view live tactical heatmaps and query relief requests within a 5–50 km radius of their current location.
- **Automated Two-Way SMS Updates**: When an aid ticket is claimed or resolved, the requester receives an automated SMS text with responder identification and ETA.
- **Interactive SMS Simulator**: Built-in test sandbox on the frontend that allows judges, hackathon reviewers, and visitors to test sending inbound SMS commands and see real-time pins drop on the map without needing live telephony credits.

---

## Demo

- **GitHub Repository**: [github.com/swatiicfai/ResQAlert](https://github.com/swatiicfai/ResQAlert)
- **Live Deployment**: [resqalert-omega.vercel.app](https://resqalert-omega.vercel.app)

### Project Walkthrough:
1. **Interactive Disaster Radar**: Real-time Leaflet map displaying active incident pins color-coded by urgency (Red for critical medical/rescue, Amber for food/water, Green for volunteer shelters and supplies).
2. **Offline SMS Ingestion**: When an SMS message is sent to our Twilio gateway, the backend extracts the category, severity, and location, performs spatial geocoding, stores the ticket in MongoDB Atlas, and replies with a tracking ID (`REQ-XXXX`).
3. **Verified Responder Dispatch Queue**: Responders can claim open requests, coordinate dispatches, and mark incidents as resolved in real time.

---

## Partner Technologies

To make ResQAlert reliable and responsive under real-world crisis constraints, I integrated three primary partner technologies:

### 1. MongoDB Atlas (2dsphere Geospatial Indexing)
- **Implementation**: I utilized MongoDB's native **`2dsphere` spatial index** on the `location.coordinates` field (`[longitude, latitude]`).
- **Why it matters**: In an emergency, volunteers cannot sift through an unorganized database. By leveraging MongoDB's `$near` operator, the platform queries and sorts nearby relief requests by physical proximity in milliseconds:
  ```javascript
  const nearbyRequests = await db.collection("requests").find({
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [userLng, userLat] },
        $maxDistance: radiusInMeters, // e.g., 25000 (25km)
      },
    },
    status: "OPEN",
  }).toArray();
  ```

### 2. Twilio Programmable SMS
- **Implementation**: Created an inbound webhook endpoint (`/api/sms`) that listens for incoming SMS traffic and responds with automated TwiML messages.
- **Why it matters**: When users have no cellular data or internet, SMS is their sole lifeline. Twilio enables two-way communication: victims text `NEED [Category] at [Address]`, our backend parses the urgency, pins the location, and sends back immediate confirmation and status alerts.

### 3. Auth0 by Okta
- **Implementation**: Structured user authentication and Role-Based Access Control (RBAC).
- **Why it matters**: In disaster mutual aid, trust and security are vital. Auth0 enables quick, frictionless sign-in for community members while protecting dispatch features with scoped roles (`role:responder`, `role:admin`), ensuring only verified teams can claim sensitive medical tickets.

---

## Hackathon Experience

Building ResQAlert was an intense and deeply rewarding experience. 

- **The Biggest Technical Challenge**: Designing a tolerant parsing algorithm for incoming SMS messages. In an emergency, people text under extreme stress with unpredictable abbreviations and formatting. Developing a flexible keyword and landmark extractor with automatic fallback prompts required careful testing.
- **Favorite Moment**: Watching the built-in SMS simulator trigger an incoming text and immediately seeing the glowing red marker pop up on the live Leaflet map within milliseconds!
- **Next Steps**: Adding multi-lingual NLP translation using the Gemini API so non-English speakers can text in their native language, and implementing Progressive Web App (PWA) offline service-worker caching for field volunteers.

<!-- Share your submission! The more you share this post, the more engagement it gets, which means a better chance of being selected. Share your submission with your network, on social media, and in your hacker communities. -->

<!-- Thanks for participating! -->
