# Membership Affiliation and Management System (MAMS)

MAMS is a powerful, multi-tenant Software as a Service (SaaS) platform designed to modernize the administrative operations of community-based organizations.
Initially engineered as a solution for the United Church of Zambia (UCZ), the system features a dynamic **Multi-Tenant Architecture** that allows it to seamlessly adapt its UI and database structures to serve any hierarchical organization, including other church denominations and School Parent-Teacher Associations (PTAs).

## 🚀 Key Features

- **Dynamic Multi-Tenancy:** The system dynamically re-renders UI terminology based on the logged-in organization type (e.g., automatically translating Church "Zones & Sections" into School "Grades & Classes").
- **Role-Based Access Control (RBAC):** Hierarchical security layers ranging from Super-Admin (Global) to Organization Admin, Zone Leaders, and regular Members.
- **Smart Attendance Tracking:** Automated generation and scanning of dynamic QR codes for secure event attendance logging.
- **Targeted Broadcasting:** Send custom announcements and event invitations targeted specifically to isolated groups, sections, or entire organizations.
- **Automated Background Jobs:** Web Push Notifications and email reminders dispatched automatically via background cron jobs (APScheduler).

## 💻 Tech Stack

- **Frontend:** React.js, Tailwind CSS, React Router DOM, Vite
- **Backend:** Python, Django, Django REST Framework (DRF)
- **Database:** MySQL
- **Security:** JSON Web Tokens (JWT) with secure HTTP-only configurations
- **Infrastructure:** Oracle Cloud (Target Deployment)

## 🏗️ Architecture

MAMS utilizes a strict API-driven decoupling between the frontend and backend. The database architecture is designed with high data-isolation standards, ensuring that tenant data (Church vs. PTA) never leaks across organizational boundaries, strictly enforced at the API Viewset level.
