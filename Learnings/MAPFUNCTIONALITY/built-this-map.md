# Radar Map & Collapsible Trip Simulator Documentation

This document describes the technical architecture, data model, APIs, and step-by-step control flow of the custom 2D minimalist map and its collapsible trip-simulation sheet.

---

## 1. Tech Stack & Infrastructure

- **Frontend Map Library**: `react-map-gl` (specifically the `react-map-gl/maplibre` wrapper) for fully declarative React bindings.
- **Rendering Engine**: `maplibre-gl` for hardware-accelerated 2D vector map canvas rendering.
- **Map Styles & Vector Tiles**: **MapTiler** (using the `streets-v2-dark` and ultra-minimalist `dataviz-light` themes).
- **Backend Database**: **Supabase PostgreSQL** managing ~31,000+ public charging stations and custom host P2P chargers.
- **ORM / Migrations**: **Drizzle ORM** for fully typed Postgres queries and rapid geometric bounding-box lookups.
- **Icons**: `lucide-react` (Chevron, Play, Pause, Zap, Clock, ShieldCheck, etc.).

---

## 2. API Keys & Environment Configurations

The following variables are injected into the application runtime via standard Node environment configuration (`.env`):

```env
# Supabase DB Connection (Direct Pooler Link)
DATABASE_URL="postgresql://postgres:Ms338453%40%23%40%23@db.lyvjsxxpdqufjxcxppwt.supabase.co:5432/postgres"

# MapTiler Service API Key
VITE_MAPTILER_KEY="MGfm2iX7ZF7UYCnVAxlk"
NEXT_PUBLIC_MAPTILER_KEY="MGfm2iX7ZF7UYCnVAxlk"
```

---

## 3. Architecture & Data Model (Drizzle Schema)

Two central tables support the map pins:
1. **Host Chargers (`chargers`)**: Peer-to-peer user-hosted home/office ports.
2. **Govt/Public Sites (`charging_sites`)**: Over 30,000 official public charging hubs across India.

### Schema Blueprint (`/src/lib/schema.ts`):
```typescript
import { pgTable, uuid, text, decimal, integer, timestamp, boolean } from "drizzle-orm/pg-core";

// Peer-to-Peer Host Chargers
export const chargers = pgTable("chargers", {
  id: uuid("id").primaryKey().defaultNow(),
  hostId: uuid("host_id").notNull(),
  title: text("title").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  pricePerKwh: decimal("price_per_kwh", { precision: 6, scale: 2 }).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  powerKw: decimal("power_kw", { precision: 6, scale: 2 }),
  plugType: text("plug_type"),
  site_type: text("site_type").default("home"), // home | commercial | public
});

// Government PCS Public Stations (30k+ records)
export const chargingSites = pgTable("charging_sites", {
  id: uuid("id").primaryKey().defaultNow(),
  cpoName: text("cpo_name").notNull(),
  ownership: text("ownership").notNull(),
  state: text("state").notNull(),
  district: text("district").notNull(),
  cityVillage: text("city_village").notNull(),
  location: text("location").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
});
```

---

## 4. Control Flow Diagram

Below is the execution pipeline showing how user interaction, database bounding-box calculations, MapTiler routing, and the real-time simulation intervals communicate:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           1. INITIAL STATE                              │
│  • App detects browser/GPS user location (e.g. New Delhi).               │
│  • Frontend calls GET `/api/chargers?lat=28.61&lng=77.20` on Express.   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      2. OPTIMIZED BACKEND LOOKUP                        │
│  • Express checks if database is Supabase Postgres.                      │
│  • Computes a fast bounding-box of ~35 km (±0.35° Lat/Lng).              │
│  • SQL executes index search: `latitude BETWEEN 28.26 AND 28.96` etc.    │
│  • Combines P2P Chargers & local Public Charging Sites (LIMIT 150).     │
│  • Sends structured array back to client.                               │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            3. MAP LAYOUT                                │
│  • MapStyle loaded strictly in 2D (Pitch=0, Bearing=0, Drag-Rotate=Off) │
│  • User Car rendered at coordinate center using custom white Tesla SVG.  │
│  • All adjacent charger points mapped as minimal, clean color-coded dots│
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                 User clicks on a station pin node
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    4. ROUTING & ANGLE COMPUTATION                       │
│  • SelectedCharger ID set in state.                                    │
│  • Calculates instant trigonometric bearing (car rotation heading).     │
│  • Calls MapTiler Routing API: GET `/routing/v1/car/...`                │
│  • If MapTiler succeeds: Receives full LineString geometry list.         │
│  • If MapTiler key fails: Safe fallbacks back to Haversine straight path│
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                Map draws solid black trace path on canvas
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     5. COLLAPSIBLE TRIP SIMULATOR                       │
│  • Bottom HUD slides in displaying computed Distance (km) and Duration. │
│  • User toggles Collapsible Arrow: Hides/shows metrics & simulator.     │
│  • User clicks "Start Trip": Toggles state `isSimulating = true`.       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                          Simulation timer starts (150ms)
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         6. REAL-TIME TRACKING                           │
│  • Timer advances `simulatedIndex` point by point.                      │
│  • Updates vehicle coordinate on map.                                  │
│  • Automatically pans map center to follow the moving car.             │
│  • Dynamically calculates bearing angle `pt[n] ──> pt[n+1]` to rotate   │
│    the vehicle vector vectorially.                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Implementation Files

