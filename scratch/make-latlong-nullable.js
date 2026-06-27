const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split(/\r?\n/).forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const idx = trimmed.indexOf('=');
  if (idx === -1) return;
  const key = trimmed.slice(0, idx).trim();
  let val = trimmed.slice(idx + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  env[key] = val;
});

const pool = new Pool({
  connectionString: env['DATABASE_URL'],
  ssl: { rejectUnauthorized: false },
});

(async () => {
  await pool.query(
    `ALTER TABLE charging_sites ALTER COLUMN latitude DROP NOT NULL, ALTER COLUMN longitude DROP NOT NULL`
  );
  console.log('OK: latitude and longitude are now nullable');
  await pool.end();
})();