"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import Map, { Source, Layer, Marker } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { mapStyleLight, maptilerKey } from "@/lib/map";

import type { ChargerResult, ChargingSiteResult } from "@/lib/types";

import {
  MapPin, Zap, Clock, ExternalLink, HelpCircle,
  ChevronDown, ChevronUp, Play, Pause, RotateCcw
} from "lucide-react";

interface EVMapClientProps {
  chargers: ChargerResult[];
  sites: ChargingSiteResult[];
  selectedCharger: ChargerResult | ChargingSiteResult | null;
  onSelectCharger: (charger: ChargerResult | ChargingSiteResult) => void;
  userCoords: {
    lat: number;
    lng: number;
  };
}

type RouteGeometry =
  | {
    type: "LineString";
    coordinates: [number, number][];
  }
  | {
    type: "MultiLineString";
    coordinates: [number, number][][];
  };

// ─── Helpers ──────────────────────────────────────────────────────────────

function getStationTitle(station: ChargerResult | ChargingSiteResult) {
  return "title" in station ? station.title : station.cpoName;
}

function getAddress(station: ChargerResult | ChargingSiteResult) {
  return "address" in station ? station.address : station.location;
}

function isP2PStation(station: ChargerResult | ChargingSiteResult): boolean {
  return (
    "type" in station &&
    (station.type === "p2p" || station.category === "p2p")
  );
}