### A. High Performance Bounding-Box Server Endpoint (`/server.ts`)
To prevent loading all 31,000+ public database rows into front-end memory, the server performs a highly optimized database spatial filter:

```typescript
app.get("/api/chargers", async (req, res) => {
  const latParam = req.query.lat ? parseFloat(String(req.query.lat)) : null;
  const lngParam = req.query.lng ? parseFloat(String(req.query.lng)) : null;

  let p2pChargers: any[] = [];
  let pubSites: any[] = [];
  let allConnectorProfiles: any[] = [];
  let allUsers: any[] = [];

  if (isPostgres && db) {
    try {
      p2pChargers = await db.select().from(chargers);
      allUsers = await db.select().from(users);

      if (latParam !== null && lngParam !== null) {
        // Fetch public charging sites within a fast ~35 km (0.35 degrees bounding box)
        const dLat = 0.35;
        const dLng = 0.35;
        
        pubSites = await db.select()
          .from(chargingSites)
          .where(
            and(
              sql`CAST(${chargingSites.latitude} AS DOUBLE PRECISION) BETWEEN ${latParam - dLat} AND ${latParam + dLat}`,
              sql`CAST(${chargingSites.longitude} AS DOUBLE PRECISION) BETWEEN ${lngParam - dLng} AND ${lngParam + dLng}`
            )
          )
          .limit(150);

        if (pubSites.length > 0) {
          const siteIds = pubSites.map((s: any) => s.id);
          allConnectorProfiles = await db.select()
            .from(siteConnectorProfiles)
            .where(inArray(siteConnectorProfiles.siteId, siteIds));
        }
      } else {
        pubSites = await db.select().from(chargingSites).limit(100);
      }
    } catch (err) {
      console.error("Optimized Postgres query failed:", err);
    }
  }
  // Data compiling mapping follows...
});
```

---

### B. Interactive Map & Collapsible HUD Component (`/src/components/InteractiveMap.tsx`)
This is the unified visual component that embeds the map canvas, custom SVG vehicle nodes, routing polyline overlays, and the control state dashboard:

