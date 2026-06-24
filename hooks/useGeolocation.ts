"use client";
import { useState, useCallback } from "react";

interface UseGeolocationOptions {
  initialCoords: { lat: number; lng: number } | null;
}

export function useGeolocation({ initialCoords }: UseGeolocationOptions) {
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(initialCoords);
  const [locationError, setLocationError] = useState("");

  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    const isLocal =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");

    if (
      typeof window !== "undefined" &&
      !window.isSecureContext &&
      !isLocal
    ) {
      setLocationError(
        "Proximity search requires a secure context (HTTPS)."
      );
      return;
    }

    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.warn("Geolocation error:", error);
        setLocationError("Permission denied or location unavailable.");
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  }, []);

  return {
    userCoords,
    locationError,
    setLocationError,
    handleGeolocate,
    setUserCoords,
  };
}
