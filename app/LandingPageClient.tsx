"use client";

import { useState, useEffect, useRef, useCallback, useDeferredValue, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Calendar,
  Smartphone,
  Zap,
  Home,
  Shield,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  Circle,
  Square,
  Clock,
} from "lucide-react";

// Custom hooks
import { useUnifiedSearch } from "@/hooks/useUnifiedSearch";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { ChargerResult, ChargingSiteResult } from "@/lib/types";

// Import components
import FilterBar from "@/components/FilterBar";
import SearchListings from "@/components/SearchListings";
import ChargingSiteCard from "@/components/ChargingSiteCard";
import dynamic from "next/dynamic";

const InteractiveMap = dynamic(() => import("@/components/map/EVMapClient"), {
  ssr: false,
  loading: () => (
    <div style={{ height: 560, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-surface)", borderRadius: "var(--radius-xl)" }}>
      <span style={{ color: "var(--color-muted)" }}>Loading interactive map…</span>
    </div>
  ),
});

const ChargingMap = dynamic(() => import("@/components/ChargingMap"), {
  ssr: false,
  loading: () => (
    <div style={{ height: 480, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-surface)", borderRadius: "var(--radius-xl)" }}>
      <span style={{ color: "var(--color-muted)" }}>Loading map…</span>
    </div>
  ),
});

// Skeleton fallbacks
const MapSkeleton = () => (
  <div style={{ height: 480, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-surface)", borderRadius: "var(--radius-xl)", border: "1.5px solid var(--color-border)" }} aria-hidden="true">
    <span style={{ color: "var(--color-muted)" }}>Loading map…</span>
  </div>
);

const ListingsSkeleton = () => (
  <div className="listings-grid" role="list" aria-label="EV charger listings" aria-busy="true">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="animate-pulse" style={{ background: "var(--color-surface-2)", height: "360px", borderRadius: "16px", border: "1.5px solid var(--color-border)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }} />
    ))}
  </div>
);

const HERO_SLIDES = [
  { id: 1, image: "https://images.unsplash.com/photo-1704475386627-dcfcd97ed51a?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", tag: "Discover", title: "Charge at Home, On the Go", specs: ["P2P Network", "₹6/kWh Average", "1,200+ Hosts"], color: "#00d084" },
  { id: 2, image: "https://images.unsplash.com/photo-1671785196242-ba6b37b10ce5?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", tag: "Earn", title: "Turn Your Charger into Income", specs: ["₹5,400/mo Avg", "48 Cities", "Zero Setup"], color: "#3b82f6" },
  { id: 3, image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1000&q=80", tag: "Trust", title: "Secure, Verified, Community-Driven", specs: ["4.9★ Rating", "Secret Code", "Verified IDs"], color: "#f59e0b" },
];

const JOURNEY_STEPS = [
  { num: "01", icon: <Search className="w-6 h-6" />, title: "Search Nearby Chargers", desc: "Open Electric UPI and type your city or area. Browse a map view or list of home-based EV chargers available near you — just like searching on OLX or Airbnb.", tag: "Driver", tagType: "primary" },
  { num: "02", icon: <Calendar className="w-6 h-6" />, title: "Request a Booking", desc: "See the host's charger details — price per kWh, distance, availability, and ratings. Tap 'Request Booking'. The host gets notified and can accept or decline instantly.", tag: "Both", tagType: "accent" },
  { num: "03", icon: <Smartphone className="w-6 h-6" />, title: "Verify with Secret Code", desc: "Host accepts → your app shows a 6-digit secret code (valid 15 min). When you arrive, tell the code to the host. Host enters it to verify. No QR scanning, no fuss.", tag: "Secure", tagType: "info" },
  { num: "04", icon: <Zap className="w-6 h-6" />, title: "Charge & Pay", desc: "Both tap 'Start Charging'. Session runs. When done, tap 'Stop'. Cost is auto-calculated by kWh consumed. Payment via UPI — split in seconds. Host earns, driver powers up.", tag: "Complete", tagType: "success" },
  { num: "05", icon: <Home className="w-6 h-6" />, title: "Hosts: List Your Charger", desc: "Have an EV charger at home? List it in 5 minutes. Set your price per kWh, availability hours, and charger specs. Your home becomes Airbnb for EVs — earn ₹2,000–₹8,000/month.", tag: "Host", tagType: "accent" },
  { num: "06", icon: <Shield className="w-6 h-6" />, title: "Trust & Safety System", desc: "Every host and driver has a Trust Score. Both can leave reviews after each session. Verified profiles, photo IDs, and session logs keep the community safe — just like Airbnb does.", tag: "Community", tagType: "info" },
];

interface LandingPageProps {
  initialUser?: User | null;
}

export default function LandingPageClient({ initialUser = null }: LandingPageProps = {}) {
  // State
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [filterType, setFilterType] = useState("All Types");
  const [sortOrder, setSortOrder] = useState("Nearest First");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [radius, setRadius] = useState(50);
  const [maxPrice, setMaxPrice] = useState("");
  const [plugTypes, setPlugTypes] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [selectedChargerId, setSelectedChargerId] = useState<string | null>(null);
  const [selectedCharger, setSelectedCharger] = useState<ChargerResult | ChargingSiteResult | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  const [bookingLoaderId, setBookingLoaderId] = useState<string>("");

  const [bookingError, setBookingError] = useState("");

  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  // Hooks
  const { user, handleSignOut } = useAuth({ initialUser });
  const { theme, toggleTheme } = useTheme();
  const { userCoords, locationError, setLocationError, handleGeolocate, setUserCoords } = useGeolocation({ initialCoords: null });

  // =====================================================================
  // Single unified hook for all search data
  // =====================================================================
  const {
    chargers,
    sites,
    center,
    loading,
  } = useUnifiedSearch({
    searchQuery: submittedQuery,
    userCoords,
    filterType,
    radius,
    maxPrice,
    plugTypes,
    page,
  });



  // Client-side sort + filter for peer chargers
   const getFilteredChargers = useCallback(() => {
    let result = [...chargers];

    // Filter by type — using actual ChargerResult fields
    if (filterType === "Home Charger") {
      result = result.filter(
        (c) =>
          c.chargerType?.toLowerCase().includes("home") ||
          c.chargerType?.toLowerCase().includes("level 2") ||
          c.category?.toLowerCase().includes("home")
      );
    } else if (filterType === "Fast Charging") {
      result = result.filter((c) => c.powerKw != null && c.powerKw >= 22);
    } else if (filterType === "Apartment") {
      result = result.filter(
        (c) =>
          c.category?.toLowerCase().includes("apartment") ||
          c.type?.toLowerCase().includes("apartment")
      );
    } else if (filterType === "Verified Host") {
      result = result.filter((c) => c.isSuperhost === true);
    } else if (filterType === "24/7 Available") {
      // No time window specified = available anytime
      result = result.filter(
        (c) => c.availableFrom == null && c.availableTo == null
      );
    }

    // Filter by plug types
    if (plugTypes.length > 0) {
      result = result.filter((c) =>
        plugTypes.some((pt) =>
          c.plugType?.toLowerCase().includes(pt.toLowerCase())
        )
      );
    }

    // Filter by max price
    if (maxPrice) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) {
        result = result.filter(
          (c) => c.pricePerKwh != null && c.pricePerKwh <= max
        );
      }
    }

    // Sort
    if (sortOrder === "Nearest First" && userCoords) {
      result.sort((a, b) => {
        const distA = a.distanceKm ?? Infinity;
        const distB = b.distanceKm ?? Infinity;
        return distA - distB;
      });
    } else if (sortOrder === "Price: Low to High") {
      result.sort(
        (a, b) => (a.pricePerKwh ?? Infinity) - (b.pricePerKwh ?? Infinity)
      );
    } else if (sortOrder === "Highest Rated") {
      result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }

    return result;
  }, [chargers, filterType, plugTypes, maxPrice, sortOrder, userCoords]);
  const filteredChargers = getFilteredChargers();

  // Simple booking handler
  const handleRequestBooking = useCallback(async (chargerId: string) => {
    if (!user) {
      router.push("/login");
      return;
    }
    setBookingLoaderId(chargerId);
    setBookingError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chargerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking failed");
      // alarm
      // router.push(`/booking/${data.id}`);
      router.push(`/booking/${data.bookingId}`);
    } catch (err: any) {
      setBookingError(err.message || "Something went wrong");
    } finally {
      setBookingLoaderId("");
    }
  }, [user, router]);

  const toggleFavorite = useCallback((id: string, _e: React.MouseEvent) => {
    setFavorites((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]);
  }, []);

  // Handlers
  const handleSearchSubmit = useCallback((value: string) => {
    setSubmittedQuery(value);
    setPage(1);
  }, []);
  // Toggle proximity — clears text query when turning ON, clears coords when turning OFF
  const handleToggleProximity = useCallback(() => {
    if (userCoords) {
      // Turn OFF proximity
      setUserCoords(null);
    } else {
      // Turn ON proximity — clear text search, use coords only
      setSubmittedQuery("");
      setSearchQuery("");
      setPage(1);
      handleGeolocate();
    }
  }, [userCoords, handleGeolocate]);
  const deferredQuery = useDeferredValue(submittedQuery);

  // Hero Carousel
  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
      }, 5000);
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isAutoPlaying]);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  }, []);

  // Carousel controls
  const [visibleSteps, setVisibleSteps] = useState<number>(3);
  useEffect(() => {
    const compute = () => (window.innerWidth < 768 ? 1 : 3);
    setVisibleSteps(compute());
    const onResize = () => setVisibleSteps(compute());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const maxCarouselIndex = Math.max(0, JOURNEY_STEPS.length - visibleSteps);
  const slidePrev = useCallback(() => setCarouselIndex((prev) => Math.max(0, prev - 1)), []);
  const slideNext = useCallback(() => setCarouselIndex((prev) => Math.min(maxCarouselIndex, prev + 1)), [maxCarouselIndex]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* NAVBAR */}
      <nav className="nav" role="navigation" aria-label="Main navigation">
        <div className="nav-inner">
          <Link href="/" className="nav-logo" aria-label="Electric UPI Home">
            <div className="nav-logo-icon"><Zap className="w-5 h-5 text-white fill-white" /></div>
            <div>
              <div className="nav-logo-text">Electric UPI</div>
              <div className="nav-logo-sub">P2P EV Charging</div>
            </div>
          </Link>
          <form className="nav-search" role="search" onSubmit={(e) => { e.preventDefault(); const trimmed = searchQuery.trim(); if (trimmed.length >= 2) handleSearchSubmit(trimmed); }}>
            <Search className="w-4 h-4" />
            <input type="text" placeholder="Search by city, area, pin..." aria-label="Search chargers" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </form>
          <div className="nav-actions">
            <Link href="/list-charger" className="btn btn-outline">List Your Charger</Link>
            <a href="#find" className="btn btn-primary">Find Charging</a>
            {user && (<><Link href="/host/bookings" className="btn btn-ghost">Host Dashboard</Link><Link href="/driver/bookings" className="btn btn-ghost">My Bookings</Link></>)}
            {user ? <button onClick={handleSignOut} className="btn btn-ghost">Sign Out</button> : <Link href="/login" className="btn btn-ghost">Sign In</Link>}
            <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle dark mode">{theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero" id="home">
        <div className="hero-bg" aria-hidden="true"></div>
        <div className="hero-grid" aria-hidden="true"></div>
        <div className="hero-inner">
          <div className="hero-text">
            <div className="hero-badge"><Zap className="w-3 h-3 fill-current mr-1" />India's First P2P EV Charging Network</div>
            <h1 className="hero-title">Charge your car,<br /><em>right at home.</em></h1>
            <p className="hero-subtitle">Find home-based EV chargers near you — or turn your home into a charging hub and earn money while you sleep. Just like Airbnb, but for electrons.</p>
            <div className="hero-cta-row">
              <a href="#find" className="btn btn-primary btn-lg"><Search className="w-5 h-5 mr-1" />Find a Charger</a>
              <Link href="/list-charger" className="btn btn-outline btn-lg"><Home className="w-5 h-5 mr-1" />Become a Host</Link>
            </div>
            <div className="hero-stats" role="list" aria-label="Key metrics">
              <div role="listitem"><div className="hero-stat-num">1,200+</div><div className="hero-stat-label">Active chargers</div></div>
              <div role="listitem" style={{ borderLeft: "1px solid var(--color-border)", paddingLeft: "var(--space-6)" }}><div className="hero-stat-num">48</div><div className="hero-stat-label">Cities in India</div></div>
              <div role="listitem" style={{ borderLeft: "1px solid var(--color-border)", paddingLeft: "var(--space-6)" }}><div className="hero-stat-num">₹6/kWh</div><div className="hero-stat-label">Avg. price</div></div>
            </div>
          </div>
          <div className="hero-carousel-wrapper">
            <div className="hero-carousel">
              <AnimatePresence initial={false} custom={currentSlide}>
                {HERO_SLIDES.map((slide, index) => index === currentSlide && (
                  <motion.div key={slide.id} className="carousel-hero-slide" initial={{ opacity: 0, x: 100, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -100, scale: 0.9 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} style={{ zIndex: 2 }}>
                    <div className="slide-image-wrapper"><img src={slide.image} alt={slide.title} className="slide-image" /><div className="slide-overlay" /></div>
                    <div className="slide-content">
                      <span className="slide-tag" style={{ backgroundColor: slide.color }}>{slide.tag}</span>
                      <h3 className="slide-title">{slide.title}</h3>
                      <ul className="slide-specs">{slide.specs.map((spec, i) => <li key={i} className="slide-spec-item"><Zap className="w-3 h-3" style={{ color: slide.color }} />{spec}</li>)}</ul>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div className="carousel-progress-bar"><div className="carousel-progress-fill" style={{ width: `${((currentSlide + 1) / HERO_SLIDES.length) * 100}%`, backgroundColor: HERO_SLIDES[currentSlide].color }} /></div>
              <div className="carousel-controls">
                <button className="carousel-arrow prev w-8 h-8 p-1 rounded-full bg-black/30 dark:bg-white/10" onClick={prevSlide} aria-label="Previous slide"><ChevronLeft className="w-4 h-4" /></button>
                <div className="journey-carousel-dots">{HERO_SLIDES.map((_, index) => <button key={index} className={`carousel-dot ${index === currentSlide ? "active" : ""}`} onClick={() => goToSlide(index)} aria-label={`Go to slide ${index + 1}`} />)}</div>
                <button className="carousel-arrow next w-8 h-8 p-1 rounded-full bg-black/30 dark:bg-white/10" onClick={nextSlide} aria-label="Next slide"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EV CHARGING MAP */}
      <section className="map-section" id="map" aria-labelledby="map-heading">
        <div className="section-header fade-in" style={{ textAlign: "center", marginBottom: "var(--space-4)" }}>
          <div className="section-eyebrow">Explore Stations</div>
          <h2 className="section-title" id="map-heading">39,000+ Charging Stations Across India</h2>
          <p className="section-subtitle" style={{ maxWidth: 600, margin: "0 auto" }}>Browse every registered EV charging station on an interactive map. Filter by charger type or state to find exactly what you need.</p>
        </div>
        <Suspense fallback={<MapSkeleton />}>
          {/* FIX #2: ChargingMap now gets both chargers + sites from single hook */}
          <ChargingMap
            chargers={chargers}
            sites={sites}
            userCoords={userCoords}
            selectedChargerId={selectedChargerId}
            onSelectCharger={setSelectedChargerId}
          />
        </Suspense>
      </section>

      {/* INTERACTIVE ROUTE MAP */}
      <section id="interactive-map" aria-labelledby="interactive-map-heading" style={{ padding: "var(--space-8) 0" }}>
        <div className="section-header fade-in" style={{ textAlign: "center", marginBottom: "var(--space-4)" }}>
          <div className="section-eyebrow">Route & Navigate</div>
          <h2 className="section-title" id="interactive-map-heading">Live Route Tracking & Trip Simulator</h2>
          <p className="section-subtitle" style={{ maxWidth: 600, margin: "0 auto" }}>Select any station to see turn-by-turn routing. Simulate your trip live with real-time GPS tracking.</p>
        </div>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 var(--space-4)" }}>
          <Suspense fallback={<MapSkeleton />}>
            <div style={{ position: "relative", height: 560, borderRadius: "var(--radius-xl)", overflow: "hidden", border: "1.5px solid var(--color-border)" }}>
              <InteractiveMap
                chargers={chargers.slice(0, 50)}
                sites={sites}
                selectedCharger={selectedCharger}
                onSelectCharger={(c: ChargerResult | ChargingSiteResult) => setSelectedCharger(c)}
                userCoords={userCoords || { lat: 28.6315, lng: 77.2167 }}
              />
            </div>
          </Suspense>
        </div>
      </section>

      {/* CATEGORY CHIPS */}
      <div className="category-section" id="find" role="navigation" aria-label="Filter by charger type">
        <div className="category-inner">
          <div className="category-chips" role="list">
            {[{ label: "All", icon: <Circle className="w-4 h-4" /> }, { label: "Home Charger", icon: <Home className="w-4 h-4" /> }, { label: "Apartment", icon: <Square className="w-4 h-4" /> }, { label: "Fast Charging", icon: <Zap className="w-4 h-4" /> }, { label: "Verified Host", icon: <Shield className="w-4 h-4" /> }, { label: "24/7 Available", icon: <Clock className="w-4 h-4" /> }].map((chip) => (
            <button key={chip.label} className={`chip ${activeCategory === chip.label ? "active" : ""}`} role="listitem" aria-pressed={activeCategory === chip.label} onClick={() => { setActiveCategory(chip.label); setFilterType(chip.label === "All" ? "All Types" : chip.label); }}>{chip.icon}{chip.label}</button>
          ))}
          </div>
        </div>
      </div>

      {/* LISTINGS */}
      <section className="listings-section" aria-labelledby="listings-heading">
        <div className="listings-inner">
          <div className="section-header fade-in" style={{ marginBottom: "var(--space-6)" }}>
            <div className="section-eyebrow">Chargers Near You</div>
            <h2 className="section-title" id="listings-heading">Find your perfect<br /><em style={{ fontStyle: "italic" }}>charging spot</em></h2>
          </div>

          {locationError && <div style={{ background: "#fffbeb", border: "1.5px solid #fef3c7", color: "#b45309", padding: "12px 16px", borderRadius: "12px", marginBottom: "16px", fontSize: "14px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 10, position: "relative" }}><span>⚠️ {locationError}</span><button onClick={() => setLocationError("")} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontWeight: "bold" }}>✕</button></div>}

          {bookingError && <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", color: "#b91c1c", padding: "12px 16px", borderRadius: "12px", marginBottom: "16px", fontSize: "14px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 10, position: "relative" }}><span>⚠️ {bookingError}</span><button onClick={() => setBookingError("")} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontWeight: "bold" }}>✕</button></div>}

          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSearchSubmit={handleSearchSubmit}
            isSearching={loading}
            filterType={filterType}
            onFilterTypeChange={setFilterType}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            userCoords={userCoords}
            onGeolocate={handleToggleProximity}
            onReset={() => { setSearchQuery(""); setSubmittedQuery(""); setFilterType("All Types"); setSortOrder("Nearest First"); setUserCoords(null); setLocationError(""); setRadius(50); setMaxPrice(""); setPlugTypes([]); setActiveCategory("All"); }}
          />

          <div className="listings-meta">
            <p className="listings-count">Showing <strong>{filteredChargers.length} peer chargers</strong> and <strong>{sites.length} public stations</strong></p>
            <div className="sort-row">
              <span>Sort:</span>
              <button onClick={() => setSortOrder("Nearest First")} className={`btn btn-ghost ${sortOrder === "Nearest First" ? "text-primary font-bold" : ""}`} style={{ padding: "var(--space-1) var(--space-2)", fontSize: "var(--text-sm)" }}>Nearest</button>
              <button onClick={() => setSortOrder("Price: Low to High")} className={`btn btn-ghost ${sortOrder === "Price: Low to High" ? "text-primary font-bold" : ""}`} style={{ padding: "var(--space-1) var(--space-2)", fontSize: "var(--text-sm)" }}>Price</button>
              <button onClick={() => setSortOrder("Highest Rated")} className={`btn btn-ghost ${sortOrder === "Highest Rated" ? "text-primary font-bold" : ""}`} style={{ padding: "var(--space-1) var(--space-2)", fontSize: "var(--text-sm)" }}>Rating</button>
            </div>
          </div>

          <Suspense fallback={<ListingsSkeleton />}>
            {/* FIX #2: Pass sites prop — now required by SearchListings */}
            <SearchListings
              searchQuery={deferredQuery}
              userCoords={userCoords}
              filterType={filterType}
              sortOrder={sortOrder}
              radius={radius}
              maxPrice={maxPrice}
              plugTypes={plugTypes}
              page={page}
              favorites={favorites}
              bookingLoaderId={bookingLoaderId}
              bookingError={bookingError}
              selectedChargerId={selectedChargerId}
              onSelectCharger={(chargerId) => setSelectedChargerId(chargerId)}
              onToggleFavorite={toggleFavorite}
              onRequestBooking={handleRequestBooking}
              onSetPage={setPage}
              onSetTotal={() => {}}
              getFilteredChargers={getFilteredChargers}
              sites={sites}
              loading={loading}
            />
          </Suspense>

          {/* ================================================================= */}
          {/* FIX #3: REMOVED duplicate public sites grid.                      */}
          {/* Sites are now rendered inside SearchListings as unified results.    */}
          {/* If you want a SEPARATE dedicated section for public sites only,    */}
          {/* uncomment below — but be aware users will see sites twice.         */}
          {/* ================================================================= */}
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="cta-banner" id="list-charger" aria-labelledby="cta-heading">
        <div className="cta-banner-bg" aria-hidden="true"></div>
        <div className="cta-inner">
          <div className="section-eyebrow" style={{ color: "oklch(1 0 0 / .7)" }}>For Homeowners & Societies</div>
          <h2 className="cta-title" id="cta-heading">Turn your charger into<br /><em>a source of income</em></h2>
          <p className="cta-sub">List your home EV charger on Electric UPI. Set your own price, hours, and availability. Earn ₹2,000–₹8,000 per month while helping your neighbours charge.</p>
          <div className="cta-btns">
            <Link href="/list-charger" className="btn btn-white" style={{ padding: "var(--space-3) var(--space-8)", fontSize: "var(--text-base)" }}>List My Charger — Free</Link>
            <a href="#journey-heading" className="btn btn-ghost-white" style={{ padding: "var(--space-3) var(--space-8)", fontSize: "var(--text-base)" }}>Learn How It Works</a>
          </div>
        </div>
      </section>

      {/* TRUST STATS */}
      <section className="trust-section" aria-labelledby="trust-heading">
        <div className="trust-inner">
          <div className="section-header fade-in">
            <div className="section-eyebrow">By The Numbers</div>
            <h2 className="section-title" id="trust-heading">Why India is<br /><em style={{ fontStyle: "italic" }}>choosing Electric UPI</em></h2>
          </div>
          <div className="trust-grid fade-in" role="list">
            <div className="trust-card" role="listitem"><div className="trust-num">1,200+</div><div className="trust-label">Home chargers listed across India</div></div>
            <div className="trust-card" role="listitem"><div className="trust-num">48</div><div className="trust-label">Cities covered and growing</div></div>
            <div className="trust-card" role="listitem"><div className="trust-num">₹6/kWh</div><div className="trust-label">Average price per kWh — 40% cheaper than public stations</div></div>
            <div className="trust-card" role="listitem"><div className="trust-num">4.9★</div><div className="trust-label">Average host rating across all sessions</div></div>
            <div className="trust-card" role="listitem"><div className="trust-num">₹5,400</div><div className="trust-label">Average monthly host earnings</div></div>
            <div className="trust-card" role="listitem"><div className="trust-num">25%</div><div className="trust-label">Monthly growth rate — India's fastest EV charging network</div></div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS CAROUSEL */}
      <section className="journey-section" aria-labelledby="journey-heading">
        <div className="section-header fade-in">
          <div className="section-eyebrow">How It Works</div>
          <h2 className="section-title" id="journey-heading">Your EV journey,<br /><em style={{ fontStyle: "italic" }}>explained simply</em></h2>
          <p className="section-subtitle">From finding a charger to completing a session — it takes just 4 steps. No QR codes. No complexity.</p>
        </div>
        <div className="carousel-wrapper fade-in">
          <div className="carousel-track-outer ">
            <div className="carousel-track" style={{ transform: `translateX(-${carouselIndex * (100 / visibleSteps)}%)`, transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }} role="list">
              {JOURNEY_STEPS.map((step) => (
                <div key={step.num} className="journey-step" style={{ flex: `0 0 calc(${100 / visibleSteps}% - var(--space-4))` }} role="listitem">
                  <div className="step-number" aria-hidden="true">{step.num}</div>
                  <div className={`step-icon-wrap ${step.tagType}`}>{step.icon}</div>
                  <h3 className="step-title">{step.title}</h3>
                  <p className="step-desc">{step.desc}</p>
                  <div className={`step-tag ${step.tagType}`}>{step.tag}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="carousel-nav" aria-label="Carousel navigation">
            <button onClick={slidePrev} className="carousel-btn" disabled={carouselIndex === 0} aria-label="Previous step"><ChevronLeft className="w-5 h-5" /></button>
            <div className="journey-carousel-dots  " id="carouselDots" role="tablist" aria-label="Journey steps">
              {Array.from({ length: maxCarouselIndex + 1 }).map((_, i) => (
                <button key={i} className={`carousel-dot ${carouselIndex === i ? "active" : ""}`} role="tab" aria-selected={carouselIndex === i} aria-label={`Go to step ${i + 1}`} onClick={() => setCarouselIndex(i)} />
              ))}
            </div>
            <button onClick={slideNext} className="carousel-btn" disabled={carouselIndex === maxCarouselIndex} aria-label="Next step"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials-section" aria-labelledby="testimonials-heading">
        <div style={{ maxWidth: "var(--content-wide)", marginInline: "auto" }}>
          <div className="section-header fade-in">
            <div className="section-eyebrow">Community Stories</div>
            <h2 className="section-title" id="testimonials-heading">Real people,<br /><em style={{ fontStyle: "italic" }}>real experiences</em></h2>
          </div>
        </div>
        <div className="testimonials-grid fade-in">
          <div className="testimonial-card">
            <p className="testimonial-quote">I charge my Tata Nexon EV at Rahul's place every evening. It's literally 800m from my house. Costs me ₹50 for a full overnight charge. Game changer!</p>
            <div className="testimonial-user">
              <div className="t-avatar" aria-hidden="true">M</div>
              <div><div className="t-name">Mayank Gupta</div><div className="t-role">EV Driver · Lajpat Nagar</div></div>
              <div className="t-stars" aria-label="5 out of 5 stars">★★★★★</div>
            </div>
          </div>
          <div className="testimonial-card">
            <p className="testimonial-quote">Listed my 7.4 kW charger 3 months ago. I'm now earning ₹6,200/month from it. It just sits in my parking slot and pays my WiFi bill 3x over. Brilliant idea.</p>
            <div className="testimonial-user">
              <div className="t-avatar" style={{ background: "var(--color-accent)" }} aria-hidden="true">S</div>
              <div><div className="t-name">Sunita Agarwal</div><div className="t-role">Host · Dwarka, Delhi</div></div>
              <div className="t-stars" aria-label="5 out of 5 stars">★★★★★</div>
            </div>
          </div>
          <div className="testimonial-card">
            <p className="testimonial-quote">The secret code verification is clever — no awkward QR scanning, just a quick 6-digit code. Feels safe and very smooth. Exactly what P2P needed to work in India.</p>
            <div className="testimonial-user">
              <div className="t-avatar" style={{ background: "#0284c7" }} aria-hidden="true">A</div>
              <div><div className="t-name">Arjun Sharma</div><div className="t-role">Driver · Bengaluru</div></div>
              <div className="t-stars" aria-label="5 out of 5 stars">★★★★★</div>
            </div>
          </div>
          <div className="testimonial-card">
            <p className="testimonial-quote">Our housing society now has 5 registered hosts. We've solved range anxiety for everyone inside the colony. Electric UPI made it happen without any infrastructure investment.</p>
            <div className="testimonial-user">
              <div className="t-avatar" style={{ background: "#7c3aed" }} aria-hidden="true">R</div>
              <div><div className="t-name">Ritu Joshi</div><div className="t-role">RWA President · Noida</div></div>
              <div className="t-stars" aria-label="5 out of 5 stars">★★★★★</div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer role="contentinfo">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="nav-logo" style={{ marginBottom: "var(--space-4)" }}>
                <div className="nav-logo-icon"><Zap className="w-5 h-5 text-white fill-white" /></div>
                <div><div className="nav-logo-text" >Electric UPI</div><div className="nav-logo-sub">India's P2P EV Network</div></div>
              </div>
              <p>Empowering local communities to accelerate EV adoption with decentralized home charging networks across India.</p>
            </div>
            <div className="footer-col">
              <h4>For Drivers</h4>
              <ul><li><a href="#">Find a Charger</a></li><li><a href="#">How It Works</a></li><li><a href="#">Pricing</a></li><li><a href="#">EV Calculator</a></li><li><a href="#">Safety</a></li></ul>
            </div>
            <div className="footer-col">
              <h4>For Hosts</h4>
              <ul><li><a href="#">List Your Charger</a></li><li><a href="#">Host Guide</a></li><li><a href="#">Earnings Calculator</a></li><li><a href="#">Trust & Safety</a></li><li><a href="#">Host Community</a></li></ul>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <ul><li><a href="#">About Us</a></li><li><a href="#">Blog</a></li><li><a href="#">Careers</a></li><li><a href="#">Press</a></li><li><a href="#">Contact</a></li></ul>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-copy">© 2026 Electric UPI. All rights reserved. Made with ⚡ in India.</div>
            <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
              <a href="#" style={{ color: "oklch(from white l c h / .45)", fontSize: "var(--text-xs)", textDecoration: "none" }}>Privacy Policy</a>
              <a href="#" style={{ color: "oklch(from white l c h / .45)", fontSize: "var(--text-xs)", textDecoration: "none" }}>Terms of Service</a>
              <a href="#" style={{ color: "oklch(from white l c h / .45)", fontSize: "var(--text-xs)", textDecoration: "none" }}>Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}