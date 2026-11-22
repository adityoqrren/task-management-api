# TaskFlow API

A REST API for collaborative task management. TaskFlow API provides users, projects, tasks, attachments, notifications, activity logs, and dashboard statistics, with JWT authentication and event-driven side effects.

This repository contains the HTTP API only. Notifications and activity logs are persisted by separate worker services that consume domain events over RabbitMQ, and real-time delivery is handled by a separate WebSocket service.

## Features

- JWT authentication with short-lived access tokens and rotating refresh tokens.
- Web clients receive HttpOnly cookies; mobile clients receive tokens in the response body.
- Cloudflare Turnstile verification on registration and, when required, on login.
- Login-attempt protection and Redis-backed rate limiting.
- Projects with owner/leader/member roles and member activation management.
- Project lifecycle: archive, unarchive, soft delete, restore, permanent delete.
- Tasks with status, priority, start/due dates, assignment, comments, and attachments.
- Task lifecycle: archive, unarchive, soft delete, restore, permanent delete.
- In-app notifications and activity logs (read APIs).
- Dashboard statistics for the authenticated user.
- WebSocket token issuance for the real-time service.
- User profile updates and profile photo storage on Cloudflare R2.
- OpenAPI/Swagger documentation.

## Tech stack

| Area | Technology |
| --- | --- |
| Runtime | Node.js >= 22 (ES modules) |
| HTTP | Express 5 |
| Database | PostgreSQL with Prisma 6 |
| Cache / rate limits | Redis |
| Messaging | RabbitMQ (topic exchange `domain-events`) |
| Object storage | Cloudflare R2 (S3-compatible) |
| Auth | JWT, bcrypt |
| Validation | Zod |
| Docs | swagger-jsdoc + swagger-ui-express |
| Lint | ESLint |

## Architecture

The API is a modular monolith. Each feature lives in `src/modules/<feature>` and is split into controller, service, repository, routes, and validation layers.

```text
src/
  app.js                 Express bootstrap, middleware, route mounting
  modules/
    auth/                Register, login, token refresh, logout
    user/                User lookup, profile, profile photo
    project/             Projects, members, lifecycle
    task/                Tasks, assignment, attachments, lifecycle
    taskcomment/         Task comments (mounted under /api/tasks)
    notification/        Read/mark notifications
    activitylog/         Read activity logs
    dashboard/           Aggregated statistics
    websocket/           WebSocket token issuance
  shared/
    middlewares/         Auth, project role checks, validation, errors, rate limits
    services/            Turnstile and login-attempt protection
    utils/               Response helpers, lifecycle assertions, sanitization
    config/              Swagger configuration
    redis/               Redis client for rate limits
  cache/                 Redis cache service
  queue/                 RabbitMQ connection, event publisher, email producer
  storage/               Cloudflare R2 client
  jwt/                   Access, refresh, and WebSocket token generation
  db/                    Prisma client
  exceptions/            Application error classes
prisma/
  schema.prisma          Data model
  migrations/            Prisma migrations
docker/
  docker-compose.yml     Local PostgreSQL and Redis
```

### Event-driven side effects

The API publishes domain events to the RabbitMQ topic exchange `domain-events`. Worker services in the TaskFlow monorepo bind `project.#` and `task.#` and persist notifications and activity logs. Email work is queued on `email.queue`.

Events published:

- `project.created`, `project.updated`, `project.archived`, `project.unarchived`, `project.deleted`, `project.restored`, `project.permanent.deleted`, `project.member.added`
- `task.created`, `task.assigned`, `task.completed`, `task.updated`, `task.archived`, `task.unarchived`, `task.deleted`, `task.restored`, `task.permanent.deleted`

Because of this design, the API only reads from the `Notifications` and `ActivityLogs` tables. If the worker services are not running locally, those tables stay empty even though the API works.

## Requirements

- Node.js >= 22 and npm
- PostgreSQL (local Docker setup provided)
- Redis (local Docker setup provided)
- RabbitMQ reachable via `RABBITMQ_URL` (required at startup)
- Cloudflare R2 credentials
- Cloudflare Turnstile secret and allowed hostnames

The application calls `initRabbit()` before it starts listening, so it will not boot unless RabbitMQ is reachable.

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create the development environment file:

   ```bash
   cp .env.example .env.dev
   ```

   On Windows PowerShell, use `Copy-Item .env.example .env.dev`. Fill in the values. The `dev` script loads `.env.dev`.

3. Start PostgreSQL and Redis:

   ```bash
   docker compose -f docker/docker-compose.yml --env-file docker/.env up -d
   ```

   PostgreSQL is exposed on host port `5433`; Redis on `6379`.