function getStationId(station: ChargerResult | ChargingSiteResult): string {
  return station.id;
}

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function EVMapClient({
  chargers,
  sites,
  selectedCharger,
  onSelectCharger,
  userCoords,
}: EVMapClientProps) {
  const mapRef = useRef<MapRef>(null);
  const simIndexRef = useRef<number>(-1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [viewport, setViewport] = useState({
    latitude: userCoords.lat,
    longitude: userCoords.lng,
    zoom: 12.5,
    pitch: 0,
    bearing: 0,
  });

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedIndex, setSimulatedIndex] = useState(-1);
  const [simulatedCoords, setSimulatedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [simulatedBearing, setSimulatedBearing] = useState(0);
  const [routeGeometry, setRouteGeometry] = useState<RouteGeometry | null>(null);
  const [routeDetails, setRouteDetails] = useState<{ distance: number; duration: number } | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  const isDemoKey = !process.env.NEXT_PUBLIC_MAPTILER_KEY;

  // Keep map in sync when userCoords change
  useEffect(() => {
    setViewport((v) => ({ ...v, latitude: userCoords.lat, longitude: userCoords.lng }));
  }, [userCoords.lat, userCoords.lng]);

  // When selectedCharger changes: auto-pan, reset simulation
  useEffect(() => {
    if (!selectedCharger) return;

    const stationLat = selectedCharger.latitude || 28.6139;
    const stationLng = selectedCharger.longitude || 77.2090;
    const midLat = (userCoords.lat + stationLat) / 2;
    const midLng = (userCoords.lng + stationLng) / 2;

    setViewport((v) => ({
      ...v,
      latitude: midLat,
      longitude: midLng,
      zoom: 13,
    }));
    setIsCollapsed(false);

    // Reset simulation states
    setIsSimulating(false);
    setSimulatedIndex(-1);
    setSimulatedCoords(null);
    setSimulatedBearing(0);
    simIndexRef.current = -1;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [selectedCharger?.id]);

  // Fetch route via MapTiler API
  useEffect(() => {
    if (!selectedCharger) {
      setRouteGeometry(null);
      setRouteDetails(null);
      return;
    }

    const userLat = userCoords.lat;
    const userLng = userCoords.lng;
    const stationLat = selectedCharger.latitude || 28.6139;
    const stationLng = selectedCharger.longitude || 77.2090;

    let cancelled = false;
    setIsLoadingRoute(true);

    const fetchRoute = async () => {
      try {
        const url = `https://api.maptiler.com/routing/v1/car/${userLng},${userLat};${stationLng},${stationLat}?key=${maptilerKey}&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Route API ${res.status}`);
        const data = await res.json();

        if (cancelled) return;

        if (data?.routes?.[0]) {
          const route = data.routes[0];
          setRouteGeometry(route.geometry);
          setRouteDetails({
            distance: route.distance,
            duration: route.duration,
          });
        } else {
          throw new Error("No route in response");
        }
      } catch {
        if (cancelled) return;
        // Fallback: Haversine straight line
        setRouteGeometry({
          type: "LineString",
          coordinates: [
            [userLng, userLat],
            [stationLng, stationLat],
          ],
        });
        const dist = calculateHaversineDistance(userLat, userLng, stationLat, stationLng);
        setRouteDetails({
          distance: dist * 1000,
          duration: (dist / 40) * 3600,
        });
      } finally {
        if (!cancelled) setIsLoadingRoute(false);
      }
    };

    fetchRoute();
    return () => { cancelled = true; };
  }, [selectedCharger?.id, userCoords.lat, userCoords.lng]);

  // Simulation ticker
  useEffect(() => {
    if (!isSimulating || !routeGeometry) return;

    const coords: [number, number][] =
      routeGeometry.type === "LineString"
        ? routeGeometry.coordinates
        : routeGeometry.type === "MultiLineString"
          ? routeGeometry.coordinates.flat()
          : [];

    if (coords.length < 2) return;

    intervalRef.current = setInterval(() => {
      const nextIdx = simIndexRef.current + 1;

      if (nextIdx >= coords.length) {
        setIsSimulating(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }

      simIndexRef.current = nextIdx;
      setSimulatedIndex(nextIdx);

      const [lng, lat] = coords[nextIdx];
      setSimulatedCoords({ lat, lng });

      // Calculate bearing to next point
      if (nextIdx + 1 < coords.length) {
        const [nextLng, nextLat] = coords[nextIdx + 1];
        const bearing = calculateBearing(lat, lng, nextLat, nextLng);
        setSimulatedBearing(bearing);
      }

      // Smooth camera follow
      setViewport((v) => ({
        ...v,
        latitude: lat,
        longitude: lng,
        zoom: 14,
      }));
    }, 150);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isSimulating, routeGeometry]);

  const handlePlay = useCallback(() => {
    if (!routeGeometry) return;
    const coords: [number, number][] =
      routeGeometry.type === "LineString"
        ? routeGeometry.coordinates
        : routeGeometry.type === "MultiLineString"
          ? routeGeometry.coordinates.flat(1)
          : [];

    if (simIndexRef.current >= coords.length - 1) {
      simIndexRef.current = -1;
      setSimulatedIndex(-1);
      setSimulatedCoords(null);
      setSimulatedBearing(0);
    }
    setIsSimulating(true);
  }, [routeGeometry]);

  const handlePause = useCallback(() => {
    setIsSimulating(false);
  }, []);

  const handleReset = useCallback(() => {
    setIsSimulating(false);
    simIndexRef.current = -1;
    setSimulatedIndex(-1);
    setSimulatedCoords(null);
    setSimulatedBearing(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Car bearing when not simulating
  const carBearing = selectedCharger
    ? calculateBearing(
      userCoords.lat,
      userCoords.lng,
      selectedCharger.latitude || 28.6139,
      selectedCharger.longitude || 77.2090
    )
    : 0;

  const routeGeoJson = useMemo(() => {
    if (!routeGeometry) return null;

    return {
      type: "Feature" as const,
      properties: {},
      geometry: routeGeometry,
    };
  }, [routeGeometry]);

  const routeCoords = useMemo<[number, number][]>(() => {
    if (!routeGeometry) return [];

    if (routeGeometry.type === "LineString") {
      return routeGeometry.coordinates;
    }

    if (routeGeometry.type === "MultiLineString") {
      return routeGeometry.coordinates.flat();
    }

    return [];
  }, [routeGeometry]);

  const userMarkerCoords = isSimulating && simulatedCoords
    ? simulatedCoords
    : userCoords;

  const carRotation = isSimulating ? simulatedBearing : carBearing;

  return (
    <div className="relative w-full h-full">
      {/* Demo Key Warning */}
      {isDemoKey && (
        <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 bg-amber-500/90 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm">
          <HelpCircle className="w-3.5 h-3.5" />
          Demo Map Active
        </div>
      )}

      <Map
        ref={mapRef}
        {...viewport}
        onMove={(evt) => {
          setViewport({
            latitude: evt.viewState.latitude,
            longitude: evt.viewState.longitude,
            zoom: evt.viewState.zoom,
            pitch: 0,
            bearing: 0,
          });
        }}
        mapStyle={mapStyleLight}
        dragRotate={false}
        pitchWithRotate={false}
        touchZoomRotate={false}
        maxPitch={0}
        minPitch={0}
        mapLib={maplibregl}
        style={{ width: "100%", height: "100%" }}
      >
        {/* Route Layer */}
        {routeGeoJson && (
          <Source id="route-source" type="geojson" data={routeGeoJson}>
            <Layer
              id="route-line"
              type="line"
              layout={{
                "line-join": "round",
                "line-cap": "round",
              }}
              paint={{
                "line-color": "#000000",
                "line-width": 5.5,
                "line-opacity": 0.95,
              }}
            />
          </Source>
        )}

        {/* User Car Marker */}
        <Marker
          latitude={userMarkerCoords.lat}
          longitude={userMarkerCoords.lng}
          anchor="center"
          rotation={carRotation}
        >
          <svg
            viewBox="0 0 24 48"
            className="w-6 h-12 drop-shadow-lg"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="3" y="8" width="18" height="32" rx="4" fill="#1a1a2e" stroke="#333" strokeWidth="1" />
            <rect x="5" y="10" width="14" height="8" rx="2" fill="#4a9eff" opacity="0.7" />
            <rect x="5" y="30" width="14" height="6" rx="2" fill="#4a9eff" opacity="0.5" />
            <rect x="5" y="18" width="14" height="12" rx="1" fill="#2a2a4a" />
            <rect x="1" y="10" width="3" height="6" rx="1.5" fill="#111" />
            <rect x="20" y="10" width="3" height="6" rx="1.5" fill="#111" />
            <rect x="1" y="32" width="3" height="6" rx="1.5" fill="#111" />
            <rect x="20" y="32" width="3" height="6" rx="1.5" fill="#111" />
            <rect x="0" y="12" width="3" height="2" rx="0.5" fill="#555" />
            <rect x="21" y="12" width="3" height="2" rx="0.5" fill="#555" />
            <rect x="5" y="8" width="4" height="2" rx="0.5" fill="#ffe066" />
            <rect x="15" y="8" width="4" height="2" rx="0.5" fill="#ffe066" />
          </svg>
        </Marker>

        {/* Station Markers */}
        <>
          {/* P2P Chargers */}
          {chargers.map((charger) => {
            const lat = charger.latitude || 28.6139;
            const lng = charger.longitude || 77.2090;
            const isSelected = selectedCharger?.id === charger.id;

            return (
              <Marker
                key={`charger-${charger.id}`}
                latitude={lat}
                longitude={lng}
                anchor="center"
              >
                <div className="group relative flex flex-col items-center">
                  <div
                    onClick={() => onSelectCharger(charger)}
                    className={`cursor-pointer transition-transform hover:scale-125 ${
                      isSelected
                        ? "w-6 h-6 bg-black border-4 border-white ring-2 ring-black rounded-full animate-bounce"
                        : "w-3.5 h-3.5 bg-emerald-500 border-2 border-emerald-300 rounded-full shadow-md"
                    }`}
                  />
                  <div className="absolute bottom-full mb-1 hidden group-hover:block pointer-events-none">
                    <div className="bg-zinc-900 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap">
                      {charger.title}
                    </div>
                  </div>
                </div>
              </Marker>
            );
          })}

          {/* Public Charging Sites */}
          {sites.map((site) => {
            const isSelected = selectedCharger?.id === site.id;

            return (
              <Marker
                key={`site-${site.id}`}
                latitude={site.latitude}
                longitude={site.longitude}
                anchor="center"
              >
                <div className="group relative flex flex-col items-center">
                  <div
                    onClick={() => onSelectCharger(site)}
                    className={`cursor-pointer transition-transform hover:scale-125 ${
                      isSelected
                        ? "w-6 h-6 bg-black border-4 border-white ring-2 ring-black rounded-full animate-bounce"
                        : "w-3.5 h-3.5 bg-blue-500 border-2 border-blue-300 rounded-full shadow-md"
                    }`}
                  />
                  <div className="absolute bottom-full mb-1 hidden group-hover:block pointer-events-none">
                    <div className="bg-zinc-900 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap">
                      {site.cpoName}
                    </div>
                  </div>
                </div>
              </Marker>
            );
          })}
        </>
      </Map>

      {/* Bottom Card */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pointer-events-none">
        {selectedCharger ? (
          <div className="bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4 shadow-2xl pointer-events-auto transition-all duration-300">
            {/* Grab handle with collapsible trigger */}
            <div
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex justify-between items-center cursor-pointer pb-2 border-b border-zinc-900 mb-3 group hover:text-zinc-200"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`text-[8px] font-bold font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${
                    isP2PStation(selectedCharger)
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                  }`}
                >
                  {isP2PStation(selectedCharger) ? "P2P Station" : "Public Station"}
                </span>
                {isCollapsed && (
                  <span className="text-[10px] font-mono text-zinc-500 animate-pulse">
                    Tap to expand route details
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono text-zinc-500 group-hover:text-zinc-400">
                  {isCollapsed ? "Expand" : "Collapse"}
                </span>
                <button className="text-zinc-500 group-hover:text-zinc-300 p-1 rounded-full bg-zinc-900 border border-zinc-800/80">
                  {isCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* Core Card Info (always visible) */}
            <div className="flex justify-between items-start mb-2">
              <div className="min-w-0 flex-1 pr-3">
                <h3 className="text-sm font-bold text-zinc-100 truncate">
                  {getStationTitle(selectedCharger)}
                </h3>
                <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
                  <span>{getAddress(selectedCharger)}</span>
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[9px] font-mono text-zinc-500 block uppercase tracking-wider">
                  Charging Cost
                </span>
                <span className="text-base font-black text-emerald-400 block mt-0.5">
                  {"pricePerKwh" in selectedCharger
                    ? `₹${selectedCharger.pricePerKwh}/kWh`
                    : "Public Station"}
                </span>
              </div>
            </div>

            {/* Expandable portion */}
            {!isCollapsed && (
              <div className="space-y-3 animate-in fade-in duration-200">
                {/* Route metrics grid */}
                <div className="grid grid-cols-3 gap-2 bg-zinc-900/50 border border-zinc-800/80 p-2.5 rounded-xl text-center">
                  <div>
                    <span className="text-[8px] font-mono text-zinc-500 uppercase block">Distance</span>
                    <span className="text-xs font-mono font-bold text-zinc-200 block mt-0.5">
                      {isLoadingRoute ? (
                        <span className="text-zinc-500">...</span>
                      ) : routeDetails ? (
                        `${(routeDetails.distance / 1000).toFixed(1)} km`
                      ) : (
                        "N/A"
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] font-mono text-zinc-500 uppercase block">Est. Time</span>
                    <span className="text-xs font-mono font-bold text-zinc-200 block mt-0.5 flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      {isLoadingRoute ? (
                        <span className="text-zinc-500">...</span>
                      ) : routeDetails ? (
                        `${Math.round(routeDetails.duration / 60)} min`
                      ) : (
                        "N/A"
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] font-mono text-zinc-500 uppercase block">Power/Plug</span>
                    <span className="text-xs font-mono font-bold text-zinc-200 block mt-0.5 truncate">
                      {"powerKw" in selectedCharger ? (
                        <>
                          {selectedCharger.powerKw ? `${selectedCharger.powerKw} kW` : "—"}
                          {" • "}
                          {selectedCharger.plugType || "N/A"}
                        </>
                      ) : (
                        selectedCharger.connectorSummary || "Various"
                      )}
                    </span>
                  </div>
                </div>

                {/* Trip simulator dashboard */}
                {routeCoords.length > 0 && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between shadow-inner">
                    <div className="flex items-center gap-2.5">
                      <div className="relative flex h-3 w-3">
                        {isSimulating && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        )}
                        <span className={`relative inline-flex rounded-full h-3 w-3 ${isSimulating ? "bg-emerald-500" : "bg-zinc-600"}`}></span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-zinc-300 block font-bold">
                          {isSimulating ? "LIVE GPS SIMULATING" : "SIMULATE LIVE POSITION"}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-500">
                          {simulatedIndex !== -1
                            ? `Progress: ${simulatedIndex + 1}/${routeCoords.length} trackpoints`
                            : "Position: Starting point"}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {isSimulating ? (
                        <button
                          onClick={handlePause}
                          className="bg-amber-600/90 hover:bg-amber-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                          title="Pause Simulation"
                        >
                          <Pause className="w-3 h-3" />
                          Pause
                        </button>
                      ) : (
                        <button
                          onClick={handlePlay}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                          title="Start GPS Route Tracking"
                        >
                          <Play className="w-3 h-3" />
                          {simulatedIndex !== -1 ? "Resume" : "Start Trip"}
                        </button>
                      )}
                      {simulatedIndex !== -1 && (
                        <button
                          onClick={handleReset}
                          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                          title="Reset vehicle to starting point"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions panel */}
                <div className="flex gap-2.5 pt-1">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&origin=${userCoords.lat},${userCoords.lng}&destination=${selectedCharger.latitude || 28.6139},${selectedCharger.longitude || 77.2090}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Launch Maps
                  </a>
                  {"pricePerKwh" in selectedCharger && (
                    <button
                      className={`flex-1 text-white text-xs font-bold py-2.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        isP2PStation(selectedCharger)
                          ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-950/30"
                          : "bg-blue-600 hover:bg-blue-700 shadow-blue-950/30"
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5 shrink-0" />
                      Book Slot
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-zinc-950/85 backdrop-blur-xl border border-zinc-800 rounded-xl p-3 text-center shadow-lg pointer-events-auto">
            <p className="text-[11px] text-zinc-400">
              Select any station to map the dynamic path routing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}