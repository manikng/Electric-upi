"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Popup, useMap, Circle, CircleMarker } from "react-leaflet";
import { LatLngExpression } from "leaflet";
import { ChargerResult } from "@/lib/types";

interface ChargerMapProps {
  chargers: ChargerResult[];
  userCoords: { lat: number; lng: number } | null;
  selectedChargerId: string | null;
  onSelectCharger: (chargerId: string) => void;
  radius: number;
}

const defaultCenter: LatLngExpression = [28.6139, 77.209];

function MapAutoCenter({ center }: { center: LatLngExpression }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

export default function ChargerMap({ chargers, userCoords, selectedChargerId, onSelectCharger, radius }: ChargerMapProps) {
  const [mapCenter, setMapCenter] = useState<LatLngExpression>(defaultCenter);

  useEffect(() => {
    if (userCoords) {
      setMapCenter([userCoords.lat, userCoords.lng]);
    } else if (chargers.length > 0) {
      const firstWithGeo = chargers.find((charger) => charger.latitude !== null && charger.longitude !== null);
      if (firstWithGeo) {
        setMapCenter([firstWithGeo.latitude!, firstWithGeo.longitude!]);
      }
    }
  }, [userCoords, chargers]);

  const markers = useMemo(
    () =>
      chargers
        .filter((charger) => charger.latitude !== null && charger.longitude !== null)
        .map((charger) => ({
          id: charger.id,
          position: [charger.latitude!, charger.longitude!] as [number, number],
          title: charger.title,
          price: charger.pricePerKwh,
        })),
    [chargers]
  );

  const selectedMarker = markers.find((marker) => marker.id === selectedChargerId);

  return (
    <div className="map-card" style={{ marginBottom: "var(--space-8)" }}>
      <div className="map-card-header">
        <div>
          <div className="section-eyebrow">Map View</div>
          <h2 className="section-title">Browse chargers on the map</h2>
          <p style={{ marginTop: "var(--space-2)", color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
            Use the map to explore nearby EV chargers. Select a marker to highlight the charger in the list.
          </p>
        </div>
      </div>
      <div style={{ height: "520px", width: "100%", borderRadius: "24px", overflow: "hidden", border: "1.5px solid var(--color-border)" }}>
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {userCoords && (
            <>
              <CircleMarker
                center={[userCoords.lat, userCoords.lng]}
                radius={10}
                pathOptions={{ color: "#0f766e", fillColor: "#0f766e", fillOpacity: 0.9 }}
              >
                <Popup>Your location</Popup>
              </CircleMarker>
              <Circle
                center={[userCoords.lat, userCoords.lng]}
                radius={radius * 1000}
                pathOptions={{ color: "var(--color-primary)", fillColor: "rgba(0,110,47,0.12)", weight: 2 }}
              />
            </>
          )}
          {markers.map((marker) => (
            <CircleMarker
              key={marker.id}
              center={marker.position}
              radius={10}
              pathOptions={{
                color: marker.id === selectedChargerId ? "#0f766e" : "#2563eb",
                fillColor: marker.id === selectedChargerId ? "#0f766e" : "#38bdf8",
                fillOpacity: 0.95,
              }}
              eventHandlers={{
                click: () => onSelectCharger(marker.id),
              }}
            >
              <Popup>
                <strong>{marker.title}</strong>
                <div style={{ marginTop: "0.4rem" }}>
                  ₹{marker.price.toFixed(2)} / kWh
                </div>
                <div style={{ marginTop: "0.8rem", fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                  Click a listing to sync selection.
                </div>
              </Popup>
            </CircleMarker>
          ))}
          <MapAutoCenter center={mapCenter} />
        </MapContainer>
      </div>
      {selectedMarker ? (
        <div style={{ marginTop: "var(--space-4)", padding: "var(--space-4)", borderRadius: "var(--radius-lg)", background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
          <strong>Selected charger:</strong> {selectedMarker.title}
        </div>
      ) : null}
    </div>
  );
}
