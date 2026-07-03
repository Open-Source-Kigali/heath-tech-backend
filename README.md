# ClinicSync Backend

[![NestJS](https://img.shields.io/badge/NestJS-Framework-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com) [![TypeScript](https://img.shields.io/badge/TypeScript-Language-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org) [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org) [![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io) [![Swagger](https://img.shields.io/badge/Swagger-APIdocs-green?logo=swagger&logoColor=white)](https://swagger.io) [![Docker](https://img.shields.io/badge/Docker-Containerization-2496ED?logo=docker&logoColor=white)](https://www.docker.com) ●• [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) ![GitHub forks](https://img.shields.io/github/forks/Open-Source-Kigali/heath-tech-backend?style=social) ![GitHub stars](https://img.shields.io/github/stars/Open-Source-Kigali/heath-tech-backend?style=social)

Offline-first clinic management backend for [Open Source Kigali](https://github.com/Open-Source-Kigali). Built with NestJS, TypeScript, Prisma, and PostgreSQL. Clinic devices work while disconnected and reconcile changes through a bidirectional sync protocal when they are back online.

## Getting started

> **TL;DR** clone the repo and install dependencies, set up your `.env` file, start the database, and you are up. Read more below for environment variables, database setup, project structure, and scripts. Here are the quick commands to get started.

```bash
npm install
cp .env.example .env
docker compose up -d db
npx prisma migrate dev
npm run start:dev
```

The server runs on `http://localhost:3000` and Swagger UI is at `http://localhost:3000/docs/api`.

If a local PostgreSQL already uses port 5432, set `POSTGRES_PORT` to another value (for example `5433`) in `.env` and update `DATABASE_URL` to match.

<details>
<summary><b>Environment variables</b></summary>
<br>

See `.env.example` for the full list.

| Variable                     | Required | Description                                              |
| ---------------------------- | -------- | -------------------------------------------------------- |
| `PORT`                       | no       | Server port (default `3000`)                             |
| `NODE_ENV`                   | no       | `development` or `production`                            |
| `DATABASE_URL`               | yes      | PostgreSQL connection string                             |
| `JWT_SECRET`                 | yes      | Signs user login tokens; use a long random value         |
| `JWT_EXPIRES_IN`             | no       | User token lifetime (default `1h`)                       |
| `DEVICE_JWT_SECRET`          | yes      | Signs per-device sync tokens; separate from `JWT_SECRET` |
| `DEVICE_JWT_EXPIRES_IN`      | no       | Device token lifetime (default `30d`)                    |
| `SYNC_PULL_MAX_LIMIT`        | no       | Max changes returned by one pull page (default `500`)    |
| `SYNC_FULL_RESYNC_THRESHOLD` | no       | Cursor lag that forces a full re-sync (default `50000`)  |
| `THROTTLE_TTL_SECONDS`       | no       | Rate-limit window in seconds (default `60`)              |
| `THROTTLE_LIMIT`             | no       | Requests allowed per window (default `120`)              |

</details>

<details>
<summary><b>Database</b></summary>
<br>

PostgreSQL runs locally via Docker. Make sure Docker is installed, then:

```bash
docker compose up -d db      # start Postgres
npx prisma migrate dev       # apply migrations
npx prisma studio            # optional: browse the DB in a GUI
npm run db:seed              # optional: demo clinic and admin login
```

To stop the database run `docker compose down` (add `-v` to wipe the data).

</details>

<details>
<summary><b>Project structure</b></summary>
<br>

```
src/
├── main.ts             Bootstrap, Swagger, global pipes
├── app.module.ts       Root module
├── config/             Typed environment configuration
├── prisma/             Prisma service and module
├── auth/               Login, JWT strategy, guards
├── patients/           Patients module
├── audit/              Audit log service
├── sync/               Sync layer (handshake, push, pull, entity syncers)
└── health/             Liveness endpoint
prisma/
├── schema.prisma       Prisma schema
├── migrations/         Generated migration history
└── seed.ts             Optional local seed
```

</details>

<details>
<summary><b>Scripts</b></summary>
<br>

- `npm run start:dev` start the server in watch mode
- `npm run build` compile TypeScript to `dist/`
- `npm run start:prod` run the compiled build
- `npm test` run the unit tests
- `npm run lint` lint the codebase
- `npm run format` format with Prettier
- `npm run prisma:migrate` create and apply a migration
- `npm run db:seed` seed a demo clinic and admin user

</details>

## API Documentation

[![Launch Swagger UI](https://img.shields.io/badge/Swagger%20UI-Launch%20API%20Docs-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)](http://localhost:3000/docs/api)

The interactive Swagger UI is available at `http://localhost:3000/docs/api` once the server is running.

Authentication uses two bearer tokens: a user JWT from login, and a per-device token issued at sync handshake. The sync surface is:

| Endpoint               | Auth         | Purpose                                           |
| ---------------------- | ------------ | ------------------------------------------------- |
| `POST /sync/handshake` | user JWT     | Register a device and get a device token          |
| `POST /sync/push`      | device token | Send a batch of local changes (idempotent)        |
| `GET  /sync/pull`      | device token | Read changes after a cursor, including tombstones |

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, branching, commit conventions, and the pull request flow. By participating, you agree to follow our [Code of Conduct](./CODE_OF_CONDUCT.md). To report a bug or request a feature, open an issue using one of the templates in [`.github/ISSUE_TEMPLATE`](./.github/ISSUE_TEMPLATE). To report a security issue, read [SECURITY.md](./SECURITY.md).

## Contributors

[![](https://contrib.rocks/image?repo=Open-Source-Kigali/heath-tech-backend)](https://github.com/Open-Source-Kigali/heath-tech-backend/graphs/contributors)

To add yourself, open a pull request that adds your GitHub username to [`CONTRIBUTORS.md`](./CONTRIBUTORS.md).

## License

[MIT](./LICENSE)
