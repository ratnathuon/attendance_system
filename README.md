# AttendSphere • Smart Dynamic QR Attendance & Cohort Management System

**AttendSphere** is an enterprise-grade, role-based attendance tracking and academic supervision platform. It features an anti-fraud **dynamic rotating QR code engine** (HMAC time-stepped tokens), multi-tier leave request endorsement workflows, institutional reports, a Next.js 15 Admin Web Dashboard, and a Flutter cross-platform mobile client.

---

## 🏛️ System Architecture

```text
attendance-system/
│
├── docker-compose.yml                     # Multi-container orchestration (PostgreSQL, Backend, Frontend)
├── .dockerignore                          # Prevents unnecessary host files from copying into images
├── README.md                              # Institutional system documentation
│
├── backend/                               # Laravel 11 REST API Backend
│   ├── Dockerfile                         # PHP 8.3-cli-alpine with pdo_pgsql & Composer
│   ├── .dockerignore
│   ├── .env                               # DB_HOST=postgres_db, DB_PORT=5432
│   ├── composer.json
│   ├── artisan
│   │
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   ├── Admin/                 # Users, Classrooms, Subjects, Assignments, System Reports
│   │   │   │   ├── Teacher/               # Attendance Sessions, Rotating QR, Manual Overrides, Approvals
│   │   │   │   ├── Mazer/                 # Homeroom Rosters, Status Overrides, 1st-tier Approvals, Broadcasts
│   │   │   │   ├── Student/               # Dynamic QR Check-in, Logs, Stats, Leave Applications
│   │   │   │   └── Auth/                  # Sanctum authentication & profile
│   │   │   ├── Middleware/                # RoleMiddleware, EnsureSessionNotExpired
│   │   │   └── Requests/                  # Form request validation schemas
│   │   ├── Models/                        # User, ClassRoom, Subject, ClassSubject, Session, Record, Leave
│   │   ├── Policies/                      # Authorization policies
│   │   └── Services/
│   │       └── QrTokenService.php         # HMAC dynamic token rotation logic (anti-screenshot)
│   ├── database/
│   │   ├── migrations/                    # 8 Core Domain Migrations
│   │   └── seeders/                       # DatabaseSeeder with demo users, cohorts, and sessions
│   └── routes/
│       └── api.php                        # 47 REST API endpoints grouped by role
│
├── admin-dashboard/                       # Next.js 15 Admin Web Dashboard
│   ├── Dockerfile                         # Node 20 alpine runner
│   ├── .dockerignore
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   ├── middleware.ts                      # Admin role routing guard
│   └── src/
│       ├── app/
│       │   ├── (auth)/login/              # Authentication with demo quick-fill
│       │   ├── (dashboard)/               # Overview, Users, Classes, Subjects, Reports, Settings
│       │   └── globals.css
│       ├── components/                    # UI Atoms, Sidebar, Header, DataTable, Forms
│       └── lib/                           # Axios api-client, utils
│
└── mobile_app/                            # Flutter Cross-Platform Mobile Application
    ├── pubspec.yaml                       # dio, flutter_secure_storage, qr_flutter, mobile_scanner
    └── lib/
        ├── main.dart                      # Splash & session initialization
        ├── core/                          # API endpoints, Dio interceptors, Secure storage, Dark theme
        ├── features/
        │   ├── auth/                      # Login & UserModel
        │   ├── student/                   # Live Camera Scanner, Attendance Logs, Leave Submissions
        │   ├── teacher/                   # Dynamic QR Generator, Countdown Timer, Manual Override
        │   └── mazer/                     # Homeroom Class Roster, 1st Tier Approvals, Class Announcements
        └── routes/
            └── app_router.dart            # Dynamic redirection based on user.role
```

---

## 🔑 Demo User Credentials

All sample accounts are pre-seeded in the database with the standard password: `password123`.

