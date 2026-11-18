# Campus Crew

**A full-stack campus club and event management platform.**

Campus Crew brings student clubs, recruitment drives, events, volunteering, tasks, announcements, and participation tracking into one web application. It provides role-specific experiences for students, club coordinators, and administrators.

> **Project context:** This is an academic team project developed as part of a Full-Stack Development course. This repository is a personal fork for continued learning and portfolio presentation. See the [original team repository](https://github.com/sneha-priya-valeru/Campus-Crew) for the upstream project and its history.

## Features

### Student experience
- Discover clubs and view club details.
- Join clubs and track memberships.
- Browse events and manage event registrations.
- Apply to club recruitment drives and track application status.
- View assigned tasks and volunteer assignments.
- View announcements, notifications, contribution history, and the leaderboard.
- Manage a student profile and notification preferences.

### Coordinator experience
- Manage club members and recruitment drives.
- Create and manage events.
- Create volunteer opportunities and manage volunteer applications and assignments.
- Assign, track, and verify event tasks.
- Manage attendance and publish announcements.
- View club and event analytics and export event reports as CSV.

### Administrator experience
- Manage user accounts and roles.
- Review club and event approval requests.
- View platform-level statistics.

### Platform capabilities
- Role-based access control for student, coordinator, and administrator areas.
- JWT-based authentication and password hashing.
- REST API with request validation and centralized error handling.
- Real-time notifications using Socket.IO.
- Scheduled event and task reminder jobs.
- Event registration capacity protection using a database transaction and row-level locking.
- Automated API tests and a k6 load-test scenario.

## Technology stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router, TanStack Query, Axios |
| Backend | Node.js, Express.js |
| API and real-time communication | REST, Socket.IO |
| Database and ORM | PostgreSQL, Prisma ORM |
| Authentication and validation | JSON Web Tokens (JWT), bcryptjs, Zod |
| Backend security | Helmet, express-rate-limit |
| Scheduled jobs | node-cron |
| Testing | Vitest, Supertest, k6 |
| Local database environment | Docker Compose |

## Architecture

```mermaid
flowchart TD
    U[Student / Coordinator / Admin] --> FE[React frontend]
    FE -->|HTTP REST requests| API[Express backend]
    FE <-->|Real-time events| WS[Socket.IO]
    API --> AUTH[Authentication and role middleware]
    AUTH --> CTRL[Route handlers and controllers]
    CTRL --> ORM[Prisma ORM]
    ORM --> DB[(PostgreSQL)]
    JOB[Scheduled reminder jobs] --> DB
    JOB --> NOTIFY[Notification service]
    NOTIFY --> WS
```

## Repository structure

```text
Campus-Crew/
├── backend/
│   ├── prisma/              # Prisma schema
│   └── src/
│       ├── config/          # Environment and database setup
│       ├── controllers/     # Request handling and business logic
│       ├── jobs/            # Scheduled reminder jobs
│       ├── middleware/      # Authentication, roles, validation, errors
│       ├── prisma/          # Database seed script
│       ├── routes/           # REST API routes
│       ├── services/        # Shared services
│       ├── sockets/         # Socket.IO setup
│       ├── tests/           # API and concurrency tests
│       └── validators/      # Request schemas
├── frontend/
│   └── src/
│       ├── components/      # Shared UI components
│       ├── contexts/        # Authentication, socket, and toast contexts
│       ├── layouts/         # Public and dashboard layouts
│       ├── pages/           # Public, student, coordinator, and admin pages
│       └── services/        # API client
├── load-tests/              # k6 load-test script
├── docker-compose.yml       # Local PostgreSQL service
├── package.json             # Root development scripts
└── README.md
```

## Getting started

### Prerequisites

- Node.js 18.18 or later (Node.js 20 LTS is recommended).
- npm.
- Docker Desktop with Docker Compose, or a locally running PostgreSQL 16 database.
- Git.

### 1. Clone the repository

```bash
git clone https://github.com/Aishwarya-official1/Campus-Crew.git
cd Campus-Crew
```

### 2. Install dependencies

```bash
npm install --prefix backend
npm install --prefix frontend
```

### 3. Configure the backend environment

Create the backend environment file:

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and configure the values for your local environment:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/campuscrew?schema=public"
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

Generate a local JWT secret on macOS or Linux with:

```bash
openssl rand -hex 32
```

Use the generated value for `JWT_SECRET`. Never commit `.env` files or share real secrets.

### 4. Configure the frontend API URL

The backend's example configuration uses port `5000`, while the frontend API client has a different fallback port. Create `frontend/.env.local` so the frontend points to the backend port configured above:

```env
VITE_API_URL=http://localhost:5000/api
```

### 5. Start PostgreSQL

From the repository root, run:

```bash
npm run db:up
```

This starts the PostgreSQL 16 container defined in `docker-compose.yml`. The default local database is `campuscrew` on port `5432`.

### 6. Generate the Prisma client and create the database schema

```bash
cd backend
npx prisma generate
cd ..
npm run prisma:push
```

### 7. (Optional) Seed sample data

```bash
npm run prisma:seed
```

**Important:** The seed script clears existing application records before inserting sample data. Run it only against a disposable local development database. The script also contains demo credentials; do not reuse them outside local development.

### 8. Run the application

Start the backend in one terminal from the repository root:

```bash
npm run dev:backend
```

Start the frontend in a second terminal from the repository root:

```bash
npm run dev:frontend
```

The frontend is served by Vite (normally at `http://localhost:5173`) and the backend API runs at `http://localhost:5000` with a health endpoint at:

```text
http://localhost:5000/api/health
```

## Available scripts

Run these commands from the repository root:

| Command | Description |
|---|---|
| `npm run dev:frontend` | Start the Vite development server. |
| `npm run dev:backend` | Start the Express server with nodemon. |
| `npm run start:backend` | Start the backend without nodemon. |
| `npm run db:up` | Start the PostgreSQL container. |
| `npm run db:down` | Stop the PostgreSQL container. |
| `npm run prisma:push` | Synchronize the Prisma schema with the database. |
| `npm run prisma:seed` | Clear and seed the local database with sample data. |
| `npm test` | Run the backend Vitest suite. |
| `npm run build` | Build the frontend for production. |

## Testing

The backend test suite uses Vitest and Supertest. It includes coverage for:

- API health and authentication flows.
- Authorization checks for protected routes.
- Club, task, and contribution-related API behaviour.
- Event registration concurrency and duplicate-registration prevention.

The concurrency test creates test records in the configured database. Run tests only against a disposable development/test database with the required sample data available; do not point the test suite at production data.

A k6 script is available at `load-tests/k6-load-test.js`. To run it against the local backend (with [k6 installed](https://k6.io/docs/get-started/installation/)):

```bash
k6 run load-tests/k6-load-test.js -e API_BASE_URL=http://localhost:5000/api
```

The script defines request-duration and error-rate thresholds; these are test criteria, not a claim that a particular performance result has been achieved.

## Security notes

- Keep `backend/.env` and `frontend/.env.local` out of version control.
- Set a unique, strong `JWT_SECRET` for every environment.
- The included seeder is intended for local development only and deletes existing records before inserting sample data.
- Review uploads and any user-provided files before deploying the application publicly.

## Project status

This repository contains the source code and local development configuration for an academic project. No hosted demo or production deployment is documented here.

## Acknowledgements

Campus Crew was developed collaboratively as part of a Full-Stack Development course. This fork is maintained for personal learning, documentation, and portfolio purposes. Credit for the original collaborative work belongs to the project team and the upstream repository.
