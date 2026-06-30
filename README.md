# Electric UPI
## Why I Built Electric UPI
As an EV owner in India, I struggled to find chargers — public stations are scattered across PDFs, and private chargers (like mine!) sit idle. Electric UPI solves this by **unifying peer-to-peer chargers and 39,000+ government stations on one map**, with a trust system for bookings and billing. No hardware. No vendor lock-in. Just open-source tools and real data.

## The Problem We Solve

India is the world's 3rd-largest automobile market, and EV adoption is accelerating — but **finding a charger is still a nightmare**. The core problems:

1. **Spare capacity is invisible**: Millions of home/commercial EV chargers sit idle 90%+ of the time. Their owners would share them — but there's no platform to list, discover, or book them.
2. **Public stations are fragmented**: 39,000+ government-installed public charging stations exist across India, but their data is scattered across PDFs, state portals, and proprietary apps. No unified, searchable map exists.
3. **No trust mechanism for peer sharing**: Even if a driver finds a private charger, there's no verification handshake, no billing, and no payment flow — making peer-to-peer charging impractical and unsafe.

### Why Electric UPI Solves This Efficiently

| Problem | How Electric UPI Solves It | Why It's Efficient |
|---------|---------------------------|-------------------|
| Spare capacity is invisible | **Peer-to-peer charger listing** — any host can list their charger with real-time availability, pricing, plug type, and amenities | Turns idle infrastructure into bookable inventory at zero marginal cost |
| Public stations are fragmented | **Unified map search** — 39,641 govt stations + peer chargers on one map, powered by PostGIS `ST_DWithin` geospatial queries | Single query replaces browsing multiple portals; 2025 govt data ensures accuracy |
| No trust mechanism | **OTP handshake + state-machine bookings** — 6-digit code verified on-site, 10-min hold timer, full lifecycle (`pending → active → charging → completed → paid`) | Prevents no-shows, ensures both parties confirm presence before session starts |
| No billing for peer chargers | **Auto-energy calculation + manual override + UPI payment simulation** — energy estimated from duration × power, host can adjust, driver pays via UPI PIN | Fair billing without IoT hardware; host's sub-meter takes priority over estimates |
| Expensive map APIs | **MapLibre GL JS + MapTiler** — open-source mapping at ~90% lower cost than Google Maps | Full customization, no vendor lock-in, privacy-friendly |

### Key Differentiators

- **Dual inventory model**: Peer chargers (underutilized private assets) + public stations (govt data) on a single map — no other Indian EV platform does both.
- **Offline-capable, privacy-first maps**: MapLibre + cached tiles work in low-connectivity areas (critical for Indian highways).
- **Real 2025 government data**: Not scraped — sourced from official Ministry of Heavy Industries datasets, ensuring regulatory accuracy.
- **Zero-hardware billing**: Energy calculated from time × power rating; host override for sub-meter accuracy. No smart-plug or OBD integration required.
**No IoT hardware required**: Energy estimated from time × power; host can override with sub-meter readings.
- **UPI Payment Simulation**: Simulated for testing; real UPI integration (Razorpay/PayU) planned for production.


### Why Not Just Use [PlugShare](https://plugshare.com/) / [ChargeGrid](https://chargegrid.in/) / [Tata Power EZ Charge](https://www.tatapower.com/ev-charging/)?
| Competitor | Missing | Electric UPI’s Edge |
|------------|---------|---------------------|
| PlugShare | No peer-to-peer bookings, no govt data | Dual inventory (peer + 39k public stations) |
| ChargeGrid | Proprietary hardware, vendor lock-in | Zero-hardware billing, host override |
| Tata Power EZ Charge | Only Tata chargers, no private listings | Open platform, any charger can join |
| Google Maps EV Layer | No bookings, no real-time availability | OTP handshake + billing + payments |

## Project Structure

### Overview
Electric UPI is a Next.js 16 application (App Router) for peer-to-peer EV charger booking and public charging station discovery. It integrates Supabase PostgreSQL with PostGIS for geospatial queries and Drizzle ORM for database interactions.

