-- SQL migration to add hold_expires_at column to bookings table
-- This migration adds the hold_expires_at timestamp column to store 10-minute booking hold expiration
CREATE TABLE IF NOT EXISTS bookings (
  ... existing columns ...
, hold_expires_at TIMESTAMPTZ
);

-- If table already exists, add the column
ALTER TABLE IF EXISTS bookings ADD COLUMN IF NOT EXISTS hold_expires_at TIMESTAMPTZ;