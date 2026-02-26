# LittleSteps Forecaster

A childcare enrollment forecasting dashboard that helps daycare administrators visualize and forecast classroom capacity, enrollment trends, and child transitions across age-based classrooms.

## Architecture

- **Frontend**: React + Vite with TanStack Query, Recharts, Framer Motion, shadcn/ui
- **Backend**: Express.js with RESTful API
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter (frontend), Express (backend)

## Data Model

- **classrooms**: id (serial), name, color, minAgeMonths, maxAgeMonths, capacity, ratio
- **children**: id (serial), name, birthDate, enrollmentDate

## API Endpoints

- `GET /api/classrooms` — List all classrooms
- `POST /api/classrooms` — Create a classroom
- `PATCH /api/classrooms/:id` — Update a classroom
- `DELETE /api/classrooms/:id` — Delete a classroom
- `GET /api/children` — List all children
- `POST /api/children` — Create a child
- `PATCH /api/children/:id` — Update a child
- `DELETE /api/children/:id` — Delete a child

## Key Files

- `shared/schema.ts` — Drizzle schema definitions
- `server/db.ts` — Database connection
- `server/storage.ts` — Storage interface with DatabaseStorage implementation
- `server/routes.ts` — API route handlers
- `server/seed.ts` — Database seeding script
- `client/src/pages/Dashboard.tsx` — Main dashboard page
