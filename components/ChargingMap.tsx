"use client";

import { useEffect, useState, useMemo } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import "leaflet/dist/leaflet.css";

// MarkerCluster styles (inlined to avoid Turbopack resolution issues)
const markerClusterStyles = `
.marker-cluster-small{background-color:rgba(181,226,140,0.6)}.marker-cluster-small div{background-color:rgba(110,204,57,0.6)}.marker-cluster-medium{background-color:rgba(253,156,115,0.6)}.marker-cluster-medium div{background-color:rgba(241,128,32,0.6)}.marker-cluster-large{background-color:rgba(255,215,0,0.6)}.marker-cluster-large div{background-color:rgba(241,128,32,0.6)}.marker-cluster{background-clip:padding-box;border-radius:20px}.marker-cluster div{width:30px;height:30px;margin-left:5px;margin-top:5px;text-align:center;border-radius:15px;font-size:12px;font-weight:700}.marker-cluster span{line-height:30px}
`;

// Fix default icon bug
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface ChargingMapProps {
  chargerTypeFilter?: string;
  stateFilter?: string;
  onFilterChange?: (filters: { chargerType: string; state: string }) => void;
}

const CHARGER_TYPES = ["All", "Type-II AC", "CCS-II", "CHAdeMO", "Type-2 AC", "GB/T"];

function FlyToBounds({ features }: { features: GeoJSON.Feature[] }) {
  const map = useMap();
  useEffect(() => {
    if (!features.length) return;
    // Skip fitBounds on huge datasets — Leaflet recomputes tile grid + animates
    // over thousands of points, locking the main thread for seconds.
    if (features.length > 500) return;

    const pts = features.map((f) => {
      const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates;
      return L.latLng(lat, lng);
    });
    map.fitBounds(L.latLngBounds(pts), { padding: [20, 20] });
  }, [features, map]);
  return null;
}

export default function ChargingMap({ chargerTypeFilter, stateFilter, onFilterChange }: ChargingMapProps) {
  const [data, setData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [localType, setLocalType] = useState(chargerTypeFilter ?? "All");
  const [localState, setLocalState] = useState(stateFilter ?? "All");

  useEffect(() => {
    fetch("/api/chargers/geojson?limit=2000")
      .then((r) => r.json())
      .then((fc) => setData(fc))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const states = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.features.map((f) => f.properties?.state).filter(Boolean))].sort();
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.features.filter((f) => {
      const p = f.properties;
      if (localType !== "All" && p?.chargerType !== localType) return false;
      if (localState !== "All" && p?.state !== localState) return false;
      return true;
    });
  }, [data, localType, localState]);

  const handleType = (v: string) => { setLocalType(v); onFilterChange?.({ chargerType: v, state: localState }); };
  const handleState = (v: string) => { setLocalState(v); onFilterChange?.({ chargerType: localType, state: v }); };

  return (
    <>
      <style>{markerClusterStyles}</style>
    <div style={{ position: "relative", width: "100%", height: "600px", borderRadius: "var(--radius-xl, 12px)", overflow: "hidden" }}
      className="charging-map-wrapper">
      {/* Filter overlay */}
      <div style={{ position: "absolute", top: 10, right: 10, zIndex: 1000, background: "var(--color-surface, #fff)", padding: "8px 12px", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,.15)", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select value={localType} onChange={(e) => handleType(e.target.value)} style={{ fontSize: 13, padding: "4px 8px", borderRadius: 6, border: "1px solid #ccc" }}>
          {CHARGER_TYPES.map((t) => <option key={t} value={t}>{t === "All" ? "All Types" : t}</option>)}
        </select>
        <select value={localState} onChange={(e) => handleState(e.target.value)} style={{ fontSize: 13, padding: "4px 8px", borderRadius: 6, border: "1px solid #ccc", maxWidth: 140 }}>
          <option value="All">All States</option>
          {states.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{ fontSize: 12, color: "var(--color-primary, #2563eb)", fontWeight: 600 }}>{filtered.length} stations</span>
      </div>

      <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FlyToBounds features={filtered} />
        <MarkerClusterGroup maxClusterRadius={50} spiderfyOnMaxZoom chunkedLoading>
          {filtered.map((f, i) => {
            const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates;
            const p = f.properties!;
            return (
              <Marker key={i} position={[lat, lng]}>
                <Popup>
                  <strong>{p.cpoName}</strong><br />
                  {p.chargerType} · {p.chargerRating} kW<br />
                  {p.connectorCount} connector{p.connectorCount > 1 ? "s" : ""} · {p.connectorRating}<br />
                  {p.city}, {p.state}<br />
                  <em>{p.location}</em>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>

      <style>{`.charging-map-wrapper@media(max-width:640px){height:400px!important}`}</style>
    </div>
    </>
  );
}
