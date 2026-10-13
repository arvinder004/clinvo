# Clinvo — Full Production & Backend Roadmap

> This document combines the desktop app production plan with the full backend platform strategy.
> Features are marked **[NOW]** (current scope), **[SOON]** (next 6 months), or **[FUTURE]** (long-term vision).

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Microservices Breakdown](#microservices-breakdown)
3. [API Key System](#api-key-system)
4. [Database Design](#database-design)
5. [Plans & Feature Flags](#plans--feature-flags)
6. [Admin Dashboard](#admin-dashboard)
7. [License & Subscription System](#license--subscription-system)
8. [Web App (Clinvo Web)](#web-app-clinvo-web)
9. [Electron App Changes](#electron-app-changes)
10. [Immediate App Fixes](#immediate-app-fixes)
11. [Security](#security)
12. [Infrastructure & DevOps](#infrastructure--devops)
13. [Full Implementation Plan](#full-implementation-plan)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                  │
│                                                                 │
│  Clinvo Desktop (Electron)    Clinvo Web (React SPA)            │
│  └─ API Key auth              └─ JWT auth (future)              │
│                                                                 │
│  Third-party integrations     Admin Dashboard (internal)        │
│  └─ API Key auth              └─ Master key auth                │
└────────────────────┬────────────────────────────────────────────┘
                     │  HTTPS
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY                                  │
│           (rate limiting, auth, routing)                        │
└──┬──────────────┬──────────────┬──────────────┬────────────────┘
   │              │              │              │
   ▼              ▼              ▼              ▼
┌──────┐    ┌──────────┐   ┌──────────┐  ┌──────────┐
│License│   │ Clinic   │   │Notifica- │  │Analytics │
│Service│   │ Service  │   │tion Svc  │  │ Service  │
└──┬───┘    └────┬─────┘   └────┬─────┘  └────┬─────┘
   │             │              │              │
   └─────────────┴──────────────┴──────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │      PostgreSQL       │
         │  (shared + per-tenant │
         │   schema isolation)   │
         └───────────────────────┘
```

**Why microservices here:**
- License service can be reused across any product you build
- Clinic service holds all the medical data and can scale independently
- Notification service handles email/WhatsApp without coupling to business logic
- Analytics service can be swapped/extended without touching the core

---

## Microservices Breakdown

### Service 1 — License Service `api.clinvo.in/license`

The heart of subscription control. Completely product-agnostic — reusable for any future product.

**[NOW]**
- Issue API keys tied to a plan and expiry
- Verify key status (`active | paused | expired | cancelled`)
- Return feature flags for the key's plan
- Pause / resume / revoke a key
- Grace period support for offline clients

**[SOON]**
- Webhooks — fire events on `license.expired`, `license.paused`, `license.renewed`
- Trial-to-paid conversion tracking
- Multi-seat licenses (one key, N devices)

**[FUTURE]**
- Usage-based billing hooks (e.g. charge per receipt over a threshold)
- License portals — let doctors self-serve their subscription
- White-label license branding per reseller

---

### Service 2 — Clinic Service `api.clinvo.in/clinic`

All medical/clinic data operations. This is what both the desktop app and the future web app talk to.

**[NOW]**
- Doctors CRUD
- Services CRUD
- Receipts CRUD (create, update, delete, list, search)
- Patient lookup by phone
- Metadata (clinic name, receipt number counters)
- **Multi-user logins per clinic** — receptionist, doctor, admin roles on a single license

**[SOON]**
- Patient records as a first-class entity (separate from receipts)
- Appointment scheduling (basic slots)
- Prescription history per patient
- Financial summary endpoints (revenue by day/week/month/doctor)
- Cloud backup — sync local SQLite data to server

**[FUTURE]**
- Multi-branch support (one doctor, multiple clinic locations)
- Inventory management (medicine stock)
- Lab report attachments (file upload → S3)
- Insurance claim generation
- HL7/FHIR compatibility for hospital integrations

---

### Service 3 — Notification Service `api.clinvo.in/notify`

Decoupled delivery of all outbound communications. Nothing else calls email/WhatsApp directly.

**[NOW]**
- Send license key via email on issuance
- Send expiry reminder emails (7 days, 3 days, 1 day before)

**[SOON]**
- WhatsApp delivery (Twilio/WATI) — key delivery + reminders
- Appointment reminder SMS/WhatsApp to patients
- Renewal prompts to clinic owners

**[FUTURE]**
- In-app notification inbox
- Bulk messaging to all clients (e.g. new feature announcements)
- Patient discharge summaries via WhatsApp

---

### Service 4 — Analytics Service `api.clinvo.in/analytics`

Aggregated, anonymised data you can use to understand how clinics use the product.

**[SOON]**
- Receipts generated per day across all clients
- Feature usage heatmap (which features are used most)
- Churn indicators (clients not seen in 7+ days)

**[FUTURE]**
- Per-clinic dashboards visible to the clinic owner
- Predictive renewal scoring
- Regional usage maps

---

## API Key System

### How It Works

Every client (desktop app install or web app user) gets one or more API keys. Keys are the sole auth mechanism for the clinic-facing APIs.

```
POST /license/v1/keys/issue
→ returns { apiKey: "clnv_live_xxxxxxxxxxxx", plan: "pro", expiresAt: "..." }
```

**Key format:**
```
clnv_live_<32-char-random-hex>    ← production
clnv_test_<32-char-random-hex>    ← sandbox/testing
```

**Key types:**

| Type | Used by | Scope |
|---|---|---|
| `client_key` | Electron app, web app | Clinic data + license check |
| `admin_key` | Admin dashboard | Full access — issue keys, manage plans |
| `readonly_key` | Reporting integrations | Read-only on clinic data |

### Authentication Flow

```
Client  ──►  API Gateway
             └─ reads Authorization: Bearer clnv_live_xxx
             └─ calls License Service to validate key
             └─ attaches { tenantId, plan, features } to request context
             └─ routes to target service
```

Keys are never stored in plaintext — SHA-256 hashed on write, compared on verify (same pattern as bcrypt but faster for API keys).

### Desktop App Integration

```ts
// electron/ipc/handlers/licensing.ts (updated)
const response = await fetch('https://api.clinvo.in/license/v1/verify', {
  headers: { 'Authorization': `Bearer ${storedKey}` }
});
const { valid, status, plan, features, expiresAt } = await response.json();

// Cache for offline grace period (72h)
store.set('license_cache', { valid, status, plan, features, expiresAt, cachedAt: Date.now() });
```

---

## Database Design

### PostgreSQL Schema (License Service)

```sql
-- Tenants (one per clinic)
CREATE TABLE tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,           -- clinic name
  owner_name  TEXT NOT NULL,
  owner_email TEXT UNIQUE NOT NULL,
  owner_phone TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Plans
CREATE TABLE plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,           -- 'basic', 'pro', 'enterprise'
  description TEXT,
  price_inr   INTEGER,                 -- monthly price in paise
  is_active   BOOLEAN DEFAULT true
);

-- Feature flags per plan
CREATE TABLE plan_features (
  plan_id     UUID REFERENCES plans(id),
  feature_key TEXT NOT NULL,           -- 'pdf_export', 'max_doctors', etc.
  value       TEXT NOT NULL,           -- 'true', 'false', or numeric string
  PRIMARY KEY (plan_id, feature_key)
);

-- Licenses
CREATE TABLE licenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id),
  plan_id     UUID REFERENCES plans(id),
  api_key_hash TEXT UNIQUE NOT NULL,   -- SHA-256 of the actual key
  api_key_prefix TEXT NOT NULL,        -- 'clnv_live_abc123' first 16 chars for display
  status      TEXT DEFAULT 'active'    -- active | paused | expired | cancelled
               CHECK (status IN ('active','paused','expired','cancelled')),
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ,
  notes       TEXT
);

-- Per-license feature overrides (override plan defaults for a specific tenant)
CREATE TABLE license_feature_overrides (
  license_id  UUID REFERENCES licenses(id),
  feature_key TEXT NOT NULL,
  value       TEXT NOT NULL,
  PRIMARY KEY (license_id, feature_key)
);

-- Audit log
CREATE TABLE license_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id  UUID REFERENCES licenses(id),
  event_type  TEXT NOT NULL,           -- 'issued', 'verified', 'paused', 'renewed', etc.
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

### PostgreSQL Schema (Clinic Service)

Uses **row-level tenant isolation** — all tables include `tenant_id`. A single database with schema isolation, not a separate DB per tenant (for now).

```sql
CREATE TABLE doctors (
  id             UUID PRIMARY KEY,
  tenant_id      UUID NOT NULL,
  name           TEXT NOT NULL,
  specialization TEXT,
  qualifications TEXT,
  phone          TEXT,
  address        TEXT,
  is_active      BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE services (
  id          UUID PRIMARY KEY,
  tenant_id   UUID NOT NULL,
  name        TEXT NOT NULL,
  amount      NUMERIC(10,2),
  is_active   BOOLEAN DEFAULT true
);

CREATE TABLE patients (                -- [SOON] first-class patient entity
  id          UUID PRIMARY KEY,
  tenant_id   UUID NOT NULL,
  name        TEXT NOT NULL,
  phone       TEXT,
  dob         DATE,
  gender      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE receipts (
  id             UUID PRIMARY KEY,
  tenant_id      UUID NOT NULL,
  receipt_number TEXT NOT NULL,
  date           DATE NOT NULL,
  patient_id     UUID,                 -- nullable until patients table is live
  patient_name   TEXT NOT NULL,
  patient_age    TEXT,
  patient_dob    DATE,
  patient_gender TEXT,
  patient_phone  TEXT,
  doctor_id      UUID REFERENCES doctors(id),
  doctor_name    TEXT,
  diagnosis      TEXT,
  items          JSONB NOT NULL DEFAULT '[]',
  medicines      JSONB NOT NULL DEFAULT '[]',
  total          NUMERIC(10,2),
  payment_method TEXT CHECK (payment_method IN ('CASH','ONLINE','FREE')),
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_receipts_tenant    ON receipts(tenant_id);
CREATE INDEX idx_receipts_date      ON receipts(tenant_id, date);
CREATE INDEX idx_receipts_phone     ON receipts(tenant_id, patient_phone);
CREATE INDEX idx_receipts_doctor    ON receipts(tenant_id, doctor_id);

-- Staff / multi-user logins (one clinic, multiple roles)
CREATE TABLE staff (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL,
  name         TEXT NOT NULL,
  username     TEXT NOT NULL,
  pin_hash     TEXT NOT NULL,           -- SHA-256(pin + salt)
  role         TEXT NOT NULL            -- 'admin' | 'doctor' | 'receptionist'
               CHECK (role IN ('admin', 'doctor', 'receptionist')),
  doctor_id    UUID REFERENCES doctors(id),  -- linked doctor profile, nullable
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, username)
);

CREATE INDEX idx_staff_tenant ON staff(tenant_id);
```

**Role permissions:**

| Permission | Admin | Doctor | Receptionist |
|---|---|---|---|
| Create / edit receipts | ✓ | ✓ | ✓ |
| View all patient history | ✓ | ✓ | ✓ |
| View financial reports | ✓ | ✗ | ✗ |
| Manage doctors & services | ✓ | ✗ | ✗ |
| Manage staff logins | ✓ | ✗ | ✗ |
| Change clinic settings | ✓ | ✗ | ✗ |
| Developer / debug mode | ✓ | ✗ | ✗ |
```

---

## Plans & Feature Flags

### Tiers

| Feature | Basic | Pro | Enterprise |
|---|---|---|---|
| Receipt generation | ✓ | ✓ | ✓ |
| PDF export | ✗ | ✓ | ✓ |
| Max doctors | 2 | 10 | Unlimited |
| Financial reports (CSV) | ✗ | ✓ | ✓ |
| Prescribed medicines | ✗ | ✓ | ✓ |
| Auto cloud backup `[SOON]` | ✗ | ✓ | ✓ |
| Patient history / records `[SOON]` | ✗ | ✓ | ✓ |
| Appointment scheduling `[SOON]` | ✗ | ✗ | ✓ |
| Multi-branch `[FUTURE]` | ✗ | ✗ | ✓ |
| Multi-user logins (receptionist, doctor, admin) | 2 users | 5 users | Unlimited |
| API access for integrations `[FUTURE]` | ✗ | ✗ | ✓ |
| Priority support | ✗ | ✗ | ✓ |
| White-label branding `[FUTURE]` | ✗ | ✗ | ✓ |

### Feature Flag Response Shape

```json
{
  "valid": true,
  "status": "active",
  "plan": "pro",
  "tenantId": "uuid",
  "expiresAt": 1777766400000,
  "features": {
    "pdf_export": true,
    "max_doctors": 10,
    "financial_reports": true,
    "medicines": true,
    "auto_backup": true,
    "cloud_sync": false,
    "appointments": false,
    "multi_branch": false,
    "api_access": false
  }
}
```

---

## Admin Dashboard

A private internal web app at `admin.clinvo.in` — only you log into this.

### Pages

**Clients**
- Table: clinic name, owner, plan, status, expiry, last seen, actions
- Filters: by plan, by status, search by name/phone

**Client Detail**
- Full profile, license history, event log
- Toggle: pause / resume / revoke
- Override individual feature flags for this client
- Extend expiry without reissuing a key

**Issue New License**
- Select tenant (existing) or create new
- Choose plan + expiry date
- Generate key → copy to clipboard or fire email/WhatsApp
- Add internal notes

**Plans**
- Create / edit plans and their feature sets
- Mark a plan as legacy (grandfathered clients keep it, new clients can't select it)

**Analytics** `[SOON]`
- Active clients, churned, trial vs paid
- Revenue MRR/ARR tracker
- Feature adoption rates

### Tech Stack

- React + Vite + shadcn/ui
- Auth: simple username/password with JWT + refresh token (only you use this)
- Hosted at `admin.clinvo.in` (same server, different subdomain)

---

## License & Subscription System

### Key Lifecycle

```
Issue  ──►  Active  ──►  Expiring (≤7 days)  ──►  Expired
               │                                      │
               ▼                                      ▼
             Paused  ◄──────────────────────  Cancelled
```

### Offline Grace Period

The desktop app must work without internet. The grace period ensures clinics with poor connectivity aren't disrupted.

```
Last verified < 72h ago  →  use cached state, allow full access
Last verified 72h–7d ago →  use cached state, show warning banner
Last verified > 7d ago   →  block app, require connectivity to re-verify
```

### Automatic Expiry

A nightly cron job on the server:
1. Finds all licenses where `expires_at < now()` and `status = 'active'`
2. Sets `status = 'expired'`
3. Fires `license.expired` event to Notification Service
4. Notification Service sends email + WhatsApp to owner

---

## Web App (Clinvo Web)

**[SOON]** — A browser-based version of Clinvo for clinics that don't want to install the desktop app.

All data lives in the cloud (Clinic Service) instead of local SQLite. The API key authenticates the session.

**Feature parity target:** 90% of the desktop app
- Receipt creation and printing
- Doctor and service management
- History and search
- Financial reports

**What stays desktop-only:**
- Offline mode (by definition)
- Local SQLite backup
- PDF via `printToPDF` (web uses browser print)

### Shared Backend Advantage

Both the desktop app and the web app talk to the same Clinic Service API. The API key is the only difference in how they authenticate. One backend, two clients.

```
Desktop App  ──►  clnv_live_xxx  ──►  Clinic Service  ──►  PostgreSQL (cloud)
Web App      ──►  clnv_live_xxx  ──►  Clinic Service  ──►  PostgreSQL (cloud)
```

---

## Electron App Changes

### Phase 2 Updates to the Existing App

**`electron/ipc/handlers/licensing.ts`**
- Replace HMAC offline verification with HTTP call to License Service
- Cache response in `electron-store` with `cachedAt` timestamp
- Implement grace period logic

**`src/lib/featureGate.ts`** (new file)
```ts
// Read features from cached license response
export const can = (feature: string): boolean => {
  const cache = store.get('license_cache');
  return cache?.features?.[feature] === true;
};

export const limit = (feature: string): number => {
  const cache = store.get('license_cache');
  return Number(cache?.features?.[feature] ?? 0);
};
```

**`src/components/FeatureGate.tsx`** (new component)
```tsx
// Wrap any gated section
<FeatureGate feature="pdf_export" fallback={<UpgradePrompt />}>
  <PDFButton />
</FeatureGate>
```

**`electron/database/migrations.ts`**
- Replace inline `ALTER TABLE` calls with a versioned migration runner

**Cloud Sync** `[SOON]`
- On save/update, also push to Clinic Service API in the background
- Local SQLite remains source of truth; server is the backup
- Conflict resolution: last-write-wins with timestamp

**Multi-user Logins** `[NOW]`
- New `staff` table in local SQLite — stores username, hashed PIN, and role
- Login screen lets staff select their role and enter their PIN
- Active session stored in memory (not persisted) — each app launch requires login
- Admin account is created during setup wizard; admin can add/remove staff from settings
- UI sections gated by role: financial reports and settings visible to admin only

---

## Immediate App Fixes

These should be done before any backend work — they are independent and unblock quality.

| Issue | Fix |
|---|---|
| `medicines` not saved to DB | Add `medicines` column to `receipts` table; update `saveReceipt` SQL |
| Inline migrations in `database.init()` | Move to versioned migration runner with a `schema_version` table |
| `App.tsx` is a monolith | Extract `SettingsPage`, `AuthGate`, `AppRouter` into separate components |
| No React error boundaries | Add `<ErrorBoundary>` at the root and per major section |
| Receipt number not atomic | Use a SQLite `BEGIN EXCLUSIVE` transaction for number generation |
| Device ID shown on startup | Remove from UI; it's unused since keys are not device-bound |

---

## Security

- API keys hashed with SHA-256 before storage (never stored in plaintext)
- HTTPS enforced everywhere — no HTTP fallback
- Rate limiting on `/license/verify`: 10 req/min per key to prevent abuse
- Admin dashboard behind separate auth — master credentials not stored in any client
- `Content-Security-Policy` already in Electron prod build — keep it
- All DB queries parameterised — already done in the SQLite layer, enforce same in Postgres
- Tenant isolation: every query includes `tenant_id` filter — enforced at service layer, not just ORM

---

## Infrastructure & DevOps

### Hosting

| Service | Platform | Notes |
|---|---|---|
| License Service | Railway / Render | Auto-deploy from GitHub |
| Clinic Service | Railway / Render | Same |
| Notification Service | Railway / Render | Or as a serverless function |
| Admin Dashboard | Vercel / Railway | Static + API routes |
| PostgreSQL | Supabase or Railway Postgres | Managed, daily backups |
| File storage `[SOON]` | Cloudflare R2 or S3 | Lab reports, attachments |

### CI/CD

```yaml
# .github/workflows/build.yml (existing) — extend with:
- name: Deploy License Service
  run: railway up --service license
  
- name: Deploy Clinic Service
  run: railway up --service clinic
```

### Environments

| Environment | Purpose |
|---|---|
| `development` | Local dev with `clnv_test_` keys |
| `staging` | Mirrors prod, used for QA before release |
| `production` | Live — `clnv_live_` keys only |

---

## Full Implementation Plan

### Phase 0 — App Quality Fixes (1 week, do now)
- [ ] Fix `medicines` not saving to SQLite
- [ ] Versioned migration runner
- [ ] Split `App.tsx`
- [ ] Add error boundaries
- [ ] Fix receipt number atomicity
- [ ] Remove device ID from startup UI
- [ ] **Multi-user login system** — staff table in SQLite (admin, doctor, receptionist roles), role-based UI gating, managed by admin user

### Phase 1 — License Service (2 weeks)
- [ ] PostgreSQL schema: `tenants`, `plans`, `plan_features`, `licenses`, `license_events`
- [ ] REST API: `POST /v1/keys/issue`, `GET /v1/keys/verify`, `PATCH /v1/keys/:id/status`
- [ ] Admin API: full CRUD on tenants, licenses, plans
- [ ] Nightly expiry cron job
- [ ] Deploy to Railway with staging + prod environments

### Phase 2 — Electron Phone-Home (1 week)
- [ ] Update `handlers/licensing.ts` to call License Service
- [ ] Implement 72h offline grace period cache
- [ ] `featureGate.ts` utility
- [ ] `<FeatureGate>` React component
- [ ] Gate existing features: PDF, financial reports, doctor limit, medicines

### Phase 3 — Admin Dashboard (2 weeks)
- [ ] React + shadcn/ui project scaffold
- [ ] Auth (username + password + JWT)
- [ ] Clients list page with filters
- [ ] Client detail + feature override UI
- [ ] Issue new license flow
- [ ] Deploy to `admin.clinvo.in`

### Phase 4 — Notification Service (1 week)
- [ ] Email delivery via Resend or AWS SES
- [ ] License key email template
- [ ] Expiry reminder emails (7d, 3d, 1d)
- [ ] WhatsApp via WATI for Indian doctors `[SOON]`

### Phase 5 — Clinic Service API (3 weeks) `[SOON]`
- [ ] PostgreSQL schema: `doctors`, `services`, `receipts`, `patients`
- [ ] Full REST API matching current IPC handlers
- [ ] Tenant isolation enforcement
- [ ] Background sync from Electron (push on save, pull on startup)
- [ ] Patient as first-class entity

### Phase 6 — Clinvo Web (4–6 weeks) `[SOON]`
- [ ] React SPA with same UI components as desktop
- [ ] Auth via API key (entered once, stored in localStorage)
- [ ] Receipt creation, history, doctor/service management
- [ ] Browser print for receipts (replaces `printToPDF`)
- [ ] Deploy to `app.clinvo.in`

### Phase 7 — Analytics & Advanced Features `[FUTURE]`
- [ ] Analytics Service with aggregated usage data
- [ ] Per-clinic dashboards
- [ ] Appointment scheduling
- [ ] Multi-branch support
- [ ] Lab report file uploads
- [ ] Usage-based billing hooks
- [ ] Public API access for Enterprise plan (third-party integrations)
