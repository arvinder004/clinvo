# Clinvo Backend Platform Deployment Guide

This guide covers setting up and deploying the Clinvo backend services (`license-service` and `notification-service`) and the Admin Dashboard (`clinvo-admin`), both locally and on Railway.

---

## Architecture Overview

The backend platform consists of:
- **`@clinvo/shared`**: Shared TypeScript types, schemas (Zod), and Drizzle ORM database schema.
- **`@clinvo/license-service`**: Core REST API running on port 3001 handling tenant management, plan definitions, license issuance, verification, heartbeat tracking, and offline token signing.
- **`@clinvo/notification-service`**: Asynchronous notification service running on port 3003 handling transactional email delivery (via Resend or console fallback).
- **`clinvo-admin`**: Standalone React + Vite single-page application for license administration and operational management.

---

## Prerequisites

- **Node.js**: `22+ LTS`
- **pnpm**: `9.x` (`npm install -g pnpm@9.12.0`)
- **Docker Desktop**: For running local PostgreSQL and Redis via Docker Compose
- **Railway CLI** (optional for CLI deployments): `npm install -g @railway/cli`

---

## Local Development Setup

### 1. Clone and Configure Monorepo

```bash
cd backend
cp .env.example .env
```

Ensure `.env` contains valid configuration values for local development.

### 2. Start PostgreSQL and Redis via Docker Compose

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL** on `localhost:5432` (`postgres:postgres@localhost:5432/clinvo_licenses`)
- **Redis** on `localhost:6379`

### 3. Install Dependencies and Build Shared Package

```bash
cd backend
pnpm install
pnpm --filter @clinvo/shared build
```

### 4. Run Database Migrations

Before starting services for the first time, apply database migrations:

```bash
cd backend/packages/shared
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

### 5. Start Backend Services in Development Mode

In terminal 1 (License Service on port 3001):
```bash
cd backend
pnpm --filter @clinvo/license-service dev
```

In terminal 2 (Notification Service on port 3003):
```bash
cd backend
pnpm --filter @clinvo/notification-service dev
```

### 6. Start Admin Dashboard

In terminal 3:
```bash
cd admin
cp .env.example .env
pnpm install
pnpm dev
```
The admin dashboard runs at `http://localhost:5173`.

---

## Database Migrations with Drizzle Kit

Drizzle Kit manages schema migrations located in `backend/packages/shared`:
- **Generate SQL Migrations**: Run `pnpm --filter @clinvo/shared drizzle-kit generate` when schema definitions change in `src/db/schema.ts`.
- **Apply Migrations**: Run `pnpm --filter @clinvo/shared drizzle-kit migrate` against `DATABASE_URL`.
- **Drizzle Studio**: Inspect the database visually by running `pnpm --filter @clinvo/shared drizzle-kit studio`.

---

## Railway Deployment

### 1. Create a Railway Project

1. Log into Railway: `railway login`
2. Initialize or connect project:
   ```bash
   cd backend
   railway init
   ```
   Or create a new project directly in the [Railway Web Dashboard](https://railway.com/dashboard).

### 2. Provision PostgreSQL Database

1. In your Railway project, click **New** → **Database** → **PostgreSQL**.
2. Once provisioned, navigate to the PostgreSQL service's **Variables** tab and copy `DATABASE_URL` (or reference `${{Postgres.DATABASE_URL}}` across services).

### 3. Deploy License Service

1. In Railway, click **New** → **GitHub Repo** (or empty service connected to your repo).
2. Set service name to `license-service`.
3. Configure **Settings**:
   - **Root Directory**: `backend`
   - **Build Command**: `pnpm install && pnpm --filter @clinvo/shared build && pnpm --filter @clinvo/license-service build`
   - **Start Command**: `node packages/license-service/dist/index.js`
4. Configure **Variables**:
   - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}`
   - `ADMIN_SECRET_KEY`: `<secure-random-secret-key>`
   - `ADMIN_USERNAME`: `admin`
   - `ADMIN_PASSWORD_HASH`: `<bcrypt-hash-of-admin-password>`
   - `JWT_SECRET`: `<secure-jwt-signing-key>`
   - `JWT_EXPIRY`: `8h`
   - `INTERNAL_SERVICE_KEY`: `<shared-secret-key>`
   - `NOTIFY_SERVICE_URL`: Internal Railway URL, e.g. `http://notification-service.railway.internal:3003`
   - `NODE_ENV`: `production`
   - `PORT`: `3001` (Railway provides `PORT` automatically)
5. Under **Networking**, generate a public domain for external API access (e.g., `https://license-service-production.up.railway.app`).

### 4. Deploy Notification Service

1. Create a second service named `notification-service`.
2. Configure **Settings**:
   - **Root Directory**: `backend`
   - **Build Command**: `pnpm install && pnpm --filter @clinvo/shared build && pnpm --filter @clinvo/notification-service build`
   - **Start Command**: `node packages/notification-service/dist/index.js`
3. Configure **Variables**:
   - `INTERNAL_SERVICE_KEY`: `<same-shared-secret-as-license-service>`
   - `RESEND_API_KEY`: `<your-resend-api-key>` (if empty, emails are logged to console)
   - `EMAIL_FROM`: `Clinvo <noreply@clinvo.in>`
   - `PORT`: `3003`
   - `NODE_ENV`: `production`
