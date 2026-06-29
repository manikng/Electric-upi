"use client";

import React, { useEffect, useMemo } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import "leaflet/dist/leaflet.css";

import type { ChargerResult, ChargingSiteResult } from "@/lib/types";

// ---------------------------------------------------------------------
// Leaflet default icon fix
// ---------------------------------------------------------------------
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ---------------------------------------------------------------------
// Custom marker icons (default + blue for public + selected)
// ---------------------------------------------------------------------
const defaultIcon = L.icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const blueIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const selectedIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// ---------------------------------------------------------------------
// FlyToBounds component
// ---------------------------------------------------------------------
function FlyToBounds({
  stations,
  userCoords,
}: {
  stations: MapStation[];
  userCoords: { lat: number; lng: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    // No stations → center on user
    if (!stations.length) {
      if (userCoords) {
        map.setView([userCoords.lat, userCoords.lng], 12);
      }
      return;
    }

    // Huge result set
    if (stations.length > 500) return;

    const bounds = L.latLngBounds(
      stations.map((s) => [s.latitude, s.longitude] as [number, number])
    );

    map.fitBounds(bounds, {
      padding: [30, 30],
    });
  }, [stations, userCoords, map]);

  return null;
}

// ---------------------------------------------------------------------
// Types — Change 1: Union type with discriminated "type" field
// ---------------------------------------------------------------------
interface MapStation {
  id: string;
  type: "peer" | "public";
  latitude: number;
  longitude: number;
  title: string;
  raw: ChargerResult | ChargingSiteResult;
}

interface ChargingMapProps {
  chargers: ChargerResult[];
  sites: ChargingSiteResult[];
  userCoords: { lat: number; lng: number } | null;
  selectedChargerId: string | null;
  onSelectCharger: (id: string) => void;
}

// ---------------------------------------------------------------------
// Cluster CSS (unchanged)
// ---------------------------------------------------------------------
const markerClusterStyles = `
.marker-cluster-small{background-color:rgba(181,226,140,0.6)}
.marker-cluster-small div{background-color:rgba(110,204,57,0.6)}
.marker-cluster-medium{background-color:rgba(253,156,115,0.6)}
.marker-cluster-medium div{background-color:rgba(241,128,32,0.6)}
.marker-cluster-large{background-color:rgba(255,215,0,0.6)}
.marker-cluster-large div{background-color:rgba(241,128,32,0.6)}
.marker-cluster{
background-clip:padding-box;
border-radius:20px
}
.marker-cluster div{
width:30px;
height:30px;
margin-left:5px;
margin-top:5px;
text-align:center;
border-radius:15px;
font-size:12px;
font-weight:700
}
.marker-cluster span{
line-height:30px
}
`;

