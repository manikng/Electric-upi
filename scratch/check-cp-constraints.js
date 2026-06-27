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
  // Check connector profile constraints/indexes
  const r1 = await pool.query(`
    SELECT conname, pg_get_constraintdef(c.oid) AS def
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'site_connector_profiles'
  `);
  console.log('=== site_connector_profiles constraints ===');
  console.log(JSON.stringify(r1.rows, null, 2));

  const r2 = await pool.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'site_connector_profiles'
  `);
  console.log('\n=== indexes ===');
  console.log(JSON.stringify(r2.rows, null, 2));

  // Check why connectors were skipped - look at sample duplicate connector types per site
  const r3 = await pool.query(`
    SELECT site_id, connector_type, COUNT(*) as cnt
    FROM site_connector_profiles
    GROUP BY site_id, connector_type
    ORDER BY cnt DESC
    LIMIT 10
  `);
  console.log('\n=== top duplicate connector types (site_id, connector_type) ===');
  console.log(JSON.stringify(r3.rows, null, 2));

  // Check how many sites have multiple connector types
  const r4 = await pool.query(`
    SELECT connector_type, COUNT(*) as sites_with_this_type
    FROM site_connector_profiles
    GROUP BY connector_type
    ORDER BY sites_with_this_type DESC
    LIMIT 20
  `);
  console.log('\n=== connector type distribution ===');
  console.log(JSON.stringify(r4.rows, null, 2));

  await pool.end();
})();