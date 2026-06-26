# Contributing to ClinicSync Backend

Thanks for your interest in contributing. This is the offline-first clinic
management backend for [Open Source Kigali](https://github.com/Open-Source-Kigali),
built with NestJS, TypeScript, Prisma, and PostgreSQL. Whether you are fixing a
bug, adding a feature, or improving the docs, this guide will help you get set up
and submit a change.

## Code of conduct

By participating, you agree to follow our [Code of Conduct](./CODE_OF_CONDUCT.md).
Please report unacceptable behavior to the maintainers.

## Getting started

### Prerequisites

- Node.js 20 or newer and npm
- Docker, for a local PostgreSQL instance

### Setup

```bash
git clone https://github.com/Open-Source-Kigali/heath-tech-backend.git
cd heath-tech-backend
npm install
cp .env.example .env
docker compose up -d db
npx prisma migrate dev
npm run start:dev
```

The server runs at http://localhost:3000 and Swagger UI is at /docs/api.

If a local PostgreSQL already uses port 5432, set POSTGRES_PORT to another value
(for example 5433) in .env and update DATABASE_URL to match.

### Environment variables

See `.env.example` for the full list. The important ones for local development:

- `DATABASE_URL` is the Postgres connection string.
- `JWT_SECRET` and `DEVICE_JWT_SECRET` sign user and device tokens. Use long
  random values; the app falls back to insecure defaults if they are unset.

## Branching

The default branch is `main`. Branch off it and use a type prefix in the name:

- `feat/<short-description>` for new features
- `fix/<short-description>` for bug fixes
- `docs/<short-description>` for documentation
- `refactor/<short-description>` for internal restructuring
- `chore/<short-description>` for tooling, dependencies, or infra

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org). The first
line should be:

```
<type>: <short summary>
```

Common types: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `style`, `perf`.
Keep the summary under 72 characters and add a body if the change needs context.

## Code style

- TypeScript strict mode is on. Please keep it that way and avoid `any`.
- Keep controllers thin. Put business logic in services.
- Sync logic lives in `src/sync`. To make a new entity syncable, add an entity
  syncer and register it in the registry and module.
- Do not commit secrets, `.env` files, or generated artifacts.

Run before pushing:

```bash
npm run build
npm run lint
npm run test:e2e
```

## Database changes

If you change `prisma/schema.prisma`:

1. Run `npx prisma migrate dev --name <short-description>` locally.
2. Commit both the schema change and the generated migration directory.
3. Mention any data implications in the pull request description.

## Tests

The integration test covers a full offline, reconnect, and two-device sync
cycle, and it uses a separate database so it can reset tables freely.

```bash
createdb clinicsync_test
export TEST_DB="postgresql://clinicsync:clinicsync@localhost:5433/clinicsync_test?schema=public"
DATABASE_URL="$TEST_DB" npx prisma migrate deploy
DATABASE_URL="$TEST_DB" npm run test:e2e
```

## Pull requests

1. Push your branch and open a pull request against `main` using the
   [PR template](.github/PULL_REQUEST_TEMPLATE.md).
2. Link the issue your PR closes, for example `Closes #123`.
3. Keep PRs focused. One logical change per PR is easier to review.
4. Be ready to iterate. Reviewers may suggest changes, and that is normal.

## Reporting bugs and requesting features

Use the issue templates:

- [Bug report](.github/ISSUE_TEMPLATE/bug_report.md)
- [Feature request](.github/ISSUE_TEMPLATE/feature_request.md)

Search existing issues first to avoid duplicates.
