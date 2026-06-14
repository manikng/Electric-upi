/**
 * seed.js — Real Supabase Data Seeder
 * ------------------------------------
 * Inserts actual data into your Supabase Postgres database.
 * - 2 users  (1 host + 1 driver)
 * - 5 chargers (all 15+ columns populated)
 * - 1 booking (pending_host_accept)
 *
 * Deliberate 800ms delay between each write to avoid Supabase rate limits.
 * Password is ALREADY URL-encoded in .env.local — do NOT re-encode here.
 *
 * Run: node scratch/seed.js
 */

const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

// ──────────────────────────────────────────────────────────────────────────────
// 1. Helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Pause execution for `ms` milliseconds */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Pretty step logger */
function log(step, msg) {
  const now = new Date().toLocaleTimeString('en-IN', { hour12: false });
  console.log(`[${now}] STEP ${step.toString().padStart(2, '0')} ► ${msg}`);
}

// ──────────────────────────────────────────────────────────────────────────────
// 2. Load .env.local  (password is already %40%23%40%23 — do NOT re-encode)
// ──────────────────────────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '../.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌  .env.local not found');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split(/\r?\n/).forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const idx = trimmed.indexOf('=');
  if (idx === -1) return;
  const key = trimmed.slice(0, idx).trim();
  let val   = trimmed.slice(idx + 1).trim();
  // Strip surrounding quotes
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  env[key] = val;
});

const connectionString = env['DATABASE_URL'];
if (!connectionString) {
  console.error('❌  DATABASE_URL not found in .env.local');
  process.exit(1);
}

console.log('✅  DATABASE_URL loaded (password already URL-encoded)');

// ──────────────────────────────────────────────────────────────────────────────
// 3. Connect — SSL required for Supabase Transaction Pooler
// ──────────────────────────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },  // Supabase pooler uses self-signed TLS
  connectionTimeoutMillis: 10000,
});

// ──────────────────────────────────────────────────────────────────────────────
// 4. Seed Data
// ──────────────────────────────────────────────────────────────────────────────
const HOST_EMAIL   = 'host.test@electric-upi.dev';
const DRIVER_EMAIL = 'driver.test@electric-upi.dev';

