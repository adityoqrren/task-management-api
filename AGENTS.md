# AGENTS.md

Express 5 REST API (ESM) + Prisma 6 (Postgres) + Redis cache + RabbitMQ queue + Cloudflare R2 (S3-compatible) file storage. No frontend in this repo.

## Commands

- `npm run dev` — nodemon on `src/app.js` (entrypoint; also run `npm start`)
- `npx prisma migrate dev` + `npx prisma generate` — required after any `prisma/schema.prisma` change (models are plural, e.g. `prisma.tasks`, `prisma.users`; the two `prisma.task` calls in `src/modules/task/repository/taskRepository.js:297,311` are a known bug, not the convention)
- `npx eslint .` — lint; there is no `lint` npm script
- No test framework. Verification is done via root `verify_*.js` scripts (gitignored) that `fetch` a running server; the server + Postgres + Redis + RabbitMQ must be up first.
- **Never run `git commit` or `git push` unless the user explicitly asks.** Do not stage, commit, amend, or push changes on your own.

## Running the app

- Requires `.env` (gitignored, no `.env.example` — copy `.env`; keys: `DATABASE_URL`, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `WS_TOKEN_SECRET`, `JWT_SECRET`, `R2_*`, `REDIS_SERVER/PORT`).
- `docker compose -f docker/docker-compose.yml up` gives Postgres (host port **5433** → 5432; use port 5433 in `DATABASE_URL`) and Redis (6379) only. **RabbitMQ is not in compose**.
- `src/app.js` calls `await initRabbit()` at top level (src/queue/queueService.js:7), connecting to hardcoded `amqp://admin:admin@localhost:5672` — the server **fails to boot** if RabbitMQ is not running. Start one manually (e.g. `docker run -p 5672:5672 -e RABBITMQ_DEFAULT_USER=admin -e RABBITMQ_DEFAULT_PASS=admin rabbitmq:3`).

## Architecture

- One module per feature under `src/modules/<feature>/`: `{feature}Routes.js` (Swagger JSDoc inline), `{feature}Validation.js` (zod), plus `controller/`, `service/`, `repository/`. All routes mounted in `src/app.js`.
- Cross-cutting code in `src/shared/` (middlewares, config, utils), `src/cache/` (Redis), `src/queue/`, `src/storage/` (R2), `src/jwt/`, `src/exceptions/`. API docs at `/api-docs`.
- Auth: JWT access token (5m) accepted via `Authorization: Bearer` or `accessToken` cookie; `authenticate` sets `req.user = { id, email }`. Role checks via `src/shared/middlewares/checkProjectRole.js` (`LEADER`/`MEMBER`).
- Prisma enums are UPPERCASE (`LEADER`, `TODO`, `IN_PROGRESS`, `DONE`, `LOW/MEDIUM/HIGH`). DB columns are snake_case via `@map`. Records use soft-delete (`deletedAt`), not hard deletes.
- Features doc'd in `docs/` (api-endpoints-summary, task-attachments-api-guide, activity-log-guide) and `docs/codebase-recommendations.md` records known issues; read before touching those areas.

## Gotchas

- `validateRequest` middleware runs `schema.parse(data)` but does **not** write parsed/transformed values back to `req` (src/shared/middlewares/validateRequest.js) — zod defaults/transforms are lost; services re-derive.
- `checkProjectRoleForUpdateStatusTask` dereferences `task.assignee.userId` without optional chaining (src/shared/middlewares/checkProjectRole.js:110) — crashes with 500 on unassigned tasks.
- Each `new CacheService()` opens its own Redis connection (src/cache/cacheService.js) — reuse, don't instantiate per request.
- Swagger JSDoc lives inline in route files — keep it in sync with route changes.
- Commit style: lowercase imperative (e.g. `add task comment feature`, `fixing caching`).

## Agent skills

### Issue tracker

Issues live as markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), defaulted. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
