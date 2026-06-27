const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const envPath = path.join(__dirname, "../.env");
const envContent = fs.readFileSync(envPath, "utf8");
const env = {};
envContent.split(/\r?\n/).forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const idx = trimmed.indexOf("=");
  if (idx === -1) return;
  const key = trimmed.slice(0, idx).trim();
  let val = trimmed.slice(idx + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  env[key] = val;
});

const connectionString = env["DBTransactionPoolerURL"] || env["DATABASE_URL"];
if (!connectionString) {
  console.error("❌ DATABASE_URL not found in .env");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === "production" ? undefined : { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

async function main() {
  const client = await pool.connect();
  try {
    const siteResult = await client.query(`
      SELECT id, cpo_name, city_village, raw_source IS NOT NULL AS has_raw_source
      FROM charging_sites
      WHERE source = 'openchargemap'
      ORDER BY id
      LIMIT 5
    `);
    console.log("\n=== charging_sites raw_source check ===");
    console.table(siteResult.rows);

    const cpResult = await client.query(`
      SELECT id, site_id, connector_type, raw_source IS NOT NULL AS has_raw_source
      FROM site_connector_profiles
      WHERE raw_source IS NOT NULL
      ORDER BY id
      LIMIT 5
    `);
    console.log("\n=== site_connector_profiles raw_source check ===");
    console.table(cpResult.rows);

    const sampleSite = siteResult.rows[0];
    if (sampleSite && sampleSite.has_raw_source) {
      const detail = await client.query(`SELECT raw_source FROM charging_sites WHERE id = $1`, [sampleSite.id]);
      const raw = detail.rows[0]?.raw_source;
      console.log("\n=== Sample raw_source keys (site) ===");
      console.log(Object.keys(raw || {}).slice(0, 10).join(", ") || "(empty)");
    }

    const sampleCp = cpResult.rows[0];
    if (sampleCp) {
      const detail = await client.query(`SELECT raw_source FROM site_connector_profiles WHERE id = $1`, [sampleCp.id]);
      const raw = detail.rows[0]?.raw_source;
      console.log("\n=== Sample raw_source keys (connector) ===");
      console.log(Object.keys(raw || {}).slice(0, 10).join(", ") || "(empty)");
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});