const CHARGERS = [
  {
    title:            "Rahul's AC Charger — Green Park",
    address:          "A-12, Green Park Main, New Delhi",
    city:             "Delhi",
    area:             "Green Park",
    pincode:          "110016",
    state:            "Delhi",
    price_per_kwh:    5.50,
    charger_type:     "AC Charger",
    power_kw:         7.4,
    plug_type:        "Type 2",
    available_from:   "06:00",
    available_to:     "22:00",
    amenities:        JSON.stringify(["WiFi", "Covered Parking", "CCTV"]),
    vehicle_segments: JSON.stringify(["4-Wheeler"]),
    image_url:        null,
    description:      "Secure covered parking. RFID card available. 7.4 kW AC charging.",
    status:           "active",
    latitude:         28.558892,
    longitude:        77.202805,
  },
  {
    title:            "Priya's DC Fast Charger — Saket",
    address:          "PVR Anupam Complex, Saket, New Delhi",
    city:             "Delhi",
    area:             "Saket",
    pincode:          "110017",
    state:            "Delhi",
    price_per_kwh:    7.00,
    charger_type:     "DC Fast Charger",
    power_kw:         50,
    plug_type:        "CCS2",
    available_from:   "08:00",
    available_to:     "21:00",
    amenities:        JSON.stringify(["Restroom", "Café Nearby", "Security Guard"]),
    vehicle_segments: JSON.stringify(["4-Wheeler"]),
    image_url:        null,
    description:      "50 kW DC CCS2 fast charging in gated society. Close to market.",
    status:           "active",
    latitude:         28.524458,
    longitude:        77.206613,
  },
  {
    title:            "Anjali's Home Charger — Lajpat Nagar",
    address:          "Central Market, Lajpat Nagar II, New Delhi",
    city:             "Delhi",
    area:             "Lajpat Nagar",
    pincode:          "110024",
    state:            "Delhi",
    price_per_kwh:    4.80,
    charger_type:     "AC Charger",
    power_kw:         7.4,
    plug_type:        "Bharat AC-001",
    available_from:   "07:00",
    available_to:     "23:00",
    amenities:        JSON.stringify(["Parking", "Friendly Host"]),
    vehicle_segments: JSON.stringify(["2-Wheeler", "3-Wheeler", "4-Wheeler"]),
    image_url:        null,
    description:      "7.4 kW AC Charger. Gated parking. Friendly hosting. All vehicles.",
    status:           "active",
    latitude:         28.570775,
    longitude:        77.241517,
  },
  {
    title:            "Vikram's Garage Charger — GK II",
    address:          "M-Block Market, Greater Kailash II, New Delhi",
    city:             "Delhi",
    area:             "Greater Kailash",
    pincode:          "110048",
    state:            "Delhi",
    price_per_kwh:    6.00,
    charger_type:     "AC Charger",
    power_kw:         11,
    plug_type:        "Type 2",
    available_from:   "09:00",
    available_to:     "20:00",
    amenities:        JSON.stringify(["Private Garage", "WiFi", "24/7 CCTV"]),
    vehicle_segments: JSON.stringify(["4-Wheeler"]),
    image_url:        null,
    description:      "Private lockable garage slot. 11 kW AC charger with WiFi access.",
    status:           "active",
    latitude:         28.534220,
    longitude:        77.242484,
  },
  {
    title:            "Karawal Nagar Community Charger",
    address:          "Karawal Nagar Main Road, Delhi",
    city:             "Delhi",
    area:             "Karawal Nagar",
    pincode:          "110094",
    state:            "Delhi",
    price_per_kwh:    5.00,
    charger_type:     "Level 1 (Slow)",
    power_kw:         3.3,
    plug_type:        "3-Pin",
    available_from:   "00:00",
    available_to:     "23:59",
    amenities:        JSON.stringify(["Open Parking", "Road Access"]),
    vehicle_segments: JSON.stringify(["2-Wheeler", "3-Wheeler"]),
    image_url:        null,
    description:      "Community-facing charger. Easy road access. Two and three wheelers.",
    status:           "active",
    latitude:         28.718302,
    longitude:        77.271101,
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// 5. Main seed function
// ──────────────────────────────────────────────────────────────────────────────
async function seed() {
  const DELAY = 800; // ms between writes — avoids Supabase rate limits

  console.log('\n🌱  Starting seed...\n');

  // ── Step 1: Upsert host user ──────────────────────────────────────────────
  log(1, `Upserting host user  <${HOST_EMAIL}>  …`);
  const hostRes = await pool.query(
    `INSERT INTO users (email, full_name, city, trust_score)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE
       SET full_name = EXCLUDED.full_name,
           trust_score = EXCLUDED.trust_score
     RETURNING id`,
    [HOST_EMAIL, 'Rahul Sharma (Test Host)', 'Delhi', 98]
  );
  const hostId = hostRes.rows[0].id;
  console.log(`    ✅  host_id = ${hostId}`);
  await sleep(DELAY);

  // ── Step 2: Upsert driver user ────────────────────────────────────────────
  log(2, `Upserting driver user  <${DRIVER_EMAIL}>  …`);
  const driverRes = await pool.query(
    `INSERT INTO users (email, full_name, city, trust_score)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE
       SET full_name = EXCLUDED.full_name,
           trust_score = EXCLUDED.trust_score
     RETURNING id`,
    [DRIVER_EMAIL, 'Meera Patel (Test Driver)', 'Delhi', 95]
  );
  const driverId = driverRes.rows[0].id;
  console.log(`    ✅  driver_id = ${driverId}`);
  await sleep(DELAY);

  // ── Step 3: Clear old test chargers for this host ─────────────────────────
  log(3, 'Removing previous test chargers for this host…');
  await pool.query('DELETE FROM chargers WHERE host_id = $1', [hostId]);
  console.log('    ✅  Cleared');
  await sleep(DELAY);

  // ── Step 4–8: Insert 5 chargers (all 15+ columns) ─────────────────────────
  const chargerIds = [];
  for (let i = 0; i < CHARGERS.length; i++) {
    const c = CHARGERS[i];
    log(4 + i, `Inserting charger ${i + 1}/5: "${c.title}"  …`);
    const res = await pool.query(
      `INSERT INTO chargers (
         host_id, title, address, city, area, pincode, state,
         price_per_kwh, charger_type, power_kw, plug_type,
         available_from, available_to, amenities, vehicle_segments,
         image_url, description, status, latitude, longitude
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,
         $8,$9,$10,$11,
         $12,$13,$14,$15,
         $16,$17,$18,$19,$20
       ) RETURNING id`,
      [
        hostId,
        c.title, c.address, c.city, c.area, c.pincode, c.state,
        c.price_per_kwh, c.charger_type, c.power_kw, c.plug_type,
        c.available_from, c.available_to, c.amenities, c.vehicle_segments,
        c.image_url, c.description, c.status,
        c.latitude, c.longitude,
      ]
    );
    const cid = res.rows[0].id;
    chargerIds.push(cid);
    console.log(`    ✅  charger_id = ${cid}`);
    await sleep(DELAY);
  }

  // ── Step 9: Insert one booking (driver books first charger) ───────────────
  log(9, 'Creating test booking (driver → charger #1)…');
  // Remove any existing test bookings to allow clean re-runs
  await pool.query(
    `DELETE FROM bookings WHERE driver_id = $1 AND charger_id = $2`,
    [driverId, chargerIds[0]]
  );
  const bookingRes = await pool.query(
    `INSERT INTO bookings (charger_id, driver_id, status)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [chargerIds[0], driverId, 'pending_host_accept']
  );
  const bookingId = bookingRes.rows[0].id;
  console.log(`    ✅  booking_id = ${bookingId}`);
  await sleep(DELAY);

  // ── Step 10: Verify — read back counts ────────────────────────────────────
  log(10, 'Verifying inserted data…');
  const verifyChargers = await pool.query(
    `SELECT COUNT(*) AS cnt FROM chargers WHERE host_id = $1 AND status = 'active'`,
    [hostId]
  );
  const verifyBookings = await pool.query(
    `SELECT COUNT(*) AS cnt FROM bookings WHERE driver_id = $1`,
    [driverId]
  );
  console.log(`    ✅  Active chargers for host : ${verifyChargers.rows[0].cnt}`);
  console.log(`    ✅  Bookings for driver      : ${verifyBookings.rows[0].cnt}`);

  console.log('\n🎉  Seed complete!\n');
  console.log('Summary');
  console.log('-------');
  console.log(`  Host user    : ${HOST_EMAIL}  (id: ${hostId})`);
  console.log(`  Driver user  : ${DRIVER_EMAIL}  (id: ${driverId})`);
  console.log(`  Chargers     : ${chargerIds.length} inserted`);
  console.log(`  Booking      : ${bookingId}`);
  console.log('\nOpen Supabase → Table Editor → chargers  to verify all 20 columns are populated.\n');

  await pool.end();
}

// ──────────────────────────────────────────────────────────────────────────────
seed().catch((err) => {
  console.error('\n❌  Seed failed:', err.message);
  console.error(err);
  pool.end().finally(() => process.exit(1));
});