### Directory Structure
```
.
├── app/
│   ├── (auth)/
│   ├── api/
│   │   ├── bookings/
│   │   ├── chargers/
│   │   ├── map-search/
│   │   ├── map-stations/
│   │   └── upload/
│   ├── booking/
│   ├── driver/
│   ├── host/
│   ├── list-charger/
│   ├── login/
│   ├── map/
│   └── LandingPageClient.tsx
│   
├── components/
│   ├── ChargerCard.tsx
│   ├── ChargerDetailModal.tsx
│   ├── ChargerMap.tsx
│   ├── ChargingMap.tsx
│   ├── ChargingSiteCard.tsx
│   ├── FilterBar.tsx
│   ├── SearchListings.tsx
│   └── ui/
│       ├── Badge.tsx
│       ├── Button.tsx
│       ├── Card.tsx
│       └── Input.tsx
│   
├── hooks/
│   ├── useAuth.ts
│   ├── useChargers.ts
│   ├── useGeolocation.ts
│   ├── useTheme.ts
│   └── useUnifiedSearch.ts
│   
├── lib/
│   ├── billing.ts
│   ├── db.ts
│   ├── geojson.ts
│   ├── map.ts
│   ├── schema.ts
│   └── types.ts
│   
├── public/
│   ├── ev_charging_stations.json
│   ├── openchargemap_india.json
│   └── placeholder-ev-station.svg
│   
├── supabase/
│   ├── migrations/
│   └── seed scripts/
│   
├── .github/
│   ├── instructions/
│   └── skills/
```

### API Routes
The project includes **24 API route handlers** for managing chargers, bookings, and map data:

```
/api/chargers — GET (list), POST (create)
/api/chargers/[id] — GET (detail)
/api/chargers/search — GET (text + geo search)
/api/chargers/geojson — GET (39k stations GeoJSON)
/api/map-search — GET (unified search: chargers + sites)
/api/map-stations — GET (map station data)
/api/charging-sites — GET (public stations)
/api/upload — POST (image to Supabase Storage)
/api/bookings — POST (create booking)
/api/bookings/driver — GET (driver's bookings)
/api/bookings/host — GET (host's bookings)
/api/bookings/[id] — GET (booking detail)
/api/bookings/[id]/accept — POST (host accepts)
/api/bookings/[id]/generate-code — POST (driver OTP)
/api/bookings/[id]/regenerate-code — POST (re-gen OTP)
/api/bookings/[id]/verify-code — POST (host verifies)
/api/bookings/[id]/start — POST (start charging)
/api/bookings/[id]/end — POST (end session)
/api/bookings/[id]/billing — PATCH (host override kWh)
/api/bookings/[id]/billing/finalize — POST (finalize bill)
/api/bookings/[id]/pay — POST (simulated payment)
/api/bookings/[id]/cancel — POST (cancel booking)
/api/bookings/[id]/status — GET (booking status)
/api/auth/confirm — GET (email confirmation)
```

### Server Actions
- `getCoordinates(locationText)`: Photon geocoding for address-to-coordinates conversion.

### Components
13 reusable UI components for charger listings, maps, and bookings:
- `ChargerCard`, `ChargerClient`, `ChargerDetailModal`
- `ChargerMap`, `ChargingMap`, `ChargingSiteCard`
- `FilterBar`, `SearchListings`
- `map/EVMapClient`
- `ui/Badge`, `ui/Button`, `ui/Card`, `ui/Input`

### Hooks
5 custom hooks for authentication, data fetching, and geolocation:
- `useAuth`, `useChargers`, `useGeolocation`, `useTheme`, `useUnifiedSearch`

### Database Schema
High-level overview of the database schema with relations:

