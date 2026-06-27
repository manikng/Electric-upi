-- Auto-populate location_geom on INSERT/UPDATE for charging_sites
-- This trigger ensures location_geom is always set from latitude/longitude

BEGIN;

-- Function to set location_geom from latitude/longitude
CREATE OR REPLACE FUNCTION set_charging_sites_location_geom()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location_geom := ST_SetSRID(ST_MakePoint(NEW.longitude::float8, NEW.latitude::float8), 4326)::geometry;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS trg_set_charging_sites_location_geom ON charging_sites;

CREATE TRIGGER trg_set_charging_sites_location_geom
  BEFORE INSERT OR UPDATE OF latitude, longitude ON charging_sites
  FOR EACH ROW
  EXECUTE FUNCTION set_charging_sites_location_geom();

-- GiST index for spatial queries
DROP INDEX IF EXISTS idx_charging_sites_location_geom;
CREATE INDEX idx_charging_sites_location_geom
  ON charging_sites USING GIST (location_geom);

COMMIT;
