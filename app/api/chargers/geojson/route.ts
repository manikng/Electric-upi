import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { toGeoJSON, StationsJson } from "@/lib/geojson";

const MAX_FEATURES = 2000;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get("limit") || String(MAX_FEATURES), 10);
    const limit = Math.min(Math.max(1, limitParam || MAX_FEATURES), MAX_FEATURES);

    const filePath = path.join(process.cwd(), "public", "ev_charging_stations.json");
    const raw = await readFile(filePath, "utf-8");
    const data: StationsJson = JSON.parse(raw);

    // Slice before conversion — avoids parsing 39k+ features synchronously
    const sliced = { ...data, data: data.data.slice(0, limit), total_records: data.total_records };
    const geojson = toGeoJSON(sliced);

    return NextResponse.json(geojson, {
      headers: {
        "Content-Type": "application/geo+json",
        "Cache-Control": "public, s-maxage=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load charger data" }, { status: 500 });
  }
}