```mermaid
erDiagram
    users ||--o{ chargers : "owns"
    users ||--o{ bookings : "creates"
    chargers ||--o{ bookings : "booked"
    chargers ||--o{ site_connector_profiles : "has"
    charging_sites ||--o{ site_connector_profiles : "has"
    bookings ||--o{ payments : "generates"

    users {
        uuid id PK
        text email
        text name
        text avatar_url
        timestamp created_at
    }

    chargers {
        uuid id PK
        uuid user_id FK
        text address
        float latitude
        float longitude
        text status
        timestamp created_at
    }

    charging_sites {
        uuid id PK
        text name
        text address
        float latitude
        float longitude
        jsonb raw_source
        timestamp created_at
    }

    site_connector_profiles {
        uuid id PK
        uuid charger_id FK
        uuid charging_site_id FK
        text connector_type
        float power_kw
        text status
        jsonb raw_source
    }

    bookings {
        uuid id PK
        uuid driver_id FK
        uuid host_id FK
        uuid charger_id FK
        text status
        timestamp start_time
        timestamp end_time
        float price_per_hour
        float total_amount
    }

    payments {
        uuid id PK
        uuid booking_id FK
        float amount
        text status
        timestamp created_at
    }
```

Key fields:
- **`users`**: Core user data (email, name, avatar).
- **`chargers`**: Peer chargers with geospatial coordinates.
- **`charging_sites`**: Public charging stations with raw JSON source.
- **`site_connector_profiles`**: Connector details for chargers/sites.
- **`bookings`**: Booking handshake between driver and host.
- **`payments`**: Simulated payment records.

## Map Implementation

### Map Stack
- **Library**: [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) (open-source fork of Mapbox GL).
- **Tiles**: [MapTiler](https://www.maptiler.com/) (affordable, privacy-friendly alternative to Google Maps).
- **Key Features**:
  - Custom layers for charger density, user location, and routes.
  - Clustered markers for 39k+ stations (performance-optimized).
  - Responsive design with dynamic tile loading.
  - Offline support via cached tiles.

### Why Not Google Maps?
- **Cost**: MapTiler is ~90% cheaper at scale.
- **Customization**: Full control over map styles and interactions.

-**Privacy-friendly (no third-party tracking; tiles cached locally)**: No third-party tracking.

### Example: Map Initialization
```typescript
import maplibregl from 'maplibre-gl';

const map = new maplibregl.Map({
  container: 'map-container',
  style: `https://api.maptiler.com/maps/streets/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_API_KEY}`,
  center: [longitude, latitude],
  zoom: 12,
});

// Add clustered markers
map.addSource('chargers', {
  type: 'geojson',
  data: chargerGeoJSON,
  cluster: true,
  clusterRadius: 50,
});
```

### Future Work
- **3D Maps**: Add 3D buildings and terrain.
- **Directions API**: Integrate turn-by-turn navigation.
- **Offline Mode**: Full offline support for EV drivers.

### Known Limitations (and Workarounds)
| Limitation | Why It Exists | Workaround |
|------------|---------------|------------|
| No IoT hardware | Cost/availability in India | Manual host override for kWh |
| Simulated payments | RBI regulations | Real UPI integration planned (see Future Work) |
| No real-time charger status | Hardware dependency | Host marks availability manually (like Airbnb) |
| Offline maps not fully cached | Storage constraints | Prioritize tiles for user’s city/route |
- **UPI Payment Simulation**: Simulated for testing; real UPI integration (Razorpay/PayU) in progress.
- **No IoT hardware required**: Energy estimated from time × power; host can override with sub-meter readings.
- **No third-party tracking**: Map tiles cached locally; no Google/Facebook SDKs.
## Data Sources
- **2025 Government-Released EV Charging Stations**: The project includes **real data** from official government sources (2025), ensuring accuracy and relevance for Indian EV drivers.

## Screenshots

| Light Mode: Map View | Dark Mode: Nearby View |
| :---: | :---: |
| <a href="public/ligh-EVCN.jpeg" target="_blank"><img src="public/ligh-EVCN.jpeg" height="400" alt="Light Mode Map View" /></a> | <a href="public/DARK-NEARBYME-EVCN.jpeg" target="_blank"><img src="public/DARK-NEARBYME-EVCN.jpeg" height="400" alt="Dark Mode Nearby View" /></a> |

## Flow Diagrams

### Booking Flow
```mermaid
sequenceDiagram
    participant Driver
    participant LandingPage
    participant API
    participant Supabase
    participant Host

    Driver->>LandingPage: Search for chargers
    LandingPage->>API: GET /api/map-search
    API->>Supabase: Query chargers + sites
    Supabase-->>API: Results
    API-->>LandingPage: MapSearchResponse
