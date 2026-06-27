-- Add unique constraint on site_connector_profiles for (site_id, connector_type)
-- This enables ON CONFLICT DO NOTHING for idempotent bulk inserts

ALTER TABLE site_connector_profiles
ADD CONSTRAINT site_connector_profiles_site_id_connector_type_unique
UNIQUE (site_id, connector_type);