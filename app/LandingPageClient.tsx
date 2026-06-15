"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Search,
  Home,
  Sun,
  Moon,
  MapPin,
  Star,
  Heart,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Shield,
  Circle,
  Square,
  Clock,
  Layers,
  Box,
  Calendar,
  Smartphone,
  CheckCircle2,
  Users,
} from "lucide-react";



const HERO_SLIDES = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1704475386627-dcfcd97ed51a?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    tag: "Discover",
    title: "Charge at Home, On the Go",
    specs: ["P2P Network", "₹6/kWh Average", "1,200+ Hosts"],
    color: "#00d084",
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1671785196242-ba6b37b10ce5?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    tag: "Earn",
    title: "Turn Your Charger into Income",
    specs: ["₹5,400/mo Avg", "48 Cities", "Zero Setup"],
    color: "#3b82f6",
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1000&q=80",
    tag: "Trust",
    title: "Secure, Verified, Community-Driven",
    specs: ["4.9★ Rating", "Secret Code", "Verified IDs"],
    color: "#f59e0b",
  },
];

// Journey Steps from HTML
const JOURNEY_STEPS = [
  {
    num: "01",
    icon: <Search className="w-6 h-6" />,
    title: "Search Nearby Chargers",
    desc: "Open Electric UPI and type your city or area. Browse a map view or list of home-based EV chargers available near you — just like searching on OLX or Airbnb.",
    tag: "Driver",
    tagType: "primary",
  },
  {
    num: "02",
    icon: <Calendar className="w-6 h-6" />,
    title: "Request a Booking",
    desc: "See the host's charger details — price per kWh, distance, availability, and ratings. Tap 'Request Booking'. The host gets notified and can accept or decline instantly.",
    tag: "Both",
    tagType: "accent",
  },
  {
    num: "03",
    icon: <Smartphone className="w-6 h-6" />,
    title: "Verify with Secret Code",
    desc: "Host accepts → your app shows a 6-digit secret code (valid 15 min). When you arrive, tell the code to the host. Host enters it to verify. No QR scanning, no fuss.",
    tag: "Secure",
    tagType: "info",
  },
  {
    num: "04",
    icon: <Zap className="w-6 h-6" />,
    title: "Charge & Pay",
    desc: "Both tap 'Start Charging'. Session runs. When done, tap 'Stop'. Cost is auto-calculated by kWh consumed. Payment via UPI — split in seconds. Host earns, driver powers up.",
    tag: "Complete",
    tagType: "success",
  },
  {
    num: "05",
    icon: <Home className="w-6 h-6" />,
    title: "Hosts: List Your Charger",
    desc: "Have an EV charger at home? List it in 5 minutes. Set your price per kWh, availability hours, and charger specs. Your home becomes Airbnb for EVs — earn ₹2,000–₹8,000/month.",
    tag: "Host",
    tagType: "accent",
  },
  {
    num: "06",
    icon: <Shield className="w-6 h-6" />,
    title: "Trust & Safety System",
    desc: "Every host and driver has a Trust Score. Both can leave reviews after each session. Verified profiles, photo IDs, and session logs keep the community safe — just like Airbnb does.",
    tag: "Community",
    tagType: "info",
  },
];

interface LandingPageProps {
  initialUser: User | null;
}