4. Start RabbitMQ. A ready-to-use RabbitMQ setup lives in the sibling TaskFlow monorepo at `task-management-workers/rabbitmq-docker` (not in this repository). Point `RABBITMQ_URL` at it.

5. Apply database migrations and generate the Prisma client:

   ```bash
   npm run prisma:migrate:dev
   npx prisma generate
   ```

6. Start the API in watch mode:

   ```bash
   npm run dev
   ```

7. Open Swagger UI at [http://localhost:3000/api-docs](http://localhost:3000/api-docs).

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `NODE_ENV` | Yes | `development`, `test`, or `production`. Controls cookie `secure` and proxy trust. |
| `PORT` | No | HTTP port. Defaults to `3000`. |
| `REMOTE_ADDRESS` | Production | Value passed to Express `trust proxy`. |
| `DATABASE_URL` | Yes | PostgreSQL connection string. |
| `ACCESS_TOKEN_SECRET` | Yes | Signing secret for access tokens. |
| `REFRESH_TOKEN_SECRET` | Yes | Secret for refresh token generation. |
| `WS_TOKEN_SECRET` | Yes | Signing secret for short-lived WebSocket tokens. |
| `REDIS_SERVER` | Yes | Redis host. |
| `REDIS_PORT` | Yes | Redis port. |
| `RABBITMQ_URL` | Yes | RabbitMQ AMQP URL. Required at startup. |
| `R2_REGION` | Yes | Cloudflare R2 region. |
| `R2_ACCOUNT_ID` | Yes | Cloudflare account id for the R2 endpoint. |
| `R2_ACCESS_KEY_ID` | Yes | R2 access key. |
| `R2_SECRET_ACCESS_KEY` | Yes | R2 secret key. |
| `R2_BUCKET_NAME` | Yes | Bucket for profile photos and task attachments. |
| `TURNSTILE_SECRET_KEY` | Yes | Cloudflare Turnstile secret key. |
| `TURNSTILE_ALLOWED_HOSTNAMES` | Yes | Comma-separated hostnames accepted in Turnstile responses. |
| `LOGIN_RATE_LIMIT_SECRET` | Yes | Secret used to hash account identifiers for login protection. |
| `JWT_SECRET` | No | Present in existing env files but not referenced by current code. Legacy. |

Test-only variables: `TEST_BASE_URL`, `TEST_COOKIE`, and `PROTECTION_TEST_PORT`.

## Authentication

- Access tokens are JWTs valid for about 5 minutes.
- Refresh tokens are generated, hashed, and stored in the `RefreshTokens` table. They rotate on refresh and are revoked on logout.
- Web clients (`x-client-type` not `mobile`) receive HttpOnly cookies `accessToken` and `refreshToken`.
- Mobile clients (`x-client-type: mobile`) receive both tokens in the JSON response.
- Protected endpoints accept either `Authorization: Bearer <accessToken>` or the `accessToken` cookie.
- Registration always requires a Turnstile token. Login requires one only when the account is under login protection after repeated failures.

## API overview

Base path: `/api`. Interactive documentation is available at `/api-docs`.

### Auth

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Register a user |
| POST | `/api/auth/login` | Log in |
| GET | `/api/auth/info` | Current user from the access token |
| PUT | `/api/auth/token` | Rotate access/refresh tokens |
| DELETE | `/api/auth/token` | Revoke the refresh token (logout) |

### Users

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/users/info` | Logged-in user |
| GET | `/api/users/:userid` | User by id |
| GET | `/api/users?name=&username=` | Search users |
| PATCH | `/api/users/me` | Update full name |
| POST | `/api/users/me/photo` | Upload profile photo |
| DELETE | `/api/users/me/photo` | Remove profile photo |

### Projects

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/projects` | Create a project |
| GET | `/api/projects` | List projects for the user |
| GET | `/api/projects/all/:id` | Project detail including deleted |
| GET | `/api/projects/:id` | Project detail |
| PATCH | `/api/projects/:id` | Update project |
| PATCH | `/api/projects/:id/archive` | Archive project and tasks |
| PATCH | `/api/projects/:id/unarchive` | Unarchive project and tasks |
| PATCH | `/api/projects/:id/soft-delete` | Soft delete project and tasks |
| PATCH | `/api/projects/:id/restore` | Restore soft-deleted project |
| DELETE | `/api/projects/:id` | Permanently delete project |
| GET | `/api/projects/:id/statistics` | Task counts by status |
| GET | `/api/projects/:id/tasks` | Project tasks |
| GET | `/api/projects/:id/tasks/recent` | Recently updated tasks |
| POST | `/api/projects/members` | Add a member |
| GET | `/api/projects/:id/members` | List members |
| GET | `/api/projects/:projectId/members/:memberId/task-summary` | Member task summary |
| PATCH | `/api/projects/:projectId/members/:memberId/active` | Activate/deactivate a member (owner only) |

### Tasks

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/tasks` | Create a task |
| GET | `/api/tasks/me` | Tasks assigned to the user |
| GET | `/api/tasks/me/counts` | User task counts |
| GET | `/api/tasks/:taskId` | Task detail |
| GET | `/api/tasks/all/:taskId` | Task detail including deleted |
| PATCH | `/api/tasks/:taskId` | Update task |
| PATCH | `/api/tasks/:taskId/assign` | Assign a member |
| PATCH | `/api/tasks/:taskId/completed` | Update completion/status |
| PATCH | `/api/tasks/:taskId/progress` | Update progress |
| PATCH | `/api/tasks/:taskId/archive` | Archive task |
| PATCH | `/api/tasks/:taskId/unarchive` | Unarchive task |
| PATCH | `/api/tasks/:taskId/soft-delete` | Soft delete task |
| PATCH | `/api/tasks/restore/:taskId` | Restore soft-deleted task |
| DELETE | `/api/tasks/:taskId` | Permanently delete task |
| POST | `/api/tasks/:taskId/attachments/images` | Upload image attachment |
| POST | `/api/tasks/:taskId/attachments/files` | Upload file attachment |
| GET | `/api/tasks/:taskId/attachments` | List attachments |
| DELETE | `/api/tasks/:taskId/attachments/:attachmentId` | Delete attachment |
| GET | `/api/tasks/:taskId/comments` | List task comments |
| POST | `/api/tasks/:taskId/comments` | Add a comment |
| PATCH | `/api/tasks/:taskId/comments/:commentId` | Edit a comment |
| DELETE | `/api/tasks/:taskId/comments/:commentId` | Delete a comment |

### Notifications

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/notifications` | List notifications (cursor pagination) |
| GET | `/api/notifications/unread-count` | Unread count |
| PATCH | `/api/notifications/:id/read` | Mark one as read |
| PATCH | `/api/notifications/read-all` | Mark all as read |

### Activity logs

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/activity-logs` | Logs for the current user |
| GET | `/api/activity-logs/projects/:projectId` | Logs for a project |
| GET | `/api/activity-logs/tasks/:taskId` | Logs for a task |

### Dashboard and WebSocket

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/dashboard/statistics` | Projects, assigned tasks, due soon, overdue |
| POST | `/api/websocket/token` | Short-lived WebSocket token |

## Data model

Core entities in `prisma/schema.prisma`:

- `Users`: identity and credentials.
- `Projects`: owner, lifecycle timestamps, last activity.
- `ProjectMembers`: membership with `LEADER`/`MEMBER` role and active flag.
- `Tasks`: status (`TODO`, `IN_PROGRESS`, `DONE`), priority, dates, assignee, lifecycle.
- `TaskAttachments`: R2 object references.
- `TaskComments`: task discussion.
- `RefreshTokens`: hashed refresh tokens.
- `Notifications`: produced by the notification worker.
- `ActivityLogs`: produced by the activity-logs worker.

Projects and tasks use `archivedAt` and `deletedAt` for reversible lifecycle operations. Permanent deletes remove rows.

## Rate limits

Rate limiting is Redis-backed. Limits apply per authenticated user or per IP:

| Group | Window | Limit |
| --- | --- | --- |
| Projects | 1 minute | 120 |
| Tasks | 1 minute | 120 |
| Users | 1 minute | 60 |
| Notifications | 1 minute | 120 |
| Activity logs | 1 minute | 60 |
| Dashboard | 1 minute | 60 |
| Login | 15 minutes | 50 |
| Register | 1 hour | 100 |
| Unauthorized (failed auth) | 1 minute | 60 |

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run with nodemon using `.env.dev` |
| `npm run dev:production` | Run with nodemon using `.env.production` |
| `npm start` | Run `src/app.js` with ambient environment variables |
| `npm run prisma:migrate:dev` | Apply migrations using `.env.dev` |
| `npm run prisma:validate:dev` | Validate the Prisma schema |
| `npm run prisma:format:dev` | Format the Prisma schema |
| `npm run test:member-active` | Unit tests for member activation rules (self-contained) |
| `npm run test:rate-limit` | Rate limiter checks against a running API |

The test files live under `tests/`. `test:rate-limit` requires a running server, Redis, and a valid `TEST_COOKIE`.

## Notes for deployment

- CORS allowed origins are hardcoded in `src/app.js` (`http://localhost:3001` and `https://taskflow.adityop.web.id`). Update the list for your frontend.
- Cookies use `sameSite: 'strict'` and `secure` when `NODE_ENV=production`.
- In production, set `REMOTE_ADDRESS` so Express trusts the proxy correctly.
- RabbitMQ must be reachable before the process can start accepting traffic.

## License

ISC.
