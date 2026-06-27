/**
 * openstreetmap-data.js  (ultra-fast bulk version — adapted from seed-charging-data.js)
 * ------------------------------------------------------------------------------------
 * Loads `public/openchargemap_india.json` and pushes rows into Supabase/Postgres
 * using batched UNNEST queries for maximum throughput.
 *
 * Tables written:
 *  - charging_sites            (one row per distinct charging site)
 *  - site_connector_profiles   (one row per connector-type profile per site)
 *
 * Run:
 *   node scratch/openstreetmap-data.js
 *
 * The script loads the JSON from the public/ folder relative to the script path,
 * so it should be executed from the project root as shown above.
 */

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

// ---------------------------------------------------------------------------
// 1. Env / connection
// ---------------------------------------------------------------------------
const envPath = path.join(__dirname, "../.env");
if (!fs.existsSync(envPath)) {
  console.error("❌ .env.local not found");
  process.exit(1);
}
const envContent = fs.readFileSync(envPath, "utf8");
const env = {};
envContent.split(/\r?\n/).forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const idx = trimmed.indexOf("=");
  if (idx === -1) return;
  const key = trimmed.slice(0, idx).trim();
  let val = trimmed.slice(idx + 1).trim();
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
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

const BATCH_SIZE = 500;

function log(step, msg) {
  const now = new Date().toLocaleTimeString("en-IN", { hour12: false });
  console.log(`[${now}] STEP ${String(step).padStart(2, "0")} ► ${msg}`);
}

// ---------------------------------------------------------------------------
// 2. OCM Mappings & helpers
// ---------------------------------------------------------------------------
const OPERATOR_MAP = {
  1: "Unknown Operator",
  45: "Tata Power",
  3436: "Jio-BP",
  3779: "Glida",
  3818: "Static Energy",
  3539: "Zeon Electric",
  3778: "PlugNGo",
  3817: "E-Fill",
  3858: "EVQube",
  3972: "Electreefi",
  3997: "EVA",
};

const CONNECTION_MAP = {
  1: "Type 1",
  2: "CHAdeMO",
  33: "CCS Type 2",
  1036: "Type 2 AC",
};

function mapOperator(operatorId) {
  return OPERATOR_MAP[operatorId] || `Operator_${operatorId || "Unknown"}`;
}

function mapOwnership(usageTypeId) {
  return [1, 4, 5].includes(usageTypeId) ? "Public" : "Private";
}

function mapConnector(connectionTypeId) {
  return CONNECTION_MAP[connectionTypeId] || `Type_${connectionTypeId || "Unknown"}`;
}

const toNum = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

const truncate = (v, max) => {
  if (!v) return v;
  return v.length > max ? v.slice(0, max) : v;
};

// ---------------------------------------------------------------------------
// 3. Group OCM stations by a dedup key
// ---------------------------------------------------------------------------
function normalizeOcmKey(station) {
  const addr = station.AddressInfo || {};
  return [
    mapOperator(station.OperatorID),
    addr.StateOrProvince || "",
    addr.Town || "",
    addr.Title || addr.AddressLine1 || "",
  ]
    .join("|")
    .toLowerCase();
}

function buildSiteRecord(station) {
  const addr = station.AddressInfo || {};
  const title = addr.Title || "";
  const line1 = addr.AddressLine1 || "";
  const locationText = [title, line1].filter(Boolean).join(" - ").trim() || "Unknown";

  return {
    cpoName: mapOperator(station.OperatorID),
    ownership: mapOwnership(station.UsageTypeID),
    state: truncate(addr.StateOrProvince || "Unknown", 128),
    district: "Unknown", // OCM doesn't have district — keep Unknown
    cityVillage: truncate(addr.Town || addr.StateOrProvince || "Unknown", 128),
    location: truncate(locationText, 512),
    latitude: toNum(addr.Latitude),
    longitude: toNum(addr.Longitude),
    source: "openchargemap",
    rawSource: station,
  };
}

function buildConnectorRecords(siteId, station) {
  const connections = station.Connections || [];
  return connections.map((conn) => ({
    siteId,
    connectorType: mapConnector(conn.ConnectionTypeID),
    chargerRatingKw: conn.PowerKW != null ? toNum(conn.PowerKW) : null,
    connectorRatingKw: conn.PowerKW != null ? toNum(conn.PowerKW) : null,
    connectorCount: conn.Quantity || 1,
    rawSource: conn,
  }));
}

// ---------------------------------------------------------------------------
// 4. Load & group
// ---------------------------------------------------------------------------
const jsonPath = path.join(__dirname, "../public/openchargemap_india.json");
const stations = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

console.log(`Found ${stations.length} stations in openchargemap_india.json`);

const siteMap = new Map(); // key -> { site, connectors[] }
for (const station of stations) {
  const key = normalizeOcmKey(station);
  if (!siteMap.has(key)) {
    const site = buildSiteRecord(station);
    // Skip sites completely missing lat/lng
    if (site.latitude === null || site.longitude === null) {
      continue;
    }
    site.connectors = [];
    siteMap.set(key, site);
  }
  siteMap.get(key).connectors.push(...buildConnectorRecords(siteMap.get(key).siteId, station));
}

const sites = [...siteMap.values()];
const totalConnectors = sites.reduce((sum, s) => sum + s.connectors.length, 0);

log(
  "INIT",
  `Grouped into ${sites.length} unique sites, ${totalConnectors} connector profiles.`
);

