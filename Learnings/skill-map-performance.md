# Skill: Map/Geo Performance
> **Derives from**: `skill-core-exploration.md`
> **Prerequisite**: Load `skill-core-exploration.md` first.
> **Primary reference**: `/memories/repo/perf-freeze-lessons.md`

## Purpose
Prevent main-thread freezes and hydration stalls when rendering Leaflet/MapLibre maps with large GeoJSON datasets in Electric UPI. Encode the specific fixes applied to `ChargingMap.tsx`, `/api/chargers/geojson`, and `useChargers.ts` so they are never regressed.

## Root Causes
1. **Synchronous server-side conversion** — `readFile()` + `JSON.parse()` on a 40k-record array, then `Array.from().map().filter()` to convert to GeoJSON, all inside a single API route handler. Next.js streams only after the handler resolves, blocking the response.
2. **Client-side `FlyToBounds` over thousands of points** — `map.fitBounds(L.latLngBounds(<thousands of points>))` runs synchronously during hydration, locking the main thread for seconds.
3. **No error contract on fetch hooks** — `loading=true` is never reset on backend failure, leaving the page in a permanent loading state.
4. **Unbounded dataset shipped to client** — No `?limit=` parameter, so the full dataset (39k+ records) is parsed and converted every request.

## Fix Patterns

### 1. Slice Before `toGeoJSON`
**File**: `app/api/chargers/geojson/route.ts`
- Parse the raw JSON, slice the `data` array, then call `toGeoJSON()` on the sliced object.
- Never call `toGeoJSON()` on the full dataset.

```typescript
const MAX_FEATURES = 2000;
const limit = Math.min(Math.max(1, limitParam || MAX_FEATURES), MAX_FEATURES);
const sliced = { ...data, data: data.data.slice(0, limit), total_records: data.total_records };
const geojson = toGeoJSON(sliced);
```

### 2. `FlyToBounds` Guard
**File**: `components/ChargingMap.tsx`
- Skip `fitBounds` when the feature count exceeds a threshold (500).
- Leaflet recomputes tile grid + animates over thousands of points, locking the main thread.

```tsx
function FlyToBounds({ stations, userCoords }: { stations: MapStation[]; userCoords: { lat: number; lng: number } | null; }) {
  const map = useMap();
  useEffect(() => {
    if (!stations.length) {
      if (userCoords) map.setView([userCoords.lat, userCoords.lng], 12);
      return;
    }
    if (stations.length > 500) return; // Guard: skip fitBounds on huge datasets
    const bounds = L.latLngBounds(stations.map((s) => [s.latitude, s.longitude] as [number, number]));
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [stations, userCoords, map]);
  return null;
}
```

### 3. Chunked Loading + Suspense
**File**: `components/ChargingMap.tsx`
- Use `MarkerClusterGroup` with `chunkedLoading` to avoid rendering all markers at once.
- Wrap server components in `loading.tsx` to enable automatic Suspense boundaries.

```tsx
<MarkerClusterGroup chunkedLoading spiderfyOnMaxZoom maxClusterRadius={50}>
  {stations.map((station) => (
    <Marker key={station.id} position={[station.latitude, station.longitude]} icon={...}>
      <Popup>...</Popup>
    </Marker>
  ))}
</MarkerClusterGroup>
```

### 4. Error Contract on Hooks
**File**: `hooks/useChargers.ts`
- Always surface `fetchError` state when `!res.ok`.
- Always reset data on failure (`setDbChargers([])`, `setTotal(0)`).
- Provide `clearFetchError` callback for UI to dismiss errors.

```typescript
const [fetchError, setFetchError] = useState("");
// On failure:
setFetchError(`Search failed (${res.status}). Please try again.`);
setDbChargers([]);
setTotal(0);
// On success:
setFetchError("");
// Clear callback:
const clearFetchError = useCallback(() => setFetchError(""), []);
```

## API Optimizations
**File**: `app/api/chargers/geojson/route.ts`
- Accept `?limit=` query parameter, default to `MAX_FEATURES = 2000`.
- Clamp limit between 1 and `MAX_FEATURES`.
- Set `Cache-Control: public, s-maxage=3600` for CDN caching.

```typescript
const limitParam = parseInt(searchParams.get("limit") || String(MAX_FEATURES), 10);
const limit = Math.min(Math.max(1, limitParam || MAX_FEATURES), MAX_FEATURES);
return NextResponse.json(geojson, {
  headers: {
    "Content-Type": "application/geo+json",
    "Cache-Control": "public, s-maxage=3600",
  },
});
```

## Error Contracts
**Hook**: `useChargers`
- `fetchError: string` — populated on HTTP error or network failure.
- `clearFetchError: () => void` — resets error to empty string.
- **Never leave `loading=true` forever** — always set `loading=false` in `finally`.
- **Always clear data on failure** — prevents stale markers from persisting after an error.

## Code Examples

### Slice before `toGeoJSON`
```typescript
// lib/geojson.ts — toGeoJSON itself is fine; the fix is calling it on sliced data
export function toGeoJSON(data: StationsJson): FeatureCollection {
  const features: Feature[] = data.data
    .filter((r) => r.Latitude && r.Longitude)
    .map((r) => { /* ... */ })
    .filter(Boolean) as Feature[];
  return { type: "FeatureCollection", features };
}
```

### `FlyToBounds` guard
```tsx
if (features.length > 500) return; // Skip fitBounds on huge datasets
```

### `MarkerClusterGroup` with chunked loading
```tsx
<MarkerClusterGroup chunkedLoading spiderfyOnMaxZoom maxClusterRadius={50}>
  {stations.map((station) => (
    <Marker key={station.id} position={[station.latitude, station.longitude]} icon={...}>
      <Popup>...</Popup>
    </Marker>
  ))}
</MarkerClusterGroup>
```

### Error contract in hook
```typescript
const [fetchError, setFetchError] = useState("");
const clearFetchError = useCallback(() => setFetchError(""), []);
```

## Verification
- `GET /api/chargers/geojson?limit=2000` → <500ms in dev
- DevTools Performance → no main-thread task >500ms during map load
- Page interactive within 3s on first load, <500ms on subsequent navigations
- `FlyToBounds` does not fire when `stations.length > 500`
- `fetchError` is set on HTTP failure and cleared on success or manual dismiss
