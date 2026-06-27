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
      SELECT id, cpo_name, raw_source
      FROM charging_sites
      WHERE source = 'openchargemap'
      ORDER BY id
      LIMIT 3
    `);
    console.log("\n=== charging_sites raw_source DETAIL ===");
    siteResult.rows.forEach((row) => {
      console.log(`\nSite ID: ${row.id}`);
      console.log(`CPO: ${row.cpo_name}`);
      console.log(`raw_source type: ${typeof row.raw_source}`);
      console.log(`raw_source is null: ${row.raw_source === null}`);
      console.log(`raw_source keys: ${row.raw_source ? Object.keys(row.raw_source).join(", ") : "N/A"}`);
      console.log(`raw_source sample: ${row.raw_source ? JSON.stringify(row.raw_source).slice(0, 200) : "null"}`);
    });

    const cpResult = await client.query(`
      SELECT id, site_id, connector_type, raw_source
      FROM site_connector_profiles
      ORDER BY id
      LIMIT 3
    `);
    console.log("\n=== site_connector_profiles raw_source DETAIL ===");
    cpResult.rows.forEach((row) => {
      console.log(`\nCP ID: ${row.id}`);
      console.log(`Site ID: ${row.site_id}`);
      console.log(`Type: ${row.connector_type}`);
      console.log(`raw_source type: ${typeof row.raw_source}`);
      console.log(`raw_source is null: ${row.raw_source === null}`);
      console.log(`raw_source keys: ${row.raw_source ? Object.keys(row.raw_source).join(", ") : "N/A"}`);
      console.log(`raw_source sample: ${row.raw_source ? JSON.stringify(row.raw_source).slice(0, 200) : "null"}`);
    });

    const nullCount = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM charging_sites WHERE raw_source IS NULL) AS null_sites,
        (SELECT COUNT(*) FROM site_connector_profiles WHERE raw_source IS NULL) AS null_cps,
        (SELECT COUNT(*) FROM charging_sites) AS total_sites,
        (SELECT COUNT(*) FROM site_connector_profiles) AS total_cps
    `);
    console.log("\n=== NULL Count Summary ===");
    console.table(nullCount.rows[0]);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});
