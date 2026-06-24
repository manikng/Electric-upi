-- ============================================================================
-- Migration: Search & Filter Performance Indexes + PostGIS Geography Column
-- ============================================================================
-- Purpose: Enable fast geo search (ST_DWithin) and filter queries on chargers
-- Run this ONCE in the Supabase SQL Editor (Database → SQL Editor → New Query)
-- ============================================================================

-- 1. Enable PostGIS extension (idempotent — safe to re-run)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Add geography column to chargers (nullable, so existing rows are fine)
ALTER TABLE chargers
  ADD COLUMN IF NOT EXISTS location geography(Point, 4326);

-- 3. Backfill location from existing latitude/longitude (one-time)
UPDATE chargers
SET location = ST_SetSRID(ST_MakePoint(longitude::float8, latitude::float8), 4326)::geography
WHERE latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND location IS NULL;

-- 4. GiST index on location for fast geo queries (ST_DWithin)
CREATE INDEX IF NOT EXISTS chargers_location_idx
  ON chargers USING GIST (location);

-- 5. B-tree indexes for filter columns
CREATE INDEX IF NOT EXISTS chargers_city_idx ON chargers (city);
CREATE INDEX IF NOT EXISTS chargers_plug_type_idx ON chargers (plug_type);
CREATE INDEX IF NOT EXISTS chargers_charger_type_idx ON chargers (charger_type);
CREATE INDEX IF NOT EXISTS chargers_price_per_kwh_idx ON chargers (price_per_kwh);
CREATE INDEX IF NOT EXISTS chargers_status_idx ON chargers (status);

-- 6. Trigger: auto-set location on insert/update of lat/lng
CREATE OR REPLACE FUNCTION set_chargers_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location := ST_SetSRID(
      ST_MakePoint(NEW.longitude::float8, NEW.latitude::float8),
      4326
    )::geography;
  ELSE
    NEW.location := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_chargers_location ON chargers;
CREATE TRIGGER trg_set_chargers_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON chargers
  FOR EACH ROW
  EXECUTE FUNCTION set_chargers_location();

-- 7. Verify
SELECT
  count(*) AS total_chargers,
  count(location) AS geocoded_chargers
FROM chargers;
