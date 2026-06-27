"use client";

import React from "react";
import { Search, MapPin, SlidersHorizontal } from "lucide-react";

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: (value: string) => void;
  isSearching: boolean;
  filterType: string;
  onFilterTypeChange: (value: string) => void;
  sortOrder: string;
  onSortOrderChange: (value: string) => void;
  userCoords: { lat: number; lng: number } | null;
  onGeolocate: () => void;
  onReset: () => void;
}

const FilterBar = React.memo(function FilterBar({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  isSearching,
  filterType,
  onFilterTypeChange,
  sortOrder,
  onSortOrderChange,
  userCoords,
  onGeolocate,
  onReset,
}: FilterBarProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed.length >= 2) {
      onSearchSubmit(trimmed);
    }
  };

  return (
    <div className="filter-bar fade-in" role="search" aria-label="Filter chargers">
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-box">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="City, area or pin code..."
            aria-label="Search location"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <button
            type="submit"
            className="btn btn-primary search-submit-btn"
            disabled={isSearching || searchQuery.trim().length < 2}
            aria-label="Search"
            style={{
              height: "48px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              borderRadius: "var(--radius-xl)",
              padding: "0 var(--space-4)",
            }}
          >
            {isSearching ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Search</span>
              </>
            )}
          </button>
        </div>
      </form>
      <button
        type="button"
        onClick={onGeolocate}
        className="btn btn-outline"
        style={{
          height: "48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          borderRadius: "var(--radius-xl)",
          border: userCoords
            ? "1.5px solid var(--color-primary)"
            : "1.5px solid var(--color-border)",
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
        onChange={(e) => onFilterTypeChange(e.target.value)}
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
        onChange={(e) => onSortOrderChange(e.target.value)}
      >
        <option>Nearest First</option>
        <option>Price: Low to High</option>
        <option>Highest Rated</option>
      </select>
      <button
        className="btn btn-primary"
        style={{
          borderRadius: "var(--radius-xl)",
          padding: "var(--space-3) var(--space-5)",
        }}
        onClick={onReset}
      >
        <SlidersHorizontal className="w-4 h-4 mr-1" />
        Reset
      </button>
    </div>
  );
});

export default FilterBar;
