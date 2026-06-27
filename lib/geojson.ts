// GeoJSON types
export type Point = { type: "Point"; coordinates: [number, number] };
export type GeoJsonProperties = Record<string, unknown>;
export type Feature = { type: "Feature"; geometry: Point; properties: GeoJsonProperties };
export type FeatureCollection = { type: "FeatureCollection"; features: Feature[] };

// Source data interfaces
export interface StationRecord {
  "CPO Name": string;
  "Govt/Private": string;
  State: string;
  District: string;
  "City/Village": string;
  Location: string;
  Latitude: string;
  Longitude: string;
  "Types of Chargers Installed/ Connector": string;
  "Charger Rating": string;
  "Connector Rating": string;
  "No. of Connector": string;
}

export interface StationsJson {
  headers: string[];
  total_records: number;
  data: StationRecord[];
}

export function toGeoJSON(data: StationsJson): FeatureCollection {
  const features: Feature[] = data.data
    .filter((r) => r.Latitude && r.Longitude)
    .map((r) => {
      const lat = parseFloat(r.Latitude);
      const lon = parseFloat(r.Longitude);
      if (isNaN(lat) || isNaN(lon)) return null;
      return {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [lon, lat] },
        properties: {
          cpoName: r["CPO Name"],
          sector: r["Govt/Private"],
          state: r.State,
          district: r.District,
          city: r["City/Village"],
          location: r.Location,
          chargerType: r["Types of Chargers Installed/ Connector"],
          chargerRating: r["Charger Rating"],
          connectorRating: r["Connector Rating"],
          connectorCount: r["No. of Connector"],
        },
      };
    })
    .filter(Boolean) as Feature[];

  return { type: "FeatureCollection", features };
}
