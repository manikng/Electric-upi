"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Zap,
  MapPin,
  Clock,
  Gauge,
  Star,
  ArrowLeft,
  ShieldCheck,
  DollarSign,
  Calendar,
} from "lucide-react";
import { ChargerResult } from "@/lib/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface ChargerClientProps {
  initialCharger: ChargerResult;
}

export default function ChargerClient({ initialCharger }: ChargerClientProps) {
  const router = useRouter();
  const [isBooking, setIsBooking] = useState(false);

  const charger = initialCharger;

  const handleBooking = async () => {
  setIsBooking(true);
  try {
    const res = await fetch("/api/bookings", {
      method: "POST",
      body: JSON.stringify({ chargerId: charger.id }),
    });
    const data = await res.json();
    router.push(`/booking/${data.bookingId}`); // ✅ Use bookingId
  } catch (err) {
    alert("Booking failed!");
  } finally {
    setIsBooking(false);
  }
};

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-[var(--color-surface)]/80 backdrop-blur-md border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mr-4"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold truncate">{charger.title}</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Hero Image */}
        <div className="relative w-full h-64 md:h-96 rounded-2xl overflow-hidden mb-6">
          { charger.imageUrl ? (
            <Image
              src={charger.imageUrl}
              alt={charger.title}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center">
              <Zap className="w-20 h-20 text-white/50" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="default">{charger.type}</Badge>
                {charger.isSuperhost && (
                  <Badge variant="accent" className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Superhost
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{charger.title}</h1>
              <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)]">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                  <span className="font-medium text-foreground">
                    {charger.rating ? charger.rating.toFixed(2) : "New"}
                  </span>
                  {charger.reviewsCount ? (
                    <span>({charger.reviewsCount} reviews)</span>
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>
                    { charger.city}
                    {charger.distanceKm ? ` · ${charger.distanceKm.toFixed(1)} km away` : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-[var(--color-border)]" />

            {/* Host Info */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-bold text-lg">
                {charger.hostName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium">Hosted by {charger.hostName}</p>
                <p className="text-sm text-[var(--color-text-muted)]">Verified Host</p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-[var(--color-border)]" />

            {/* Specs */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Charger specs</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card className="p-4 flex items-center gap-3">
                  <Zap className="w-5 h-5 text-[var(--color-primary)]" />
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)]">Type</p>
                    <p className="font-medium">{ charger.chargerType || "AC Charger"}</p>
                  </div>
                </Card>
                <Card className="p-4 flex items-center gap-3">
                  <Gauge className="w-5 h-5 text-[var(--color-primary)]" />
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)]">Power</p>
                    <p className="font-medium">
                      {charger.powerKw ? `${charger.powerKw} kW` : "N/A"}
                   deblog
                    </p>
                  </div>
                </Card>
                <Card className="p-4 flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-[var(--color-primary)]" />
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)]">Plug</p>
                    <p className="font-medium">{ charger.plugType || "Type 2"}</p>
                  </div>
                </Card>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-[var(--color-border)]" />

            {/* Availability */}
            {charger.availableFrom && charger.availableTo && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Availability</h3>
                <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                  <Calendar className="w-5 h-5" />
                  <span>
                    {charger.availableFrom} – {charger.availableTo}
                  </span>
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-[var(--color-border)]" />

            {/* Amenities */}
            {charger.amenities && charger.amenities.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {charger.amenities.map((amenity) => (
                    <Badge key={amenity} variant="info">
                      {amenity}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-[var(--color-border)]" />

            {/* Description */}
            {charger.description && (
              <div>
                <h3 className="text-lg font-semibold mb-3">About this charger</h3>
                <p className="text-[var(--color-text-muted)] leading-relaxed">
                  {charger.description}
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Booking Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card className="p-6 space-y-6">
                <div>
                  <p className="text-sm text-[var(--color-text-muted)]">Price per kWh</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">₹{charger.pricePerKwh.toFixed(2)}</span>
                    <span className="text-[var(--color-text-muted)]">/kWh</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--color-text-muted)]">Type</span>
                    <span className="font-medium">{ charger.type || "AC"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--color-text-muted)]">Power</span>
                    <span className="font-medium">
                      {charger.powerKw ? `${charger.powerKw} kW` : "N/A"}
                    </span>
                  </div>
                  {(charger.availableFrom && charger.availableTo) && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--color-text-muted)]">Hours</span>
                      <span className="font-medium">
                        {charger.availableFrom} – {charger.availableTo}
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleBooking}
                  disabled={isBooking}
                >
                  {isBooking ? "Redirecting..." : "Book Now"}
                </Button>

                <p className="text-xs text-center text-[var(--color-text-muted)]">
                  You won&apos;t be charged yet
                </p>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}