```tsx
import React, { useState, useEffect } from "react";
import Map, { Source, Layer, Marker } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, Zap, Clock, ChevronDown, ChevronUp, Play, Pause, RotateCcw, ExternalLink } from "lucide-react";
import { ChargerResult } from "../lib/types";

interface InteractiveMapProps {
  chargers: ChargerResult[];
  selectedCharger: ChargerResult | null;
  onSelectCharger: (charger: ChargerResult) => void;
  userCoords: { lat: number; lng: number };
}

// trigonometric formula to align car rotation perfectly along the direction of track segment
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  return ( (Math.atan2(y, x) * 180) / Math.PI + 360 ) % 360;
}

export default function InteractiveMap({ chargers, selectedCharger, onSelectCharger, userCoords }: InteractiveMapProps) {
  const mapTilerKey = (import.meta as any).env.VITE_MAPTILER_KEY || "get_your_own_OpIi9ZTMz5Ga6M8K8";
  
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

  const [routeGeometry, setRouteGeometry] = useState<any | null>(null);
  const [routeDetails, setRouteDetails] = useState<{ distance: number; duration: number } | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // Car rotation heading
  const carBearing = selectedCharger
    ? calculateBearing(userCoords.lat, userCoords.lng, selectedCharger.latitude || 28.61, selectedCharger.longitude || 77.2)
    : 0;

  // MapStyle
  const mapStyleUrl = `https://api.maptiler.com/maps/dataviz-light/style.json?key=${mapTilerKey}`;

  // Ticker Logic
  useEffect(() => {
    let timer: any = null;
    if (isSimulating && routeGeometry?.coordinates) {
      const coords = routeGeometry.coordinates;
      let nextIndex = simulatedIndex + 1;
      if (nextIndex >= coords.length) nextIndex = 0;

      timer = setInterval(() => {
        if (nextIndex < coords.length) {
          const pt = coords[nextIndex];
          setSimulatedCoords({ lat: pt[1], lng: pt[0] });
          setSimulatedIndex(nextIndex);

          if (nextIndex < coords.length - 1) {
            const nextPt = coords[nextIndex + 1];
            setSimulatedBearing(calculateBearing(pt[1], pt[0], nextPt[1], nextPt[0]));
          }
          nextIndex++;
        } else {
          setIsSimulating(false);
          clearInterval(timer);
        }
      }, 150);
    }
    return () => clearInterval(timer);
  }, [isSimulating, routeGeometry, simulatedIndex]);

  // Center on moving vehicle
  useEffect(() => {
    if (isSimulating && simulatedCoords) {
      setViewport((prev) => ({
        ...prev,
        latitude: simulatedCoords.lat,
        longitude: simulatedCoords.lng,
        zoom: 14,
      }));
    }
  }, [isSimulating, simulatedCoords]);

  // Route wrapper
  const routeGeoJson = routeGeometry ? { type: "Feature" as const, properties: {}, geometry: routeGeometry } : null;

  return (
    <div className="bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl relative h-[560px] flex flex-col">
      <div className="flex-1 w-full relative">
        <Map
          {...viewport}
          onMove={(evt) => setViewport({ ...evt.viewState, pitch: 0, bearing: 0 })}
          mapLib={maplibregl}
          mapStyle={mapStyleUrl}
          style={{ width: "100%", height: "100%" }}
          dragRotate={false}
          pitchWithRotate={false}
        >
          {/* VEHICLE */}
          <Marker longitude={simulatedCoords ? simulatedCoords.lng : userCoords.lng} latitude={simulatedCoords ? simulatedCoords.lat : userCoords.lat} anchor="center">
            <div className="transition-transform duration-100" style={{ transform: `rotate(${simulatedCoords ? simulatedBearing : carBearing}deg)` }}>
              {/* Custom top-down minimalist vector car matching image */}
              <svg viewBox="0 0 24 48" className="w-6 h-12">
                <rect x="2" y="3" width="20" height="42" rx="7" fill="#ffffff" stroke="#18181b" strokeWidth="2.5" />
                <path d="M 4 14 Q 12 11 20 14 L 18 19 Q 12 18 6 19 Z" fill="#18181b" />
                <rect x="5" y="20" width="14" height="12" rx="3" fill="#27272a" />
              </svg>
            </div>
          </Marker>

          {/* STATION PINS & OVERLAY POLYLINES */}
          {/* ... */}
        </Map>
      </div>

      {/* COLLAPSIBLE HUD CARD OVERLAY */}
      {/* Contains toggle controls for simulation playback & booking trigger */}
    </div>
  );
}
```

---

## 6. Integration & Performance Optimizations

1. **Dual DB Caching Fallback**: If connection pool limitations occur under extreme traffic, the backend immediately cascades querying back to cached static templates (`localDb`) without interrupting the UI experience.
2. **PostgreSQL Bounding Box Math**: Instead of heavy geometric queries, coordinates are parsed dynamically via raw SQL double-precision casting, executing lookup bounds on indexing instantly.
3. **Pure SVG Vehicle Node**: No heavy images are used. Custom responsive lightweight vector tags handle real-time rotational transforms natively.
4. **Declarative State Syncing**: The visual collapsible bottom card is tightly coupled to selection states. Upon clicking a new station, the collapsible portion is automatically opened to focus users' attention on path details, distance, and the live GPS "Start Trip" simulator.

---

## 7. Candid Developer Advice & Insights (Bugs, Challenges, & Best Practices)

As a developer building highly responsive, real-time map features on top of massive datasets (like 31,000+ spatial coordinates), here is a candid breakdown of potential pitfalls, architectural challenges, and actionable advice.

### 🛑 Crucial Pitfalls & What NOT to Do

#### 1. Avoid Client-Side Heavy Operations on Large Datasets
* **The Pitfall**: Never request or load all 31,000+ coordinates from Supabase into the React client state. Doing so will freeze the browser tab, result in massive garbage-collection pauses, and degrade mobile experiences completely.
* **What to do instead**: Always restrict queries on the database level using bounding-box conditions (`BETWEEN min_lat AND max_lat`) with strict row limits (e.g., `LIMIT 150`). Let Postgres do the pruning work—it is highly indexed and optimized for mathematical ranges.

#### 2. Avoid High-Frequency Viewport Renders (State Thrashing)
* **The Pitfall**: Storing the active simulation coordinate and the viewport coordinates in the same high-frequency trigger loop can cause React to choke under continuous re-renders. Stuttering will occur on standard vector tiles.
* **What to do instead**: Run the simulation ticks at a stable interval of `150ms` (which is fluid enough for a 60 FPS requestAnimationFrame-interpolated canvas render) and use simple CSS transitions (`transition-transform duration-100`) on the vehicle marker wrapper to interpolate positional rotations.

#### 3. Do NOT Hardcode Database Connection Pools for Free Tiers
* **The Pitfall**: Supabase's free tier has a hard limitation on concurrent clients (often allowing less than 20 direct connections). Setting `max: 30` or more in your connection configuration without proper error handling will lead to instant server-wide crashes with `too many clients already` errors when multiple API endpoints or server restarts spin up.
* **What to do instead**: Always restrict your database client pool settings (we decreased the active pool connection ceiling in `src/lib/db.ts` to prevent exhaustion) and build a robust, immediate auto-fallback that serves cached local assets (`localDb`) if the direct PostgreSQL connection is choked.

---

### 🛠️ Key Architectural Stretches & Challenges

#### 1. Real-Time Math: Bearing Angle Calculation
* **The Challenge**: Standard line-strings only contain coordinate points `[lng, lat]`. Making a vehicle follow this route without calculating angles makes it look robotic and disjointed.
* **Our Solution**: We integrated an explicit trigonometric bearing formula:
  $$\theta = \text{atan2}(\sin(\Delta \lambda) \cdot \cos(\phi_2), \cos(\phi_1) \cdot \sin(\phi_2) - \sin(\phi_1) \cdot \cos(\phi_2) \cdot \cos(\Delta \lambda))$$
  By feeding the current position `pt[n]` and the immediate future segment `pt[n+1]` into this bearing calculator at every single interval tick, the vehicle SVG dynamically aligns its heading vector cleanly with the upcoming curve.

#### 2. MapTiler Routing Failures
* **The Challenge**: If MapTiler routing reaches its free-tier volume quota or network latency causes route fetches to time out, the map route completely breaks.
* **Our Solution**: Implement an immediate geometric fallback. If the Routing API call fails, the frontend catches the exception and dynamically generates a straight line track using the mathematical Haversine Distance formula. It estimates average speed (~40 km/h) to keep estimated duration and progress metrics functioning beautifully without interrupting user flows.

---

### 🚀 Future Roadmap & Scalability Tips

* **Production Key Safety**: The MapTiler API Key is currently exposed on the frontend client to construct Mapbox/MapLibre vector styles. In production, always set up **Domain Restrictions** inside your MapTiler Cloud Dashboard to ensure other sites cannot hijack your key.
* **PostGIS Upgrade**: If your query volumes scale, add the PostGIS extension to Supabase and use `ST_DWithin` on a true `geometry(Point, 4326)` column. This is even faster than mathematical bounding boxes because it takes full advantage of R-Tree spatial indices!

---

## 8. UI/UX Designing, Positioning, & Styling Guidelines (Do's and Don'ts)

Crafting a highly tactile and responsive map-based dashboard requires meticulous attention to visual structure, layout offsets, and responsive overlay states. Here are the professional design patterns and styling architectures employed in this map implementation.

### 🎨 Visual & Aesthetic System Details
* **Color Palette**: Minimalist high-contrast dark-mode canvas styling (`bg-zinc-950` with elegant `emerald-500` accents for active P2P charging, and sleek `zinc-400` boundaries for public terminals).
* **Typography**: Clean, tech-forward sans-serif headings with high tracking constraints (`tracking-tight` / `tracking-wider` on status badges) paired with JetBrains Mono for metrics and power specifications.
* **Map Theme Overrides**: The vector map uses MapTiler's customized ultra-light `dataviz-light` style to maximize element readability and map icon contrast.

---

### 📏 Positioning & Layout Overlay Architecture

The interface overlays a interactive, collapsible bottom sheet (HUD Card) over a vector map viewport. 

```
┌────────────────────────────────────────────────────────┐
│ [Map Canvas Boundary]                                  │
│                                                        │
│   (●) Marker (Public)                                  │
│                 \                                      │
│                  \  Solid Black Route Polyline         │
│                   \                                    │
│                    ▲ [Animated Vehicle Vector]         │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  HUD CARD OVERLAY (Position: absolute bottom-4)  │  │
│  │                                                  │  │
│  │  [Header Row: Category Badge ─── Expand Toggle]  │  │
│  │  [Main Info Row: Station Name ── Price / Power]  │  │
│  │  ──────────────────────────────────────────────  │  │
│  │  [Collapsible Area: Distance / Live Simulator]  │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

