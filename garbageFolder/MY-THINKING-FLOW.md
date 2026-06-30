learnings:
1. डेटा फ़ेच और कैशे करने का कोड (Page - src/app/restaurants/page.tsx)यह आपका वो मुख्य पेज है जो Vercel पर डिप्लॉय होने के बाद खुद-ब-खुद कैशे (ISR) हो जाएगा।
// जादू की लाइन: Vercel इस पेज के डेटा को हर 24 घंटे में सिर्फ एक बार लोड करेगा!
export const revalidate = 86400; 
ye kisi bhi client page pe likh doge to nexjs ke acc ye ISR bn jayega aur vercel backend ko khud hi handle kr lega .
--------------



we should move in this flow bottom up approach 
1.frontend + auth 
2.List charger componet : make list charger ui and integrate it with supabase then unit testing ,create random listing with proper data , then check wheter tables relations and users are created or not. here in this phase list form ---drizzle orm --- supabase db.
3.Build one card component using above list charger form details this became trivial since we have all the data ready to build the card component.
4.Listing cards components: fetches some 10 to 20 data from db and add load more data button at the bottom. Now test card visuals and load more button.
5.Search and Filter component: build filter component that allows filtering based on the data available in the card components. this includes filtering based on the data available in the card components.Now i have langitude and longitude and other details hence i should implement the Search functionality with this.
7.Now drive , booking , acceptence ,payment ,verification confirmation
8.For Mvp we can just bypass payment option with some test coupon code.

-------------------
Best MVP RLS model for a P2P EV charging network (Host + Guest)
For an MVP like yours (“find a charger” / “become a host” + booking + accept + verification), you’ll typically have two main data domains:

Charger Listings (owned by a host/user)
Bookings (belong to a booking request between a guest user and a host user)
The “best” RLS for MVP is:

Users can only CRUD data they own (listings)
Users can only read/update bookings they’re part of
Payment/verification tables are progressively readable (host + guest) and only writable by the actor who performs the step
---------------------------------------------
<!-- critical checkup -->
Note: in our system driver id is same as user id .
5) One more critical thing to check (so RLS doesn’t break)
Your users table is NOT auth.users
Supabase Auth user id is auth.users.id. Your policies assume your public.users.id matches that.

So verify in your onboarding flow that:

when a user signs up, you insert/update public.users.id = auth.uid()
(Usually via a trigger on auth.users or an Edge Function.)

If you don’t do that mapping, RLS will block inserts/reads unexpectedly.



-------------------------
<!-- Supabase RLS -->
# Electric UPI MVP - Supabase RLS Policies

Great — your current Drizzle schema is enough to write the MVP RLS.

You already have ownership columns:

- `chargers.host_id` → owner = host user
- `bookings.driver_id` → owner/participant = driver user
- `bookings.charger_id` → links booking to a charger (and thus to a host)

---

## MVP Security Goals

