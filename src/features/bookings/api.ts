import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function fetchBookingById(bookingId: string) {
  if (!bookingId) return null;
  const d = await getDoc(doc(db, "bookings", bookingId));
  if (!d.exists()) return null;
  const dt = d.data();
  let hotel = null, room = null;
  if (dt.hotel_id) {
    const hotelSnap = await getDoc(doc(db, "hotels", dt.hotel_id));
    hotel = hotelSnap.exists() ? hotelSnap.data() : null;
  }
  if (dt.room_id) {
    const roomSnap = await getDoc(doc(db, "rooms", dt.room_id));
    room = roomSnap.exists() ? roomSnap.data() : null;
  }
  return {
    id: d.id,
    ...dt,
    hotel,
    room
  };
}