#### CSS Layout Blueprint (HUD Positioning)
The overlay card container is anchored to the bottom using Tailwind's absolute layout mechanics:
```tsx
<div className="absolute bottom-4 left-4 right-4 z-10 bg-zinc-950/95 backdrop-blur-md border border-zinc-800/80 rounded-2xl shadow-2xl p-4 transition-all duration-300">
  {/* Card Content */}
</div>
```

---

### ✅ UI/UX Best Practices (DO's)

1. **DO Use Blur Filters (`backdrop-blur`)**: 
   * Always pair high-opacity dark overlays (`bg-zinc-950/90`) with backdrop blur filters. This guarantees readability of the card content even if colorful roads or pins pass underneath during viewport pans.
2. **DO Constrain High-Saturations to Micro-Indicators**:
   * Keep the general card and map layout monochrome (slate, grays, whites). Only use hyper-saturated primary colors like neon-emerald (`#10b981`) or vivid blue (`#3b82f6`) on critical elements like charging speed badges (`Power Kw`) and action buttons (`Start Trip`).
3. **DO Build Adaptive Collapsible Heights**:
   * When no station is selected, hide the HUD completely or compress it to a single call-to-action bar. When selected, load the basic details immediately, and allow the user to expand details on-demand via a transition-smooth accordion container (`max-h-0 overflow-hidden` to `max-h-96`).
