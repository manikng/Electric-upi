"use client";

import { useRouter } from "next/navigation";

export function useBookingActions(bookingId: string) {
  const router = useRouter();

  const cancelBooking = async (
    setActionLoading: (loading: boolean) => void,
    setError: (error: string) => void,
  ): Promise<boolean> => {
    if (!confirm("Are you sure you want to cancel this booking? You can then apply to a different host.")) {
      return false;
    }

    setActionLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to cancel booking.");
        return false;
      }

      router.push("/");
      return true;
    } catch {
      setError("Network error. Could not cancel booking.");
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  return { cancelBooking };
}
