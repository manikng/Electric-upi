Running the handshake migration

1) Open your Supabase project and go to the SQL Editor. Copy the SQL in
   `supabase/2026-06-15_add_bookings_handshake.sql` and run it.

OR

2) Use psql (if you have direct DB access). Example:

```powershell
psql "postgresql://<db_user>:<db_pass>@<host>:5432/<db_name>" -f ./supabase/2026-06-15_add_bookings_handshake.sql
```

After running the migration:
- Verify `nonce`, `nonce_expires_at`, `nonce_used`, `host_confirmed`, `driver_confirmed`, `nonce_generated_at`, and `nonce_generated_by` exist on `public.bookings`.
- Re-enable the active-booking guard in `app/api/bookings/route.ts` by restoring the previously-removed check (recommended).

If you want, I can apply that re-enabled guard automatically after you confirm the migration is applied.
