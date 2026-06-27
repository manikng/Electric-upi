const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');
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
  connectionString: env['DBTransactionPoolerURL'] || env['DATABASE_URL'],
  ssl: { rejectUnauthorized: false },
});

(async () => {
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_charging_sites_unique
    ON charging_sites (state, district, location, cpo_name)
  `);
  console.log('Unique index ensured on charging_sites(state, district, location, cpo_name)');
  await pool.end();
})();