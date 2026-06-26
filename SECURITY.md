# Security Policy

## Supported Versions

This project is under active development on a single `main` branch and does not
currently ship tagged releases. Only the latest commit on `main` receives
security fixes.

| Version         | Supported |
| --------------- | --------- |
| `main` (latest) | Yes       |
| Older commits   | No        |

## Reporting a Vulnerability

Please do not open public GitHub issues for security vulnerabilities.

Instead, report them privately through GitHub's [private vulnerability reporting](https://github.com/Open-Source-Kigali/heath-tech-backend/security/advisories/new).
This keeps the report between you and the maintainers until a fix is ready.

When reporting, please include:

- A clear description of the vulnerability
- Steps to reproduce, or a proof of concept if possible
- The affected endpoint, file, or area of the codebase
- Any potential impact you have identified

## What to expect

- Acknowledgement within 7 days of your report.
- Initial assessment within 14 days, telling you whether the report is accepted,
  needs more information, or is being declined with reasons.
- For accepted reports, we aim to ship a fix within 30 days. We will coordinate
  disclosure timing with you and credit you in the advisory if you would like.

If you do not hear back within these timeframes, feel free to nudge by commenting
on the advisory.

## Scope

In scope:

- The API routes, controllers, guards, and services
- The sync layer (handshake, push, pull, device tokens, conflict handling)
- Authentication and authorization, including per-device token revocation
- Database access patterns and Prisma queries

Out of scope:

- Vulnerabilities in third-party dependencies, which should be reported upstream
- On-device data at rest, which is the client's responsibility
- Issues that require physical access to a server or an already compromised account