| Role | Email | Password | Primary Functions |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@attendance.com` | `password123` | Institutional overview, user CRUD, class & faculty assignments, global audit reports |
| **Teacher (Faculty)** | `teacher@attendance.com` | `password123` | Launch lecture sessions, project rotating dynamic QR codes, manual overrides, subject leave approvals |
| **Mazer (Advisor)** | `mazer@attendance.com` | `password123` | Homeroom supervision, class roster monitoring, 1st-level leave endorsements, class announcements |
| **Student** | `student@attendance.com` | `password123` | Scan dynamic QR codes via live camera, inspect personal attendance percentage, submit leave requests |

---

## 🛡️ Anti-Fraud Dynamic QR Architecture

Static QR codes allow students to take photos, share screenshots on messaging apps, and falsify presence from off-campus. AttendSphere solves this with a **Time-Stepped HMAC Token Rotation Engine**:

1. **HMAC Token Window**: When a lecture starts, an arbitrary 64-character secret is generated for the session. Every 15 seconds, a cryptographic hash (`hash_hmac('sha256', "session_id:step", secret)`) is produced.
2. **Dynamic Live Screen**: The teacher's device projects an animated QR code that automatically rotates every 15 seconds, paired with a countdown indicator.
3. **Tolerance Window Verification**: When a student scans using the camera scanner, the backend validates that the scanned token corresponds to the current or immediate preceding step (accommodating slight network transmission delays) before registering attendance.
4. **Late Threshold Enforcement**: Scans recorded after the teacher's configurable grace period (e.g. 15 minutes) are automatically flagged as **Late**.

---

## 🚀 Quick Start with Docker

Ensure Docker Desktop or Docker Engine is running on your machine:

```bash
# From the repository root
docker compose up --build
```

This starts:
- **PostgreSQL 16**: Port `5432`
- **Laravel 11 Backend API**: Port `8000` (Access at `http://localhost:8000/api`)
- **Next.js 15 Admin Dashboard**: Port `3000` (Access at `http://localhost:3000`)

To run the database migrations and seed default credentials:
```bash
docker compose exec backend php artisan migrate --seed
```

---

## 💻 Running Services Individually (Local Development)

### 1. Backend (Laravel 11)
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve --port=8000
```

### 2. Admin Dashboard (Next.js 15)
```bash
cd admin-dashboard
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Mobile App (Flutter)
```bash
cd mobile_app
flutter pub get
flutter run
```
*Note: In Android emulators, the app automatically communicates with the host machine via `http://10.0.2.2:8000/api`.*

---

## 📡 Core REST API Overview

### Authentication
- `POST /api/auth/login`: Sanctum Bearer token issue & user profile
- `GET /api/auth/me`: Authenticated profile & context (classes, taught subjects)
- `POST /api/auth/logout`: Revoke active token

### Admin (`role:admin`)
- `GET|POST|PUT|DELETE /api/admin/users`: User management
- `GET|POST|PUT|DELETE /api/admin/classes`: Classrooms & Mazer assignment
- `GET|POST|PUT|DELETE /api/admin/subjects`: Curriculum subject catalog
- `POST /api/admin/assignments/teacher`: Assign faculty to classes & schedule
- `GET /api/admin/reports/overview`: Executive metrics & 7-day attendance trend
- `GET /api/admin/reports/attendance`: Filterable attendance audit logs

### Teacher (`role:teacher,admin`)
- `POST /api/teacher/sessions`: Launch lecture session & initialize dynamic secret
- `GET /api/teacher/sessions/{session}/qr`: Retrieve current dynamic HMAC QR token & stats
- `POST /api/teacher/sessions/{session}/close`: Finalize session and auto-mark absent students
- `POST /api/teacher/sessions/{session}/attendance`: Manual attendance override
- `GET|POST /api/teacher/leave-requests`: Subject-level leave approvals

### Mazer (`role:mazer,admin`)
- `GET /api/mazer/classes/{classRoom}/roster`: Real-time class attendance roster
- `POST /api/mazer/classes/{classRoom}/override`: Homeroom status override
- `GET|POST /api/mazer/leave-requests`: 1st-level student leave endorsement
- `GET|POST /api/mazer/classes/{classRoom}/announcements`: Class broadcast announcements

### Student (`role:student,admin`)
- `POST /api/student/scan`: Dynamic QR check-in
- `GET /api/student/history`: Personal attendance history
- `GET /api/student/stats`: Personal stats & active lectures today
- `POST /api/student/leave-requests`: Submit absence / correction application

---

## 📜 License
MIT License. Built for modern academic institutions.
