-- Backfill location_geom for existing rows in charging_sites
-- This migration populates location_geom from latitude/longitude for rows where it is NULL

BEGIN;

-- Update charging_sites to set location_geom from latitude/longitude
UPDATE charging_sites
SET location_geom = ST_SetSRID(ST_MakePoint(longitude::float8, latitude::float8), 4326)::geometry
WHERE location_geom IS NULL
AND latitude IS NOT NULL
AND longitude IS NOT NULL;

-- Backfill raw_source for rows that have a source but no raw_source
-- Sets a minimal JSON object so the column is not NULL
UPDATE charging_sites
SET raw_source = jsonb_build_object(
  'source', source,
  'cpo_name', cpo_name,
  'state', state,
  'district', district,
  'location', location,
  'latitude', latitude,
  'longitude', longitude
)
WHERE raw_source IS NULL
AND source IS NOT NULL;

COMMIT;