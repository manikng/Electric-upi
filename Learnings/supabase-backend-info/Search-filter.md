
Correct architecture

There should be one source of truth.

useChargers()
        │
        ▼
allChargers
        │
        ▼
getFilteredChargers()
        │
        ├────────► SearchListings
        │
        ├────────► ChargingMap
        │
        └────────► Search count

Both cards and map should receive the same array.

What should happen

There should be one source of truth.

LandingPageClient
        │
        │ search/filter state
        ▼
 getFilteredChargers()
        │
 ┌──────┴─────────┐
 ▼                ▼
SearchListings   ChargingMap

Both should receive the same filtered array.

Now I can see the root cause.

This is actually a data-flow architecture issue, not a Leaflet issue.

Current flow
Navbar Search
      │
      ▼
submittedQuery
      │
      ▼
useChargers()
      │
      ▼
getFilteredChargers()
      │
      ▼
SearchListings

Meanwhile your map does this:

ChargingMap
      │
      ▼
fetch("/api/map-stations")

So the map never knows about the search.

Correct architecture

Your LandingPageClient should be the single source of truth.

LandingPageClient
        │
        ├───────────────► SearchListings
        │                    ▲
        │                    │
        └───────────────► ChargingMap

Both receive the same filtered array.


Read [](file:///d%3A/Dtu%20and%20doc/THE%20RISING%20PROJECT/implement%20this/electric-upi/supabase-backend-info/RLS-storage.md)

Read [](file:///d%3A/Dtu%20and%20doc/THE%20RISING%20PROJECT/implement%20this/electric-upi/supabase-backend-info/db-blueprint.md)

Read [](file:///d%3A/Dtu%20and%20doc/THE%20RISING%20PROJECT/implement%20this/electric-upi/supabase-backend-info/uml_architecture.md)

Read [](file:///d%3A/Dtu%20and%20doc/THE%20RISING%20PROJECT/implement%20this/electric-upi/supabase/2026-06-15_add_bookings_handshake.sql)

Read [](file:///d%3A/Dtu%20and%20doc/THE%20RISING%20PROJECT/implement%20this/electric-upi/supabase/rls_bookings.sql)

Read [](file:///d%3A/Dtu%20and%20doc/THE%20RISING%20PROJECT/implement%20this/electric-upi/supabase/MIGRATION_INSTRUCTIONS.md)

Here's the compressed audit of your Supabase backend:

---

## 📦 Supabase Backend — Compressed Audit

### ✅ Extensions Available
| Extension | Status | Use |
|-----------|--------|-----|
| **PostGIS** | ✅ Installed | Spatial queries (geo search) |
| `pgcrypto` | ✅ Installed | Random/crypto functions |
| `pgjwt`, `pg_cron`, `pgmq` | ✅ Installed | Extras |

### 🗄️ Tables

| Table | RLS | Rows | Key Columns |
|-------|-----|------|-------------|
| `public.users` | ✅ On | 5 | `id` (uuid PK), `email`, `full_name`, `city`, `trust_score` |
| `public.chargers` | ✅ On | 12 | `id`, `host_id`, `title`, `address`, `city`, `latitude`, `longitude`, `price_per_kwh`, `plug_type`, `charger_type`, `status` (all 12 = `active`) |
| `public.bookings` | ✅ On | 2 | `id`, `charger_id`, `driver_id`, `status` (`pending_host_accept`, `completed`), nonce fields |

### 🔐 RLS Policies Applied

**Chargers:**
- `chargers_select_authenticated` — anyone can SELECT
- `chargers_insert_own` — only if `host_id = auth.uid()`
- `chargers_update_own` — only if `host_id = auth.uid()`
- `chargers_delete_own` — only if `host_id = auth.uid()`

**Bookings:**
- `bookings_select_participants` — driver OR host can SELECT
- `bookings_insert_driver_only` — only driver can INSERT
- `bookings_block_finalization` — blocks client from changing `status` or `nonce_used`
- `bookings_host_confirm` — host can set `host_confirmed = true`
- `bookings_driver_confirm` — driver can set `driver_confirmed = true`
- `bookings_driver_regenerate` — driver can regenerate nonce when `status = 'awaiting_handshake'`
- `bookings_restrict_sensitive_columns` — blocks client from tampering with nonce fields

### ⚠️ Key Findings for Geo Search

1. **PostGIS is already installed** ✅ — No setup needed, you can use `ST_DWithin` immediately
2. **`latitude`/`longitude` exist on `chargers`** ✅ — But they're `numeric` type, not PostGIS `geography`. You'll need to cast or add a geometry column
3. **No GiST index on location** ❌ — Need to create one for geo queries to be fast
4. **`chargers_select_authenticated` allows SELECT for all** ✅ — Geo search API will work without RLS changes
5. **12 active chargers with lat/lng** ✅ — Enough data to test immediately

### 📋 What You Need to Do in Supabase

**One-time SQL to run in Supabase SQL Editor:**

```sql
-- 1. Add a PostGIS geometry column (optional but cleaner)
ALTER TABLE public.chargers ADD COLUMN IF NOT EXISTS location geography(Point, 4326);

-- 2. Populate it from existing lat/lng
UPDATE public.chargers 
SET location = ST_SetSRID(ST_MakePoint(longitude::float, latitude::float), 4326)::geography
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 3. Create GiST index for fast geo queries
CREATE INDEX IF NOT EXISTS idx_chargers_location ON public.chargers USING GIST (location);

-- 4. Create B-tree indexes for text/price filters
CREATE INDEX IF NOT EXISTS idx_chargers_city ON public.chargers (city);
CREATE INDEX IF NOT EXISTS idx_chargers_plug_type ON public.chargers (plug_type);
CREATE INDEX IF NOT EXISTS idx_chargers_price ON public.chargers (price_per_kwh);
CREATE INDEX IF NOT EXISTS idx_chargers_active ON public.chargers (status) WHERE status = 'active';

-- 5. Trigger to auto-set location on insert/update
CREATE OR REPLACE FUNCTION public.chargers_set_location()
RETURNS trigger AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude::float, NEW.latitude::float), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_chargers_set_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON public.chargers
  FOR EACH ROW EXECUTE FUNCTION public.chargers_set_location();
```

**That's it.** No new tables, no new RLS policies, no schema changes to your Drizzle file. The geo column is additive — existing queries still work.