4. **DO Provide Clear State Indicators**:
   * Change action buttons to reflect the active simulation mode dynamically (e.g., swapping a green "Start Trip" button to a yellow "Pause" button, or changing indicators on completion).

---

### ❌ Critical UI/UX Pitfalls (DON'Ts)

1. **DON'T Use Non-Interactive Absolute Layout Heights**:
   * Avoid styling HUD containers with a fixed height parameter (e.g., `h-[300px]`). Doing so causes content clipping on small devices or empty whitespace gaps on tablets. Instead, use responsive paddings (`py-4 px-5`) with a flexible height container (`h-auto`).
2. **DON'T Embed Map Controls Inside Movable Layout Panels**:
   * Keep zooming, panning, and tilt controls anchored to a separate static absolute container (e.g. `top-4 right-4`), never inside the responsive collapsible bottom card. Panel transitions should never affect map-level controls.
3. **DON'T Obstruct Visual Contrast on Interactive Pins**:
   * Never render custom pins without a high-contrast shadow or border ring. A black/white outer outline ensures that pins stand out clearly across both water bodies, dark streets, and satellite layers.
4. **DON'T Use Heavy External Webfont Assets Inside the Canvas**:
   * When styling canvas vector markers or labeling paths, prioritize local system system fonts (`system-ui`, `-apple-system`) over heavy Google Fonts. System typography speeds up first-contentful paint (FCP) and prevents map-rendering flicker.

---

## 9. Production Styling Code Snippets (Tailwind & SVGs)

Below is the exact styling implementation for the key map interface layers:

### A. The Custom Top-Down Vehicle Marker (White Tesla Vector)
Designed as a modern vector vehicle aligned using CSS 2D rotational transforms:

