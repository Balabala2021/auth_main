import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Custom hook to detect ?editBooking=BOOKING_ID in the URL and call a callback with the bookingId (if present)
 * @param onBookingId Callback to fire when bookingId param is present
 */
export function useQueryParamBooking(onBookingId: (bookingId: string) => void) {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const bookingId = params.get("editBooking");
    if (bookingId) {
      onBookingId(bookingId);
    }
    // Only on mount or when search changes
    // eslint-disable-next-line
  }, [location.search]);
}
