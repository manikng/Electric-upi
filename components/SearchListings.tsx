"use client";

import { useState, useEffect, useRef } from "react";
import { ChargerResult } from "@/lib/types";
import ChargerCard from "./ChargerCard";
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
  selectedChargerId: string | null;
  onSelectCharger: (chargerId: string) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onRequestBooking: (id: string) => void;
  onSetPage: (page: number) => void;
  onSetTotal: (total: number) => void;
  getFilteredChargers: () => ChargerResult[];
  loading: boolean;
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
  selectedChargerId,
  onSelectCharger,
  onToggleFavorite,
  onRequestBooking,
  onSetPage,
  onSetTotal,
  getFilteredChargers,
  loading,
}: SearchListingsProps) {
  const [selectedCharger, setSelectedCharger] = useState<ChargerResult | null>(null);
  const chargerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const openDetail = (charger: ChargerResult) => {
    setSelectedCharger(charger);
  };

  const closeDetail = () => {
    setSelectedCharger(null);
  };

  useEffect(() => {
    if (selectedChargerId) {
      const target = chargerRefs.current[selectedChargerId];
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [selectedChargerId]);

  // NOTE: Data fetching is owned by the parent (useChargers hook).
  // This component is now a pure presentation layer — no duplicate fetch.
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
            filteredChargers.map((charger) => {
              const isSelected = charger.id === selectedChargerId;
              return (
                <div
                  key={charger.id}
                  ref={(el) => {
                    chargerRefs.current[charger.id] = el;
                  }}
                  style={{
                    borderRadius: "18px",
                    boxShadow: isSelected ? "0 0 0 3px rgba(34, 145, 79, 0.18)" : "none",
                    transition: "box-shadow 0.2s ease",
                  }}
                >
                  <ChargerCard
                    charger={charger}
                    bookingLoaderId={bookingLoaderId}
                    onRequestBooking={onRequestBooking}
                    onClick={() => onSelectCharger(charger.id)}
                  />
                </div>
              );
            })
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
