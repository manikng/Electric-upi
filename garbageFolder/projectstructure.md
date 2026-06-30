**Project Structure**

- **Root Files:**  
  - apikeystext.txt  
  - drizzle.config.ts  
  - eslint.config.mjs  
  - LandingPageClient.tsx  
  - Mistakestillnow.md  
  - MY-THINKING-FLOW.md  
  - next-env.d.ts  
  - next.config.ts  
  - package.json  
  - postcss.config.mjs  
  - proxy.ts  
  - README.md  
  - temp.txt  
  - todo.md  
  - tsconfig.json

- **app/**  
  - globals.css  
  - LandingPageClient.tsx  
  - layout.tsx  
  - page.tsx  
  - **actions/**  
    - geocode.ts  
  - **api/**  
    - **bookings/**  
      - route.ts  
      - **[id]/**  
        - route.ts  
        - **accept/**  
          - route.ts  
        - **regenerate-code/**  
          - route.ts  
        - **verify-code/**  
          - route.ts  
        - **status/**  
          - route.ts  
        - **start/**  
          - route.ts  
        - **end/**  
          - route.ts  
        - **generate-code/**  
          - route.ts  
    - **driver/**  
      - route.ts  
    - **host/**  
      - route.ts  
    - **chargers/**  
      - route.ts  
    - **upload/**  
      - route.ts  
  - **auth/**  
    - **confirm/**  
      - route.ts  
  - **booking/**  
    - **[id]/**  
      - page.tsx  
  - **driver/**  
    - **bookings/**  
      - page.tsx  
  - **host/**  
    - **bookings/**  
      - page.tsx  
  - **list-charger/**  
    - ListChargerClient.tsx  
    - page.tsx  
  - **login/**  
    - login-theme.module.css  
    - LoginClient.tsx  
    - page.tsx  
    - **update-password/**  
      - page.tsx  
  - **booking/** (driver facing pages are under app/booking as shown above)

- **lib/**  
  - db.ts  
  - schema.ts  
  - **supabase/**  
    - browser-client.ts  
    - server-client.ts

- **scratch/**  
  - run-drizzle.js  
  - seed.js

- **supabase-backend-info/**  
  - allinone-implementatin.md  
  - electric_upi_Implementation_todo.md  
  - electric_upi_requirements.md  
  - Learning.md  
  - manikng-Electric-upi-chat-export-2026-06-14T07-35-02-696Z.md  
  - repomix-output-manikng-Electric-upi.md  
  - RLS-storage.md  
  - uml_architecture.md

- **UML-DIAGRAM/** (directory present; contents not expanded)

- **tests/**  
  - bookings.spec.ts (Vitest test skeleton)

- **supabase/**  
  - 2026-06-15_add_bookings_handshake.sql  
  - MIGRATION_INSTRUCTIONS.md  
  - rls_bookings.sql (if present)

- Misc generated/Dev files (build / .next, logs) — not listed here.

If you want, I can:
- Produce a full recursive tree output (every file) in a single downloadable file, or  
- Print the contents of any specific file (provide the path).



# Booking Lifecycle Audit — Electric UPI

> **Status:** Phase 1 (Audit) + Phase 2 (Implementation Checklist). No code generated yet.  
> **Awaiting:** User approval before Phase 3 (code generation).

---

## Executive Summary

The codebase has **one primary verification system that was mid-migration**: it started as an OTP/secretCode flow, then gained nonce/handshake fields without completing the migration. The result is a **Frankenstein schema** where:

- The **API routes use the legacy `secretCode`/`codeExpiresAt`/`codeUsed` fields** throughout
- The **schema comment says `awaiting_driver_arrival`** but the host dashboard checks **`awaiting_handshake`** (a status that is never set anywhere in the backend)
- The `nonce`/`nonceUsed`/`hostConfirmed`/`driverConfirmed` fields exist in the schema but are **never written or read by any route**
- The host dashboard references **`handleStartCharging` and `handleEndCharging`** functions that are **not defined** in the file — runtime crash guaranteed

---

## Phase 1 — Audit Report

### 1. Schema Audit (`lib/schema.ts`)

#### Current State

```
bookings table fields:
  LEGACY  → secretCode, codeExpiresAt, codeUsed
  NEW     → nonce, nonceExpiresAt, nonceUsed, hostConfirmed, driverConfirmed,
             nonceGeneratedAt, nonceGeneratedBy      ← mixed naming: "nonce" but stored secretCode
```

#### Problems

| Field | Status | Used by Routes? | Used by Frontend? |
|---|---|---|---|
| `secretCode` | LEGACY | ✅ All verification routes | ✅ `booking/[id]/page.tsx` |
| `codeExpiresAt` | LEGACY | ✅ `verify-code`, `status`, `GET /[id]` | ✅ `booking/[id]/page.tsx` |
| `codeUsed` | LEGACY | ✅ `verify-code`, `status`, `GET /[id]` | ❌ Not displayed |
| `nonce` | NEW | ❌ Never written by any route | ❌ Never rendered |
| `nonceExpiresAt` | NEW | ❌ Never written | ❌ Never rendered |
| `nonceUsed` | NEW | ❌ Never written | ❌ Never rendered |
| `hostConfirmed` | NEW | ❌ Never written | ❌ Never rendered |
| `driverConfirmed` | NEW | ❌ Never written | ❌ Never rendered |
| `nonceGeneratedAt` | MIXED | ✅ Used as cooldown timer (for secretCode!) | ❌ |
| `nonceGeneratedBy` | MIXED | ✅ Written alongside secretCode | ❌ |

#### Root Cause

`generate-code/route.ts` and `regenerate-code/route.ts` both:
1. Generate a value they store in `secretCode` (legacy field)
2. Track rate-limiting using `nonceGeneratedAt` (new-system field)
3. Never write to `nonce`, `nonceUsed`, `hostConfirmed`, or `driverConfirmed`

This means the system is **physically the OTP/secretCode flow** with **naming pollution from the abandoned handshake system**.

#### Recommendation: Keep the secretCode/OTP flow. Remove dead nonce fields.

**Reason:** The entire end-to-end flow (generate → display → host enters → verify → verified) works correctly with `secretCode`. The handshake fields (`nonce`, `nonceUsed`, `hostConfirmed`, `driverConfirmed`) are completely inert. Keeping them adds confusion and wastes schema space.

---

### 2. Route Audit

#### `POST /api/bookings` — Booking Creation
- **Responsibility:** Driver creates a booking request.
- **Status:** ✅ Correct. Validates charger active, prevents self-booking, prevents duplicate active bookings.
- **Issues:**
  - Line 41: Allows `charger.status === "pending"` for bookings — this is a demo hack that should be documented or removed.
  - `ne(bookings.status, "completed")` — also means a driver with a `rejected` (if it existed) booking can't rebook. Low risk now but fragile.

#### `POST /api/bookings/[id]/accept` — Host Accepts
- **Responsibility:** Host transitions `pending_host_accept` → `awaiting_driver_arrival`.
- **Status:** ✅ Mostly correct. Uses double-check (optimistic lock via `and` condition).
- **Issues:**
  - Comment says "Do NOT generate any code here" (line 58) — this was written during the OTP-flow design but code never moved out correctly. There's no comment explaining WHY the code is generated separately.
  - `awaiting_driver_arrival` is the correct target status — this matches the rest of the backend.

#### `POST /api/bookings/[id]/generate-code` — Driver Generates OTP
- **Responsibility:** Driver generates a 6-digit OTP after arrival.
- **Status:** ⚠️ Functional but naming is semantically broken.
- **Issues:**
  - Route is called `generate-code`, function stores in `secretCode` — consistent.
  - Uses `nonceGeneratedAt` for cooldown tracking on a secretCode flow — confusing mixed naming.
  - The cooldown check uses `nonceGeneratedAt` but does NOT update `nonceGeneratedAt` consistently with `codeUsed` reset logic.
  - Returns `secretCode` directly in the response — this is correct (driver's device gets it to display).

#### `POST /api/bookings/[id]/regenerate-code` — Driver Regenerates OTP
- **Responsibility:** Driver requests a fresh OTP.
- **Status:** 🔴 **DUPLICATE of `generate-code`** — identical logic, different URL.
- **Issues:**
  - 100% logic overlap with `generate-code`. Same auth check, same status check, same rate limit check, same crypto call, same DB write.
  - The only difference: different error messages ("generate" vs "regenerate").
  - **Should be deleted**. `generate-code` already handles both first-generation and regeneration correctly (it overwrites the old code each time).

#### `POST /api/bookings/[id]/verify-code` — Host Verifies OTP
- **Responsibility:** Host enters the driver's 6-digit OTP to confirm arrival.
- **Status:** ✅ Mostly correct.
- **Issues:**
  - Variable name `cleanNonce` (line 34) — this is a secretCode, not a nonce. Misleading.
  - Missing: after setting `status: "verified"`, it does **NOT set `nonceGeneratedAt` to null** — so the cooldown window remains after verification, which is harmless but untidy.
  - Does NOT transition to `awaiting_handshake` — this is correct for the OTP flow.

#### `POST /api/bookings/[id]/start` — Start Charging
- **Responsibility:** Either party starts the charging session after verification.
- **Status:** ✅ Correct.
- **Issues:**
  - Both driver and host can call this. For MVP this is fine, but semantically the host controls physical access, so ideally only the host starts. Not a bug.

#### `POST /api/bookings/[id]/end` — End Charging
- **Responsibility:** Either party ends the charging session.
- **Status:** ⚠️ Functional but has a HARDCODED energy value.
- **Issues:**
  - Line 62: `const energyKwhSafe = "10.500"; // Mock 10.5 kWh consumption` — **this is hardcoded mock data in production code**. Every session will say 10.5 kWh regardless of actual charging duration. This needs to at least be calculated from `startedAt` + charger's `powerKw`.

#### `GET /api/bookings/[id]` — Get Booking Details
- **Responsibility:** Full booking detail for driver or host.
- **Status:** ⚠️ Works but has issues.
- **Issues:**
  - Returns both `secretCode` fields AND `nonce` fields. For the driver, it exposes `secretCode` (correct) but also `nonce: null`, `nonceUsed: null`. Dead fields in the response.
  - Does a second DB query to get host details (lines 76-85) — this is a N+1 pattern. Should be a single join.
  - Comment on line 92-93 says "only the driver can view the raw secret OTP" but then the response (line 127) also returns `nonce: isDriver ? bookingDetails.nonce : null` — `nonce` is always null, so this is dead code returning null.

#### `GET /api/bookings/[id]/status` — Polling Status
- **Responsibility:** Lightweight status check for frontend polling.
- **Status:** ⚠️ Partially redundant.
- **Issues:**
  - Returns `secretCode`, `codeExpiresAt`, `codeUsed` — this is a superset of what a pure "status" endpoint should return.
  - The booking detail page (`/booking/[id]`) calls the full `GET /api/bookings/[id]` on every refresh anyway. This endpoint adds another fetch path to maintain. 
  - For MVP: **can be eliminated** — just use the main `GET /api/bookings/[id]` route.

#### `GET /api/bookings/driver` — Driver's Booking List
- **Responsibility:** List all driver bookings.
- **Status:** ✅ Clean and correct.
- **Issues:**
  - Missing `orderBy DESC` — bookings appear oldest-first (line 39 uses default ascending order). Newest bookings should appear first.

#### `GET /api/bookings/host` — Host's Booking List
- **Responsibility:** List all bookings for host's chargers.
- **Status:** ✅ Clean and correct.
- **Issues:**
  - Same ordering issue — oldest first.
  - Missing `pending_host_accept` bookings filter for priority display — all statuses are mixed together.

---

### 3. State Machine Audit

#### Current Conflicting Statuses

| Status | Written by backend? | Read by backend? | Read by frontend? |
|---|---|---|---|
| `pending_host_accept` | ✅ `POST /bookings` | ✅ `accept` route | ✅ All pages |
| `awaiting_driver_arrival` | ✅ `accept` route | ✅ `generate-code`, `regenerate-code`, `verify-code` | ✅ All pages |
| `awaiting_handshake` | ❌ **NEVER** | ❌ **NEVER** | ✅ **Host page checks this** — dead branch |
| `verified` | ✅ `verify-code` | ✅ `start` route | ✅ All pages |
| `charging` | ✅ `start` route | ✅ `end` route | ✅ All pages |
| `completed` | ✅ `end` route | ✅ `POST /bookings` (ne check) | ✅ All pages |

#### The Bug

In `app/host/bookings/page.tsx` line 353:
```tsx
{(booking.status === "awaiting_handshake" || booking.status === "awaiting_driver_arrival") && (
```

This renders the OTP input for BOTH `awaiting_handshake` (ghost status, never set) AND `awaiting_driver_arrival` (real status). This means the OTP input DOES appear for `awaiting_driver_arrival`, so it works by accident. But `awaiting_handshake` is dead code.

#### Definitive Recommended State Machine

```
pending_host_accept
    ↓  [Host: POST /accept]
awaiting_driver_arrival
    ↓  [Driver: POST /generate-code → OTP displayed]
    ↓  [Host: POST /verify-code, enters OTP]
verified
    ↓  [Either: POST /start]
charging
    ↓  [Either: POST /end]
completed
```

**Remove `awaiting_handshake` entirely.** It was never implemented.

#### Allowed Transitions

| From | To | Actor | Route |
|---|---|---|---|
| `pending_host_accept` | `awaiting_driver_arrival` | Host | `POST /accept` |
| `awaiting_driver_arrival` | `awaiting_driver_arrival` | Driver | `POST /generate-code` (no status change, just sets OTP) |
| `awaiting_driver_arrival` | `verified` | Host | `POST /verify-code` |
| `verified` | `charging` | Either | `POST /start` |
| `charging` | `completed` | Either | `POST /end` |

#### Invalid Transitions (must be rejected)

- `pending_host_accept` → `verified` (skip acceptance)
- `awaiting_driver_arrival` → `charging` (skip verification)
- `verified` → `completed` (skip charging)
- Any backward transition (e.g., `charging` → `verified`)
- `completed` → anything

---

### 4. Frontend Audit

#### `app/driver/bookings/page.tsx` — Driver Booking List

| Issue | Line | Severity |
|---|---|---|
| Cost calculation uses `energy = booking.energyKwh ?? 10.5` — shows fake ₹ cost for non-completed bookings | 259 | 🔴 High |
| Badge function doesn't handle `awaiting_handshake` — would fall through to gray (acceptable since status is never set) | 102-126 | Low |
| No ordering guarantee (oldest first) | - | 🟡 Medium |
| `useEffect` dependency array is empty `[]` but calls `fetchDriverBookings` — safe but ESLint will flag | 176 | Low |

#### `app/host/bookings/page.tsx` — Host Dashboard

| Issue | Line | Severity |
|---|---|---|
| **`handleStartCharging` is called (line 393) but NEVER DEFINED in this file** | 393 | 🔴 **CRASH** |
| **`handleEndCharging` is called (line 414) but NEVER DEFINED in this file** | 414 | 🔴 **CRASH** |
| Checks `booking.status === "awaiting_handshake"` — ghost status, dead code | 353 | 🟡 Medium |
| OTP input is shown for `awaiting_driver_arrival` — this WORKS correctly | 354 | ✅ OK |
| `successMsg` state is defined but its success messages for verify/accept are wiped on next list refresh | 178 | Low |
| Missing `handleStartCharging` means host can never start charging from dashboard | - | 🔴 High |

#### `app/booking/[id]/page.tsx` — Booking Detail (Driver-focused)

| Issue | Line | Severity |
|---|---|---|
| Uses `booking.secretCode` and `booking.codeExpiresAt` — consistent with API, ✅ correct | 330, 339 | ✅ |
| Status `awaiting_driver_arrival` — shows OTP box correctly | 324 | ✅ |
| Both "I'm Arrived" and "Generate New Code" call `handleGenerateCode` — correct, endpoint handles both | 347, 361 | ✅ |
| Payment is simulated with a UPI PIN form that just sets `paymentSuccess = true` | 242-249 | ⚠️ MVP OK |
| Page does NOT poll — user must manually refresh to see host verification | - | 🟡 Medium |
| No host role check — host viewing `/booking/[id]` would see the driver OTP flow | - | 🟡 Medium |

---

### 5. API Response Audit

#### `GET /api/bookings/[id]` Response Shape (current)

```json
{
  "booking": {
    "id": "...",
    "status": "awaiting_driver_arrival",
    "secretCode": "123456",      ← driver only, correct
    "codeExpiresAt": "...",      ← always returned (even to host)
    "codeUsed": false,           ← always returned (leaking internal state)
    "createdAt": "...",
    "startedAt": null,
    "endedAt": null,
    "energyKwh": null,
    "cost": null,
    "charger": { ... },
    "driver": { "id": "...", "name": "...", "email": null },   ← host gets driver email
    "host": { "id": "...", "name": "...", "email": null },     ← driver gets host email
    "nonce": null,               ← ALWAYS null, dead field
    "nonceExpiresAt": null,      ← ALWAYS null, dead field
    "nonceUsed": null,           ← ALWAYS null, dead field
  }
}
```

**Problems:**
1. `nonce`, `nonceExpiresAt`, `nonceUsed` are always null — dead fields in response
2. `codeUsed` is leaked to host — host doesn't need to know this
3. `codeExpiresAt` is returned to both parties — host doesn't need raw expiry (can derive from message)
4. Second DB query for host info is unnecessary — can be done with a second join on `users` aliased as `host`

#### Recommended Normalized Response Shape

```json
{
  "booking": {
    "id": "...",
    "status": "awaiting_driver_arrival",
    "createdAt": "...",
    "startedAt": null,
    "endedAt": null,
    "energyKwh": null,
    "cost": null,
    "verification": {
      "code": "123456",           ← driver only (null for host)
      "expiresAt": "...",         ← driver only (null for host)
      "isUsed": false             ← driver only (null for host)
    },
    "charger": {
      "id": "...",
      "title": "...",
      "address": "...",
      "city": "...",
      "pricePerKwh": 12.5,
      "chargerType": "AC Charger",
      "plugType": "Type 2"
    },
    "driver": {
      "id": "...",
      "name": "EV Driver",
      "email": null               ← host sees this, driver sees null
    },
    "host": {
      "id": "...",
      "name": "Verified Host",
      "email": null               ← driver sees this, host sees null
    }
  }
}
```

---

### 6. Database Consistency Audit

| Flow | Route | DB Write | Consistent with State Machine? |
|---|---|---|---|
| Booking creation | `POST /bookings` | `status = "pending_host_accept"` | ✅ |
| Host accepts | `POST /accept` | `status = "awaiting_driver_arrival"` | ✅ |
| Driver generates OTP | `POST /generate-code` | `secretCode`, `codeExpiresAt`, `codeUsed=false`, `nonceGeneratedAt`, `nonceGeneratedBy` | ✅ (mixed naming, but functional) |
| Host verifies OTP | `POST /verify-code` | `status = "verified"`, `codeUsed = true` | ✅ |
| Start charging | `POST /start` | `status = "charging"`, `startedAt = now()` | ✅ |
| End charging | `POST /end` | `status = "completed"`, `endedAt = now()`, `energyKwh = "10.500"` (hardcoded!) | ⚠️ Hardcoded energy |

**Critical Gap:** The `end` route hardcodes energy at 10.5 kWh. A real calculation would be:
```
duration_hours = (endedAt - startedAt) / 3_600_000
energyKwh = duration_hours * charger.powerKw
```
Even an approximate MVP calculation beats a hardcoded value.

---

### 7. Simplification Pass

#### Files that CAN be deleted

| File | Reason |
|---|---|
| `app/api/bookings/[id]/regenerate-code/route.ts` | 100% duplicate of `generate-code`. The generate-code route already handles both first generation and regeneration. |
| `app/api/bookings/[id]/status/route.ts` | Redundant with `GET /api/bookings/[id]`. Frontend uses the full route anyway. A lightweight polling endpoint is only needed if you add SSE or WebSockets — not for this MVP. |

#### Schema fields that CAN be removed

| Field | Safe to remove? |
|---|---|
| `nonce` | ✅ Never written or read |
| `nonceExpiresAt` | ✅ Never written or read |
| `nonceUsed` | ✅ Never written or read |
| `hostConfirmed` | ✅ Never written or read |
| `driverConfirmed` | ✅ Never written or read |

> [!WARNING]
> Removing DB columns requires a Drizzle migration. This must be done carefully — run `npx drizzle-kit push` after schema change. Existing rows will have the columns dropped. Since these fields are always null, data loss is zero.

#### Repeated auth pattern (repeated across 8 route files):
```ts
const supabase = await createSupabaseServerClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: "Unauthorized..." }, { status: 401 });
```
For MVP, leave this inline. Do NOT abstract into a wrapper function — it adds indirection without enough benefit at this scale.

#### Repeated booking-fetch with charger join (in 5 routes):
This select pattern repeats in `accept`, `verify-code`, `start`, `end`, `status`. Each has a slightly different shape. For MVP, keep them inline — they each select only the fields they need. Don't prematurely DRY this.

---

## Phase 2 — Implementation Checklist

Ordered from **safest** (zero runtime risk) → **riskiest** (state machine + DB migration).

> [!IMPORTANT]
> Get approval before starting. Steps are ordered so each step can be reviewed independently.

### Step 1 — Fix Host Dashboard Crash (Safest, No Backend Change)
**File:** `app/host/bookings/page.tsx`  
**Risk:** Zero — pure frontend bug fix  
- [ ] Add `handleStartCharging(bookingId)` function (calls `POST /api/bookings/[id]/start`)  
- [ ] Add `handleEndCharging(bookingId)` function (calls `POST /api/bookings/[id]/end`)  
- [ ] Remove `awaiting_handshake` from status condition (line 353) — keep only `awaiting_driver_arrival`  

### Step 2 — Fix Driver Booking List Cost Display (Safe, Frontend Only)
**File:** `app/driver/bookings/page.tsx`  
**Risk:** Zero — display-only fix  
- [ ] Show cost only when `booking.status === "completed"` and `booking.energyKwh` is not null  
- [ ] For non-completed bookings, show nothing or "In Progress" instead of fake ₹ cost  

### Step 3 — Fix Ordering in List APIs (Safe, Backend Only)
**Files:** `app/api/bookings/driver/route.ts`, `app/api/bookings/host/route.ts`  
**Risk:** Very low — just add `desc()` to `orderBy`  
- [ ] Add `import { desc } from "drizzle-orm"` to both files  
- [ ] Change `orderBy(bookings.createdAt)` → `orderBy(desc(bookings.createdAt))` in both  

### Step 4 — Rename Internal Variable in verify-code (Safe, Semantic Only)
**File:** `app/api/bookings/[id]/verify-code/route.ts`  
**Risk:** Zero — rename only  
- [ ] Rename `cleanNonce` → `cleanCode` (line 34) for clarity  

### Step 5 — Normalize GET /api/bookings/[id] Response (Medium Risk)
**File:** `app/api/bookings/[id]/route.ts`  
**Risk:** Medium — frontend must be updated to match  
- [ ] Add second `innerJoin` on `users` aliased as host to remove N+1 extra query (lines 76-85)  
- [ ] Remove `nonce`, `nonceExpiresAt`, `nonceUsed` from SELECT and response  
- [ ] Move `secretCode`/`codeExpiresAt`/`codeUsed` into nested `verification` object  
- [ ] Update `app/booking/[id]/page.tsx` to use `booking.verification.code` instead of `booking.secretCode`  
- [ ] Update `app/booking/[id]/page.tsx` to use `booking.verification.expiresAt` instead of `booking.codeExpiresAt`  

### Step 6 — Delete `regenerate-code` Route (Low Risk)
**File:** `app/api/bookings/[id]/regenerate-code/route.ts`  
**Risk:** Low — only if frontend doesn't reference it  
- [ ] Grep all frontend files for `regenerate-code` — confirm no frontend calls it  
- [ ] Delete `app/api/bookings/[id]/regenerate-code/route.ts`  
- [ ] Delete the directory `app/api/bookings/[id]/regenerate-code/`  

### Step 7 — Delete `status` Route (Low Risk)
**File:** `app/api/bookings/[id]/status/route.ts`  
**Risk:** Low — only if no frontend polls it  
- [ ] Grep all frontend files for `/status` — confirm it's not used  
- [ ] Delete `app/api/bookings/[id]/status/route.ts` and directory  

### Step 8 — Fix Hardcoded Energy in End Route (Medium Risk)
**File:** `app/api/bookings/[id]/end/route.ts`  
**Risk:** Medium — changes cost calculation  
- [ ] Fetch `startedAt` and `powerKw` from the booking/charger join  
- [ ] Calculate `energyKwh = ((now - startedAt) / 3_600_000) * powerKw`  
- [ ] Use calculated value instead of hardcoded `"10.500"`  
- [ ] Handle `powerKw` being null (default to 7.2 kW — typical Level 2 charger)  

### Step 9 — Clean Schema (Riskiest — Requires DB Migration)
**File:** `lib/schema.ts`  
**Risk:** High — irreversible column drop, requires migration  
- [ ] Remove `nonce`, `nonceExpiresAt`, `nonceUsed`, `hostConfirmed`, `driverConfirmed` fields from schema  
- [ ] Rename `nonceGeneratedAt` → `codeGeneratedAt` for semantic correctness  
- [ ] Rename `nonceGeneratedBy` → `codeGeneratedBy` for semantic correctness  
- [ ] Update `generate-code/route.ts` to use `codeGeneratedAt` / `codeGeneratedBy`  
- [ ] Update `regenerate-code/route.ts` similarly (or skip if deleted in Step 6)  
- [ ] Run `npx drizzle-kit push` to apply migration  
- [ ] Verify all routes still work with renamed columns  
- [ ] Update schema comment on line 46 to reflect final state machine  

### Step 10 — Add Auto-polling to Booking Detail Page (Enhancement, After All Fixes)
**File:** `app/booking/[id]/page.tsx`  
**Risk:** Low — additive only  
- [ ] Add `useEffect` with `setInterval` to poll `GET /api/bookings/[id]` every 5 seconds when status is `pending_host_accept` or `awaiting_driver_arrival`  
- [ ] Clear interval on unmount and when status reaches `verified` or beyond  

---

## Files Summary

| File | Action Required | Priority |
|---|---|---|
| `lib/schema.ts` | Remove 5 dead nonce fields, rename nonceGeneratedAt/By | Step 9 (last) |
| `app/api/bookings/route.ts` | No change needed | — |
| `app/api/bookings/[id]/route.ts` | Fix N+1 join, remove nonce from response | Step 5 |
| `app/api/bookings/[id]/accept/route.ts` | No change needed | — |
| `app/api/bookings/[id]/generate-code/route.ts` | Rename nonceGeneratedAt → codeGeneratedAt | Step 9 |
| `app/api/bookings/[id]/regenerate-code/route.ts` | **DELETE** | Step 6 |
| `app/api/bookings/[id]/verify-code/route.ts` | Rename `cleanNonce` → `cleanCode` | Step 4 |
| `app/api/bookings/[id]/start/route.ts` | No change needed | — |
| `app/api/bookings/[id]/end/route.ts` | Replace hardcoded energy with calculation | Step 8 |
| `app/api/bookings/[id]/status/route.ts` | **DELETE** | Step 7 |
| `app/api/bookings/driver/route.ts` | Add `desc()` ordering | Step 3 |
| `app/api/bookings/host/route.ts` | Add `desc()` ordering | Step 3 |
| `app/driver/bookings/page.tsx` | Fix cost display for non-completed bookings | Step 2 |
| `app/host/bookings/page.tsx` | **Add missing functions** + remove ghost status | Step 1 |
| `app/booking/[id]/page.tsx` | Update field paths after Step 5, add polling | Steps 5+10 |

---

## Which System is Most Standard?

**Recommendation: Keep the secretCode/OTP flow. This is the standard approach for P2P location-based verification.**

**Why:**
- The "mutual handshake" (nonce) system where both parties independently confirm is used in high-security corporate systems (Stripe Connect, bank KYC). It is overkill for an EV charging MVP.
- The OTP flow (driver shows code → host enters it) is how Zomato, Swiggy, and similar gig platforms verify delivery arrivals. Users understand it.
- It requires only one DB call to verify, not two (one per party confirmation).
- The `secretCode` approach has zero dead fields — everything written is read.

**The handshake system would only be worth implementing if:**
1. You distrust either party to honestly initiate the session
2. You need an audit trail with per-party timestamps
3. You are building for regulated industries

**For this MVP: one system, one truth, one verification step.**