// ---------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------
const ChargingMap = React.memo(function ChargingMap({
  chargers,
  sites,
  userCoords,
  selectedChargerId,
  onSelectCharger,
}: ChargingMapProps) {
  // -----------------------------------------------------------------
  // Change 2: Build stations from BOTH peer + public
  // -----------------------------------------------------------------
  const stations = useMemo(() => {
    // Peer stations from chargers
    const peerStations: MapStation[] = chargers
      .filter((c) => c.latitude != null && c.longitude != null)
      .map((c) => ({
        id: c.id,
        type: "peer" as const,
        latitude: c.latitude!,
        longitude: c.longitude!,
        title: c.title,
        raw: c,
      }));

    // Public stations from sites
    const publicStations: MapStation[] = sites
      .filter(
        (s) =>
          s.latitude != null &&
          s.longitude != null &&
          !isNaN(Number(s.latitude)) &&
          !isNaN(Number(s.longitude))
      )
      .map((s) => ({
        id: s.id,
        type: "public" as const,
        latitude: Number(s.latitude),
        longitude: Number(s.longitude),
        title: s.cpoName || s.location,
        raw: s,
      }));

    return [...peerStations, ...publicStations];
  }, [chargers, sites]);

  const peerCount = stations.filter((s) => s.type === "peer").length;
  const publicCount = stations.filter((s) => s.type === "public").length;
  const totalCount = stations.length;

  const initialCenter: [number, number] = userCoords
    ? [userCoords.lat, userCoords.lng]
    : [20.5937, 78.9629];

  // -----------------------------------------------------------------
  // Change 3: Popup content based on station.type
  // -----------------------------------------------------------------
  const renderPopup = (station: MapStation) => {
    if (station.type === "peer") {
      const raw = station.raw as ChargerResult;
      return (
        <>
          <h3 style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: 700 }}>
            {raw.title}
          </h3>
          <strong style={{ color: "#22914f" }}>Peer‑to‑Peer Charger</strong>
          <br />
          Host: {raw.hostName}
          <br />
          City: {raw.city}
          <br />
          State: {raw.state}
          <br />
          Charger: {raw.chargerType}
          <br />
          Power: {raw.powerKw ?? "-"} kW
          <br />
          Plug: {raw.plugType ?? "-"}
          <br />
          Price: ₹{raw.pricePerKwh}/kWh
        </>
      );
    }

    // Public station popup
    const raw = station.raw as ChargingSiteResult;
    return (
      <>
        <h3 style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: 700 }}>
          {raw.cpoName}
        </h3>
        <strong style={{ color: "#2563eb" }}>Public Charging Station</strong>
        <br />
        Location: {raw.location}
        <br />
        District: {raw.district}
        <br />
        City: {raw.cityVillage}
        <br />
        State: {raw.state}
        <br />
        Connectors: {raw.connectorSummary}
        <br />
        Ownership:{" "}
        <span
          style={{
            padding: "1px 6px",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: 700,
            background:
              raw.ownership.toLowerCase() === "government"
                ? "rgba(2, 132, 199, 0.12)"
                : "rgba(241, 128, 32, 0.12)",
            color:
              raw.ownership.toLowerCase() === "government"
                ? "#0284c7"
                : "#f18020",
          }}
        >
          {raw.ownership}
        </span>
      </>
    );
  };

  // -----------------------------------------------------------------
  // Change 4: Icon selection based on station.type
  // -----------------------------------------------------------------
  const getIcon = (station: MapStation) => {
    if (station.id === selectedChargerId) return selectedIcon;
    if (station.type === "public") return blueIcon;
    return defaultIcon;
  };

  return (
    <>
      <style>{markerClusterStyles}</style>

      <div
        className="charging-map-wrapper"
        style={{
          position: "relative",
          width: "100%",
          height: "600px",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        {/* ------------------------------------------------------------- */}
        {/* Change 5: Counter shows Peer / Public / Total separately       */}
        {/* ------------------------------------------------------------- */}
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 1000,
            background: "#fff",
            padding: "8px 12px",
            borderRadius: 8,
            boxShadow: "0 2px 8px rgba(0,0,0,.15)",
            fontWeight: 600,
            color: "#2563eb",
            fontSize: "12px",
            lineHeight: 1.6,
          }}
        >
          <div>
            <span style={{ color: "#22914f" }}>●</span> {peerCount} Peer
          </div>
          <div>
            <span style={{ color: "#2563eb" }}>●</span> {publicCount} Public
          </div>
          <div style={{ borderTop: "1px solid #e5e7eb", marginTop: "4px", paddingTop: "4px" }}>
            {totalCount} Total
          </div>
        </div>

        <MapContainer
          center={initialCenter}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
        >
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Change 6: FlyToBounds now uses combined stations (peer + public) */}
          <FlyToBounds
            stations={stations}
            userCoords={userCoords}
          />

          <MarkerClusterGroup
            chunkedLoading
            spiderfyOnMaxZoom
            maxClusterRadius={50}
          >
            {/* Change 7: sites prop is now consumed — all stations become markers */}
            {stations.map((station) => (
              <Marker
                key={`${station.type}-${station.id}`}
                position={[station.latitude, station.longitude]}
                icon={getIcon(station)}
                eventHandlers={{
                  click: () => onSelectCharger(station.id),
                }}
              >
                <Popup>{renderPopup(station)}</Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>

        <style>{`
          @media (max-width:640px){
            .charging-map-wrapper{
              height:400px!important;
            }
          }
        `}</style>
      </div>
    </>
  );
});

export default ChargingMap;