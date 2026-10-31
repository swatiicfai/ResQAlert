# 🚨 ResQAlert
### Offline-First Community Disaster & Mutual-Aid Resource Dispatcher

[![MLH Hackathon Project](https://img.shields.io/badge/MLH-Hackathon%20Project-fe485c?style=for-the-badge&logo=major-league-hacking)](https://dev.to/mlh-hackathon)
[![DEV Challenge](https://img.shields.io/badge/DEV-Writing%20Challenge-0a0a0a?style=for-the-badge&logo=dev-to)](https://dev.to)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas%20Geospatial-47A248?style=for-the-badge&logo=mongodb)](https://mongodb.com)
[![Twilio SMS](https://img.shields.io/badge/Twilio-Programmable%20SMS-F22F46?style=for-the-badge&logo=twilio)](https://twilio.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

---

## 📌 Problem Overview
During severe weather disasters, floods, storms, and civil emergencies, cell data (4G/5G) and home Wi-Fi infrastructure are often severed. However, basic cellular signal (2G voice/SMS) frequently remains functional. Traditional rescue services are overwhelmed with 911 calls, leaving stranded citizens with no immediate way to communicate distress or discover nearby community aid.

**ResQAlert** is an offline-first disaster mutual-aid platform that provides a real-time geospatial relief map for responders and a resilient **two-way SMS gateway** for citizens trapped without internet access.

```
       [Citizen with NO DATA / Offline]
                     │
            (SMS: "NEED WATER at 123 Elm St")
                     │
                     ▼
             [Twilio SMS Gateway]
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
 [Automated Geocoder]    [TwiML SMS Confirmation]
        │                         │
        ▼                         ▼
 [MongoDB Atlas 2dsphere]  ("Ticket REQ-104 Pinned!")
        │
        ▼
 [Real-Time Leaflet Map & Dispatch Feed]
        │
        ▼
 [Verified Volunteer / Responders En Route]
```

---

## ✨ Key Features

1. **Interactive Real-Time Disaster Map**
   - Built on Leaflet.js with dark-mode tactical cartography.
   - Color-coded glowing radar pins:
     - 🔴 **Critical SOS / Medical Assistance**
     - 🟠 **Water, Food Rations & Evacuation**
     - 🟢 **Volunteer Offers & Safe Shelters**
     - 🔵 **Claimed / Responder Dispatched**
   - Configurable search radius (10km, 25km, 50km, 100km).

2. **Inbound Twilio SMS Gateway**
   - Enables trapped victims to send plain text SMS messages (e.g. `NEED MEDICAL oxygen tank at Broadway`).
   - Webhook automatically parses the category, severity, and location, performs spatial geocoding, and replies with a tracking ID and status updates.

3. **In-Browser SMS Simulator (Live Testing Sandbox)**
   - Includes a built-in mobile device simulator for judges, hackathon reviewers, and demo presentations.
   - Send simulated incoming SMS messages and watch them drop live pins onto the geospatial grid with instant two-way confirmation.

4. **MongoDB Atlas 2dsphere Geospatial Indexing**
   - Spatial `$near` and `$geoWithin` queries allow volunteers to discover the closest urgent tickets sorted strictly by distance in milliseconds.
   - Built-in zero-config fallback storage for immediate offline and local preview.

5. **Role-Based Responder Dispatch (Auth0 Ready)**
   - Toggle between **Citizen View** (report distress or register supplies) and **Verified Responder View** (claim tickets, dispatch aid, mark resolved).

---

## 🛠️ MLH Partner Technologies & Tech Stack

| Technology | Role in ResQAlert |
| :--- | :--- |
| **MongoDB Atlas** | Stores disaster incidents and powers 2dsphere geospatial radius matching (`$near`, `$geoWithin`). |
| **Twilio Programmable SMS** | Inbound SMS webhook (`/api/sms`) and two-way automated responder notification pipeline. |
| **Auth0 by Okta** | Manages role-based access control (RBAC) separating verified field responders from public reporting. |
| **Vercel** | Serverless function deployment and global edge hosting. |
| **Leaflet.js & Tailwind CSS** | Ultra-responsive tactical dark mode UI and real-time mapping engine. |

---

## 🚀 Quick Start (Local Development)

### 1. Clone the repository
```bash
git clone https://github.com/swatiicfai/ResQAlert.git
cd ResQAlert
```

### 2. Run the application (Zero external dependencies needed!)
```bash
node server.js
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser!

### 3. Environment Variables (Optional)
Copy `.env.example` to `.env` to connect real production API credentials:
```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/resqalert
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+18005557377
```

---

## 🌐 Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/swatiicfai/ResQAlert)

1. Push your repository to GitHub (`https://github.com/swatiicfai/ResQAlert`).
2. Import the repository in [Vercel](https://vercel.com).
3. The included `vercel.json` and `/api` serverless functions are pre-configured for instant zero-configuration deployment!

---

## 📜 License
MIT License &copy; 2026 Swati ([@swatiicfai](https://github.com/swatiicfai))
