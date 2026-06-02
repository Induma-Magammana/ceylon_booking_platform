# CeylonBooking Platform — Architecture & Implementation Guide

> **Author**: I.N. Magammana (225126D)  
> **Module**: IS 3920 — Individual Project on Business Solutions  
> **University of Moratuwa**

---

## Table of Contents

1. [Introduction & Problem Statement](#1-introduction--problem-statement)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Technology Stack & Why We Chose Each Piece](#3-technology-stack--why-we-chose-each-piece)
4. [Backend Design](#4-backend-design)
5. [Frontend Design](#5-frontend-design)
6. [Database Design](#6-database-design)
7. [Authentication & Security](#7-authentication--security)
8. [Key Domain Logic](#8-key-domain-logic)
9. [Deployment & DevOps](#9-deployment--devops)
10. [Quality Assurance & Testing](#10-quality-assurance--testing)

---

## 1. Introduction & Problem Statement

Sri Lanka's tourism industry suffers from three pain points:

| Problem | Impact |
|---------|--------|
| **Manual scheduling** | Hosts manage bookings via WhatsApp and paper notebooks — double-bookings are common |
| **Pricing friction** | No standard way to offer subsidized rates for locals vs. international tourist prices |
| **Fragmentation** | No centralized platform for verified, safe local experiences |

CeylonBooking is a web-based tourism management system built to solve all three. It gives **hosts** (SMEs) a dashboard to list experiences and accommodations, and gives **tourists** a marketplace to discover and book them — with automated scheduling, dual-currency pricing, and conflict detection baked in.

---

## 2. High-Level Architecture

The system follows a clean **three-tier architecture**: a React frontend talks to a Hono REST API, which in turn talks to a Supabase (PostgreSQL) database. Each tier has a single, well-defined responsibility.

```
┌──────────────────────────────────────────────────────────────────┐
│                     Frontend (React 19)                          │
│             Mantine UI · Zustand · TanStack Query                │
│                   Served at localhost:5173                        │
└───────────────────────────┬──────────────────────────────────────┘
                            │  /api/* proxied via Vite dev server
┌───────────────────────────▼──────────────────────────────────────┐
│                      Backend API (Hono)                           │
│            Listings · Bookings · Auth · Scheduling               │
│                   Served at localhost:3000                        │
└───────────────────────────┬──────────────────────────────────────┘
                            │  Supabase JS client (PostgreSQL wire)
┌───────────────────────────▼──────────────────────────────────────┐
│                   Database (Supabase)                             │
│      PostgreSQL · Row Level Security · Auth (GoTrue)             │
│                    localhost:54321                                │
└──────────────────────────────────────────────────────────────────┘
```

**Why three tiers?**  
Separation of concerns. The frontend team can iterate on the UI without touching business logic. The backend handles validation and scheduling rules independently. The database enforces its own security (RLS) as a final safety net. Each layer can be scaled, tested, and deployed independently.

---

## 3. Technology Stack & Why We Chose Each Piece

### 3.1 Backend — Hono on Node.js

| Choice | Reasoning |
|--------|-----------|
| **Hono** | Ultra-lightweight framework (< 14 KB), built for edge computing but works perfectly on Node.js. Familiar Express-like API but with built-in TypeScript support and modern middleware patterns. |
| **`@hono/node-server`** | Lets us run Hono locally via a standard Node.js HTTP server for development, while keeping the option to deploy to Cloudflare Workers or any edge runtime later. |
| **`tsx`** | Runs TypeScript directly without a build step during development, enabling fast iteration with `tsx watch`. |

### 3.2 Frontend — React 19 + Mantine

| Choice | Reasoning |
|--------|-----------|
| **React 19** | Industry-standard component library. The latest version offers improved performance and server component foundations for when we need them. |
| **Mantine 8** | Full design system with pre-built, accessible components (forms, date pickers, notifications). Saves weeks vs. building from scratch. |
| **Zustand** | Minimal state management (< 1 KB) with no boilerplate. Perfect for our simple `authStore` — we don't need the complexity of Redux. |
| **TanStack Query** | Handles API data fetching, caching, and re-fetching automatically. Eliminates hand-written loading/error state management. |
| **React Router 7** | Client-side routing with nested layouts. Our `Layout` component wraps all pages with a consistent header/footer. |
| **Vite 7** | Lightning-fast dev server with Hot Module Replacement. Also handles our API proxy so the frontend at `:5173` can call `/api/*` endpoints on `:3000` seamlessly. |

### 3.3 Database — Supabase (PostgreSQL)

| Choice | Reasoning |
|--------|-----------|
| **Supabase** | Open-source Firebase alternative. Gives us PostgreSQL, auth (GoTrue), real-time subscriptions, and a management dashboard — all in one package. |
| **Local via Docker** | `npx supabase start` spins up a full Supabase stack locally. No cloud dependency during development. |
| **Row Level Security** | Security policies are defined at the database level, not just in application code. Even if someone bypasses the API, the database itself enforces who can read/write what. |

### 3.4 Validation — Zod

| Choice | Reasoning |
|--------|-----------|
| **Zod** | Schema-first validation with automatic TypeScript type inference. Define a schema once, get both runtime validation AND compile-time types from it. No duplication. |

### 3.5 Testing Toolchain

| Tool | Layer | Reasoning |
|------|-------|-----------|
| **Vitest** | Unit & Integration | Vite-native test runner, extremely fast, compatible with the same config and path aliases our project uses. |
| **Playwright** | End-to-End | Cross-browser testing with auto-waiting, trace recording, and screenshot-on-failure. The gold standard for modern E2E testing. |

---

## 4. Backend Design

### 4.1 Folder Structure

```
src/
├── api/
│   ├── index.ts          # Main Hono app: all route definitions + server startup
│   └── auth.ts           # Auth-specific routes (signup, login)
├── domain/
│   ├── User.ts           # User Zod schema + type
│   ├── Listing.ts        # Listing Zod schema + type
│   └── Booking.ts        # Booking Zod schema + currency/status enums
├── services/
│   ├── SchedulingService.ts  # Availability, conflict detection, booking creation
│   └── PricingService.ts     # Dual pricing calculator
├── middleware/
│   └── auth.ts           # JWT verification middleware
└── utils/
    └── supabase.ts       # Supabase client factory + Database type definitions
```

**Design principle**: Each folder has a single responsibility:
- **`domain/`** — Pure data definitions. No I/O, no side effects. Just Zod schemas and TypeScript types.
- **`services/`** — Business logic. The scheduling engine and pricing calculator live here.
- **`api/`** — HTTP layer only. Parses requests, calls services, returns responses.
- **`middleware/`** — Cross-cutting concerns (auth) that apply to multiple routes.
- **`utils/`** — Shared infrastructure (database client).

### 4.2 API Endpoints

| Method | Path | Auth Required | Purpose |
|--------|------|:---:|---------|
| `GET` | `/health` | ✗ | Health check |
| `POST` | `/api/auth/signup` | ✗ | Register new user |
| `POST` | `/api/auth/login` | ✗ | Authenticate user |
| `POST` | `/api/listings` | ✓ | Create a listing |
| `GET` | `/api/listings` | ✗ | List all listings (filterable) |
| `GET` | `/api/listings/:id` | ✗ | Get a specific listing |
| `POST` | `/api/bookings/check-availability` | ✗ | Check slot availability |
| `POST` | `/api/bookings` | ✓ | Create a booking |
| `GET` | `/api/bookings/:id` | ✓ | Get a specific booking |
| `GET` | `/api/tourists/:touristId/bookings` | ✓ | Get tourist's bookings |
| `GET` | `/api/listings/:listingId/bookings` | ✓ | Get all bookings for a listing |

### 4.3 Request Flow (Example: Creating a Booking)

```
Tourist clicks "Book Now"
       │
       ▼
Frontend calls POST /api/bookings with JWT
       │
       ▼
Auth Middleware validates JWT via Supabase → extracts user ID
       │
       ▼
API handler looks up the listing from DB
       │
       ▼
PricingService.calculatePrice() → determines LKR or USD based on user's country
       │
       ▼
SchedulingService.createBooking()
  ├── checkAvailability() → queries existing bookings, calculates remaining capacity
  ├── If insufficient capacity → return 409 Conflict
  └── If available → INSERT booking row → return 201 Created
```

---

## 5. Frontend Design

### 5.1 Folder Structure

```
frontend/src/
├── App.tsx               # Route definitions
├── main.tsx              # React entry point (providers: Router, QueryClient, Mantine)
├── components/
│   ├── layout/
│   │   ├── Layout.tsx    # Shared page wrapper (header + footer + Outlet)
│   │   └── Header.tsx    # Navigation bar with auth-aware links
│   └── ui/
│       ├── Card.tsx      # Reusable listing card
│       ├── Spinner.tsx   # Loading indicator
│       └── index.ts      # Barrel exports
├── pages/
│   ├── Home.tsx          # Listing search + grid
│   ├── ListingDetail.tsx # Full listing view + booking form
│   ├── Login.tsx         # Login form
│   ├── Signup.tsx        # Registration form (tourist/host selection)
│   ├── MyBookings.tsx    # Tourist's booking history
│   └── dashboard/
│       ├── Dashboard.tsx     # Host's management panel
│       └── CreateListing.tsx # Form to create a new listing
├── services/
│   └── api.ts            # All API calls (auth, listings, bookings)
├── store/
│   └── authStore.ts      # Zustand auth state (user, token, isAuthenticated)
└── types/
    └── index.ts          # Shared TypeScript interfaces
```

### 5.2 Key Architectural Decisions

**1. API proxy via Vite config**  
Instead of hardcoding `http://localhost:3000` everywhere, the frontend calls `/api/*` and Vite's dev server proxies these requests to the backend. This mirrors how a production reverse proxy (Nginx/Cloudflare) would work, so there's zero code change needed at deploy time.

```typescript
// vite.config.ts
server: {
    proxy: {
        '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
}
```

**2. Snake_case → camelCase mapping**  
PostgreSQL returns `snake_case` column names (e.g., `local_price`). Our frontend uses `camelCase` (e.g., `localPrice`). Rather than adding a middleware layer, we handle this mapping in a single `mapListing()` function inside `api.ts`. This is the simplest approach — one place to change, easy to test.

**3. Auth state persistence with Zustand**  
The `authStore` uses Zustand's `persist` middleware to save the user session to `localStorage`. This means the user stays logged in after a page refresh without re-authenticating — a standard UX expectation.

**4. Route protection**  
Protected pages (like `/my-bookings` and `/dashboard`) check for authentication in the component itself. If the user isn't logged in, they're redirected to `/login` or `/`. This is a simple, readable pattern suitable for our scale.

---

## 6. Database Design

### 6.1 Entity-Relationship Model

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    users     │       │   listings   │       │   bookings   │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │◄──────│ host_id (FK) │       │ id (PK)      │
│ email        │       │ id (PK)      │◄──────│ listing_id   │
│ user_type    │       │ title        │       │ tourist_id   │──►users.id
│ full_name    │       │ description  │       │ booking_date │
│ country      │       │ inventory_type│      │ time_slot    │
│ created_at   │       │ location     │       │ quantity     │
└──────────────┘       │ local_price  │       │ total_price  │
                       │ foreign_price│       │ currency     │
                       │ capacity     │       │ status       │
                       │ created_at   │       │ created_at   │
                       └──────────────┘       └──────────────┘
```

### 6.2 Migrations Strategy

We use **numbered, sequential SQL migration files** managed by the Supabase CLI:

| Migration | Purpose |
|-----------|---------|
| `001_create_users_table.sql` | Users table + email and user_type indexes |
| `002_create_listings_table.sql` | Listings table + host_id, location, inventory_type indexes |
| `003_create_bookings_table.sql` | Bookings table + composite unique constraint + availability index |
| `004_add_country_to_users.sql` | Added `country` column for dual pricing |
| `005_enable_rls.sql` | Row Level Security policies for all tables |

**Why numbered files instead of an ORM?**  
Plain SQL migrations are transparent — any developer can read them and understand exactly what's in the database. They're also framework-agnostic. If we ever move away from Supabase, these SQL files still work.

### 6.3 Key Database Constraints

1. **Double-booking prevention** — A `UNIQUE(listing_id, booking_date, time_slot)` constraint on the bookings table makes it physically impossible to insert duplicate bookings at the database level.

2. **Positive-value checks** — `CHECK (local_price > 0)`, `CHECK (capacity > 0)`, `CHECK (quantity > 0)` prevent invalid data from ever entering the system.

3. **Cascading deletes** — If a user is deleted, their listings and bookings cascade-delete automatically. This prevents orphaned records.

4. **Partial index for availability** — `idx_bookings_availability` only includes non-cancelled bookings, making availability checks fast.

### 6.4 Row Level Security (RLS) Policies

RLS is the second line of defence after our API middleware. Even if someone calls the database directly, these policies apply:

| Table | Policy | Rule |
|-------|--------|------|
| **users** | Public read | Everyone can view profiles |
| **users** | Self-update | Only `auth.uid() = id` can update |
| **listings** | Public read | Everyone can browse listings |
| **listings** | Host insert/update | Only `auth.uid() = host_id` |
| **bookings** | Tourist read | Only `auth.uid() = tourist_id` can see own bookings |
| **bookings** | Host read | Hosts can see bookings for their own listings (via subquery) |
| **bookings** | Tourist insert | Only `auth.uid() = tourist_id` can create |

---

## 7. Authentication & Security

### 7.1 Auth Flow

```
User submits credentials
       │
       ▼
POST /api/auth/login (or /signup)
       │
       ▼
Backend calls supabase.auth.signInWithPassword()
       │
       ▼
Supabase returns JWT (access_token + refresh_token)
       │
       ▼
Frontend stores token in Zustand store (persisted to localStorage)
       │
       ▼
Subsequent API calls include: Authorization: Bearer <token>
       │
       ▼
Auth middleware verifies token via supabase.auth.getUser(token)
       │
       ▼
User ID extracted and attached to request context
```

### 7.2 Security Layers

| Layer | Mechanism |
|-------|-----------|
| **Input validation** | Zod schemas reject malformed requests before they hit business logic |
| **Auth middleware** | JWT verification on every protected endpoint |
| **Row Level Security** | Database-level access control, independent of application code |
| **Password handling** | Passwords never touch our code — Supabase Auth handles hashing (bcrypt) and storage |
| **CORS** | Controlled by Hono/Vite proxy configuration |

### 7.3 Why Two Supabase Clients?

The backend uses two different Supabase client instances:

1. **`getSupabaseClient()`** — Anonymous client using the `anon` key. Used for public operations like listing all listings.
2. **`getAuthenticatedClient(token)`** — Client initialized with the user's JWT. Used for operations that need to pass through RLS policies (creating bookings, accessing personal data).

This distinction is critical. If we used the anon client for everything, RLS policies would block access to user-specific data. If we used a service-role key everywhere, we'd bypass all security.

---

## 8. Key Domain Logic

### 8.1 Dual Pricing System

The `PricingService` determines which price a tourist pays based on their country of origin:

```
Is user.country == 'LK'?
├── YES → Use listing.localPrice (LKR)
└── NO  → Use listing.foreignPrice (USD)
```

This is a straightforward but important feature for Sri Lanka's tourism model, where locals are offered subsidized rates at many attractions.

### 8.2 Scheduling Engine

The `SchedulingService` handles two inventory models:

| Model | Example | How it works |
|-------|---------|-------------|
| **Slot-based** | Boat tours, activities | Bookings are tied to a specific `booking_date` + `time_slot` combination |
| **Date-based** | Homestays, hotels | Bookings are tied to a `booking_date` only (`time_slot` is `NULL`) |

**Conflict detection** works by:
1. Querying all non-cancelled bookings for the same listing + date + time_slot
2. Summing up the `quantity` values of existing bookings
3. Comparing against the listing's `capacity`
4. If `remaining_capacity >= requested_quantity`, the booking is allowed

This prevents overbooking while still allowing multiple tourists to book the same slot (up to capacity).

---

## 9. Deployment & DevOps

### 9.1 Local Development Setup

The development environment consists of three processes:

| Process | Command | Port | Purpose |
|---------|---------|------|---------|
| Supabase | `npx supabase start` | 54321 | Local PostgreSQL + Auth |
| Backend | `npm run dev` (via `tsx watch`) | 3000 | API server with hot reload |
| Frontend | `cd frontend && npm run dev` (Vite) | 5173 | React dev server with HMR |

The Vite proxy bridges the frontend and backend, making it feel like a single application in the browser.

### 9.2 Environment Configuration

```bash
# .env (not committed to Git)
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=eyJ...            # From `npx supabase status`
PORT=3000
```

We use `dotenv` to load these on the backend. The frontend relies on Vite's proxy, so it doesn't need backend URLs directly.

### 9.3 Production Deployment Strategy

The architecture is designed for flexible deployment:

| Component | Deployment Target | Reasoning |
|-----------|------------------|-----------|
| **Frontend** | Vercel / Cloudflare Pages | Static files served from a CDN, instant global availability |
| **Backend** | Cloudflare Workers / Railway | Hono is edge-ready, so it can run on Workers with zero code changes. Railway is a simpler option with Docker support. |
| **Database** | Supabase Cloud | Managed PostgreSQL with automatic backups, auth, and real-time features |

**Why this split?** Each component is deployed to the service that best fits its workload:
- Static files → CDN (cheapest, fastest)
- API logic → Edge/serverless (scales to zero, no idle costs)
- Database → Managed service (handles backups, replication, security patching)

### 9.4 Build Process

```bash
# Backend
npm run build          # tsc compiles to dist/

# Frontend
cd frontend
npm run build          # tsc + vite build → dist/
```

---

## 10. Quality Assurance & Testing

### 10.1 Testing Philosophy

We follow a **testing pyramid** approach:

```
         ╱  E2E Tests  ╲        ← 7 Playwright spec files
        ╱  (Playwright)  ╲       Simulate real browser interactions
       ╱─────────────────────╲
      ╱  Integration Tests    ╲  ← 5 Vitest files
     ╱  (Vitest + Supabase)    ╲  Verify API endpoints end-to-end
    ╱───────────────────────────╲
   ╱      Unit Tests             ╲ ← 5 Vitest files
  ╱   (Vitest, fast, isolated)    ╲ Validate domain models & services
 ╱─────────────────────────────────╲
```

**Why a pyramid?** Unit tests are fast and cheap — we run many of them. Integration tests verify that components work together. E2E tests are expensive but catch real-world issues that lower layers miss. The pyramid shape ensures we have the right balance.

### 10.2 Unit Tests (Vitest)

**Location**: `tests/unit/`

| File | What it tests |
|------|---------------|
| `User.test.ts` | Zod validation: valid/invalid emails, user types, required fields |
| `Listing.test.ts` | Schema validation: positive prices, valid inventory types, capacity checks |
| `Booking.test.ts` | Schema validation: currency enums, status transitions, date handling |
| `SchedulingService.test.ts` | Availability calculations, conflict detection, capacity arithmetic |
| `PricingService.test.ts` | Local vs. foreign pricing, correct currency assignment |

**Example test pattern:**
```typescript
describe('PricingService', () => {
    it('should return LKR price for local users', () => {
        const result = pricingService.calculatePrice(listing, localUser, 2);
        expect(result.currency).toBe('LKR');
        expect(result.totalPrice).toBe(listing.localPrice * 2);
    });
});
```

**Running unit tests:**
```bash
npm run test:unit         # Run once
npm test                  # Watch mode (re-runs on file changes)
npm run test:coverage     # With V8 coverage report
```

### 10.3 Integration Tests (Vitest)

**Location**: `tests/integration/`

| File | What it tests |
|------|---------------|
| `api.test.ts` | Health check, error handling, response format consistency |
| `auth.test.ts` | Signup flow, login flow, token validation, invalid credentials |
| `listings.test.ts` | CRUD operations, filtering by location and inventory type |
| `bookings.test.ts` | Booking creation, availability checking, conflict responses |
| `security.test.ts` | Missing auth headers, invalid tokens, RLS enforcement |

Integration tests hit the actual API and database, verifying the full request→response cycle.

**Configuration** (`vitest.config.ts`):
- Path aliases (`@/` → `src/`, `@tests/` → `tests/`) match production TypeScript config
- V8 coverage provider generates text, JSON, and HTML reports
- Node environment (not jsdom) — we're testing a server, not a browser

### 10.4 End-to-End Tests (Playwright)

**Location**: `frontend/tests/e2e/`

This is where we test the application from a real user's perspective — opening a browser, clicking buttons, filling forms, and verifying what's on screen.

#### Why Playwright?

| Feature | Benefit |
|---------|---------|
| **Auto-waiting** | Playwright automatically waits for elements to be visible/clickable before interacting. Eliminates flaky `sleep()` calls. |
| **Trace recording** | On test failure, Playwright records a trace (DOM snapshots + network requests) that you can replay step-by-step. |
| **Screenshot on failure** | Automatically captures what the browser looked like when a test failed. |
| **HTML reports** | One command (`npx playwright show-report`) opens a detailed report with pass/fail status for every test. |
| **Multi-browser** | Can test on Chromium, Firefox, and WebKit. We currently target Chromium. |

#### Playwright Configuration

```typescript
// playwright.config.ts
export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,                    // Tests run in parallel
    retries: process.env.CI ? 2 : 0,       // Retry twice in CI to handle flakiness
    reporter: 'html',                       // Generate browsable HTML report
    use: {
        baseURL: 'http://localhost:5173',
        trace: 'on-first-retry',            // Record trace only when retrying
        screenshot: 'only-on-failure',      // Screenshot when a test fails
    },
    webServer: {
        command: 'npm run dev',             // Auto-starts the dev server
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
    },
});
```

**Key design choice**: The `webServer` block means Playwright automatically starts the frontend dev server before running tests, and kills it after. In CI, it starts fresh; locally, it reuses a running server if you already have one open.

#### E2E Test Coverage

| Spec File | What It Covers | Key Assertions |
|-----------|---------------|----------------|
| `home.spec.ts` | Homepage renders correctly | Hero section visible, search input present, navigation links work |
| `auth.spec.ts` | Login & signup forms | Form fields present, validation messages, links between login/signup |
| `navigation.spec.ts` | Page-to-page navigation | Route changes, logo link, auth redirects |
| `dashboard.spec.ts` | Host dashboard access | Non-authenticated redirect, host-only access control |
| `listing.spec.ts` | Listing detail page | Full listing data display, booking form elements |
| `booking.spec.ts` | Booking flow | Availability check, booking creation, confirmation |
| `api.spec.ts` | Direct API calls from browser | API response format, error handling |

#### Example E2E Test

```typescript
test('should display the homepage with hero section', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for hero title
    await expect(page.getByText('Discover the Beauty of')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Sri Lanka')).toBeVisible();

    // Check for navigation
    await expect(page.locator('header')).toBeVisible();
});
```

**Note the `timeout: 10000`**: We use explicit timeouts for the first assertion on each page because the initial load can be slow (especially when the API is cold-starting). Subsequent assertions on the same page don't need this because the page is already loaded.

#### Responsive Design Testing

Playwright's `page.setViewportSize()` lets us test different screen sizes without needing a physical device:

```typescript
test('should display properly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto('/');
    await expect(page.getByText('Sri Lanka')).toBeVisible();
});
```

We test both **mobile (375px)** and **tablet (768px)** viewports to ensure the layout adapts correctly.

#### Running E2E Tests

```bash
cd frontend

# Headless (fast, for CI)
npm run test:e2e

# Headed (see the browser, for debugging)
npm run test:e2e:headed

# Interactive UI mode (step through tests visually)
npm run test:e2e:ui
```

### 10.5 Manual Testing Checklist

While automated tests cover the critical paths, we also perform manual QA for UX-sensitive flows:

| Area | What to verify manually |
|------|------------------------|
| **Signup flow** | Form validation feedback, user type dropdown UX, success redirect |
| **Login/Logout** | Session persistence across page refresh, header updates after login |
| **Listing creation** | Form field validation, price input formatting, success notification |
| **Booking flow** | Date picker behavior, availability feedback, booking confirmation screen |
| **Responsive layout** | Mobile hamburger menu, card grid reflow, touch targets |
| **Error states** | Network failure handling, 404 pages, expired session handling |

### 10.6 Test Commands Summary

| Command | Scope | Location |
|---------|-------|----------|
| `npm test` | All unit + integration (watch) | Root |
| `npm run test:unit` | Unit tests only | Root |
| `npm run test:integration` | Integration tests only | Root |
| `npm run test:coverage` | All tests + coverage report | Root |
| `cd frontend && npm run test:e2e` | E2E tests (headless) | Frontend |
| `cd frontend && npm run test:e2e:headed` | E2E tests (visible browser) | Frontend |
| `cd frontend && npm run test:e2e:ui` | E2E tests (interactive UI) | Frontend |

---

## Appendix: File-by-File Reference

For quick navigation, here's every non-generated file in the project:

<details>
<summary>Click to expand full file listing</summary>

### Backend (`src/`)
| File | Lines | Purpose |
|------|-------|---------|
| `api/index.ts` | 303 | Main API router, all endpoint definitions |
| `api/auth.ts` | 118 | Auth endpoints (signup, login) |
| `domain/User.ts` | 28 | User Zod schema + type |
| `domain/Listing.ts` | 32 | Listing Zod schema + type |
| `domain/Booking.ts` | 57 | Booking Zod schema + enums |
| `services/SchedulingService.ts` | 165 | Availability + conflict detection |
| `services/PricingService.ts` | 33 | Dual pricing calculator |
| `middleware/auth.ts` | 42 | JWT verification middleware |
| `utils/supabase.ts` | 133 | Supabase client + DB types |

### Frontend (`frontend/src/`)
| File | Purpose |
|------|---------|
| `App.tsx` | Route definitions |
| `main.tsx` | Entry point + providers |
| `services/api.ts` | API client functions |
| `store/authStore.ts` | Zustand auth state |
| `pages/Home.tsx` | Listing search + discovery |
| `pages/ListingDetail.tsx` | Full listing view + booking |
| `pages/Login.tsx` | Login form |
| `pages/Signup.tsx` | Registration form |
| `pages/MyBookings.tsx` | Tourist booking history |
| `pages/dashboard/Dashboard.tsx` | Host management panel |
| `pages/dashboard/CreateListing.tsx` | Listing creation form |

### Database (`supabase/migrations/`)
| File | Purpose |
|------|---------|
| `001_create_users_table.sql` | Users table + indexes |
| `002_create_listings_table.sql` | Listings table + indexes |
| `003_create_bookings_table.sql` | Bookings table + constraints |
| `004_add_country_to_users.sql` | Country column for pricing |
| `005_enable_rls.sql` | Row Level Security policies |

### Tests
| File | Layer |
|------|-------|
| `tests/unit/User.test.ts` | Unit |
| `tests/unit/Listing.test.ts` | Unit |
| `tests/unit/Booking.test.ts` | Unit |
| `tests/unit/SchedulingService.test.ts` | Unit |
| `tests/unit/PricingService.test.ts` | Unit |
| `tests/integration/api.test.ts` | Integration |
| `tests/integration/auth.test.ts` | Integration |
| `tests/integration/listings.test.ts` | Integration |
| `tests/integration/bookings.test.ts` | Integration |
| `tests/integration/security.test.ts` | Integration |
| `frontend/tests/e2e/home.spec.ts` | E2E |
| `frontend/tests/e2e/auth.spec.ts` | E2E |
| `frontend/tests/e2e/navigation.spec.ts` | E2E |
| `frontend/tests/e2e/dashboard.spec.ts` | E2E |
| `frontend/tests/e2e/listing.spec.ts` | E2E |
| `frontend/tests/e2e/booking.spec.ts` | E2E |
| `frontend/tests/e2e/api.spec.ts` | E2E |

</details>
