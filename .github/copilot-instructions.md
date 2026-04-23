# OdishaInfra — Copilot Instructions

OdishaInfra is a **premium real estate discovery platform** for Odisha, India. It consists of three sub-projects in a monorepo-style layout (no shared tooling at root):

| Directory | Purpose | Stack |
|---|---|---|
| `OdishaInfraApp/` | Customer & Developer mobile app | Expo 54, React Native, TypeScript |
| `OdishaInfraBackend/` | REST API server | Express 5, TypeScript, Prisma + PostgreSQL |
| `OdishaInfraWeb/` | Marketing/landing website | Next.js 16, TailwindCSS v4, TypeScript |

Current overall progress: **~50%**. Phase 5 (mobile API integration) and Phase 6 (admin panel) are not yet started. See `tasklist.md` for the full task breakdown.

---

## Commands

### Mobile App (`OdishaInfraApp/`)
```bash
npm start           # Expo dev server
npm run ios         # iOS simulator
npm run android     # Android emulator
```

### Backend (`OdishaInfraBackend/`)
```bash
npm run dev              # nodemon + ts-node (port 5000)
npm run build            # tsc compile to dist/
npm run prisma:generate  # regenerate Prisma client after schema changes
npm run prisma:migrate   # run migrations (requires PostgreSQL)
npm run prisma:seed      # seed the database
```

### Web (`OdishaInfraWeb/`)
```bash
npm run dev    # Next.js dev server (port 3000)
npm run build  # production build
npm run lint   # ESLint
```

---

## Architecture

### Mobile App — Expo Router file-based routing
Routes live in `app/` with three route groups:
- `(auth)/` — login, register (pre-auth flow)
- `(customer)/` — home feed, search, property detail, shorts, wishlist, account
- `(developer)/` — dashboard, projects, add/edit property, shorts upload, leads, analytics

The root `_layout.tsx` wraps everything in `<AuthProvider>`, sets a dark `contentStyle`, and handles navigation animations.

**Auth flow:** JWT stored via `expo-secure-store`. The singleton `api` client in `src/services/api.ts` attaches `Authorization: Bearer <token>` to all requests. On app start, `AuthContext` calls `api.init()` to load the token from secure storage, then hydrates user state from `/auth/me`.

**Media uploads:** Two-step S3 presigned URL flow — call `api.getPresignedUrl()` → upload blob directly to S3 → confirm in DB with `confirmPropertyMedia()` / `confirmShortUpload()`. Never upload through the backend.

### Backend — Express 5 REST API
All routes are prefixed with `/api`:

| Prefix | File | Notes |
|---|---|---|
| `/api/auth` | `auth.routes.ts` | OTP send/verify, register, me |
| `/api/` | `customer.routes.ts` | properties, wishlist, callbacks, shorts, notifications, users |
| `/api/developer` | `developer.routes.ts` | dashboard, projects, leads, analytics, shorts, KYC |
| `/api/admin` | `admin.routes.ts` | leads, KYC review, listings moderation, users, push notifications, settings |
| `/api/subscriptions` | `subscription.routes.ts` | plans, subscribe, status |
| `/api/uploads` | `upload.routes.ts` | presign, confirm media/short/avatar |
| `/api/commissions` | `commission.routes.ts` | developer commission tracking |
| `/api/website` | `website.routes.ts` | public endpoints for the marketing site |

**Auth middleware:** `authenticate` populates `req.user` (typed via `AuthRequest`). Use `requireRole('ADMIN')` / `requireRole('DEVELOPER')` for RBAC. Blocked users receive `403`.

**OTP:** In dev, OTP is mocked/logged to console. Production uses SMS (phone) or Resend email depending on the identifier format.

**Error format:** All errors return `{ error: string }`. Success responses return data directly (no wrapper envelope).

### Web — Next.js App Router (marketing site)
Hosted at `https://odishainfra.com`. Uses the App Router (`src/app/`). Has a contact form API route at `src/app/api/contact/`.

> ⚠️ **From `AGENTS.md`:** This project uses **Next.js 16** — APIs and conventions may differ significantly from your training data. Before writing Next.js code, check `node_modules/next/dist/docs/` for the actual API reference and heed deprecation notices.

---

## Key Conventions

### Shared design system
All three sub-projects use the same visual language. The canonical token source is `OdishaInfraApp/src/constants/theme.ts`:
- **Primary accent:** `#FF8240` (orange)
- **Background:** `#010409` (near-black) — the entire app is **dark-theme only**
- **Cards:** `#0D1117` / `#161B22` / `#1A1F26`
- **Text:** `#E6EDF3` primary, `#8B949E` secondary, `#6E7681` muted

When building UI in the Web or App, match these values.

### User roles
Three roles defined in Prisma: `CUSTOMER`, `DEVELOPER`, `ADMIN`. Navigation structure, visible screens, and API access differ entirely per role. The mobile app routes to `(customer)` or `(developer)` based on `user.role` from `AuthContext`.

### Property & lead state machines
- **PropertyStatus:** `NEW_LAUNCH → PRE_LAUNCH → UNDER_CONSTRUCTION → READY_TO_MOVE → SOLD_OUT`
- **ListingStatus:** `DRAFT → PENDING_REVIEW → ACTIVE` (or `REJECTED / ARCHIVED`)
- **LeadStatus:** `PENDING → IN_REVIEW → VALIDATED → CONNECTED → REJECTED / CLOSED`

Admin approves/rejects listings and validates leads before developers can see customer contact details.

### API base URL (mobile app)
```ts
const API_BASE = __DEV__ ? 'http://localhost:5000/api' : 'https://api.odishainfra.com/api';
```

### Backend environment variables
Required keys (see `OdishaInfraBackend/.env`):
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — token signing secret
- `RESEND_API_KEY` — email delivery
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, `AWS_CLOUDFRONT_URL`, `AWS_REGION` — media storage

### Prisma
After any schema change in `prisma/schema.prisma`, always run `npm run prisma:generate` before running the app. Migrations require a live PostgreSQL instance.

### S3 media buckets
Media keys follow these type prefixes: `property-images/`, `property-videos/`, `shorts/`, `thumbnails/`, `kyc-docs/`, `avatars/`. CDN base: `https://media.odishainfra.com`.
