explore the booking flow across the three areas you mentioned.

flowchart LR
    A[Driver selects P2P charger on map] --> B[Clicks Book Slot]
    B --> C{Authenticated?}
    C -->|No| D[Redirect to /login]
    C -->|Yes| E["POST /api/bookings {chargerId}"]
    E -->|201| F["Redirect to /booking/{bookingId}"]
    F --> G[pending_host_accept + 10-min countdown]
    E -->|400 active session| H["Show: 'You have an active session. Go to it?'"]
    H --> I[Redirect to existing booking]
    G --> J[Host accepts on /host/bookings]
    J --> K[awaiting_driver_arrival → OTP flow → start → end → pay]

### Implementation Steps

**Phase 1: Wire the Map Booking Button** (EVMapClient.tsx)

1. **Add auth awareness** — Import `getSupabaseBrowserClient`, add `useEffect` to get current user on mount, store in state. If no user → button shows "Sign in to Book".

2. **Create `handleBookCharger(chargerId)` handler** — Async function: `POST /api/bookings` with `{ chargerId }`. On `201` → `router.push(/booking/${data.bookingId})`. On `400` with existing `bookingId` → offer redirect to active session. On other errors → inline toast.

3. **Wire the button `onClick`** — Replace dead `<button>` with `onClick={() => handleBookCharger(selectedCharger.id)}`. Add loading state (disable during call). Add error message area.

4. **Edge case: non-P2P / public CPO sites** — Already guarded by `{"pricePerKwh" in selectedCharger}` check. Public sites without price go to "Navigate" instead.

5. **Edge case: driver's own charger** — `ChargerResult` type doesn't expose `hostId`, so we can't pre-filter client-side. **Rely on API error response** ("You cannot book your own charger") → show inline. Acceptable for MVP.

**Phase 2: Minor Polish**

6. **Add "Back to Map" link** on page.tsx — Currently only has "← Home". Add `← Back to Map` for users arriving from the map.

7. **Clean up dead code** in page.tsx lines 10-17 — `useUnifiedSearch` call outside component is broken; remove it.

---

### Relevant Files

| File | Action |
|---|---|
| EVMapClient.tsx | **Primary** — add auth, handler, wire onClick (~line 654) |
| page.tsx | Clean dead `useUnifiedSearch` code on lines 10-17 |
| page.tsx | Add "Back to Map" nav link (minor) |
| route.ts | No changes — already complete |
| page.tsx | No changes — already complete |
| types.ts | Reference only — `ChargerResult.id` is the `chargerId` |
| useAuth.ts | Reference pattern — how auth is handled in this repo |

### Verification

1. Unauthenticated → click "Book Slot" → redirected to `/login`
2. Authenticated driver → click "Book Slot" on P2P charger → POST succeeds → lands on `/booking/{id}` with countdown
3. Host sees new booking on `/host/bookings` → can accept
4. Driver with active session → gets error + redirect to existing booking
5. Host clicking on own charger → API 400 error shown inline
6. Public CPO site (no `pricePerKwh`) → "Book Slot" hidden, only "Launch Maps" shows

### Decisions

- **Booking creation is client-side** in EVMapClient — consistent with how booking detail page uses browser Supabase client
- **No new pages needed** — only wiring existing button to existing API + existing detail page
- **Scope limited** to the booking button wiring only; NOT redesigning booking detail or host pages
- **Own-charger guard**: Rely on API error (no `hostId` in `ChargerResult` type)

### Further Considerations

1. `ChargerResult` doesn't expose `hostId` — can't pre-filter "own charger" client-side. Could add `hostId` to the search API response later for client-side UX improvement.
2. `handleRegenerateCode` bug in page.tsx — button label says "Regenerate Code" but always calls `handleGenerateCode` instead. Out of scope but worth fixing.
3. The page.tsx has dead `useUnifiedSearch` code outside the component (lines 10-17) — should be cleaned.