```tsx
<Marker 
  longitude={simulatedCoords ? simulatedCoords.lng : userCoords.lng} 
  latitude={simulatedCoords ? simulatedCoords.lat : userCoords.lat} 
  anchor="center"
>
  <div 
    className="transition-transform duration-100 ease-linear drop-shadow-lg" 
    style={{ transform: `rotate(${simulatedCoords ? simulatedBearing : carBearing}deg)` }}
  >
    <svg viewBox="0 0 24 48" className="w-6 h-12 filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.3)]">
      {/* Outer Sleek Chassis */}
      <rect x="2" y="3" width="20" height="42" rx="7" fill="#ffffff" stroke="#18181b" strokeWidth="2.5" />
      {/* Front Windshield */}
      <path d="M 4 14 Q 12 11 20 14 L 18 19 Q 12 18 6 19 Z" fill="#18181b" />
      {/* Dark Solar Tint Roof */}
      <rect x="5" y="20" width="14" height="12" rx="3" fill="#27272a" />
      {/* Rear Brake Light Reflectors */}
      <rect x="4" y="42" width="4" height="2" fill="#ef4444" rx="0.5" />
      <rect x="16" y="42" width="4" height="2" fill="#ef4444" rx="0.5" />
    </svg>
  </div>
</Marker>
```

### B. The Selected Target Concentric Radar Pin
When a user selects a terminal, a high-contrast target ring pulses around the station:

```tsx
<Marker 
  longitude={selectedCharger.longitude} 
  latitude={selectedCharger.latitude} 
  anchor="bottom"
>
  <div className="relative flex items-center justify-center">
    {/* Concentric Pulsing Radar Ring */}
    <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-emerald-400 opacity-75"></span>
    {/* Inner Station Node */}
    <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-zinc-950 border-2 border-emerald-500 shadow-lg">
      <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
    </div>
  </div>
</Marker>
```

### C. Collapsible HUD Control Sheet (Responsive Glassmorphism Wrapper)
A modern overlay with a real-time progress bar tracking distance remaining during the simulated drive:

```tsx
<div className="absolute bottom-4 left-4 right-4 z-10 bg-zinc-950/95 backdrop-blur-md border border-zinc-800/80 rounded-2xl shadow-2xl p-4 transition-all duration-300">
  {/* Header Row */}
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-2">
      <span className="px-2.5 py-0.5 text-[10px] font-bold tracking-wider rounded-md bg-emerald-500/10 text-emerald-400 uppercase border border-emerald-500/20">
        P2P STATION
      </span>
      <span className="text-xs text-zinc-500 font-medium">
        Click to expand track details
      </span>
    </div>
    
    <button 
      onClick={() => setIsCollapsed(!isCollapsed)}
      className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors"
    >
      {isCollapsed ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
    </button>
  </div>

  {/* Station Name & Power Metrics */}
  <div className="flex justify-between items-start">
    <div>
      <h3 className="font-semibold text-white tracking-tight text-lg">
        Anjali's Home Charger — Lajpat Nagar
      </h3>
      <p className="text-zinc-400 text-xs mt-0.5">
        Central Market, Lajpat Nagar II, New Delhi
      </p>
    </div>
    <div className="text-right">
      <span className="text-[10px] text-zinc-500 font-mono block tracking-widest">
        CHARGING COST
      </span>
      <span className="text-emerald-400 font-extrabold text-xl font-mono">
        ₹4.8/kWh
      </span>
    </div>
  </div>

  {/* Smooth Collapsible Section */}
  <div className={`transition-all duration-300 overflow-hidden ${isCollapsed ? 'max-h-0' : 'max-h-[220px] mt-4 pt-4 border-t border-zinc-800/80'}`}>
    {/* Live Simulated Track Progress */}
    <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mb-4">
      <div 
        className="bg-emerald-500 h-full transition-all duration-150 ease-linear"
        style={{ width: `${((simulatedIndex + 1) / (routeGeometry?.coordinates?.length || 1)) * 100}%` }}
      ></div>
    </div>

    {/* Metric Cards Row */}
    <div className="grid grid-cols-2 gap-3 mb-4">
      <div className="bg-zinc-900/50 rounded-xl p-3 border border-zinc-800/50">
        <span className="text-zinc-500 text-[10px] tracking-wider block mb-1">DISTANCE</span>
        <span className="text-white font-bold font-mono text-base">4.2 km</span>
      </div>
      <div className="bg-zinc-900/50 rounded-xl p-3 border border-zinc-800/50">
        <span className="text-zinc-500 text-[10px] tracking-wider block mb-1">DURATION</span>
        <span className="text-white font-bold font-mono text-base">12 mins</span>
      </div>
    </div>
  </div>
</div>
```



