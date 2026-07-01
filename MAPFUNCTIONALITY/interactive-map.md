import React, { useState, useEffect } from "react";
import Map, { Source, Layer, Marker } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { 
  MapPin, 
  Zap, 
  Clock, 
  ShieldCheck, 
  ExternalLink, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Play, 
  Pause, 
  RotateCcw,
  Navigation
} from "lucide-react";
import { ChargerResult } from "../lib/types";

interface InteractiveMapProps {
  chargers: ChargerResult[];
  selectedCharger: ChargerResult | null;
  onSelectCharger: (charger: ChargerResult) => void;
  userCoords: { lat: number; lng: number };
}

// Helper to calculate bearing between two coordinates to rotate the car heading dynamically
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

// Fallback Haversine distance calculator
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function InteractiveMap({
  chargers,
  selectedCharger,
  onSelectCharger,
  userCoords,
}: InteractiveMapProps) {
  // Retrieve MapTiler Key from Vite Env (with a working demo key fallback)
  const mapTilerKey = (import.meta as any).env.VITE_MAPTILER_KEY || "get_your_own_OpIi9ZTMz5Ga6M8K8";

  // Map viewport state: Strict 2D config (no pitch, no bearing)
  const [viewport, setViewport] = useState({
    latitude: userCoords.lat,
    longitude: userCoords.lng,
    zoom: 12.5,
    pitch: 0,
    bearing: 0,
  });

  // Collapsible Bottom Card state
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Simulation state engines
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedIndex, setSimulatedIndex] = useState<number>(-1);
  const [simulatedCoords, setSimulatedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [simulatedBearing, setSimulatedBearing] = useState<number>(0);

  // Keep map in sync when user coords change
  useEffect(() => {
    setViewport((prev) => ({
      ...prev,
      latitude: userCoords.lat,
      longitude: userCoords.lng,
    }));
  }, [userCoords]);

  // When a charger is selected, auto-pan to position it nicely and expand the bottom sheet
  useEffect(() => {
    if (selectedCharger) {
      setViewport((prev) => ({
        ...prev,
        latitude: (userCoords.lat + (selectedCharger.latitude || 28.6139)) / 2,
        longitude: (userCoords.lng + (selectedCharger.longitude || 77.2090)) / 2,
        zoom: 13,
      }));
      // Auto expand on click to show route specs
      setIsCollapsed(false);
    }
  }, [selectedCharger, userCoords]);

  // Route & bearing states
  const [routeGeometry, setRouteGeometry] = useState<any | null>(null);
  const [routeDetails, setRouteDetails] = useState<{ distance: number; duration: number } | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // Dynamic car rotation angle based on destination heading
  const carBearing = selectedCharger
    ? calculateBearing(
        userCoords.lat,
        userCoords.lng,
        selectedCharger.latitude || 28.6139,
        selectedCharger.longitude || 77.2090
      )
    : 0;

  // Fetch minimal route polyline
  useEffect(() => {
    if (!selectedCharger) {
      setRouteGeometry(null);
      setRouteDetails(null);
      return;
    }

    const fetchLiveRoute = async () => {
      setIsLoadingRoute(true);
      const userLng = userCoords.lng;
      const userLat = userCoords.lat;
      const stationLng = selectedCharger.longitude || 77.2090;
      const stationLat = selectedCharger.latitude || 28.6139;

      try {
        const url = `https://api.maptiler.com/routing/v1/car/${userLng},${userLat};${stationLng},${stationLat}?key=${mapTilerKey}&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Route fetch error");
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          setRouteGeometry(data.routes[0].geometry);
          setRouteDetails({
            distance: data.routes[0].distance,
            duration: data.routes[0].duration,
          });
        } else {
          throw new Error("No paths");
        }
      } catch (err) {
        // Safe fall-back straight line track
        setRouteGeometry({
          type: "LineString",
          coordinates: [
            [userLng, userLat],
            [stationLng, stationLat],
          ],
        });
        const distKm = calculateHaversineDistance(userLat, userLng, stationLat, stationLng);
        setRouteDetails({
          distance: distKm * 1000,
          duration: (distKm / 40) * 3600, // 40 km/h est.
        });
      } finally {
        setIsLoadingRoute(false);
      }
    };

    fetchLiveRoute();
  }, [selectedCharger, userCoords, mapTilerKey]);

  // Reset simulation when selected charger changes
  useEffect(() => {
    setIsSimulating(false);
    setSimulatedIndex(-1);
    setSimulatedCoords(null);
    setSimulatedBearing(0);
  }, [selectedCharger]);

  // Active Simulation ticker interval
  useEffect(() => {
    let timer: any = null;
    if (isSimulating && routeGeometry && routeGeometry.coordinates && routeGeometry.coordinates.length > 0) {
      const coords = routeGeometry.coordinates;
      let nextIndex = simulatedIndex + 1;

      // Wrap around if reached end
      if (nextIndex >= coords.length) {
        nextIndex = 0;
      }

      timer = setInterval(() => {
        if (nextIndex < coords.length) {
          const pt = coords[nextIndex];
          setSimulatedCoords({ lat: pt[1], lng: pt[0] });
          setSimulatedIndex(nextIndex);

          // Calculate heading to the next point
          if (nextIndex < coords.length - 1) {
            const nextPt = coords[nextIndex + 1];
            const brg = calculateBearing(pt[1], pt[0], nextPt[1], nextPt[0]);
            setSimulatedBearing(brg);
          }
          nextIndex++;
        } else {
          setIsSimulating(false);
          clearInterval(timer);
        }
      }, 150); // Fluid tracking update frequency
    } else {
      if (timer) clearInterval(timer);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isSimulating, routeGeometry, simulatedIndex]);

  // Smoothly center the camera on the moving car during active simulation
  useEffect(() => {
    if (isSimulating && simulatedCoords) {
      setViewport((prev) => ({
        ...prev,
        latitude: simulatedCoords.lat,
        longitude: simulatedCoords.lng,
        zoom: 14, // Zoom in slightly for that dynamic "turn-by-turn" driving perspective
      }));
    }
  }, [isSimulating, simulatedCoords]);

  const routeGeoJson = routeGeometry
    ? {
        type: "Feature" as const,
        properties: {},
        geometry: routeGeometry,
      }
    : null;

  // Ultra-minimal "dataviz-light" background theme
  const mapStyleUrl = `https://api.maptiler.com/maps/dataviz-light/style.json?key=${mapTilerKey}`;
  const isDemoKey = mapTilerKey === "get_your_own_OpIi9ZTMz5Ga6M8K8" || !(import.meta as any).env.VITE_MAPTILER_KEY;

  return (
    <div id="interactive_radar_map_container" className="bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-800 relative h-[560px] flex flex-col">
      {/* Sandbox Key Warning */}
      {isDemoKey && (
        <div id="demo_map_warning_badge" className="absolute top-3 right-3 z-30 bg-zinc-900/90 border border-zinc-800 text-zinc-300 text-[10px] font-mono px-2 py-1 rounded-lg backdrop-blur-md flex items-center gap-1.5 shadow-md">
          <HelpCircle className="h-3.5 w-3.5 text-zinc-500" />
          <span>Demo Map Active</span>
        </div>
      )}

      {/* Map Canvas */}
      <div className="flex-1 w-full relative">
        <Map
          {...viewport}
          onMove={(evt) => {
            // Lock map to 2D state strictly (prevent accidental pitch/bearing changes)
            setViewport({
              ...evt.viewState,
              pitch: 0,
              bearing: 0,
            });
          }}
          mapLib={maplibregl}
          mapStyle={mapStyleUrl}
          style={{ width: "100%", height: "100%" }}
          dragRotate={false}
          pitchWithRotate={false}
          touchZoomRotate={false}
          maxPitch={0}
          minPitch={0}
        >
          {/* USER VEHICLE: Sleek top-down modern car exact to image */}
          <Marker 
            longitude={simulatedCoords ? simulatedCoords.lng : userCoords.lng} 
            latitude={simulatedCoords ? simulatedCoords.lat : userCoords.lat} 
            anchor="center"
          >
            <div
              className="relative pointer-events-none z-20 transition-transform duration-100"
              style={{ transform: `rotate(${simulatedCoords ? simulatedBearing : carBearing}deg)` }}
            >
              {/* Sleek Minimal Car Vector */}
              <svg viewBox="0 0 24 48" className="w-6 h-12 drop-shadow-[0_4px_6px_rgba(0,0,0,0.25)]">
                {/* Wheels */}
                <rect x="0" y="8" width="2" height="6" rx="1" fill="#18181b" />
                <rect x="22" y="8" width="2" height="6" rx="1" fill="#18181b" />
                <rect x="0" y="32" width="2" height="6" rx="1" fill="#18181b" />
                <rect x="22" y="32" width="2" height="6" rx="1" fill="#18181b" />
                {/* Car Chassis Body */}
                <rect x="2" y="3" width="20" height="42" rx="7" fill="#ffffff" stroke="#18181b" strokeWidth="2.5" />
                {/* Front Windshield Glass */}
                <path d="M 4 14 Q 12 11 20 14 L 18 19 Q 12 18 6 19 Z" fill="#18181b" />
                {/* Roof Glass Top Panel */}
                <rect x="5" y="20" width="14" height="12" rx="3" fill="#27272a" opacity="0.9" />
                {/* Rear Window Glass */}
                <path d="M 5 35 Q 12 34 19 35 L 18 38 Q 12 37 6 38 Z" fill="#18181b" />
                {/* Sleek Side Mirrors */}
                <rect x="-1" y="11" width="2" height="3" rx="0.5" fill="#ffffff" stroke="#18181b" strokeWidth="1" />
                <rect x="23" y="11" width="2" height="3" rx="0.5" fill="#ffffff" stroke="#18181b" strokeWidth="1" />
              </svg>
            </div>
          </Marker>

          {/* EV Charging Station Pins */}
          {chargers.map((c) => {
            const isP2P = c.type === "peer-to-peer";
            const isSelected = selectedCharger?.id === c.id;
            const lat = c.latitude || 28.6139;
            const lng = c.longitude || 77.2090;

            if (isSelected) {
              // Exact destination node style from image: Clean concentric target dot
              return (
                <Marker key={c.id} longitude={lng} latitude={lat} anchor="center">
                  <div className="relative pointer-events-auto z-30 flex flex-col items-center select-none">
                    <div className="w-6 h-6 bg-black rounded-full border-4 border-white shadow-xl ring-2 ring-black flex items-center justify-center animate-bounce">
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-zinc-950 text-white px-2 py-0.5 rounded border border-zinc-800 shadow-md mt-1.5 whitespace-nowrap">
                      {c.title.split(" ")[0]}
                    </span>
                  </div>
                </Marker>
              );
            }

            // Normal stations: Clean, tiny minimalist dots so map remains ultra tidy
            return (
              <Marker
                key={c.id}
                longitude={lng}
                latitude={lat}
                anchor="center"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  onSelectCharger(c);
                }}
              >
                <div className="cursor-pointer group relative flex items-center justify-center p-2">
                  <div
                    className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 shadow-md ${
                      isP2P
                        ? "bg-emerald-500 border-white hover:scale-125 hover:ring-2 hover:ring-emerald-400"
                        : "bg-blue-500 border-white hover:scale-125 hover:ring-2 hover:ring-blue-400"
                    }`}
                  />
                  <div className="absolute top-full mt-1 hidden group-hover:block bg-zinc-950 text-zinc-300 text-[8px] font-bold font-mono px-1.5 py-0.5 rounded border border-zinc-800 whitespace-nowrap shadow-lg z-50">
                    {c.title.split(" ")[0]} • ₹{c.pricePerKwh}
                  </div>
                </div>
              </Marker>
            );
          })}

          {/* Crisp Bold GeoJSON Routing Path Layer */}
          {routeGeoJson && (
            <Source id="route-source" type="geojson" data={routeGeoJson}>
              <Layer
                id="route-layer"
                type="line"
                layout={{
                  "line-join": "round",
                  "line-cap": "round",
                }}
                paint={{
                  "line-color": "#000000", // Solid crisp black path line
                  "line-width": 5.5,
                  "line-opacity": 0.95,
                }}
              />
            </Source>
          )}
        </Map>
      </div>

      {/* Bottom overlay detail block */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pointer-events-none">
        {selectedCharger ? (
          <div className="bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4 shadow-2xl pointer-events-auto transition-all duration-300 animate-in slide-in-from-bottom-5">
            
            {/* Grab handle with collapsible trigger toggle */}
            <div 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex justify-between items-center cursor-pointer pb-2 border-b border-zinc-900 mb-3 group hover:text-zinc-200"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`text-[8px] font-bold font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${
                    selectedCharger.type === "peer-to-peer"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                  }`}
                >
                  {selectedCharger.type === "peer-to-peer" ? "P2P Station" : "Commercial Hub"}
                </span>
                {isCollapsed && (
                  <span className="text-[10px] font-mono text-zinc-500 animate-pulse">
                    Click to expand track details
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono text-zinc-500 group-hover:text-zinc-400">
                  {isCollapsed ? "Expand" : "Collapse"}
                </span>
                <button
                  className="text-zinc-500 group-hover:text-zinc-300 p-1 rounded-full bg-zinc-900 border border-zinc-800/80"
                  aria-label="Toggle collapsible detail sheet"
                >
                  {isCollapsed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </div>
            </div>

            {/* Core Card Info (Always visible, even when collapsed!) */}
            <div className="flex justify-between items-start mb-2">
              <div className="min-w-0 flex-1 pr-3">
                <h4 className="text-sm font-bold text-zinc-100 truncate">{selectedCharger.title}</h4>
                <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5 flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-zinc-500 shrink-0" />
                  <span>{selectedCharger.address}</span>
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[9px] font-mono text-zinc-500 block uppercase tracking-wider">
                  CHARGING COST
                </span>
                <span className="text-base font-black text-emerald-400 block mt-0.5">
                  ₹{selectedCharger.pricePerKwh}/kWh
                </span>
              </div>
            </div>

            {/* EXPANDABLE PORTION */}
            {!isCollapsed && (
              <div className="space-y-3 animate-in fade-in duration-200">
                
                {/* Dynamic Calculated Route Metrics */}
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
                      <Clock className="h-3 w-3 text-zinc-500" />
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
                      {selectedCharger.powerKw} kW • {selectedCharger.plugType}
                    </span>
                  </div>
                </div>

                {/* TRIP SIMULATOR DASHBOARD PANEL */}
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
                          ? `Progress: ${simulatedIndex + 1}/${routeGeometry?.coordinates.length || 0} trackpoints`
                          : "Position: Starting point"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {isSimulating ? (
                      <button
                        onClick={() => setIsSimulating(false)}
                        className="bg-amber-600/90 hover:bg-amber-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Pause Simulation"
                      >
                        <Pause className="h-3 w-3" />
                        <span>Pause</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsSimulating(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Start GPS Route Tracking"
                      >
                        <Play className="h-3 w-3" />
                        <span>{simulatedIndex !== -1 ? "Resume" : "Start Trip"}</span>
                      </button>
                    )}

                    {simulatedIndex !== -1 && (
                      <button
                        onClick={() => {
                          setIsSimulating(false);
                          setSimulatedIndex(-1);
                          setSimulatedCoords(null);
                          setSimulatedBearing(0);
                        }}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        title="Reset vehicle back to starting point"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Actions Panel */}
                <div className="flex gap-2.5 pt-1">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedCharger.latitude},${selectedCharger.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Launch Maps</span>
                  </a>
                  <button
                    onClick={() => onSelectCharger(selectedCharger)}
                    className={`flex-1 text-white text-xs font-bold py-2.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      selectedCharger.type === "peer-to-peer"
                        ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-950/30"
                        : "bg-blue-600 hover:bg-blue-700 shadow-blue-950/30"
                    }`}
                  >
                    <Zap className="h-3.5 w-3.5 shrink-0" />
                    <span>Book Slot</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-zinc-950/85 backdrop-blur-xl border border-zinc-800 rounded-xl p-3 text-center shadow-lg">
            <p className="text-[11px] text-zinc-400">
              Select any station to map the dynamic path routing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
