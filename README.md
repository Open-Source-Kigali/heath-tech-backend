# ClinicSync Backend

An offline-first clinic management backend built with NestJS, TypeScript,
PostgreSQL, and Prisma. It targets clinics in low-connectivity areas. The server
is the source of truth and stays online. Clinic devices keep a local database,
work while disconnected, and reconcile changes in both directions once they are
back online.

## Getting started

```bash
cp .env.example .env
docker compose up -d db
npm install
npx prisma migrate dev
npm run db:seed        # optional demo clinic and admin login
npm run start:dev
```

The API runs on http://localhost:3000 and Swagger is available at /docs/api.

If a local PostgreSQL already uses port 5432, set POSTGRES_PORT to another value
(for example 5433) in .env and update DATABASE_URL to match.

## Sync endpoints

| Endpoint              | Auth         | Purpose                                          |
| --------------------- | ------------ | ------------------------------------------------ |
| POST /sync/handshake  | user JWT     | Register a device and get a device token         |
| POST /sync/push       | device token | Send a batch of local changes (idempotent)       |
| GET  /sync/pull       | device token | Read changes after a cursor, including tombstones |

Syncable entities fall into two groups. Patient, Appointment, and Visit are
mutable and resolved last-write-wins, with every overwrite recorded for review.
LabResult and MedicalHistoryEvent are append-only clinical records, so a
correction is a new row that links back to the one it replaces.

## Running the tests

The integration test covers a full offline, reconnect, and two-device sync
cycle. It uses a separate database so it can truncate tables freely.

```bash
createdb clinicsync_test
export TEST_DB="postgresql://clinicsync:clinicsync@localhost:5433/clinicsync_test?schema=public"
DATABASE_URL="$TEST_DB" npx prisma migrate deploy
DATABASE_URL="$TEST_DB" npm run test:e2e
```

## Useful scripts

- npm run build
- npm run lint
- npm run start:dev
- npm run test:e2e
- npm run prisma:migrate
- npm run db:seed
