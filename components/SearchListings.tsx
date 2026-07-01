"use client";

import { useState, useEffect, useRef, useMemo} from "react";
import React from "react";
import { ChargerResult, ChargingSiteResult } from "@/lib/types";
import ChargerCard from "./ChargerCard";
import ChargingSiteCard from "./ChargingSiteCard";
import ChargerDetailModal from "./ChargerDetailModal";
import Link from "next/link";

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
  // Change 1: Add sites prop
  sites: ChargingSiteResult[];
  loading: boolean;
}

const SearchListings = React.memo(function SearchListings({
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
  sites,
  loading,
}: SearchListingsProps) {
  // Change 4: Selected becomes union type
  const [selectedCharger, setSelectedCharger] =
    useState<ChargerResult | null>(null);
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

  // 
  // This component is a pure presentation layer — no duplicate fetch.
  const filteredChargers = getFilteredChargers();

  // Change 2: Build unified results array
const results = useMemo(() => {
  return [
    ...filteredChargers.map((c) => ({
      _kind: "peer" as const,
      data: c,
    })),
    ...sites.map((s) => ({
      _kind: "public" as const,
      data: s,
    })),
  ].sort((a, b) => {
    switch (sortOrder) {
      case "Nearest First":
        return (
          (a.data.distanceKm ?? Number.MAX_SAFE_INTEGER) -
          (b.data.distanceKm ?? Number.MAX_SAFE_INTEGER)
        );

      case "Price: Low to High":
        return (
          ("pricePerKwh" in a.data
            ? a.data.pricePerKwh
            : Number.MAX_SAFE_INTEGER) -
          ("pricePerKwh" in b.data
            ? b.data.pricePerKwh
            : Number.MAX_SAFE_INTEGER)
        );

      case "Highest Rated":
        return (
          ("rating" in b.data ? b.data.rating : 0) -
          ("rating" in a.data ? a.data.rating : 0)
        );

      default:
        return 0;
    }
  });
}, [filteredChargers, sites, sortOrder]);

  const peerCount = filteredChargers.length;
  const publicCount = sites.length;

  return (
    <div className="listings-section" aria-labelledby="listings-heading">
      <div className="listings-inner">
        <div
          className="section-header fade-in"
          style={{ marginBottom: "var(--space-6)" }}
        >
          <div className="section-eyebrow">
            {peerCount} Peer · {publicCount} Public · {results.length} Total
          </div>
          <h2 className="section-title" id="listings-heading">
            Find your perfect<br />
            <em style={{ fontStyle: "italic" }}>charging spot</em>
          </h2>
        </div>

        {/* LISTINGS GRID */}
        <div
          className="listings-grid"
          id="listingsGrid"
          role="list"
          aria-label="EV charger listings"
        >
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
          ) : results.length === 0 ? (
            <div className="col-span-full text-center py-16 text-gray-500">
              No chargers or stations found. Try resetting filters or search
              query.
            </div>
          ) : (
            // Change 3: Render based on type
            results.map((item) => {
              if (item._kind === "peer") {
                const charger = item.data;
                const isSelected = charger.id === selectedChargerId;
                return (
                  <div
                    key={`peer-${charger.id}`}
                    ref={(el) => {
                      chargerRefs.current[charger.id] = el;
                    }}
                    style={{
                      borderRadius: "18px",
                      boxShadow: isSelected
                        ? "0 0 0 3px rgba(34, 145, 79, 0.18)"
                        : "none",
                      transition: "box-shadow 0.2s ease",
                    }}
                  >
                    <Link 
                    href={`/host/chargers/${charger.id}`}
                    className="listing-card-link block h-full  group">
                      <ChargerCard
                      charger={charger}
                    />
                    </Link>
                  </div>
                );
              }

              // Public station
              const site = item.data;
              return (
                <div key={`public-${site.id}`}>
                  <ChargingSiteCard
                    site={site}
                    // Change 5: Don't open modal for public stations
                    // Modal only supports peer chargers
                    onClick={() => {
                      // Future: could navigate to site detail or show popup
                      // For now, select on map if possible
                      onSelectCharger(site.id);
                    }}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Detail Modal — only for peer chargers (Change 5) */}
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
});

export default SearchListings;