-- Supabase RLS policies for bookings (mutual-nonce handshake)
-- Run in Supabase SQL editor. Assumes RLS is enabled on public.bookings and public.chargers.

-- 0) Drop broad participant update policy if present
DROP POLICY IF EXISTS bookings_update_participants ON public.bookings;

-- 1) SELECT for participants
CREATE POLICY IF NOT EXISTS bookings_select_participants
ON public.bookings
FOR SELECT
TO authenticated
USING (
  driver_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.chargers c WHERE c.id = bookings.charger_id AND c.host_id = auth.uid()
  )
);

-- 2) INSERT only by driver
CREATE POLICY IF NOT EXISTS bookings_insert_driver_only
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (
  driver_id = auth.uid()
);

-- 3) Block client-side finalization: clients cannot set `nonce_used` or change `status`
CREATE POLICY IF NOT EXISTS bookings_block_finalization
ON public.bookings
FOR UPDATE
TO authenticated
USING (
  driver_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.chargers c WHERE c.id = bookings.charger_id AND c.host_id = auth.uid()
  )
)
WITH CHECK (
  status = bookings.status            -- clients may NOT change status
  AND nonce_used = bookings.nonce_used -- clients may NOT mark nonce as used
);

-- 4) Host may set host_confirmed = true (and only that confirmation flag)
CREATE POLICY IF NOT EXISTS bookings_host_confirm
ON public.bookings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chargers c WHERE c.id = bookings.charger_id AND c.host_id = auth.uid()
  )
)
WITH CHECK (
  (host_confirmed = true OR host_confirmed = bookings.host_confirmed)
  AND nonce_used = bookings.nonce_used
  AND status = bookings.status
);

-- 5) Driver may set driver_confirmed = true (and only that confirmation flag)
CREATE POLICY IF NOT EXISTS bookings_driver_confirm
ON public.bookings
FOR UPDATE
TO authenticated
USING (
  driver_id = auth.uid()
)
WITH CHECK (
  (driver_confirmed = true OR driver_confirmed = bookings.driver_confirmed)
  AND nonce_used = bookings.nonce_used
  AND status = bookings.status
);

-- 6) Driver may regenerate nonce fields while booking is in awaiting_handshake
CREATE POLICY IF NOT EXISTS bookings_driver_regenerate
ON public.bookings
FOR UPDATE
TO authenticated
USING (
  driver_id = auth.uid()
  AND status = 'awaiting_handshake'
)
WITH CHECK (
  (
    (nonce IS NOT NULL AND nonce_expires_at IS NOT NULL AND nonce_generated_at IS NOT NULL AND nonce_generated_by = auth.uid())
    OR (host_confirmed = false AND driver_confirmed = false)
  )
  AND nonce_used = bookings.nonce_used
  AND status = bookings.status
);

-- 7) Prevent arbitrary client updates to sensitive nonce columns
CREATE POLICY IF NOT EXISTS bookings_restrict_sensitive_columns
ON public.bookings
FOR UPDATE
TO authenticated
USING (
  driver_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.chargers c WHERE c.id = bookings.charger_id AND c.host_id = auth.uid()
  )
)
WITH CHECK (
  nonce = bookings.nonce
  AND nonce_expires_at = bookings.nonce_expires_at
  AND nonce_generated_at = bookings.nonce_generated_at
  AND nonce_generated_by = bookings.nonce_generated_by
);
