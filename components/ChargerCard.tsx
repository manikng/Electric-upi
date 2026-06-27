"use client";

import Link from "next/link";
import { MapPin, ChevronRight } from "lucide-react";
import { ChargerResult } from "@/lib/types";
import Image from "next/image";

interface ChargerCardProps {
  charger: ChargerResult;
  bookingLoaderId: string;
  onRequestBooking: (id: string) => void;
  onClick?: () => void;
}

export default function ChargerCard({
  charger,
  bookingLoaderId,
  onRequestBooking,
  onClick,
}: ChargerCardProps) {
  const distanceText =
    charger.distanceKm !== null && charger.distanceKm !== undefined
      ? `${Number(charger.distanceKm ?? 0).toFixed(1)} km away`
      : null;

  const listAmenities = Array.isArray(charger.amenities) ? charger.amenities : [];
  const displayTags = [
    charger.chargerType || "AC Charger",
    charger.plugType || "Type 2",
    ...listAmenities.slice(0, 1),
  ];

  // Fallback image URL — placeholder when charger.imageUrl is null/undefined
  const placeholderImageUrl = "/placeholder-ev-station.png";

  return (
    <Link
      href={`/host/chargers/${charger.id}`}
      style={{
        textDecoration: "none",
        color: "inherit",
      }}
      onClick={(event) => {
        if (onClick) {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <article
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
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          cursor: "pointer",
        }}
      >
      {/* Image Section */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "3/2",
          overflow: "hidden",
          background: "var(--color-surface-offset)",
        }}
      >
        <Image
          src={charger.imageUrl || placeholderImageUrl}
          alt={charger.title || "EV Charging Station"}
          fill
          style={{ objectFit: "cover" }}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          onError={(e) => {
            // Next.js Image handles errors internally, but fallback for parity
            // This handler is defensive — Next.js v16 handles fallbacks automatically.
          }}
        />
      </div>

      {/* Details Section */}
      <div
        style={{
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          gap: "8px",
        }}
      >
        {/* Top Row: Locality & Rating */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--color-primary)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            {charger.area || charger.city || "Verified Slot"}
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "3px",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            <span>★</span>
            <span>{charger.rating ? Number(charger.rating).toFixed(2) : "New"}</span>
            {charger.reviewsCount ? (
              <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>
                ({charger.reviewsCount})
              </span>
            ) : null}
          </div>
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: "15px",
            fontWeight: 700,
            color: "var(--color-text)",
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {charger.title}
        </h3>

        {/* Location details */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "12px",
            color: "var(--color-text-muted)",
          }}
        >
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {charger.address}
          </span>
          {distanceText && (
            <>
              <span>·</span>
              <span style={{ fontWeight: 600, color: "var(--color-text)" }}>
                {distanceText}
              </span>
            </>
          )}
        </div>

        {/* Tag list */}
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}
        >
          {displayTags.map((tag) => (
            <span
              key={tag}
              style={{
                padding: "3px 8px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 600,
                background: "var(--color-surface-offset)",
                color: "var(--color-text-muted)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Footer: Price, CTA, Expand indicator */}
        <div
          style={{
            marginTop: "auto",
            paddingTop: "12px",
            borderTop: "1px solid var(--color-border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--color-text)" }}>
              ₹{Number(charger.pricePerKwh ?? 0).toFixed(2)}
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "var(--color-text-muted)",
                }}
              >
                /kWh
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRequestBooking(charger.id);
              }}
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
                transition: "opacity 0.2s",
              }}
            >
              {bookingLoaderId === charger.id ? "Booking..." : "Book Now"}
            </button>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "var(--color-surface-offset)",
                color: "var(--color-text-muted)",
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </article>
  </Link>
);
}
