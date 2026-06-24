"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { ChargerResult } from "@/lib/types";

export interface SearchResponse {
  data: ChargerResult[];
  total: number;
  page: number;
  hasMore: boolean;
}

interface UseChargersOptions {
  initialUser: User | null;
  searchQuery: string;
  userCoords: { lat: number; lng: number } | null;
  filterType: string;
  radius: number;
  maxPrice: string;
  plugTypes: string[];
  page: number;
}

export function useChargers({
  initialUser,
  searchQuery,
  userCoords,
  filterType,
  radius,
  maxPrice,
  plugTypes,
  page,
}: UseChargersOptions) {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [dbChargers, setDbChargers] = useState<ChargerResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [bookingLoaderId, setBookingLoaderId] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [total, setTotal] = useState(0);

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
        if (filterType !== "All Types") {
          params.set(
            "chargerType",
            filterType === "AC Charger" ? "AC Charger" : "DC Fast"
          );
        }
        params.set("radius", String(radius));
        if (maxPrice) params.set("maxPrice", maxPrice);
        if (plugTypes.length > 0) {
          params.set("plug", plugTypes.join(","));
        }
        params.set("page", String(page));

        const res = await fetch(`/api/chargers/search?${params.toString()}`);
        if (res.ok && active) {
          const data: SearchResponse = await res.json();
          setDbChargers(data.data || []);
          setTotal(data.total);
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
  }, [searchQuery, userCoords, filterType, page, radius, maxPrice, plugTypes]);

  const toggleFavorite = useCallback(
    (chargerId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setFavorites((prev) =>
        prev.includes(chargerId)
          ? prev.filter((id) => id !== chargerId)
          : [...prev, chargerId]
      );
    },
    []
  );

  const handleRequestBooking = useCallback(
    async (chargerId: string) => {
      if (!initialUser) {
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
    },
    [initialUser, router]
  );

  const getFilteredChargers = useCallback(() => {
    return dbChargers;
  }, [dbChargers]);

  return {
    dbChargers,
    loading,
    favorites,
    bookingLoaderId,
    bookingError,
    setBookingError,
    total,
    setTotal,
    toggleFavorite,
    handleRequestBooking,
    getFilteredChargers,
  };
}
