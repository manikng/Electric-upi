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

// Mock Chargers Data from HTML
const MOCK_CHARGERS = [
  {
    id: "charger-1",
    title: "Rahul's Level 2 Home Charger — Green Park",
    hostName: "Rahul S.",
    isSuperhost: true,
    rating: 4.97,
    reviewsCount: 142,
    address: "Green Park, South Delhi",
    distance: "1.2 km away",
    city: "Delhi",
    area: "South Delhi",
    pricePerKwh: 5.50,
    tags: ["22 kW AC", "Available Now", "Covered Parking", "RFID Card", "24/7", "Type 2 Plug"],
    type: "AC Charger",
    category: "Home Charger",
    status: "Available now",
    statusDot: "green",
    emoji: "⚡🏠",
    featured: true,
  },
  {
    id: "charger-2",
    title: "Priya's DC Fast Charger — Saket",
    hostName: "Priya M.",
    isSuperhost: true,
    rating: 4.89,
    reviewsCount: 87,
    address: "Saket, South Delhi",
    distance: "2.4 km away",
    city: "Delhi",
    area: "South Delhi",
    pricePerKwh: 7.00,
    tags: ["50 kW DC", "Opens at 7 AM", "Society Parking", "CCS2"],
    type: "DC Fast",
    category: "Apartment",
    status: "From 7 AM",
    statusDot: "amber",
    emoji: "🔋🚗",
    featured: false,
  },
  {
    id: "charger-3",
    title: "Anjali's Home Charger — Lajpat Nagar",
    hostName: "Anjali K.",
    isSuperhost: false,
    rating: 4.75,
    reviewsCount: 12,
    address: "Lajpat Nagar III, Delhi",
    distance: "3.1 km away",
    city: "Delhi",
    area: "Lajpat Nagar",
    pricePerKwh: 4.80,
    tags: ["7.4 kW AC", "Gated Community", "Visitor Parking"],
    type: "AC Charger",
    category: "Home Charger",
    status: "Available now",
    statusDot: "green",
    emoji: "🏡⚡",
    featured: false,
  },
  {
    id: "charger-4",
    title: "Vikram's Garage — GK II",
    hostName: "Vikram D.",
    isSuperhost: true,
    rating: 5.00,
    reviewsCount: 31,
    address: "Greater Kailash II, Delhi",
    distance: "3.8 km away",
    city: "Delhi",
    area: "Greater Kailash",
    pricePerKwh: 6.00,
    tags: ["11 kW AC", "Available Now", "Private Garage", "WiFi"],
    type: "AC Charger",
    category: "Home Charger",
    status: "Available now",
    statusDot: "green",
    emoji: "🚘🔌",
    featured: false,
  },
  {
    id: "charger-5",
    title: "Sonal's Apartment Charger — Def. Colony",
    hostName: "Sonal T.",
    isSuperhost: false,
    rating: 4.82,
    reviewsCount: 58,
    address: "Defence Colony, Delhi",
    distance: "4.5 km away",
    city: "Delhi",
    area: "Defence Colony",
    pricePerKwh: 5.20,
    tags: ["7.4 kW AC", "Weekends Only", "Basement Parking"],
    type: "AC Charger",
    category: "Apartment",
    status: "Busy — Next slot: 3 PM",
    statusDot: "red",
    emoji: "🏢⚡",
    featured: false,
  },
];

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
  const [favorites, setFavorites] = useState<string[]>(["charger-3"]); // Mock initial favorite
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("All Types");
  const [sortOrder, setSortOrder] = useState("Nearest First");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const heroCarouselRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const supabase = getSupabaseBrowserClient();
  const router = useRouter();

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
    return MOCK_CHARGERS.filter((charger) => {
      // 1. Search Query (City, area, title)
      const matchesSearch =
        searchQuery === "" ||
        charger.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        charger.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        charger.city.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Category Chips (All, Home Charger, Apartment, Fast Charging, Verified Host, etc.)
      let matchesCategory = true;
      if (activeCategory === "Home Charger") {
        matchesCategory = charger.category === "Home Charger";
      } else if (activeCategory === "Apartment") {
        matchesCategory = charger.category === "Apartment";
      } else if (activeCategory === "Fast Charging") {
        matchesCategory = charger.type === "DC Fast";
      } else if (activeCategory === "Verified Host") {
        matchesCategory = charger.isSuperhost;
      } else if (activeCategory === "24/7 Available") {
        matchesCategory = charger.tags.includes("24/7");
      }

      // 3. Dropdown Charger Type Filter
      let matchesType = true;
      if (filterType === "AC Charger") {
        matchesType = charger.type === "AC Charger";
      } else if (filterType === "DC Fast") {
        matchesType = charger.type === "DC Fast";
      } else if (filterType === "Home Charger") {
        matchesType = charger.category === "Home Charger";
      }

      return matchesSearch && matchesCategory && matchesType;
    }).sort((a, b) => {
      // 4. Sort Order
      if (sortOrder === "Price: Low to High") {
        return a.pricePerKwh - b.pricePerKwh;
      } else if (sortOrder === "Highest Rated") {
        return b.rating - a.rating;
      }
      // "Nearest First" or default: keep original mock layout sorting
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
            {filteredChargers.length === 0 ? (
              <div className="col-span-full text-center py-16 text-gray-500">
                No chargers found matching your search. Try searching for "Delhi" or "Saket".
              </div>
            ) : (
              filteredChargers.map((charger) => (
                <article
                  key={charger.id}
                  className={`listing-card ${charger.featured ? "featured" : ""} fade-in`}
                  role="listitem"
                  tabIndex={0}
                  aria-label={`${charger.hostName}'s Charger, ${charger.address}`}
                >
                  <div className="listing-card-img">
                    <div className="listing-img-inner">{charger.emoji}</div>
                    {charger.isSuperhost && (
                      <div className="listing-badge">⭐ Superhost</div>
                    )}
                    {charger.featured && !charger.isSuperhost && (
                      <div className="listing-badge">⭐ Featured Host</div>
                    )}
                    <button
                      onClick={(e) => toggleFavorite(charger.id, e)}
                      className={`listing-fav ${favorites.includes(charger.id) ? "active" : ""}`}
                      aria-label={favorites.includes(charger.id) ? "Saved to favourites" : "Save to favourites"}
                      aria-pressed={favorites.includes(charger.id)}
                    >
                      <Heart
                        className="w-4 h-4"
                        fill={favorites.includes(charger.id) ? "var(--color-error)" : "none"}
                      />
                    </button>
                  </div>
                  <div className="listing-body">
                    <div className="listing-host-row">
                      <div className="listing-host">
                        <div className="host-avatar" aria-hidden="true">
                          {charger.hostName[0]}
                        </div>
                        <span className="host-name">
                          {charger.hostName} · {charger.isSuperhost ? "Superhost" : "Verified Host"} ({charger.reviewsCount})
                        </span>
                      </div>
                    </div>
                    <h3 className="listing-title">{charger.title}</h3>
                    <div className="listing-addr">
                      <MapPin className="w-3 h-3 mr-1" />
                      {charger.address} · {charger.distance}
                    </div>
                    <div className="listing-tags">
                      {charger.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`tag ${
                            tag === "Available Now" || tag === "Opens at 7 AM" || tag.includes("AC") || tag.includes("DC")
                              ? "green"
                              : ""
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="listing-footer">
                      <div>
                        <div className="listing-price">
                          ₹{charger.pricePerKwh.toFixed(2)}
                          <span>/kWh</span>
                        </div>
                        <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: "2px" }}>
                          ≈ ₹{(charger.pricePerKwh * 10).toFixed(0)} for 10 kWh charge
                        </div>
                      </div>
                      <div className="listing-avail">
                        <div className={`avail-dot ${charger.statusDot}`} aria-hidden="true"></div>
                        {charger.status}
                      </div>
                    </div>
                  </div>
                </article>
              ))
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
