const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
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
  const q1 = `
    SELECT conname, pg_get_constraintdef(c.oid) AS def
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'charging_sites'
  `;
  const r1 = await pool.query(q1);
  console.log('constraints:', r1.rows);

  const q2 = `
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'charging_sites'
  `;
  const r2 = await pool.query(q2);
  console.log('indexes:', r2.rows);

  await pool.end();
})();