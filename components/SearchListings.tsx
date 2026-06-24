"use client";

import { useState, useEffect } from "react";
import { SearchResponse } from "@/hooks/useChargers";
import ChargerCard from "./ChargerCard";
import { ChargerResult } from "@/lib/types";
import ChargerDetailModal from "./ChargerDetailModal";

interface SearchListingsProps {
  searchQuery: string;
  userCoords: { lat: number; lng: number } | null;
  filterType: string;
  sortOrder: string;
  radius: number;
  maxPrice: string;
  plugTypes: string[];
  page: number;
  favorites: string[];
  bookingLoaderId: string;
  bookingError: string;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onRequestBooking: (id: string) => void;
  onSetPage: (page: number) => void;
  onSetTotal: (total: number) => void;
  getFilteredChargers: () => ChargerResult[];
}

export default function SearchListings({
  searchQuery,
  userCoords,
  filterType,
  sortOrder,
  radius,
  maxPrice,
  plugTypes,
  page,
  favorites,
  bookingLoaderId,
  bookingError,
  onToggleFavorite,
  onRequestBooking,
  onSetPage,
  onSetTotal,
  getFilteredChargers,
}: SearchListingsProps) {
  const [dbChargers, setDbChargers] = useState<ChargerResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [selectedCharger, setSelectedCharger] = useState<ChargerResult | null>(null);

  const openDetail = (charger: ChargerResult) => {
    setSelectedCharger(charger);
  };

  const closeDetail = () => {
    setSelectedCharger(null);
  };

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
        // Add new filter parameters
        if (filterType !== "All Types") {
          params.set(
            "chargerType",
            filterType === "AC Charger" ? "AC Charger" : "DC Fast"
          );
        }
        // Add radius (default 50km)
        params.set("radius", String(radius));
        // Add max price filter
        if (maxPrice) params.set("maxPrice", maxPrice);
        // Add plug type filter if needed
        if (plugTypes.length > 0) {
          params.set("plug", plugTypes.join(","));
        }
        // Add page (default 1)
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
  }, [searchQuery, userCoords, filterType, radius, maxPrice, plugTypes, page]);

  const filteredChargers = getFilteredChargers();

  return (
    <div className="listings-section" aria-labelledby="listings-heading">
      <div className="listings-inner">
        <div
          className="section-header fade-in"
          style={{ marginBottom: "var(--space-6)" }}
        >
          <div className="section-eyebrow">Chargers Near You</div>
          <h2 className="section-title" id="listings-heading">
            Find your perfect<br />
            <em style={{ fontStyle: "italic" }}>charging spot</em>
          </h2>
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
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
              />
            ))
          ) : filteredChargers.length === 0 ? (
            <div className="col-span-full text-center py-16 text-gray-500">
              No chargers found. Try resetting filters or search query.
            </div>
          ) : (
            filteredChargers.map((charger) => (
              <ChargerCard
                key={charger.id}
                charger={charger}
                bookingLoaderId={bookingLoaderId}
                onRequestBooking={onRequestBooking}
                onClick={() => openDetail(charger)}
              />
            ))
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedCharger && (
        <ChargerDetailModal
          charger={selectedCharger}
          isOpen={true}
          onClose={closeDetail}
          onRequestBooking={onRequestBooking}
          bookingLoaderId={bookingLoaderId}
        />
      )}
    </div>
  );
}
