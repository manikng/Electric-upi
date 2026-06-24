"use client";
import { X, MapPin, Zap, Clock, Gauge, Star } from "lucide-react";
import { ChargerResult } from "@/lib/types";

interface ChargerDetailModalProps {
  charger: ChargerResult | null;
  isOpen: boolean;
  onClose: () => void;
  onRequestBooking: (id: string) => void;
  bookingLoaderId: string;
}

export default function ChargerDetailModal({
  charger,
  isOpen,
  onClose,
  onRequestBooking,
  bookingLoaderId,
}: ChargerDetailModalProps) {
  if (!isOpen || !charger) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="modal-close"
          aria-label="Close details"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="modal-scroll">
          {charger.imageUrl ? (
            <img
              src={charger.imageUrl}
              alt={charger.title}
              className="modal-hero-image"
            />
          ) : (
            <div className="modal-hero-fallback">⚡</div>
          )}

          <div className="modal-body">
            <div className="modal-header">
              <div className="modal-title-row">
                <h2 id="modal-title" className="modal-title">
                  {charger.title}
                </h2>
                <div className="modal-rating">
                  <Star className="w-4 h-4 fill-current text-yellow-500" />
                  <span>{charger.rating ? charger.rating.toFixed(2) : "New"}</span>
                  {charger.reviewsCount ? (
                    <span className="modal-reviews">
                      ({charger.reviewsCount} reviews)
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="modal-location">
                <MapPin className="w-4 h-4" />
                <span>
                  {charger.address}
                  {charger.distanceKm ? ` · ${charger.distanceKm.toFixed(1)} km away` : ""}
                </span>
              </div>

              {charger.availableFrom && charger.availableTo && (
                <div
                  className="modal-availability"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    marginTop: "8px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--color-text-muted)",
                  }}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {charger.availableFrom} – {charger.availableTo}
                  </span>
                </div>
              )}
            </div>

            <div className="modal-specs">
              <div className="modal-spec">
                <Zap className="w-4 h-4" />
                <div>
                  <div className="modal-spec-label">Type</div>
                  <div className="modal-spec-value">
                    {charger.chargerType || "AC Charger"}
                  </div>
                </div>
              </div>
              <div className="modal-spec">
                <Gauge className="w-4 h-4" />
                <div>
                  <div className="modal-spec-label">Power</div>
                  <div className="modal-spec-value">
                    {charger.powerKw ? `${charger.powerKw} kW` : "N/A"}
                  </div>
                </div>
              </div>
              <div className="modal-spec">
                <div>
                  <div className="modal-spec-label">Plug</div>
                  <div className="modal-spec-value">
                    {charger.plugType || "Type 2"}
                  </div>
                </div>
              </div>
            </div>

            {charger.amenities && charger.amenities.length > 0 && (
              <div className="modal-section">
                <h3 className="modal-section-title">Amenities</h3>
                <div className="modal-tags">
                  {charger.amenities.map((amenity) => (
                    <span key={amenity} className="modal-tag">
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {charger.description && (
              <div className="modal-section">
                <h3 className="modal-section-title">About this charger</h3>
                <p className="modal-description">{charger.description}</p>
              </div>
            )}

            <div className="modal-footer">
              <div>
                <div className="modal-price">
                  ₹{charger.pricePerKwh.toFixed(2)}
                  <span>/kWh</span>
                </div>
              </div>
              <button
                onClick={() => onRequestBooking(charger.id)}
                disabled={bookingLoaderId !== ""}
                className="btn btn-primary btn-lg modal-book-btn"
              >
                {bookingLoaderId === charger.id ? "Booking..." : "Book Now"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