```

### Backend Architecture Overview
```mermaid
flowchart TD
    A[Next.js API Routes] -->|Drizzle ORM| B[Supabase PostgreSQL]
    A -->|Auth| C[Supabase Auth]
    B -->|RLS Policies| C
    C -->|Session| A
```
*Backend: Next.js API ↔ Supabase (PostgreSQL + Auth) with RLS policies.*

### Booking Flow (Backend)
```mermaid
sequenceDiagram
    participant Driver
    participant API
    participant Supabase
    participant Host

    Driver->>API: POST /api/bookings
    API->>Supabase: Begin transaction
    Supabase-->>API: Booking created
    API->>Host: Notification (Webhook/Email)
    Host->>API: POST /api/bookings/[id]/accept
    API->>Supabase: Update status
    Supabase-->>API: Transaction committed
```
*Backend: Database transactions for booking handshake and status updates.*

### Data Flow for Charger Search
```mermaid
flowchart LR
    A[Client] -->|GET /api/map-search| B[Next.js API]
    B -->|Drizzle ORM| C[Supabase]
    C -->|PostGIS: ST_DWithin| D[chargers + charging_sites]
    D -->|GeoJSON| B
    B -->|MapSearchResponse| A
```
*Backend: Geospatial filtering and unified search response.*

### Types
Key TypeScript interfaces:
- `ChargerResult`: Peer charger data.
- `SearchResponse`: Unified search results.
- `ConnectorProfile`: Connector details.
- `MapSearchResponse`: Map-specific search results.
- `ChargingSiteResult`: Public charging site data.

### Migrations
8 migrations for schema evolution:
- Booking handshake and status flows.
- Geospatial indexes and constraints.
- Backfill scripts for `location_geom`.

### Public Assets
- `ev_charging_stations.json`: 39,641 public charging stations.
- `openchargemap_india.json`: India-specific dataset.
- `placeholder-ev-station.svg`: Default station icon.

## Setup Instructions
1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/electric-upi.git
   cd electric-upi
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```
   > **Note**: You can also use `npm` or `yarn` if preferred, but `pnpm` is recommended for its efficiency.

3. Set up environment variables:
   - Copy `.env.local.example` to `.env.local` and update the values.
   - Ensure `DATABASE_URL` and `SUPABASE_URL`/`SUPABASE_KEY` are configured.

4. Run database migrations:
   ```bash
   pnpm drizzle-kit migrate
   ```

5. Seed the database (optional):
   ```bash
   pnpm seed
   ```

6. Start the development server:
   ```bash
   pnpm dev
   ```

## Flow Diagrams

### Booking & Handshake Lifecycle (State Diagram)
This state diagram represents the full lifecycle of a booking from creation to final payment, including the OTP handshake and billing review.

```mermaid
stateDiagram-v2
    [*] --> pending_host_accept : Driver requests Booking (POST /api/bookings)
    pending_host_accept --> cancelled : Cancel (POST /api/bookings/[id]/cancel) or 10-min Hold Timeout
    pending_host_accept --> awaiting_driver_arrival : Host Accepts (POST /api/bookings/[id]/accept)
    
    awaiting_driver_arrival --> cancelled : Cancel (POST /api/bookings/[id]/cancel)
    awaiting_driver_arrival --> awaiting_driver_arrival : Driver generates OTP (POST /api/bookings/[id]/generate-code)
    awaiting_driver_arrival --> active : Host verifies OTP (POST /api/bookings/[id]/verify-code)
    
    active --> cancelled : Cancel (POST /api/bookings/[id]/cancel)
    active --> charging : Start session (POST /api/bookings/[id]/start)
    
    charging --> completed : End session (POST /api/bookings/[id]/end) <br> [Calculates Auto-Energy (Time x Power)]
    
    state completed {
        [*] --> draft : billing_status = draft
        draft --> draft : Host edits kWh (PATCH /api/bookings/[id]/billing)
        draft --> finalized : Host finalizes bill (POST /api/bookings/[id]/billing/finalize)
        finalized --> simulated_paid : Driver pays with UPI PIN (POST /api/bookings/[id]/pay)
    }
```

### Complete Sequence Flows

