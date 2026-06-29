"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import useSWR from "swr";
import type { ChargerResult, ChargingSiteResult } from "@/lib/types";
import { useUnifiedSearch } from "@/hooks/useUnifiedSearch";

const { chargers, sites, center, loading } = useUnifiedSearch({
  searchQuery: "",
  userCoords: null,
  filterType: "All Types",
  radius: 50,
  maxPrice: "",
  plugTypes: [],
  page: 1,
});


const EVMapClient = dynamic(() => import("@/components/map/EVMapClient"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-900 flex items-center justify-center">
      <p className="text-white animate-pulse">Loading Map...</p>
    </div>
  ),
});

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function MapPage() {
  // const { data, isLoading } = useSWR('/api/map-stations', fetcher, { revalidateOnFocus: false });
  const [query, setQuery] = useState("");

  const endpoint =
    query.length === 0
      ? "/api/map-stations"
      : `/api/map-search?q=${encodeURIComponent(query)}`;

  const { data, isLoading } = useSWR(endpoint, fetcher, {
    revalidateOnFocus: false
  });

  // const [selectedCharger, setSelectedCharger] = useState<ChargerResult | null>(null);
  const [selectedCharger, setSelectedCharger] = useState<ChargerResult | ChargingSiteResult | null>(null);
  const [userCoords] = useState({ lat: 28.6315, lng: 77.2167 });

  const handleSelectCharger = useCallback((charger: ChargerResult) => {
    setSelectedCharger(charger);
  }, []);

  const chargers: ChargerResult[] = data?.chargers || [];
  const sites =
    data?.sites || [];
  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      {/* Top Section */}
      <div className="p-4 bg-gray-950 z-10">
        <div className="flex items-center bg-gray-800 rounded-xl px-4 py-3 gap-3">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city/state..."
            className="bg-transparent w-full outline-none"
          />
        </div>
      </div>

      {/* Middle Section: Map */}
      <div className="relative flex-1 shadow-2xl">
        <EVMapClient
          chargers={chargers}
          sites={sites}
          selectedCharger={selectedCharger}
            onSelectCharger={(charger: ChargerResult | ChargingSiteResult) => setSelectedCharger(charger)}
          userCoords={userCoords}
        />
      </div>
    </div>
  );
}