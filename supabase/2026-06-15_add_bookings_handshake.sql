-- Migration: add mutual-nonce handshake columns to bookings
-- Run this in your Supabase SQL editor or via psql against the project DB.

BEGIN;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS nonce text,
  ADD COLUMN IF NOT EXISTS nonce_expires_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS nonce_used boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS host_confirmed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS driver_confirmed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS nonce_generated_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS nonce_generated_by uuid REFERENCES public.users(id);

COMMIT;

-- Optional: create an index on driver_id to make lookups faster
CREATE INDEX IF NOT EXISTS idx_bookings_driver_id ON public.bookings (driver_id);