#### 1. Discovery, Booking Request & Handshake Verification
This sequence covers finding a charger, requesting the booking, the host accepting it, and verification via the 6-digit OTP code when the driver arrives at the site.

```mermaid
sequenceDiagram
    autonumber
    actor Driver
    actor Host
    participant UI as Next.js Web App
    participant API as Route Handlers
    participant DB as Supabase PostgreSQL

    %% 0. Search
    Driver->>UI: Search for chargers
    UI->>API: GET /api/map-search
    API->>DB: Query chargers + public sites (PostGIS geo-query)
    DB-->>API: Results
    API-->>UI: MapSearchResponse

    %% 1. Booking Request
    Driver->>UI: Selects charger & requests booking
    UI->>API: POST /api/bookings { chargerId }
    API->>DB: Check if charger active & driver has no active bookings
    API->>DB: Insert booking (status: pending_host_accept, holdExpiresAt: 10 mins)
    API-->>UI: Return bookingId
    
    %% 2. Host Acceptance
    Host->>UI: Views pending booking request
    UI->>API: POST /api/bookings/[id]/accept
    API->>DB: Update booking (status: awaiting_driver_arrival)
    API->>DB: Auto-cancel other pending bookings for this driver
    API-->>UI: Success message

    %% 3. Arrival and Handshake Verification
    Driver->>UI: Arrives at charger & clicks "Generate Code"
    UI->>API: POST /api/bookings/[id]/generate-code
    API->>DB: Verify driver & check 2-min cooldown
    API->>DB: Generate 6-digit OTP, set codeExpiresAt (15 mins)
    API-->>UI: Return secretCode
    Driver->>Host: Verbally shares 6-digit OTP code
    Host->>UI: Enters OTP code & clicks "Verify"
    UI->>API: POST /api/bookings/[id]/verify-code { code }
    API->>DB: Validate code matches, not expired, not used
    API->>DB: Update booking (status: active, codeUsed: true)
    API-->>UI: Returns active status confirmation

    %% 4. Session Start
    Driver->>UI: Clicks "Start Charging"
    UI->>API: POST /api/bookings/[id]/start
    API->>DB: Update booking (status: charging, startedAt: now)
    API-->>UI: Session started
```

#### 2. Session Completion, Billing & Simulated Payment
This sequence covers ending the charging session, the billing review with optional manual kWh override, finalizing the bill, and simulated payment using a UPI PIN.

```mermaid
sequenceDiagram
    autonumber
    actor Driver
    actor Host
    participant UI as Next.js Web App
    participant API as Route Handlers
    participant DB as Supabase PostgreSQL

    %% 1. End Session
    Driver->>UI: Clicks "End Charging" (or Host does)
    UI->>API: POST /api/bookings/[id]/end
    API->>DB: Calculate auto_energy_kwh = duration x charger_power (kW)
    API->>DB: Update booking (status: completed, endedAt: now, energyKwh = auto_energy, billingStatus: draft)
    API-->>UI: Charging ended (returns draft preview cost)

    %% 2. Billing Review and Override
    Host->>UI: Reviews draft energy and cost
    Note over Host, UI: Host can optionally edit kWh if sub-meter differs
    Host->>UI: Submits manual kWh (e.g. 15.5 kWh)
    UI->>API: PATCH /api/bookings/[id]/billing { energyKwh: 15.5 }
    API->>DB: Update booking (energyKwh: 15.5, energySource: manual)
    API-->>UI: Draft billing updated

    %% 3. Finalize Bill
    Host->>UI: Clicks "Finalize Bill"
    UI->>API: POST /api/bookings/[id]/billing/finalize
    API->>DB: Compute finalAmount = energyKwh x price_per_kwh
    API->>DB: Update booking (billingStatus: finalized, finalAmount, billingFinalizedAt: now)
    API-->>UI: Bill finalized, lock edits

    %% 4. Payment
    Driver->>UI: Clicks "Pay Now" & enters UPI PIN
    UI->>API: POST /api/bookings/[id]/pay { pin }
    API->>DB: Validate 4/6-digit pin format
    API->>DB: Insert payment record (status: simulated_paid, paidAt: now)
    API-->>UI: Payment successful
```
staled deployment : without map deployment : https://electric-upi.vercel.app
