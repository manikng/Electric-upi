"use client";
import { useState, useEffect } from "react";
import { ChargerResult, ChargingSiteResult } from "@/lib/types";

interface UseUnifiedSearchOptions {
  searchQuery: string;
  userCoords: { lat: number; lng: number } | null;
  filterType: string;
  radius: number;
  maxPrice: string;
  plugTypes: string[];
  page: number;
}

export interface UnifiedSearchResponse {
  chargers: ChargerResult[];
  sites: ChargingSiteResult[];
  center: { lat: number; lng: number };
  totalChargers: number;
  totalSites: number;
}

export function useUnifiedSearch({
  searchQuery,
  userCoords,
  filterType,
  radius,
  maxPrice,
  plugTypes,
  page,
}: UseUnifiedSearchOptions) {
  const [chargers, setChargers] = useState<ChargerResult[]>([]);
  const [sites, setSites] = useState<ChargingSiteResult[]>([]);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalChargers, setTotalChargers] = useState(0);
  const [totalSites, setTotalSites] = useState(0);

  useEffect(() => {
    let active = true;

    async function fetchData() {
      setLoading(true);
      try {
        const params = new URLSearchParams();

        // KEY FIX: coords and text query are MUTUALLY EXCLUSIVE
        // If user has coords → nearby mode (ignore text query)
        // If no coords → text search mode
        if (userCoords) {
          params.set("lat", String(userCoords.lat));
          params.set("lng", String(userCoords.lng));
          // Don't send q — nearby mode
        } else if (searchQuery) {
          params.set("q", searchQuery);
          // Don't send lat/lng — text search mode
        }
        // If neither → API returns default results

        if (filterType !== "All Types") {
          params.set("chargerType", filterType === "AC Charger" ? "AC Charger" : "DC Fast");
        }
        params.set("radius", String(radius));
        if (maxPrice) params.set("maxPrice", maxPrice);
        if (plugTypes.length > 0) {
          params.set("plug", plugTypes.join(","));
        }
        params.set("page", String(page));

        const res = await fetch(`/api/map-search?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        if (active) {
          const data: UnifiedSearchResponse = await res.json();
          setChargers(data.chargers || []);
          setSites(data.sites || []);
          setCenter(data.center || null);
          setTotalChargers(data.totalChargers || 0);
          setTotalSites(data.totalSites || 0);
        }
      } catch (err) {
        console.error("Failed to fetch unified search:", err);
        if (active) {
          setChargers([]);
          setSites([]);
          setCenter(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchData();
    return () => { active = false; };
  }, [searchQuery, userCoords, filterType, page, radius, maxPrice, plugTypes]);

  return {
    chargers,
    sites,
    center,
    loading,
    totalChargers,
    totalSites,
  };
}