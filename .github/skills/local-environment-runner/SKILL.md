---
name: local-environment-runner
description: "Use when the user asks to run everything in this workspace locally, boot the full MVP stack, verify service health, check or free ports, run migrations or seed data, execute quality checks, or reproduce the same checks as CI."
---

# local-environment-runner

## Purpose

This skill standardizes how to run the full Instagram Development local MVP in this workspace.

It covers:

- port pre-checks
- local stack startup
- database bootstrap
- health verification
- service-specific startup
- quality commands
- E2E execution
- CI-equivalent local checks

## Use When

Use this skill when the user asks to:

- run everything locally
- start frontend, backend, worker, postgres, and redis
- reproduce the local MVP environment
- verify the workspace is runnable end-to-end
- run the same checks that CI performs
- investigate failures caused by port conflicts or missing bootstrap steps

## Required Context

Read these files before acting:

1. README.md
2. SKILL.md
3. .github/copilot-instructions.md
4. 05_source_code/infra/README.md
5. 04_tasks/task-breakdown.md
6. .github/workflows/ci.yml

## Default Ports

Prefer the values in 05_source_code/infra/.env if present.

Common defaults used by this repository are:

- frontend: 3100 in compose-based local stack, 3000 in standalone Next.js dev
- backend: 4000
- postgres: 5432
- redis: 6379

Do not assume the ports are free.

## Mandatory Preflight

Before starting services, always check which processes already listen on the required ports.

Example:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
lsof -nP -iTCP:3100 -sTCP:LISTEN
lsof -nP -iTCP:4000 -sTCP:LISTEN
lsof -nP -iTCP:5432 -sTCP:LISTEN
lsof -nP -iTCP:6379 -sTCP:LISTEN
```

If a required port is already in use:

1. identify whether the process belongs to this workspace
2. stop the conflicting process before continuing if the user expects a clean local run
3. if the port should remain occupied, switch to the configured alternative port in 05_source_code/infra/.env

Report the port state in progress updates and in the final summary.

## Preferred Full-Stack Workflow

From 05_source_code:

```bash
cp infra/.env.example infra/.env
./scripts/local-stack.sh up
./scripts/local-db.sh bootstrap
./scripts/local-stack.sh ps
curl http://localhost:4000/api/health
curl http://localhost:4000/api/local/dependencies/redis
```

Expected outcomes:

- postgres, redis, backend, frontend, worker are up
- backend health returns {"status":"ok"}
- redis dependency check returns ping PONG

## Full Reset Workflow

Use this when the local environment is inconsistent:

```bash
./scripts/local-stack.sh down
./scripts/local-stack.sh reset
cp infra/.env.example infra/.env
./scripts/local-stack.sh up
./scripts/local-db.sh bootstrap
```

## Service-Specific Startup

Use standalone startup when the user only wants one service or when debugging a single layer.

### Backend

```bash
cd 05_source_code/backend
cp .env.example .env
npm install
npm run dev
```

### Frontend

```bash
cd 05_source_code/frontend
cp .env.local.example .env.local
npm install
npm run dev
```

### Worker

```bash
cd 05_source_code/worker
cp .env.example .env
npm install
npm run dev
```

## Database Operations

Run from 05_source_code:

```bash
./scripts/local-db.sh bootstrap
./scripts/local-db.sh migrate
./scripts/local-db.sh seed
./scripts/local-db.sh tables
```

If the app fails with a missing PostgreSQL column after a schema change, suspect that migrate or bootstrap was skipped before changing code.

## Local Verification Targets

After startup, verify at least these endpoints and pages when relevant:

- backend health: http://localhost:4000/api/health
- redis check: http://localhost:4000/api/local/dependencies/redis
- mock status: http://localhost:4000/api/local/mocks/status
- frontend login: http://localhost:3100/login in compose mode
- frontend dashboard: http://localhost:3100/dashboard in compose mode

Default local login:

- email: demo@example.com
- password: LocalPass123!

## Quality Commands

Run the narrowest checks for the touched service first.

### Backend

```bash
cd 05_source_code/backend
npm run typecheck
npm run lint
npm run format:check
npm test
```

### Frontend

```bash
cd 05_source_code/frontend
npm run typecheck
npm run lint
npm run format:check
```

### Worker

```bash
cd 05_source_code/worker
npm run typecheck
npm run lint
npm run format:check
```

## E2E Commands

Run from 05_source_code/frontend:

```bash
npx playwright install --with-deps chromium
npx playwright test --config=playwright.config.mjs e2e/connect-workflow.spec.ts
npx playwright test --config=playwright.config.mjs e2e/content-workflow.spec.ts
```

Set PLAYWRIGHT_DATABASE_URL when needed:

```bash
PLAYWRIGHT_DATABASE_URL=postgresql://instagram:instagram@localhost:5432/instagram_ops npx playwright test --config=playwright.config.mjs e2e/connect-workflow.spec.ts
```

## CI-Equivalent Checks

The GitHub Actions workflow is defined in .github/workflows/ci.yml.

To mirror it locally, run:

1. backend: npm ci, typecheck, lint, format:check
2. frontend: npm ci, typecheck, lint, format:check
3. worker: npm ci, typecheck, lint, format:check
4. postgres-backed Playwright tests for TASK-007 and TASK-016

## Operating Rules

- Prefer the integrated stack under 05_source_code for end-to-end validation.
- Prefer service-local commands when isolating failures.
- After the first code edit, run one focused validation immediately.
- Do not mark a TASK complete until local checks pass and GitHub Actions CI has been triggered and confirmed.
- If ports are occupied, mention what was using them and whether you stopped the process.

## Current Repository Status To Remember

As of 2026-06-20:

- TASK-001 and TASK-002 are complete and provide the local run foundation.
- TASK-007 and TASK-016 have runnable Playwright coverage.
- TASK-026, TASK-042, TASK-043, and TASK-053 are still partial.
- TASK-032 through TASK-037 and TASK-054 through TASK-059 are not implemented yet.

This means "run everything" in this workspace currently means running the local MVP and its implemented flows, not a fully completed production feature set.