export default function LandingPageClient({ initialUser }: LandingPageProps) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [activeCategory, setActiveCategory] = useState("All");
  const [favorites, setFavorites] = useState<string[]>([]); // Favorite listings
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("All Types");
  const [sortOrder, setSortOrder] = useState("Nearest First");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // DB Data & API states
  const [dbChargers, setDbChargers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState("");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [bookingLoaderId, setBookingLoaderId] = useState("");
  const [bookingError, setBookingError] = useState("");

  const heroCarouselRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const supabase = getSupabaseBrowserClient();
  const router = useRouter();

  // Fetch chargers from DB with geolocation if enabled
  useEffect(() => {
    let active = true;
    async function fetchChargers() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.set("q", searchQuery);
        if (userCoords) {
          params.set("lat", String(userCoords.lat));
          params.set("lng", String(userCoords.lng));
        }
        const res = await fetch(`/api/chargers?${params.toString()}`);
        if (res.ok && active) {
          const data = await res.json();
          setDbChargers(data.chargers || []);
        }
      } catch (err) {
        console.error("Failed to fetch chargers:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    const delayDebounce = setTimeout(() => {
      fetchChargers();
    }, 300);

    return () => {
      active = false;
      clearTimeout(delayDebounce);
    };
  }, [searchQuery, userCoords]);

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }
    // Simple secure context check (Chrome / modern browsers block geolocation on insecure HTTP)
    const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    if (typeof window !== "undefined" && !window.isSecureContext && !isLocal) {
      setLocationError("Proximity search requires a secure context (HTTPS).");
      return;
    }

    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.warn("Geolocation error:", error);
        setLocationError("Permission denied or location unavailable.");
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const handleRequestBooking = async (chargerId: string) => {
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
      console.debug("handleRequestBooking response", res.status, data);
      if (!res.ok) {
        setBookingError(data.error || "Failed to request booking.");
        // show immediate alert for debugging
        alert("Booking failed: " + (data.error || res.statusText));
        if (data.bookingId) {
          router.push(`/booking/${data.bookingId}`);
        }
      } else {
        router.push(`/booking/${data.bookingId}`);
      }
    } catch (err) {
      console.error("Booking error:", err);
      setBookingError("Network error. Please try again.");
      alert("Network error while creating booking: " + String(err));
    } finally {
      setBookingLoaderId("");
    }
  };

  // Hero Carousel Auto-play
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

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  // Listen to auth state changes
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [supabase]);

  // Handle Theme Init
  useEffect(() => {
    const storedTheme = document.documentElement.getAttribute("data-theme") as "light" | "dark" | null;
    if (storedTheme) {
      setTheme(storedTheme);
    } else {
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initialTheme = systemPrefersDark ? "dark" : "light";
      setTheme(initialTheme);
      document.documentElement.setAttribute("data-theme", initialTheme);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    try {
      // Persist theme in a cookie so the server can read it during SSR and
      // render the same `data-theme` attribute, preventing hydration warnings.
      document.cookie = `theme=${encodeURIComponent(nextTheme)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    } catch (e) {
      /* ignore */
    }
  };

  // Carousel controls
  // `visibleSteps` is a client-only responsive value. Initialize to 3 (desktop)
  // so server and client start the same to avoid hydration mismatch, then
  // update after mount based on window width.
  const [visibleSteps, setVisibleSteps] = useState<number>(3);
  useEffect(() => {
    const compute = () => (window.innerWidth < 768 ? 1 : 3);
    setVisibleSteps(compute());
    const onResize = () => setVisibleSteps(compute());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const maxCarouselIndex = Math.max(0, JOURNEY_STEPS.length - visibleSteps);

  const slidePrev = () => {
    setCarouselIndex((prev) => Math.max(0, prev - 1));
  };

  const slideNext = () => {
    setCarouselIndex((prev) => Math.min(maxCarouselIndex, prev + 1));
  };

  // Favorites logic
  const toggleFavorite = (chargerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setFavorites((prev) =>
      prev.includes(chargerId) ? prev.filter((id) => id !== chargerId) : [...prev, chargerId]
    );
  };

  // Sign out helper
  const handleSignOut = async () => {
    try {
      console.log("Signing out — cookies before:", document.cookie);
      console.log("localStorage keys before:", Object.keys(localStorage));
      const { error } = await supabase.auth.signOut({ scope: "local" });
      console.log("signOut response error:", error);
      if (error) {
        console.warn("Local signOut failed, attempting global signOut", error);
        const { error: err2 } = await supabase.auth.signOut();
        console.log("global signOut response error:", err2);
      }
      console.log("Signing out — cookies after:", document.cookie);
      console.log("localStorage keys after:", Object.keys(localStorage));
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setUser(null);
      try {
        router.push("/");
      } catch (e) {}
      router.refresh();
      // small delay then hard reload to ensure cookies/localStorage cleared
      setTimeout(() => window.location.reload(), 400);
    }
  };

  // Filtered Chargers list based on UI selections
  const getFilteredChargers = () => {
    return dbChargers.filter((charger) => {
      if (!charger) return false;

      // 1. Category Chips (All, Home Charger, Apartment, Fast Charging, Verified Host, etc.)
      let matchesCategory = true;
      if (activeCategory === "Home Charger") {
        matchesCategory = charger.category === "Home Charger" || String(charger.chargerType).toLowerCase().includes("home") || String(charger.chargerType).toLowerCase().includes("ac");
      } else if (activeCategory === "Apartment") {
        matchesCategory = charger.category === "Apartment" || String(charger.chargerType).toLowerCase().includes("apartment") || String(charger.title).toLowerCase().includes("apartment") || String(charger.description).toLowerCase().includes("apartment");
      } else if (activeCategory === "Fast Charging") {
        matchesCategory = String(charger.chargerType).toLowerCase().includes("dc") || String(charger.chargerType).toLowerCase().includes("fast");
      } else if (activeCategory === "Verified Host") {
        matchesCategory = !!charger.isSuperhost;
      } else if (activeCategory === "24/7 Available") {
        const listAmenities = Array.isArray(charger.amenities) ? charger.amenities : [];
        matchesCategory = listAmenities.some((a: string) => a.toLowerCase().includes("24/7"));
      }

      // 2. Dropdown Charger Type Filter
      let matchesType = true;
      if (filterType === "AC Charger") {
        matchesType = String(charger.chargerType).toLowerCase().includes("ac");
      } else if (filterType === "DC Fast") {
        matchesType = String(charger.chargerType).toLowerCase().includes("dc") || String(charger.chargerType).toLowerCase().includes("fast");
      } else if (filterType === "Home Charger") {
        matchesType = charger.category === "Home Charger" || String(charger.chargerType).toLowerCase().includes("home") || String(charger.chargerType).toLowerCase().includes("ac");
      }

      return matchesCategory && matchesType;
    }).sort((a, b) => {
      // 3. Sort Order
      if (sortOrder === "Price: Low to High") {
        return (Number(a.pricePerKwh) || 0) - (Number(b.pricePerKwh) || 0);
      } else if (sortOrder === "Highest Rated") {
        return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      }
      return 0;
    });
  };

  const filteredChargers = getFilteredChargers();

  return (
    <div className="flex flex-col min-h-screen">
      {/* ─── NAVBAR ─── */}
      <nav className="nav" role="navigation" aria-label="Main navigation">
        <div className="nav-inner">
          <Link href="/" className="nav-logo" aria-label="Electric UPI Home">
            <div className="nav-logo-icon">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <div className="nav-logo-text">Electric UPI</div>
              <div className="nav-logo-sub">P2P EV Charging</div>
            </div>
          </Link>

          <div className="nav-search" role="search">
            <Search className="w-4 h-4" />
            <input
              type="text"
              placeholder="Search by city, area, pin..."
              aria-label="Search chargers"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="nav-actions">
            <Link href="/list-charger" className="btn btn-outline">
              List Your Charger
            </Link>
            <a href="#find" className="btn btn-primary">
              Find Charging
            </a>
            
            {user && (
              <>
                <Link href="/host/bookings" className="btn btn-ghost">
                  Host Dashboard
                </Link>
                <Link href="/driver/bookings" className="btn btn-ghost">
                  My Bookings
                </Link>
              </>
            )}
            
            {user ? (
              <button onClick={handleSignOut} className="btn btn-ghost">
                Sign Out
              </button>
            ) : (
              <Link href="/login" className="btn btn-ghost">
                Sign In
              </Link>
            )}

            <button
              onClick={toggleTheme}
              className="theme-toggle"
              aria-label="Toggle dark mode"
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="hero" id="home">
        <div className="hero-bg" aria-hidden="true"></div>
        <div className="hero-grid" aria-hidden="true"></div>
        <div className="hero-inner">
          <div className="hero-text">
            <div className="hero-badge">
              <Zap className="w-3 h-3 fill-current mr-1" />
              India's First P2P EV Charging Network
            </div>
            <h1 className="hero-title">
              Charge your car,<br />
              <em>right at home.</em>
            </h1>
            <p className="hero-subtitle">
              Find home-based EV chargers near you — or turn your home into a charging hub and earn money while you sleep. Just like Airbnb, but for electrons.
            </p>
            <div className="hero-cta-row">
              <a href="#find" className="btn btn-primary btn-lg">
                <Search className="w-5 h-5 mr-1" />
                Find a Charger
              </a>
              <Link href="/list-charger" className="btn btn-outline btn-lg">
                <Home className="w-5 h-5 mr-1" />
                Become a Host
              </Link>
            </div>
            <div className="hero-stats" role="list" aria-label="Key metrics">
              <div role="listitem">
                <div className="hero-stat-num">1,200+</div>
                <div className="hero-stat-label">Active chargers</div>
              </div>
              <div
                role="listitem"
                style={{ borderLeft: "1px solid var(--color-border)", paddingLeft: "var(--space-6)" }}
              >
                <div className="hero-stat-num">48</div>
                <div className="hero-stat-label">Cities in India</div>
              </div>
              <div
                role="listitem"
                style={{ borderLeft: "1px solid var(--color-border)", paddingLeft: "var(--space-6)" }}
              >
                <div className="hero-stat-num">₹6/kWh</div>
                <div className="hero-stat-label">Avg. price</div>
              </div>
            </div>
          </div>

          {/* HERO CAROUSEL */}
          <div className="hero-carousel-wrapper">
            <div className="hero-carousel" ref={heroCarouselRef}>
              <AnimatePresence initial={false} custom={currentSlide}>
                {HERO_SLIDES.map((slide, index) => (
                  index === currentSlide && (
                    <motion.div
                      key={slide.id}
                      className="carousel-hero-slide"
                      initial={{ opacity: 0, x: 100, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -100, scale: 0.9 }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      style={{ zIndex: 2 }}
                    >
                      <div className="slide-image-wrapper">
                        <img src={slide.image} alt={slide.title} className="slide-image" />
                        <div className="slide-overlay" />
                      </div>
                      <div className="slide-content">
                        <span
                          className="slide-tag"
                          style={{ backgroundColor: slide.color }}
                        >
                          {slide.tag}
                        </span>
                        <h3 className="slide-title">{slide.title}</h3>
                        <ul className="slide-specs">
                          {slide.specs.map((spec, i) => (
                            <li key={i} className="slide-spec-item">
                              <Zap className="w-3 h-3" style={{ color: slide.color }} />
                              {spec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )
                ))}
              </AnimatePresence>
              <div className="carousel-progress-bar">
                <div
                  className="carousel-progress-fill"
                  style={{
                    width: `${((currentSlide + 1) / HERO_SLIDES.length) * 100}%`,
                    backgroundColor: HERO_SLIDES[currentSlide].color,
                  }}
                />
              </div>
              <div className="carousel-controls">
                <button
                  className="carousel-arrow prev w-8 h-8 p-1 rounded-full bg-black/30 dark:bg-white/10"
                  onClick={prevSlide}
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="carousel-dots">
                  {HERO_SLIDES.map((_, index) => (
                    <button
                      key={index}
                      className={`carousel-dot ${index === currentSlide ? "active" : ""}`}
                      onClick={() => goToSlide(index)}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
                <button
                  className="carousel-arrow next w-8 h-8 p-1 rounded-full bg-black/30 dark:bg-white/10"
                  onClick={nextSlide}
                  aria-label="Next slide"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CATEGORY CHIPS ─── */}
      <div className="category-section" id="find" role="navigation" aria-label="Filter by charger type">
        <div className="category-inner">
          <div className="category-chips" role="list">
            {[
              { label: "All", icon: <Circle className="w-4 h-4" /> },
              { label: "Home Charger", icon: <Home className="w-4 h-4" /> },
              { label: "Apartment", icon: <Square className="w-4 h-4" /> },
              { label: "Fast Charging", icon: <Zap className="w-4 h-4" /> },
              { label: "Verified Host", icon: <Shield className="w-4 h-4" /> },
              { label: "24/7 Available", icon: <Clock className="w-4 h-4" /> },
            ].map((chip) => (
              <button
                key={chip.label}
                className={`chip ${activeCategory === chip.label ? "active" : ""}`}
                role="listitem"
                aria-pressed={activeCategory === chip.label}
                onClick={() => setActiveCategory(chip.label)}
              >
                {chip.icon}
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── HOW IT WORKS CAROUSEL ─── */}
      <section className="journey-section" aria-labelledby="journey-heading">
        <div className="section-header fade-in">
          <div className="section-eyebrow">How It Works</div>
          <h2 className="section-title" id="journey-heading">
            Your EV journey,<br />
            <em style={{ fontStyle: "italic" }}>explained simply</em>
          </h2>
          <p className="section-subtitle">
            From finding a charger to completing a session — it takes just 4 steps. No QR codes. No complexity.
          </p>
        </div>

        <div className="carousel-wrapper fade-in">
          <div className="carousel-track-outer">
            <div
              className="carousel-track"
              style={{
                transform: `translateX(-${carouselIndex * (100 / visibleSteps)}%)`,
                transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              role="list"
            >
              {JOURNEY_STEPS.map((step) => (
                <div
                  key={step.num}
                  className="journey-step"
                  style={{ flex: `0 0 calc(${100 / visibleSteps}% - var(--space-4))` }}
                  role="listitem"
                >
                  <div className="step-number" aria-hidden="true">
                    {step.num}
                  </div>
                  <div className={`step-icon-wrap ${step.tagType}`}>
                    {step.icon}
                  </div>
                  <h3 className="step-title">{step.title}</h3>
                  <p className="step-desc">{step.desc}</p>
                  <div className={`step-tag ${step.tagType}`}>{step.tag}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="carousel-nav" aria-label="Carousel navigation">
            <button
              onClick={slidePrev}
              className="carousel-btn"
              disabled={carouselIndex === 0}
              aria-label="Previous step"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="carousel-dots" id="carouselDots" role="tablist" aria-label="Journey steps">
              {Array.from({ length: maxCarouselIndex + 1 }).map((_, i) => (
                <button
                  key={i}
                  className={`carousel-dot ${carouselIndex === i ? "active" : ""}`}
                  role="tab"
                  aria-selected={carouselIndex === i}
                  aria-label={`Go to step ${i + 1}`}
                  onClick={() => setCarouselIndex(i)}
                />
              ))}
            </div>
            <button
              onClick={slideNext}
              className="carousel-btn"
              disabled={carouselIndex === maxCarouselIndex}
              aria-label="Next step"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* ─── LISTINGS ─── */}
      <section className="listings-section" aria-labelledby="listings-heading">
        <div className="listings-inner">
          <div className="section-header fade-in" style={{ marginBottom: "var(--space-6)" }}>
            <div className="section-eyebrow">Chargers Near You</div>
            <h2 className="section-title" id="listings-heading">
              Find your perfect<br />
              <em style={{ fontStyle: "italic" }}>charging spot</em>
            </h2>
          </div>

          {locationError && (
            <div style={{
              background: "#fffbeb",
              border: "1.5px solid #fef3c7",
              color: "#b45309",
              padding: "12px 16px",
              borderRadius: "12px",
              marginBottom: "16px",
              fontSize: "14px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              zIndex: 10,
              position: "relative"
            }}>
              <span>⚠️ {locationError}</span>
              <button onClick={() => setLocationError("")} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontWeight: "bold" }}>✕</button>
            </div>
          )}

          {bookingError && (
            <div style={{
              background: "#fef2f2",
              border: "1.5px solid #fca5a5",
              color: "#b91c1c",
              padding: "12px 16px",
              borderRadius: "12px",
              marginBottom: "16px",
              fontSize: "14px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              zIndex: 10,
              position: "relative"
            }}>
              <span>⚠️ {bookingError}</span>
              <button onClick={() => setBookingError("")} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontWeight: "bold" }}>✕</button>
            </div>
          )}

          <div className="filter-bar fade-in" role="search" aria-label="Filter chargers">
            <div className="search-box">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="City, area or pin code..."
                aria-label="Search location"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={handleGeolocate}
              className="btn btn-outline"
              style={{
                height: "48px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                borderRadius: "var(--radius-xl)",
                border: userCoords ? "1.5px solid var(--color-primary)" : "1.5px solid var(--color-border)",
                color: userCoords ? "var(--color-primary)" : "inherit",
                background: userCoords ? "rgba(26,107,74,0.06)" : "transparent",
              }}
            >
              <MapPin className="w-4 h-4" />
              {userCoords ? "Proximity On" : "Nearby Me"}
            </button>
            <select
              className="filter-select"
              aria-label="Charger type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option>All Types</option>
              <option>AC Charger</option>
              <option>DC Fast</option>
              <option>Home Charger</option>
            </select>
            <select
              className="filter-select"
              aria-label="Sort order"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option>Nearest First</option>
              <option>Price: Low to High</option>
              <option>Highest Rated</option>
            </select>
            <button
              className="btn btn-primary"
              style={{ borderRadius: "var(--radius-xl)", padding: "var(--space-3) var(--space-5)" }}
              onClick={() => {
                setSearchQuery("");
                setFilterType("All Types");
                setSortOrder("Nearest First");
                setUserCoords(null);
                setLocationError("");
              }}
            >
              <SlidersHorizontal className="w-4 h-4 mr-1" />
              Reset
            </button>
          </div>

          <div className="listings-meta">
            <p className="listings-count">
              Showing <strong>{filteredChargers.length} chargers</strong>
            </p>
            <div className="sort-row">
              <span>Sort:</span>
              <button
                onClick={() => setSortOrder("Nearest First")}
                className={`btn btn-ghost ${sortOrder === "Nearest First" ? "text-primary font-bold" : ""}`}
                style={{ padding: "var(--space-1) var(--space-2)", fontSize: "var(--text-sm)" }}
              >
                Nearest
              </button>
              <button
                onClick={() => setSortOrder("Price: Low to High")}
                className={`btn btn-ghost ${sortOrder === "Price: Low to High" ? "text-primary font-bold" : ""}`}
                style={{ padding: "var(--space-1) var(--space-2)", fontSize: "var(--text-sm)" }}
              >
                Price
              </button>
              <button
                onClick={() => setSortOrder("Highest Rated")}
                className={`btn btn-ghost ${sortOrder === "Highest Rated" ? "text-primary font-bold" : ""}`}
                style={{ padding: "var(--space-1) var(--space-2)", fontSize: "var(--text-sm)" }}
              >
                Rating
              </button>
            </div>
          </div>

          {/* LISTINGS GRID */}
          <div className="listings-grid" id="listingsGrid" role="list" aria-label="EV charger listings">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse"
                  style={{
                    background: "var(--color-surface-2)",
                    height: "360px",
                    borderRadius: "16px",
                    border: "1.5px solid var(--color-border)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                  }}
                />
              ))
            ) : filteredChargers.length === 0 ? (
              <div className="col-span-full text-center py-16 text-gray-500">
                No chargers found. Try resetting filters or search query.
              </div>
            ) : (
              filteredChargers.map((charger) => {
                const distanceText = charger.distanceKm !== null && charger.distanceKm !== undefined
                  ? `${charger.distanceKm.toFixed(1)} km away`
                  : null;

                const listAmenities = Array.isArray(charger.amenities) ? charger.amenities : [];
                const displayTags = [
                  charger.chargerType || "AC Charger",
                  charger.plugType || "Type 2",
                  ...listAmenities.slice(0, 1)
                ];

                return (
                  <article
                    key={charger.id}
                    className="listing-card"
                    role="listitem"
                    style={{
                      background: "var(--color-surface-2)",
                      border: "1.5px solid var(--color-border)",
                      borderRadius: "16px",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      position: "relative",
                      transition: "transform 0.2s ease, box-shadow 0.2s ease"
                    }}
                  >
                    <div style={{ position: "relative", width: "100%", aspectRatio: "3/2", overflow: "hidden", background: "var(--color-surface-offset)" }}>
                      {charger.imageUrl ? (
                        <img
                          src={charger.imageUrl}
                          alt={charger.title}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div style={{
                          width: "100%",
                          height: "100%",
                          background: "linear-gradient(135deg, #1a6b4a 0%, #114932 100%)",
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "3rem"
                        }}>
                          ⚡
                        </div>
                      )}
                      
                      {/* Save to Favorites icon */}
                      <button
                        onClick={(e) => toggleFavorite(charger.id, e)}
                        className={`listing-fav ${favorites.includes(charger.id) ? "active" : ""}`}
                        style={{
                          position: "absolute",
                          top: "12px",
                          right: "12px",
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.9)",
                          border: "none",
                          display: "grid",
                          placeItems: "center",
                          cursor: "pointer",
                          zIndex: 2,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
                        }}
                      >
                        <Heart
                          className="w-4 h-4"
                          fill={favorites.includes(charger.id) ? "var(--color-error)" : "none"}
                        />
                      </button>

                      {charger.isSuperhost && (
                        <div style={{
                          position: "absolute",
                          top: "12px",
                          left: "12px",
                          background: "rgba(255,255,255,0.95)",
                          color: "#1a1916",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 700,
                          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                          zIndex: 2
                        }}>
                          ★ SUPERHOST
                        </div>
                      )}
                    </div>

                    <div style={{ padding: "16px", display: "flex", flexDirection: "column", flexGrow: 1, gap: "8px" }}>
                      {/* Top Row: Locality & Rating */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-primary)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                          {charger.area || charger.city || "Verified Slot"}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "12px", fontWeight: 600 }}>
                          <span>★</span>
                          <span>{charger.rating ? charger.rating.toFixed(2) : "New"}</span>
                          {charger.reviewsCount ? (
                            <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>
                              ({charger.reviewsCount})
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Title */}
                      <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-text)", margin: 0, lineHeight: 1.3 }}>
                        {charger.title}
                      </h3>

                      {/* Location details */}
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--color-text-muted)" }}>
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {charger.address}
                        </span>
                        {distanceText && (
                          <>
                            <span>·</span>
                            <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{distanceText}</span>
                          </>
                        )}
                      </div>

                      {/* Tag list */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                        {displayTags.map((tag) => (
                          <span
                            key={tag}
                            style={{
                              padding: "3px 8px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: 600,
                              background: "var(--color-surface-offset)",
                              color: "var(--color-text-muted)"
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Footer: Price & CTA */}
                      <div style={{ marginTop: "auto", paddingTop: "12px", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--color-text)" }}>
                            ₹{charger.pricePerKwh.toFixed(2)}
                            <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--color-text-muted)" }}>/kWh</span>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleRequestBooking(charger.id)}
                          disabled={bookingLoaderId !== ""}
                          style={{
                            background: "linear-gradient(135deg, #1a6b4a, #22914f)",
                            color: "white",
                            border: "none",
                            padding: "8px 16px",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: 700,
                            cursor: bookingLoaderId !== "" ? "not-allowed" : "pointer",
                            boxShadow: "0 4px 12px rgba(26,107,74,0.15)",
                            transition: "opacity 0.2s"
                          }}
                        >
                          {bookingLoaderId === charger.id ? "Booking..." : "Book Now"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* ─── CTA BANNER ─── */}
      <section className="cta-banner" id="list-charger" aria-labelledby="cta-heading">
        <div className="cta-banner-bg" aria-hidden="true"></div>
        <div className="cta-inner">
          <div className="section-eyebrow" style={{ color: "oklch(1 0 0 / .7)" }}>
            For Homeowners & Societies
          </div>
          <h2 className="cta-title" id="cta-heading">
            Turn your charger into<br />
            <em>a source of income</em>
          </h2>
          <p className="cta-sub">
            List your home EV charger on Electric UPI. Set your own price, hours, and availability. Earn ₹2,000–₹8,000 per month while helping your neighbours charge.
          </p>
          <div className="cta-btns">
            <Link
              href="/list-charger"
              className="btn btn-white"
              style={{ padding: "var(--space-3) var(--space-8)", fontSize: "var(--text-base)" }}
            >
              List My Charger — Free
            </Link>
            <a
              href="#journey-heading"
              className="btn btn-ghost-white"
              style={{ padding: "var(--space-3) var(--space-8)", fontSize: "var(--text-base)" }}
            >
              Learn How It Works
            </a>
          </div>
        </div>
      </section>

      {/* ─── TRUST STATS ─── */}
      <section className="trust-section" aria-labelledby="trust-heading">
        <div className="trust-inner">
          <div className="section-header fade-in">
            <div className="section-eyebrow">By The Numbers</div>
            <h2 className="section-title" id="trust-heading">
              Why India is<br />
              <em style={{ fontStyle: "italic" }}>choosing Electric UPI</em>
            </h2>
          </div>
          <div className="trust-grid fade-in" role="list">
            <div className="trust-card" role="listitem">
              <div className="trust-num">1,200+</div>
              <div className="trust-label">Home chargers listed across India</div>
            </div>
            <div className="trust-card" role="listitem">
              <div className="trust-num">48</div>
              <div className="trust-label">Cities covered and growing</div>
            </div>
            <div className="trust-card" role="listitem">
              <div className="trust-num">₹6/kWh</div>
              <div className="trust-label">Average price per kWh — 40% cheaper than public stations</div>
            </div>
            <div className="trust-card" role="listitem">
              <div className="trust-num">4.9★</div>
              <div className="trust-label">Average host rating across all sessions</div>
            </div>
            <div className="trust-card" role="listitem">
              <div className="trust-num">₹5,400</div>
              <div className="trust-label">Average monthly host earnings</div>
            </div>
            <div className="trust-card" role="listitem">
              <div className="trust-num">25%</div>
              <div className="trust-label">Monthly growth rate — India's fastest EV charging network</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="testimonials-section" aria-labelledby="testimonials-heading">
        <div style={{ maxWidth: "var(--content-wide)", marginInline: "auto" }}>
          <div className="section-header fade-in">
            <div className="section-eyebrow">Community Stories</div>
            <h2 className="section-title" id="testimonials-heading">
              Real people,<br />
              <em style={{ fontStyle: "italic" }}>real experiences</em>
            </h2>
          </div>
        </div>
        <div className="testimonials-grid fade-in">
          <div className="testimonial-card">
            <p className="testimonial-quote">
              I charge my Tata Nexon EV at Rahul's place every evening. It's literally 800m from my house. Costs me ₹50 for a full overnight charge. Game changer!
            </p>
            <div className="testimonial-user">
              <div className="t-avatar" aria-hidden="true">
                M
              </div>
              <div>
                <div className="t-name">Mayank Gupta</div>
                <div className="t-role">EV Driver · Lajpat Nagar</div>
              </div>
              <div className="t-stars" aria-label="5 out of 5 stars">
                ★★★★★
              </div>
            </div>
          </div>
          <div className="testimonial-card">
            <p className="testimonial-quote">
              Listed my 7.4 kW charger 3 months ago. I'm now earning ₹6,200/month from it. It just sits in my parking slot and pays my WiFi bill 3x over. Brilliant idea.
            </p>
            <div className="testimonial-user">
              <div className="t-avatar" style={{ background: "var(--color-accent)" }} aria-hidden="true">
                S
              </div>
              <div>
                <div className="t-name">Sunita Agarwal</div>
                <div className="t-role">Host · Dwarka, Delhi</div>
              </div>
              <div className="t-stars" aria-label="5 out of 5 stars">
                ★★★★★
              </div>
            </div>
          </div>
          <div className="testimonial-card">
            <p className="testimonial-quote">
              The secret code verification is clever — no awkward QR scanning, just a quick 6-digit code. Feels safe and very smooth. Exactly what P2P needed to work in India.
            </p>
            <div className="testimonial-user">
              <div className="t-avatar" style={{ background: "#0284c7" }} aria-hidden="true">
                A
              </div>
              <div>
                <div className="t-name">Arjun Sharma</div>
                <div className="t-role">Driver · Bengaluru</div>
              </div>
              <div className="t-stars" aria-label="5 out of 5 stars">
                ★★★★★
              </div>
            </div>
          </div>
          <div className="testimonial-card">
            <p className="testimonial-quote">
              Our housing society now has 5 registered hosts. We've solved range anxiety for everyone inside the colony. Electric UPI made it happen without any infrastructure investment.
            </p>
            <div className="testimonial-user">
              <div className="t-avatar" style={{ background: "#7c3aed" }} aria-hidden="true">
                R
              </div>
              <div>
                <div className="t-name">Ritu Joshi</div>
                <div className="t-role">RWA President · Noida</div>
              </div>
              <div className="t-stars" aria-label="5 out of 5 stars">
                ★★★★★
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer role="contentinfo">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="nav-logo" style={{ marginBottom: "var(--space-4)" }}>
                <div className="nav-logo-icon">
                  <Zap className="w-5 h-5 text-white fill-white" />
                </div>
                <div>
                  <div className="nav-logo-text" style={{ color: "#fff" }}>
                    Electric UPI
                  </div>
                  <div className="nav-logo-sub">India's P2P EV Network</div>
                </div>
              </div>
              <p>
                Empowering local communities to accelerate EV adoption with decentralized home charging networks across India.
              </p>
            </div>
            <div className="footer-col">
              <h4>For Drivers</h4>
              <ul>
                <li><a href="#">Find a Charger</a></li>
                <li><a href="#">How It Works</a></li>
                <li><a href="#">Pricing</a></li>
                <li><a href="#">EV Calculator</a></li>
                <li><a href="#">Safety</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>For Hosts</h4>
              <ul>
                <li><a href="#">List Your Charger</a></li>
                <li><a href="#">Host Guide</a></li>
                <li><a href="#">Earnings Calculator</a></li>
                <li><a href="#">Trust & Safety</a></li>
                <li><a href="#">Host Community</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <ul>
                <li><a href="#">About Us</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Careers</a></li>
                <li><a href="#">Press</a></li>
                <li><a href="#">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-copy">© 2025 Electric UPI. All rights reserved. Made with ⚡ in India.</div>
            <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
              <a href="#" style={{ color: "oklch(from white l c h / .45)", fontSize: "var(--text-xs)", textDecoration: "none" }}>
                Privacy Policy
              </a>
              <a href="#" style={{ color: "oklch(from white lenna .45)", fontSize: "var(--text-xs)", textDecoration: "none" }}>
                Terms of Service
              </a>
              <a href="#" style={{ color: "oklch(from white l c h / .45)", fontSize: "var(--text-xs)", textDecoration: "none" }}>
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
