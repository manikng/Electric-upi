const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");

// --------------------------------------------------
// ENV
// --------------------------------------------------

const envPath = path.join(__dirname, "../.env.local");

const envContent = fs.readFileSync(envPath, "utf8");

const env = {};

envContent.split(/\r?\n/).forEach((line) => {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith("#")) return;

  const idx = trimmed.indexOf("=");

  if (idx === -1) return;

  const key = trimmed.slice(0, idx).trim();

  let value = trimmed.slice(idx + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  env[key] = value;
});

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? undefined
      : { rejectUnauthorized: false },
});

// --------------------------------------------------
// MAPPERS
// --------------------------------------------------

const OPERATOR_MAP = {
  45: "Tata Power",
  3436: "Jio-BP",
  3779: "Glida",
  3818: "Static Energy",
};

const CONNECTION_MAP = {
  1: "Type 1",
  2: "CHAdeMO",
  33: "CCS Type 2",
  1036: "Type 2 AC",
};

function mapOperator(id) {
  return OPERATOR_MAP[id] || `Operator_${id || "Unknown"}`;
}

function mapOwnership(id) {
  return [1, 4, 5].includes(id)
    ? "Public"
    : "Private";
}

function mapConnector(id) {
  return CONNECTION_MAP[id] || `Type_${id || "Unknown"}`;
}

// --------------------------------------------------
// INSERT SITE
// --------------------------------------------------

async function insertSite(client, row) {
  await client.query(
    `
    INSERT INTO charging_sites (
      id,
      cpo_name,
      ownership,
      state,
      district,
      city_village,
      location,
      latitude,
      longitude,
      source,
      raw_source
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
    )
    `,
    [
      row.id,
      row.cpo_name,
      row.ownership,
      row.state,
      row.district,
      row.city_village,
      row.location,
      row.latitude,
      row.longitude,
      row.source,
      JSON.stringify(row.raw_source),
    ]
  );
}

// --------------------------------------------------
// INSERT CONNECTOR
// --------------------------------------------------

async function insertConnector(client, row) {
  await client.query(
    `
    INSERT INTO site_connector_profiles (
      id,
      site_id,
      connector_type,
      charger_rating_kw,
      connector_rating_kw,
      connector_count,
      raw_source
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,$7
    )
    `,
    [
      row.id,
      row.site_id,
      row.connector_type,
      row.charger_rating_kw,
      row.connector_rating_kw,
      row.connector_count,
      JSON.stringify(row.raw_source),
    ]
  );
}

// --------------------------------------------------
// MAIN
// --------------------------------------------------

async function main() {
  const jsonPath = path.join(
    __dirname,
    "../public/openchargemap_india.json"
  );

  const stations = JSON.parse(
    fs.readFileSync(jsonPath, "utf8")
  );

  console.log(
    `Loaded ${stations.length} stations`
  );

  // -----------------------
  // TEST MODE
  // -----------------------

  const records = stations.slice(0, 1);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const station of records) {
      const siteId = crypto.randomUUID();

      const addr = station.AddressInfo || {};

      const siteRow = {
        id: siteId,

        cpo_name: mapOperator(
          station.OperatorID
        ),

        ownership: mapOwnership(
          station.UsageTypeID
        ),

        state:
          addr.StateOrProvince ||
          "Unknown",

        district: "Unknown",

        city_village:
          addr.Town ||
          "Unknown",

        location:
          [
            addr.Title,
            addr.AddressLine1,
          ]
            .filter(Boolean)
            .join(" - ") || "Unknown",

        latitude: addr.Latitude,

        longitude: addr.Longitude,

        source: "openchargemap",

        raw_source: station,
      };

      console.log(
        "\nSITE SAMPLE\n"
      );

      console.log(
        JSON.stringify(siteRow, null, 2)
      );

      await insertSite(client, siteRow);

      for (const conn of station.Connections || []) {
        const connectorRow = {
          id: crypto.randomUUID(),

          site_id: siteId,

          connector_type: mapConnector(
            conn.ConnectionTypeID
          ),

          charger_rating_kw:
            conn.PowerKW,

          connector_rating_kw:
            conn.PowerKW,

          connector_count:
            conn.Quantity || 1,

          raw_source: conn,
        };

        console.log(
          "\nCONNECTOR SAMPLE\n"
        );

        console.log(
          JSON.stringify(
            connectorRow,
            null,
            2
          )
        );

        await insertConnector(
          client,
          connectorRow
        );
      }
    }

    await client.query("COMMIT");

    console.log(
      "\n✅ TEST IMPORT SUCCESS"
    );
  } catch (err) {
    await client.query("ROLLBACK");

    console.error(
      "\n❌ IMPORT FAILED"
    );

    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();