"use client";

import { Search, MapPin, SlidersHorizontal } from "lucide-react";

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterType: string;
  onFilterTypeChange: (value: string) => void;
  sortOrder: string;
  onSortOrderChange: (value: string) => void;
  userCoords: { lat: number; lng: number } | null;
  onGeolocate: () => void;
  onReset: () => void;
}

export default function FilterBar({
  searchQuery,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  sortOrder,
  onSortOrderChange,
  userCoords,
  onGeolocate,
  onReset,
}: FilterBarProps) {
  return (
    <div className="filter-bar fade-in" role="search" aria-label="Filter chargers">
      <div className="search-box">
        <Search className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="City, area or pin code..."
          aria-label="Search location"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
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
}
