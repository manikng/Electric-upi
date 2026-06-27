/**
 * seed-charging-data.js  (ultra-fast bulk version)
 * ------------------------------------------------
 * Loads `public/ev_charging_stations.json` and pushes rows into Supabase/Postgres
 * using batched UNNEST queries for maximum throughput.
 *
 * Tables written:
 *  - charging_sites            (one row per distinct public charging site)
 *  - site_connector_profiles   (one row per connector-type profile per site)
 *
 * Run:
 *   node scratch/seed-charging-data.js
 *
 * Performance:
 *  - ~50K+ rows/minute vs ~1K rows/minute in the old row-by-row version.
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// ---------------------------------------------------------------------------
// 1. Env / connection
// ---------------------------------------------------------------------------
const envPath = path.join(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local not found');
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
  let val = trimmed.slice(idx + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  env[key] = val;
});
const connectionString = env['DBTransactionPoolerURL'] || env['DATABASE_URL'];
if (!connectionString) {
  console.error('❌ DATABASE_URL not found in .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? undefined : { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

// Number of sites per batch — tune this up/down based on your connection quality
const BATCH_SIZE = 500;

function log(step, msg) {
  const now = new Date().toLocaleTimeString('en-IN', { hour12: false });
  console.log(`[${now}] STEP ${String(step).padStart(2, '0')} ► ${msg}`);
}

// ---------------------------------------------------------------------------
// 2. Helpers
// ---------------------------------------------------------------------------
const toNum = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};
const toInt = (v) => {
  const n = parseInt(v, 10);
  return Number.isInteger(n) ? n : null;
};
const truncate = (v, max) => {
  if (!v) return v;
  return v.length > max ? v.slice(0, max) : v;
};

function normalizeSiteKey(row) {
  return [
    (row['CPO Name'] || '').trim(),
    (row['State'] || '').trim(),
    (row['District'] || '').trim(),
    (row['City/Village'] || '').trim(),
    (row['Location'] || '').trim(),
  ].join('|');
}

function parseConnectors(row) {
  const out = [];
  const type = (row['Types of Chargers Installed/ Connector'] || '').trim();
  if (type) {
    out.push({
      type: truncate(type, 128),
      chargerRatingKw: toNum(row['Charger Rating']),
      connectorRatingKw: toNum(row['Connector Rating']),
      connectorCount: toInt(row['No. of Connector']),
    });
  }
  return out;
}

function toSiteRow(raw) {
  return {
    cpoName: truncate((raw['CPO Name'] || '').trim(), 255) || null,
    ownership: truncate((raw['Govt/Private'] || '').trim(), 32) || null,
    state: truncate((raw['State'] || '').trim(), 128) || null,
    district: truncate((raw['District'] || '').trim(), 128) || null,
    cityVillage: truncate((raw['City/Village'] || '').trim(), 128) || null,
    location: truncate((raw['Location'] || '').trim(), 512) || null,
    latitude: toNum(raw.Latitude),
    longitude: toNum(raw.Longitude),
    source: truncate('public/ev_charging_stations.json', 255),
    rawSource: raw,
  };
}

// ---------------------------------------------------------------------------
// 3. Load and group data by site
// ---------------------------------------------------------------------------
const jsonPath = path.join(__dirname, '../public/ev_charging_stations.json');
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const rows = Array.isArray(json.data) ? json.data : [];

if (!rows.length) {
  console.error('No data rows found in ev_charging_stations.json');
  process.exit(1);
}

const siteMap = new Map();
for (const r of rows) {
  const key = normalizeSiteKey(r);
  if (!siteMap.has(key)) {
    const site = toSiteRow(r);
    if (!site.state || !site.district || !site.location) {
      continue;
    }
    site.connectors = [];
    siteMap.set(key, site);
  }
  siteMap.get(key).connectors.push(...parseConnectors(r));
}

const sites = [...siteMap.values()];
const totalConnectors = sites.reduce((sum, s) => sum + s.connectors.length, 0);

const skippedPath = path.join(__dirname, 'skipped-sites.log');
const skippedStream = fs.createWriteStream(skippedPath, { flags: 'a' });

// Close the log stream on exit.
process.on('exit', () => skippedStream.end());
process.on('SIGINT', () => { skippedStream.end(); process.exit(1); });

const skippedNoCoords = [];
const validSites = [];

for (const s of sites) {
  if (s.latitude === null || s.longitude === null) {
    skippedNoCoords.push(s);
    continue;
  }
  validSites.push(s);
}

for (const s of skippedNoCoords) {
  skippedStream.write(
    [
      new Date().toISOString(),
      [s.cpoName, s.state, s.district, s.cityVillage, s.location].filter(Boolean).join(' | '),
      `lat=${s.latitude}`,
      `lng=${s.longitude}`,
    ].join(' ') + '\n'
  );
}

log(
  'INIT',
  `Loaded ${rows.length} rows → ${sites.length} sites (${totalConnectors} connector profiles). ` +
    `Inserting ${validSites.length} with coords; skipping ${skippedNoCoords.length} with missing lat/lng.`
);

const sitesToInsert = validSites;

// ---------------------------------------------------------------------------
// 4. Bulk insert via UNNEST (batched)
// ---------------------------------------------------------------------------
async function main() {
  const client = await pool.connect();

  try {
    // 4a. Bulk-insert charging_sites using UNNEST + ON CONFLICT DO NOTHING
    //     This avoids a round-trip per site.
    log(1, 'Bulk-inserting charging_sites …');
    const BATCH_SIZE = 500;
    let insertedSites = 0;
    let existingSites = 0;

    const siteCols = [
      'cpo_name', 'ownership', 'state', 'district',
      'city_village', 'location', 'latitude', 'longitude', 'source', 'raw_source',
    ];
    const siteInsertSQL = `
      INSERT INTO charging_sites (${siteCols.join(', ')})
      SELECT
        d->>0, d->>1, d->>2, d->>3, d->>4,
        d->>5, (d->>6)::double precision, (d->>7)::double precision, d->>8, d->>9::jsonb
      FROM jsonb_array_elements($1::jsonb) d
      WHERE NOT EXISTS (
        SELECT 1 FROM charging_sites s
        WHERE s.state    = d->>2
          AND s.district = d->>3
          AND s.location = d->>5
          AND s.cpo_name = d->>0
      )
    `;

    for (let i = 0; i < sitesToInsert.length; i += BATCH_SIZE) {
      const batch = sitesToInsert.slice(i, i + BATCH_SIZE);
      const rowsArr = batch.map(s => [
        s.cpoName, s.ownership, s.state, s.district, s.cityVillage,
        s.location, s.latitude, s.longitude, s.source, JSON.stringify(s.rawSource)
      ]);
      const result = await client.query(siteInsertSQL, [JSON.stringify(rowsArr)]);
      insertedSites += result.rowCount;
      existingSites += batch.length - result.rowCount;

      if ((i / BATCH_SIZE) % 5 === 0 && i > 0) {
        const pct = Math.min(100, ((i + BATCH_SIZE) / sitesToInsert.length * 100).toFixed(1));
        log(1, ` ${Math.min(i + BATCH_SIZE, sitesToInsert.length)}/${sitesToInsert.length} sites (${pct}%)`);
      }
    }

    log(1, `Sites: ${insertedSites} inserted, ${existingSites} already existed.`);

    // 4b. Bulk-insert site_connector_profiles
    log(2, 'Bulk-inserting site_connector_profiles …');

    // First, load the mapping: (state, district, location, cpo_name) → id
    const idMapResult = await client.query(`
      SELECT id, state, district, location, cpo_name FROM charging_sites
    `);
    const idMap = new Map();
    for (const row of idMapResult.rows) {
      const key = [row.cpo_name, row.state, row.district, row.location].join('|');
      idMap.set(key, row.id);
    }
    log(2, `Loaded ${idMap.size} site → id mappings.`);

    const cpCols = ['site_id','connector_type','charger_rating_kw','connector_rating_kw','connector_count'];
    const cpInsertSQL = `
      INSERT INTO site_connector_profiles (${cpCols.join(', ')})
      SELECT
        (d->>0)::uuid, d->>1,
        (d->>2)::double precision, (d->>3)::double precision,
        (d->>4)::integer
      FROM jsonb_array_elements($1::jsonb) d
      ON CONFLICT (site_id, connector_type) DO NOTHING
    `;

    const connectorBatch = [];
    let insertedCp = 0;
    let skippedCp = 0;
    let skippedConnectors = 0;

    for (const s of validSites) {
      if (s.connectors.length === 0) continue;
      const key = [s.cpoName, s.state, s.district, s.location].join('|');
      const siteId = idMap.get(key);
      if (!siteId) {
        skippedConnectors++;
        continue;
      }
      for (const c of s.connectors) {
        connectorBatch.push([siteId, c.type, c.chargerRatingKw, c.connectorRatingKw, c.connectorCount]);
      }
    }

    log(2, `Assembled ${connectorBatch.length} connector rows for insertion.`);

    for (let i = 0; i < connectorBatch.length; i += BATCH_SIZE) {
      const batch = connectorBatch.slice(i, i + BATCH_SIZE);
      const result = await client.query(cpInsertSQL, [JSON.stringify(batch)]);
      insertedCp += result.rowCount;
      skippedCp += batch.length - result.rowCount;

      if ((i / BATCH_SIZE) % 10 === 0 && i > 0) {
        const pct = Math.min(100, ((i + BATCH_SIZE) / connectorBatch.length * 100).toFixed(1));
        log(2, `  ${Math.min(i + BATCH_SIZE, connectorBatch.length)}/${connectorBatch.length} connectors (${pct}%)`);
      }
    }

    console.log('\nSummary');
    console.log('-------');
    console.log(` charging_sites              : ${insertedSites} new, ${existingSites} existing`);
    console.log(` site_connector_profiles     : ${insertedCp} inserted, ${skippedCp} skipped`);
    console.log(` Source                      : public/ev_charging_stations.json`);
  } catch (err) {
    console.error('\n❌ Fatal error:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exitCode = 1;
});