4. Under **Networking**, enable private networking for internal communication with `license-service`.

### 5. Deploy Admin Dashboard

The Admin Dashboard is a standalone Vite React app located in `admin/`.

1. In Railway, click **New Service** pointing to the repository.
2. Configure **Settings**:
   - **Root Directory**: `admin`
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: Use a static server such as `npx serve -s dist -l $PORT` or deploy on a static hosting platform (e.g. Vercel, Cloudflare Pages, Railway Static).
3. Configure **Variables**:
   - `VITE_API_BASE_URL`: Public URL of `license-service` (e.g. `https://license-service-production.up.railway.app`)
4. Configure Custom Domain:
   - Map `admin.clinvo.in` in Railway DNS / Networking settings.
   - Ensure `admin.clinvo.in` is allowed in `license-service` CORS configuration.

---

## Dockerfile References

### Dockerfile for License Service

Save as `backend/Dockerfile.license-service`:
```dockerfile
FROM node:22-alpine AS base
RUN npm install -g pnpm@9.12.0
WORKDIR /app

# Copy dependency manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/license-service/package.json ./packages/license-service/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared/ ./packages/shared/
COPY packages/license-service/ ./packages/license-service/

# Build packages
RUN pnpm --filter @clinvo/shared build
RUN pnpm --filter @clinvo/license-service build

EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "packages/license-service/dist/index.js"]
```

### Dockerfile for Notification Service

Save as `backend/Dockerfile.notification-service`:
```dockerfile
FROM node:22-alpine AS base
RUN npm install -g pnpm@9.12.0
WORKDIR /app

# Copy dependency manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/notification-service/package.json ./packages/notification-service/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared/ ./packages/shared/
COPY packages/notification-service/ ./packages/notification-service/

# Build packages
RUN pnpm --filter @clinvo/shared build
RUN pnpm --filter @clinvo/notification-service build

EXPOSE 3003
ENV NODE_ENV=production
CMD ["node", "packages/notification-service/dist/index.js"]
```

---

## Environment Variables Reference

| Variable | Required | Service | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | `license-service` | PostgreSQL connection string (`postgresql://user:pass@host:5432/db`) |
| `ADMIN_SECRET_KEY` | Yes | `license-service` | Static API key for `x-admin-key` header authentication |
| `ADMIN_USERNAME` | Yes | `license-service` | Admin dashboard username (default: `admin`) |
| `ADMIN_PASSWORD_HASH` | Yes | `license-service` | bcrypt hash of admin password used by `bcryptjs.compare()` |
| `JWT_SECRET` | Yes | `license-service` | Secret key for signing admin dashboard JWT tokens |
| `JWT_EXPIRY` | No | `license-service` | TTL for admin JWT tokens (default: `8h`) |
| `INTERNAL_SERVICE_KEY` | Yes | Both | Shared secret for inter-service authentication |
| `NOTIFY_SERVICE_URL` | Yes | `license-service` | Base URL for the notification service |
| `RESEND_API_KEY` | No | `notification-service`| Resend API key; emails log to console if not provided |
| `EMAIL_FROM` | No | `notification-service`| From email address (default: `Clinvo <noreply@clinvo.in>`) |
| `PORT` | No | Both | HTTP port (overridden by Railway at runtime) |
| `NODE_ENV` | Yes | Both | Environment mode (`production` or `development`) |
| `VITE_API_BASE_URL` | Yes | `clinvo-admin` | Public API URL of `license-service` |

---

## Generating Initial Admin Password Hash

The admin dashboard authenticates using bcrypt password comparison against `ADMIN_PASSWORD_HASH`.

To generate a hashed password:
```bash
node -e "import('bcryptjs').then(b => b.default.hash('your-secure-password', 10).then(console.log))"
```

Set the generated string as `ADMIN_PASSWORD_HASH` in Railway's environment variables.

> **Note**: `bcryptjs` (`^2.4.3`) and `@types/bcryptjs` (`^2.4.6`) are installed in `license-service`, ensuring cross-platform pure JavaScript execution with zero native binary compilation overhead.

---

## Health Check Endpoints

Both backend services implement an unauthenticated health check endpoint:

```http
GET /health
```

Example response:
```json
{
  "status": "ok",
  "service": "license-service",
  "version": "1.0.0"
}
```

Railway uses this endpoint for zero-downtime health probing. Ensure `GET /health` is registered before any authentication middleware in `app.ts`.

---

## First Deployment Checklist

- [ ] PostgreSQL service created in Railway
- [ ] `DATABASE_URL` configured in `license-service` variables
- [ ] Database migrations applied: `pnpm --filter @clinvo/shared drizzle-kit migrate`
- [ ] `ADMIN_PASSWORD_HASH` generated with `bcryptjs` and configured
- [ ] `INTERNAL_SERVICE_KEY` matched between both backend services
- [ ] `license-service` deployed and healthy (`GET /health` returns 200)
- [ ] `notification-service` deployed and healthy (`GET /health` returns 200)
- [ ] `clinvo-admin` deployed with `VITE_API_BASE_URL` pointing to `license-service`
- [ ] Custom domain (`admin.clinvo.in`) configured with SSL certificate
- [ ] Verified login in Admin Dashboard and created initial tenant and plan
