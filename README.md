# MAMS — Membership Affiliation & Management System

> **Live Web Portal & Android App:** [https://mamszambia.pythonanywhere.com](https://mamszambia.pythonanywhere.com)

---

## Why I Built This

If you have ever walked into a church office or a school PTA meeting in Zambia, you already know how membership and records are usually handled: thick paper registers, handwritten receipt books, Excel files sitting on one person's laptop, and important announcements getting buried inside busy WhatsApp groups.

When a church elder needs to know who hasn't attended in a few weeks, or when a treasurer needs to pull up a clean financial report for the quarter, it takes hours of flipping through notebooks.

I built **MAMS (Membership Affiliation & Management System)** to solve that problem from the ground up. It started with the **United Church of Zambia (UCZ)** structure in mind—where members belong to *Sections* and *Groups*—but as I kept building, I realised schools, PTAs, and community clubs face the exact same headache. Instead of building separate apps for each of them, I designed MAMS so the entire system adapts its language and structure automatically depending on who is logged in.

---

## What It Actually Does

### 1. One Platform, Different Organisations (Multi-Tenant)
When a **Church** logs in, the dashboard talks about *Sections*, *Fellowship Groups*, *Tithes*, *Offerings*, and *Sermons*.  
When a **School PTA** or **Club** logs in on the exact same system, those labels automatically switch to *Grades*, *Classes*, *PTA Levies*, and *Committees*—while keeping every organisation's data completely separate.

### 2. QR Code Digital IDs & Fast Attendance
Every member gets a digital membership card with their own unique QR code (both on the web portal and on their phone). During Sunday service, a section meeting, or a school event, leaders just open the camera scanner, scan a member's QR code, and their attendance is recorded in less than a second.

### 3. Works Even When the Internet Drops (Hybrid Offline Mobile App)
Internet connectivity isn't always reliable during crowded events. I built the **Flutter Android app** so that once you log in, your profile, digital QR card, announcements, member list, and contribution history are saved locally on your phone.  
If the network goes down:
- You can still open the app and sign in offline.
- Leaders can still scan QR codes at the door—check-ins are queued on the phone and automatically synced to the server the moment the connection comes back.

### 4. Interactive Member Map (Built for Zambian Neighbourhoods)
Most street addresses in Lusaka, Kitwe, and Ndola don't show up properly on standard international address lookups. MAMS includes a custom Zambian neighbourhood geocoder covering over 45 residential areas (Kabwata, Woodlands, Chilenje, Roma, Chelston, Matero, Ibex Hill, etc.) paired with interactive Google Street Maps. Members can even drop a pin right on their house so leaders can plan home visitations easily.

### 5. Transparent Finances & Instant PDF/CSV Reports
Treasurers and admins can log tithes, offerings, building funds, and project pledges, track progress bars against financial goals, and export clean PDF or CSV reports in one click. Members can check their own giving history on their phone anytime without having to ask the office.

### 6. Built-In Community Hub
- **Targeted Announcements & Email Alerts:** Send notices to everyone or just a specific section/committee, with automatic Gmail email delivery.
- **In-App Group Channels:** Dedicated chat channels for leadership, youth, choir, or sub-committees so official updates don't get lost in personal chats.
- **Prayer Wall, Sermons & Polls:** Share audio/video sermon links, post prayer requests, and run digital polls for community decisions.

---

## Try It Live

The project is deployed and running live in the cloud—both the Web Portal and the downloadable Android `.apk` are hosted straight from the same server:

- **Web Portal:** [https://mamszambia.pythonanywhere.com](https://mamszambia.pythonanywhere.com)
- **Android App (.apk):** [Download Direct APK](https://mamszambia.pythonanywhere.com/api/download-app/) *(or click the download button right on the login page)*

---

## Tech Stack

| Layer | What I Used | Why |
| :--- | :--- | :--- |
| **Backend API** | Python 3.12, Django 6.0, Django REST Framework | Clean, secure REST API with strict multi-tenant data isolation and JWT authentication |
| **Web Frontend** | React 19, Vite, Tailwind CSS, Recharts, Leaflet | Fast single-page dashboard with live charts, QR generation, and interactive street maps |
| **Mobile App** | Flutter (Dart), `mobile_scanner`, `flutter_map` | Native Android app with camera QR scanning, local offline caching, and interactive maps |
| **Database** | SQLite (Dev & Cloud WSGI) / MySQL compatible | Relational schema with automatic cascade cleanup across users, members, and organisations |
| **Hosting & Email** | PythonAnywhere Cloud (HTTPS) + Gmail SMTP | Single-domain cloud deployment serving both the React web app and mobile API endpoints |

---

## Project Structure

```text
MAMS/
├── mams/                       # Project settings, 5-identifier JWT auth, SPA routing, APK download endpoint
├── church_profile/             # Multi-tenant Organizations, Analytics, and Statistical AI Engine (ai_engine.py)
├── members/                    # Members, Zones/Grades, Sections/Classes, Ministries, RBAC & Zambian Geocoder
├── attendance/                 # QR Attendance Sessions, Records & First-Visitor detection
├── announcements/              # Targeted Text & Video Announcements with priority levels
├── finances/                   # Multi-tenant Ledger Accounts, Tithes/Offerings & PTA Levy tracking
├── chat/                       # Scoped Role-Based Group Chat Channels & Rich Media Messages
├── events/                     # Calendar Events & RSVP Management
├── sermons/                    # Sermon Archive & Media Links
├── prayer/                     # Community Prayer Requests Wall
├── school/                     # School PTA Classrooms & Student Profiles
├── communications/             # Gmail SMTP Email Logs & WebPush Subscriptions
├── frontend/                   # React 19 + Vite Web Portal (Admin, Leader & Member views)
├── mams_mobile/                # Flutter Android Application (Online + Offline hybrid mode)
├── database/                   # SQL schema definitions and backup fixtures
├── deploy_pythonanywhere.sh    # One-command cloud setup & deployment script for PythonAnywhere
├── publish_mobile_update.bat   # 1-click Flutter APK build & OTA version publisher
└── MAMS_Mobile_Release.apk     # Compiled arm64 release APK served directly from the web portal
```

---

## Running It Locally

If you want to clone this repo and run it on your own machine:

### 1. Backend (Django API)
```bash
git clone https://github.com/Chiza-Gondwe/MAMS.git
cd MAMS

python -m venv venv
venv\Scripts\activate        # On Windows (use `source venv/bin/activate` on Mac/Linux)
pip install -r requirements.txt

python manage.py migrate
python manage.py seed_ucz    # Loads sample UCZ Trinity Congregation data
python manage.py runserver
```

### 2. Web Portal (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

### 3. Mobile App (Flutter)
```bash
cd mams_mobile
flutter pub get
flutter run
```

---

## Author

**Chiza Gondwe**  
Final Year Software Engineering Project — Zambia  
GitHub: [@Chiza-Gondwe](https://github.com/Chiza-Gondwe)
