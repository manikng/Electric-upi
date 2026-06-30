# LandingPageClient.tsx - Function Inventory & Decoupling Plan

## Current File Stats
- **File**: `app/LandingPageClient.tsx`
- **Lines**: ~1450+
- **Purpose**: Main landing page with search, filters, carousel, and charger listings

---

## Function Inventory

### State Variables (useState)
| Line | Variable | Purpose |
|------|----------|---------|
| ~80 | `user` | Authenticated user from Supabase |
| ~85 | `theme` | Current theme (light/dark) |
| ~90 | `activeCategory` | Active nav category |
| ~95 | `favorites` | Array of favorite charger IDs |
| ~100 | `searchQuery` | Search input text |
| ~105 | `filterType` | Selected filter type |
| ~110 | `sortOrder` | Selected sort order |
| ~115 | `carouselIndex` | Current carousel slide index |
| ~120 | `currentSlide` | Current hero slide index |
| ~125 | `isAutoPlaying` | Carousel autoplay state |
| ~130 | `dbChargers` | Chargers from database |
| ~135 | `loading` | Loading state for chargers |
| ~140 | `locationError` | Geolocation error message |
| ~145 | `userCoords` | User's geolocation coordinates |
| ~150 | `bookingLoaderId` | Currently booking charger ID |
| ~155 | `bookingError` | Booking error message |
| ~160 | `visibleSteps` | Responsive carousel steps |
| ~165 | `router` | Next.js router |
| ~170 | `supabase` | Supabase client |

### Functions & Effects

| Line | Name | Type | Purpose | Decouple? |
|------|------|------|---------|-----------|
| ~200 | `fetchChargers` | useEffect + async | Fetches chargers from API with debounce | ✅ Yes - to custom hook |
| 239 | `handleGeolocate` | Function | Gets user location via browser API | ✅ Yes - to hook or utils |
| 263 | `handleRequestBooking` | Async function | Creates booking request | ✅ Yes - to hook or utils |
| 315 | `goToSlide` | Function | Jump to specific carousel slide | ❌ Keep in component |
| 322 | `nextSlide` | Function | Next carousel slide | ❌ Keep in component |
| 326 | `prevSlide` | Function | Previous carousel slide | ❌ Keep in component |
| 353 | `toggleTheme` | Function | Toggle light/dark theme | ✅ Yes - to hook |
| 372 | `compute` | Function | Calculate visible carousel steps | ❌ Keep (simple helper) |
| 374 | `onResize` | Function | Handle window resize | ❌ Keep (simple helper) |
| 381 | `slidePrev` | Function | Carousel slide prev wrapper | ❌ Keep in component |
| 385 | `slideNext` | Function | Carousel slide next wrapper | ❌ Keep in component |
| 390 | `toggleFavorite` | Function | Toggle charger favorite status | ✅ Yes - to hook |
| 413 | `handleSignOut` | Async function | Sign out user | ✅ Yes - to hook |
| 426 | `getFilteredChargers` | Function | Filter chargers (currently stub) | ✅ Yes - to hook |
| 431 | `handleFilterChange` | Function | Handle filter dropdown change | ❌ Keep (simple setter) |
| 437 | `handleSortChange` | Function | Handle sort dropdown change | ❌ Keep (simple setter) |

---

## Decoupling Plan

### Phase 1: Custom Hooks (Highest Priority)
Create `hooks/` directory with custom hooks:

1. **`useChargers.ts`** - Charger fetching, filtering, favorites
   - `fetchChargers` effect
   - `getFilteredChargers`
   - `toggleFavorite`
   - `handleRequestBooking`
   - State: `dbChargers`, `loading`, `favorites`, `bookingLoaderId`, `bookingError`

2. **`useGeolocation.ts`** - Geolocation logic
   - `handleGeolocate`
   - State: `userCoords`, `locationError`

3. **`useAuth.ts`** - Authentication logic
   - `handleSignOut`
   - Auth state listener
   - State: `user`

4. **`useTheme.ts`** - Theme management
   - `toggleTheme`
   - Theme initialization
   - State: `theme`

### Phase 2: Component Extraction (Medium Priority)
Already done:
- ✅ `FilterBar.tsx` - Search and filter controls
- ✅ `SearchListings.tsx` - Chargers grid and pagination
- ✅ `ChargerCard.tsx` - Individual charger card

Still needed:
- `HeroCarousel.tsx` - Hero section with slides
- `JourneySteps.tsx` - How it works carousel
- `Testimonials.tsx` - Testimonials section
- `TrustStats.tsx` - Stats section
- `CTABanner.tsx` - Call to action banner
- `Footer.tsx` - Footer component

### Phase 3: Utilities (Low Priority)
- `lib/booking.ts` - Booking API calls
- `lib/geolocation.ts` - Geolocation helpers

---

## Recommended Execution Order

1. **Fix immediate errors first**:
   - Add missing state declarations (✅ DONE)
   - Replace listings JSX with SearchListings (✅ DONE)
   - Fix script tag warning in layout.tsx
   - Fix duplicate `if` in SearchListings.tsx

2. **Create custom hooks** (reduces component complexity):
   - `useChargers.ts`
   - `useGeolocation.ts`
   - `useAuth.ts`
   - `useTheme.ts`

3. **Extract remaining UI sections**:
   - HeroCarousel
   - JourneySteps
   - Testimonials
   - TrustStats
   - CTABanner
   - Footer

4. **Clean up**:
   - Remove unused functions
   - Remove duplicate code
   - Update imports

---

## Files to Create

```
hooks/
  useChargers.ts
  useGeolocation.ts
  useAuth.ts
  useTheme.ts

components/
  HeroCarousel.tsx
  JourneySteps.tsx
  Testimonials.tsx
  TrustStats.tsx
  CTABanner.tsx
  Footer.tsx
  Navbar.tsx (optional)

lib/
  booking.ts
  geolocation.ts
```

---

## Estimated Complexity

| Task | Complexity | Impact |
|------|-----------|--------|
| Fix script tag warning | Low | High |
| Fix duplicate `if` | Low | Medium |
| Create useChargers hook | Medium | High |
| Create useGeolocation hook | Medium | High |
| Create useAuth hook | Medium | High |
| Create useTheme hook | Low | Medium |
| Extract HeroCarousel | Medium | Medium |
| Extract JourneySteps | Medium | Medium |
| Extract Testimonials | Low | Low |
| Extract TrustStats | Low | Low |
| Extract CTABanner | Low | Low |
| Extract Footer | Low | Low |

---

## Next Steps

1. Review this plan
2. Prioritize which hooks to create first
3. Start with highest impact, lowest complexity items
4. Test after each extraction