- Anyone signed in can read charger listings (`chargers`) for discovery/search.
- Only the host can modify their chargers.
- Only the driver (booking participant) can see their booking and update driver-side fields.
- Only the host (participant via the charger's host) can see and update host-side fields.
- Everyone can read booking rows only if they are a participant (driver or host).

### Assumption

Your app uses Supabase Auth and `auth.uid()` corresponds to your `public.users.id` because both `chargers` and `bookings` reference `users.id`.

---

# 1. Enable RLS + Grants (Do This First)

For each exposed table:

```sql
ALTER TABLE public.chargers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Make sure authenticated users can attempt CRUD
-- RLS will decide which rows are actually allowed

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.chargers
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.bookings
TO authenticated;
```

Since you also have a custom `public.users` table:

```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Usually no additional grants needed for MVP.
```

---

# 2. RLS Policies for Chargers (Listings)

## A) Read Chargers (Search / Listings Page)

```sql
CREATE POLICY chargers_select_authenticated
ON public.chargers
FOR SELECT
TO authenticated
USING (true);
```

---

## B) Insert Charger (Host Creates Their Own Listing)

```sql
CREATE POLICY chargers_insert_own
ON public.chargers
FOR INSERT
TO authenticated
WITH CHECK (
  host_id = (SELECT auth.uid())
);
```

---

## C) Update Charger (Only the Host)

```sql
CREATE POLICY chargers_update_own
ON public.chargers
FOR UPDATE
TO authenticated
USING (
  host_id = (SELECT auth.uid())
)
WITH CHECK (
  host_id = (SELECT auth.uid())
);
```

---

## D) Delete Charger (Only the Host)

```sql
CREATE POLICY chargers_delete_own
ON public.chargers
FOR DELETE
TO authenticated
USING (
  host_id = (SELECT auth.uid())
);
```

### Result

✅ Hosts can only create/update/delete their own charger rows.

✅ Any authenticated user can browse charger listings.

---

# 3. RLS Policies for Bookings (Driver + Host Participants)

A booking participant can be:

- The booking driver (`driver_id`)
- The charger host (`chargers.host_id`)

---

## A) SELECT Bookings (Driver OR Host)

```sql
CREATE POLICY bookings_select_participants
ON public.bookings
FOR SELECT
TO authenticated
USING (
  driver_id = (SELECT auth.uid())
  OR
  EXISTS (
    SELECT 1
    FROM public.chargers c
    WHERE c.id = bookings.charger_id
      AND c.host_id = (SELECT auth.uid())
  )
);
```

---

## B) INSERT Booking (Driver Creates It)

```sql
CREATE POLICY bookings_insert_driver_only
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (
  driver_id = (SELECT auth.uid())
);
```

### MVP Note

This prevents users from creating bookings on behalf of another driver.

Users can still create bookings against any valid charger, which is typically desired behavior in the marketplace.

---

## C) UPDATE Booking (Participants Only)

```sql
CREATE POLICY bookings_update_participants
ON public.bookings
FOR UPDATE
TO authenticated
USING (
  driver_id = (SELECT auth.uid())
  OR
  EXISTS (
    SELECT 1
    FROM public.chargers c
    WHERE c.id = bookings.charger_id
      AND c.host_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  driver_id = (SELECT auth.uid())
  OR
  EXISTS (
    SELECT 1
    FROM public.chargers c
    WHERE c.id = bookings.charger_id
      AND c.host_id = (SELECT auth.uid())
  )
);
```

---

## Recommended Next Step

Currently, any participant can update booking fields.

For a stronger MVP, add **step-based restrictive policies** (`AS RESTRICTIVE`) so that:

- Driver can only perform driver-side transitions.
- Host can only perform host-side transitions.
- Status changes follow the allowed workflow.

Example:

```text
pending
  ↓
accepted
  ↓
arrived
  ↓
verified
  ↓
charging
  ↓
completed
```

Each transition should only be executable by the correct actor.

---

# 4. Coding Steps in Your Drizzle + Supabase Codebase

## Step 1 — Always Use Authenticated User ID

Treat the authenticated Supabase user as the source of truth.

```ts
const {
  data: { user },
} = await supabase.auth.getUser();
```

Then:

```ts
charger.hostId = user.id;
booking.driverId = user.id;
```

Never trust values coming from the frontend.

---

## Step 2 — Frontend Mapping Rules

### Creating a Charger

Do NOT allow the client to choose `host_id`.

Always:

```ts
host_id = session.user.id;
```

---

### Creating a Booking

Always:

```ts
driver_id = session.user.id;
charger_id = selectedCharger.id;
```

Never accept `driver_id` from form input.

---

## Step 3 — Optional User Profile Protection

If you query `public.users` directly (profile page, settings page, etc.), add:

```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_self
ON public.users
FOR SELECT
TO authenticated
USING (
  id = (SELECT auth.uid())
);
```

If you never expose `public.users`, you can skip this for MVP.

---

# 5. Critical Check Before Testing

Your table is:

```text
public.users
```

But Supabase Auth stores users in:

```text
auth.users
```

The policies above assume:

```text
public.users.id = auth.users.id
```

---

## Verify Your Onboarding Flow

When a user signs up:

```text
auth.users.id
        ↓
public.users.id
```

must be synchronized.

Common approaches:

- Database trigger on `auth.users`
- Edge Function
- Signup callback

---

## Example Mapping

```text
auth.users
└── id = abc123

public.users
└── id = abc123
```

If these IDs differ, RLS will fail unexpectedly.

---

# Questions Needed Before Writing Restrictive Status Policies

For booking status transitions, what are the exact actions?

### Driver Actions

Examples:

- arrived?
- code_entered?
- charging_completed?
- rating_submitted?

### Host Actions

Examples:

- accepted?
- rejected?
- verification_confirmed?
- charging_started?
- charging_completed?

### Data Model Question

Are payment and verification stored:

1. Inside the `bookings` table?

or

2. In separate tables?

Once the exact transitions are defined, restrictive (`AS RESTRICTIVE`) policies can be written so every step is locked to the correct actor.

# Current RLS Policy Behavior

## What Your Policies Currently Allow

### `public.chargers`

#### SELECT (Authenticated Users)

```sql
USING (true)
```

✅ Any authenticated user can read all charger listings.

---

#### INSERT

```sql
host_id = auth.uid()
```

✅ Users can only create charger rows where they are the host.

---

#### UPDATE

```sql
host_id = auth.uid()
```

✅ Users can only update chargers they own.

---

#### DELETE

```sql
host_id = auth.uid()
```

✅ Users can only delete chargers they own.

---

### `public.bookings`

#### INSERT

```sql
driver_id = auth.uid()
```

✅ Users can only create bookings for themselves.

---

#### SELECT

```text
driver_id = auth.uid()
OR
host owns the charger linked to the booking
```

✅ Drivers can view their own bookings.

✅ Hosts can view bookings made against chargers they host.

---

#### UPDATE

```text
driver_id = auth.uid()
OR
host owns the charger linked to the booking
```

✅ Drivers can update their own bookings.

✅ Hosts can update bookings associated with chargers they host.

---

# What You Should Do in Your Project Code

Your application logic must align with these RLS rules.

---

## 1. Creating a Charger

Always set:

```ts
hostId = session.user.id;
```

Do not allow users to choose `hostId` from the frontend.

Example:

```ts
await db.insert(chargers).values({
  hostId: session.user.id,
  title,
  address,
  pricePerHour,
});
```

---

## 2. Creating a Booking

Always set:

```ts
driverId = session.user.id;
```

Do not accept `driverId` from form data.

Example:

```ts
await db.insert(bookings).values({
  driverId: session.user.id,
  chargerId,
  bookingDate,
});
```

---

## 3. Updating a Charger

Only the charger owner (host) should be able to trigger update actions.

Example:

```ts
await db
  .update(chargers)
  .set({...})
  .where(eq(chargers.id, chargerId));
```

RLS will automatically reject the update if the logged-in user is not the host.

---

## 4. Deleting a Charger

Only the host should attempt deletion.

Example:

```ts
await db
  .delete(chargers)
  .where(eq(chargers.id, chargerId));
```

RLS will block non-owners.

---

## 5. Updating a Booking

Only booking participants should attempt updates:

### Driver

Can update their own booking.

```ts
await db
  .update(bookings)
  .set({...})
  .where(eq(bookings.id, bookingId));
```

---

### Host

Can update bookings tied to chargers they own.

```ts
await db
  .update(bookings)
  .set({...})
  .where(eq(bookings.id, bookingId));
```

RLS determines whether the update is allowed.

---

# Important Development Principle

Do not rely solely on frontend checks.

Even if your UI hides buttons from unauthorized users:

```text
Hide Button ≠ Security
RLS = Security
```

The UI should prevent accidental actions.

The database must prevent malicious actions.

Your current RLS policies are the real enforcement layer.

---

# Debugging RLS Issues

If an operation fails, identify:

```text
1. SELECT
2. INSERT
3. UPDATE
4. DELETE
```

and capture:

```text
- Exact error message
- Table involved
- Logged-in user ID
- Payload being sent
```

Common causes:

### INSERT Failed

```text
new row violates row-level security policy
```

Usually means:

```text
driver_id != auth.uid()
```

or

```text
host_id != auth.uid()
```

---

### SELECT Returned Empty Results

Usually means:

```text
User is not considered a participant
```

or

```text
auth.uid() is not matching public.users.id
```

---

### UPDATE Failed

Usually means:

```text
User is not the host
```

or

```text
User is not the booking participant
```

---

### Authentication Problem

Verify:

```text
auth.users.id
=
public.users.id
```

If these IDs are not identical, RLS policies will not behave correctly.

---

# MVP Summary

Current policy coverage is sufficient for MVP:

✅ Public charger discovery (authenticated users)

✅ Host-owned charger CRUD

✅ Driver-owned booking creation

✅ Driver booking visibility

✅ Host booking visibility

✅ Participant-only booking updates

### Next Security Upgrade

After MVP is working:

```text
Add AS RESTRICTIVE booking policies
```

to enforce:

```text
pending   → accepted     (host only)
accepted  → arrived      (driver only)
arrived   → verified     (host only)
verified  → charging     (host only)
charging  → completed    (host/driver depending on workflow)
```

This gives workflow-level security instead of participant-level security.