// ---------------------------------------------------------------------------
// 5. Bulk insert via UNNEST (batched)
// ---------------------------------------------------------------------------
async function main() {
  const client = await pool.connect();

  try {
    // 5a. Bulk-insert charging_sites
    log(1, "Bulk-inserting charging_sites …");
    let insertedSites = 0;
    let existingSites = 0;

const siteCols = [
  "cpo_name",
  "ownership",
  "state",
  "district",
  "city_village",
  "location",
  "latitude",
  "longitude",
  "source",       // Now this is index 8
  "raw_source",   // Now this is index 9
];
    const siteInsertSQL = `
  INSERT INTO charging_sites (${siteCols.join(", ")}, location_geom) -- Add geom as an extra target
  SELECT
    d->>0, 
    d->>1, 
    d->>2, 
    d->>3, 
    d->>4,
    d->>5, 
    (d->>6)::double precision, 
    (d->>7)::double precision,
    d->>8, -- source is now at index 8
    (d->>9)::jsonb, -- raw_source is now at index 9
    ST_SetSRID(ST_MakePoint((d->>7)::double precision, (d->>6)::double precision), 4326)::geometry -- Computed geom
  FROM jsonb_array_elements($1::jsonb) d
  WHERE NOT EXISTS (
    SELECT 1 FROM charging_sites s
    WHERE s.state    = d->>2
      AND s.district = d->>3
      AND s.location = d->>5
      AND s.cpo_name = d->>0
  )
`;

    for (let i = 0; i < sites.length; i += BATCH_SIZE) {
      const batch = sites.slice(i, i + BATCH_SIZE);
      const rowsArr = batch.map((s) => [
        s.cpoName,
        s.ownership,
        s.state,
        s.district,
        s.cityVillage,
        s.location,
        s.latitude,
        s.longitude,
        s.source,
        JSON.stringify(s.rawSource),
      ]);
      const result = await client.query(siteInsertSQL, [JSON.stringify(rowsArr)]);
      insertedSites += result.rowCount;
      existingSites += batch.length - result.rowCount;

      if ((i / BATCH_SIZE) % 5 === 0 && i > 0) {
        const pct = Math.min(100, ((i + BATCH_SIZE) / sites.length) * 100).toFixed(1);
        log(1, ` ${Math.min(i + BATCH_SIZE, sites.length)}/${sites.length} sites (${pct}%)`);
      }
    }

    log(1, `Sites: ${insertedSites} inserted, ${existingSites} already existed.`);

    // 5b. Bulk-insert site_connector_profiles
    log(2, "Bulk-inserting site_connector_profiles …");

    // Load site id mappings: (cpo_name, state, district, location) → id
    const idMapResult = await client.query(`
      SELECT id, state, district, location, cpo_name FROM charging_sites
    `);
    const idMap = new Map();
    for (const row of idMapResult.rows) {
      const key = [row.cpo_name, row.state, row.district, row.location].join("|");
      idMap.set(key, row.id);
    }
    log(2, `Loaded ${idMap.size} site → id mappings.`);

    const cpCols = [
      "site_id",
      "connector_type",
      "charger_rating_kw",
      "connector_rating_kw",
      "connector_count",
      "raw_source",
    ];
    const cpInsertSQL = `
      INSERT INTO site_connector_profiles (${cpCols.join(", ")})
      SELECT
        (d->>0)::uuid,
        d->>1,
        (d->>2)::double precision,
        (d->>3)::double precision,
        (d->>4)::integer,
        (d->>5)::jsonb
      FROM jsonb_array_elements($1::jsonb) d
      ON CONFLICT (site_id, connector_type) DO UPDATE SET raw_source = EXCLUDED.raw_source
    `;

    const connectorBatch = [];
    let insertedCp = 0;
    let skippedCp = 0;
    let skippedConnectors = 0;

    for (const s of sites) {
      if (s.connectors.length === 0) continue;
      const key = [s.cpoName, s.state, s.district, s.location].join("|");
      const siteId = idMap.get(key);
      if (!siteId) {
        skippedConnectors++;
        continue;
      }
      for (const c of s.connectors) {
        connectorBatch.push([siteId, c.connectorType, c.chargerRatingKw, c.connectorRatingKw, c.connectorCount, JSON.stringify(c.rawSource)]);
      }
    }

    log(2, `Assembled ${connectorBatch.length} connector rows for insertion.`);

    for (let i = 0; i < connectorBatch.length; i += BATCH_SIZE) {
      const batch = connectorBatch.slice(i, i + BATCH_SIZE);
      const result = await client.query(cpInsertSQL, [JSON.stringify(batch)]);
      insertedCp += result.rowCount;
      skippedCp += batch.length - result.rowCount;

      if ((i / BATCH_SIZE) % 10 === 0 && i > 0) {
        const pct = Math.min(100, ((i + BATCH_SIZE) / connectorBatch.length) * 100).toFixed(1);
        log(2, `  ${Math.min(i + BATCH_SIZE, connectorBatch.length)}/${connectorBatch.length} connectors (${pct}%)`);
      }
    }

    console.log("\nSummary");
    console.log("-------");
    console.log(` charging_sites              : ${insertedSites} new, ${existingSites} existing`);
    console.log(` site_connector_profiles     : ${insertedCp} inserted, ${skippedCp} skipped (conflicts)`);
    console.log(` Source                      : public/openchargemap_india.json`);
  } catch (err) {
    console.error("\n❌ Fatal error:", err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});