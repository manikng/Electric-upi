"use client";

import React from "react";
import { MapPin, Zap, Building2, Plug, Hash } from "lucide-react";
import { ChargingSiteResult } from "@/lib/types";

interface ChargingSiteCardProps {
  site: ChargingSiteResult;
  onClick?: () => void;
}

const ChargingSiteCard = React.memo(function ChargingSiteCard({ site, onClick }: ChargingSiteCardProps) {
  const ownershipColor =
    site.ownership.toLowerCase() === "government"
      ? "var(--color-info)"
      : "var(--color-accent)";

  const distanceText =
    site.distanceKm !== null && site.distanceKm !== undefined
      ? `${Number(site.distanceKm ?? 0).toFixed(1)} km away`
      : null;

  return (
    <article
      onClick={onClick}
      style={{
        background: "var(--color-surface-2)",
        border: "1.5px solid var(--color-border)",
        borderRadius: "16px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "var(--shadow-md)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
      role="listitem"
    >
      {/* Header Row: CPO Name & Ownership Badge */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "var(--color-primary-highlight)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Zap className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "var(--color-text)",
                margin: 0,
                lineHeight: 1.3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {site.cpoName}
            </h3>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
                color: "var(--color-text-muted)",
                marginTop: "2px",
              }}
            >
              <Building2 className="w-3 h-3" />
              <span
                style={{
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontSize: "10px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  background:
                    site.ownership.toLowerCase() === "government"
                      ? "rgba(2, 132, 199, 0.12)"
                      : "var(--color-accent-highlight)",
                  color: ownershipColor,
                }}
              >
                {site.ownership}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Location */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "6px",
          fontSize: "12px",
          color: "var(--color-text-muted)",
        }}
      >
        <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ marginTop: "1px" }} />
        <span
          style={{
            lineHeight: 1.4,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {site.location}
          {distanceText && (
            <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>
              {" "}· {distanceText}
            </span>
          )}
        </span>
      </div>

      {/* Location Details: District, City, State */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
          fontSize: "11px",
        }}
      >
        <span
          style={{
            padding: "3px 8px",
            borderRadius: "6px",
            background: "var(--color-surface-offset)",
            color: "var(--color-text-muted)",
            fontWeight: 500,
          }}
        >
          {site.district}
        </span>
        <span
          style={{
            padding: "3px 8px",
            borderRadius: "6px",
            background: "var(--color-surface-offset)",
            color: "var(--color-text-muted)",
            fontWeight: 500,
          }}
        >
          {site.cityVillage}
        </span>
        <span
          style={{
            padding: "3px 8px",
            borderRadius: "6px",
            background: "var(--color-primary-highlight)",
            color: "var(--color-primary)",
            fontWeight: 600,
          }}
        >
          {site.state}
        </span>
      </div>

      {/* Connector Info */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 12px",
          background: "var(--color-surface-offset)",
          borderRadius: "10px",
        }}
      >
        <Plug className="w-4 h-4" style={{ color: "var(--color-primary)", flexShrink: 0 }} />
        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--color-text)",
          }}
        >
          {site.connectorSummary}
        </span>
      </div>

      {/* Connector Types List */}
      {site.connectorProfiles.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {site.connectorProfiles.slice(0, 4).map((profile, idx) => (
            <div
              key={profile.id || idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                background: "var(--color-surface-offset)",
                borderRadius: "6px",
                fontSize: "11px",
                color: "var(--color-text-muted)",
              }}
            >
              <Hash className="w-3 h-3" />
              <span style={{ fontWeight: 500 }}>
                {profile.connectorType || "Unknown"}
              </span>
              {profile.connectorRatingKw && (
                <span style={{ color: "var(--color-text-faint)" }}>
                  {profile.connectorRatingKw}kW
                </span>
              )}
              {profile.connectorCount && profile.connectorCount > 1 && (
                <span
                  style={{
                    marginLeft: "2px",
                    padding: "1px 4px",
                    background: "var(--color-primary)",
                    color: "white",
                    borderRadius: "4px",
                    fontSize: "9px",
                    fontWeight: 700,
                  }}
                >
                  x{profile.connectorCount}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Coordinates */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          fontSize: "10px",
          color: "var(--color-text-faint)",
          fontFamily: "monospace",
        }}
      >
         {typeof site.latitude === "number" ? site.latitude.toFixed(4) : Number(site.latitude ?? 0).toFixed(4)}°N, {typeof site.longitude === "number" ? site.longitude.toFixed(4) : Number(site.longitude ?? 0).toFixed(4)}°E
      </div>
    </article>
  );
});

export default ChargingSiteCard;