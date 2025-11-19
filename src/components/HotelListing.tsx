import React, { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import moment from "moment";
import AddBookingModal from "@/model/create-booking";

export function HotelListing()  {
  const [hotels, setHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(moment().add(1, "days").format("YYYY-MM-DD"));
  const [bookedRoomIds, setBookedRoomIds] = useState([]);
  const [bookedSiteIds, setBookedSiteIds] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [prefill, setPrefill] = useState(null);

  useEffect(() => {
    fetchHotels();
  }, []);

  const fetchHotels = async () => {
    setLoading(true);
    const currentUser = auth.currentUser;
    if (!currentUser?.uid) {
      setHotels([]);
      setLoading(false);
      return;
    }
    const querySnapshot = await getDocs(collection(db, "hotels"));
    const hotelList = querySnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((hotel : any)  => Array.isArray(hotel.users) && hotel.users.includes(currentUser.uid));
    setHotels(hotelList);
    setLoading(false);
  };

  const fetchRoomsAndSites = async (hotelId) => {
    setLoading(true);
    const roomQuery = query(collection(db, "rooms"), where("hotel_id", "==", hotelId));
    const roomSnapshot = await getDocs(roomQuery);
    setRooms(roomSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

    const siteQuery = query(collection(db, "sites"), where("hotel_id", "==", hotelId));
    const siteSnapshot = await getDocs(siteQuery);
    setSites(siteSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    setLoading(false);
  };

  const fetchBookedRoomsAndSites = async (hotelId, date) => {
    setLoading(true);
    const bookingsQuery = query(collection(db, "bookings"), where("hotel_id", "==", hotelId));
    const bookingsSnapshot = await getDocs(bookingsQuery);
    const bookedRooms = [];
    const bookedSites = [];

    bookingsSnapshot.forEach((doc) => {
      const data = doc.data();
      const checkIn = getDate(data.check_in);
      const checkOut = getDate(data.check_out);

      if (
        checkIn &&
        checkOut &&
        moment(selectedDate).isBetween(moment(checkIn).subtract(1, "days"), moment(checkOut).add(1, "days"))
      ) {
        if (data.room_id) bookedRooms.push(data.room_id);
        if (data.site_id) bookedSites.push(data.site_id);
      }
    });

    setBookedRoomIds(bookedRooms);
    setBookedSiteIds(bookedSites);
    setLoading(false);
  };

  const getDate = (val) => {
    if (!val) return null;
    if (typeof val.toDate === "function") return val.toDate();
    if (typeof val === "string") return new Date(val);
    if (typeof val === "object" && val.seconds) return new Date(val.seconds * 1000);
    return null;
  };

  const handleHotelPress = async (hotel) => {
    setSelectedHotel(hotel);
    await fetchRoomsAndSites(hotel.id);
    await fetchBookedRoomsAndSites(hotel.id, selectedDate);
  };

  const handleRoomClick = (room) => {
    if (bookedRoomIds.includes(room.id)) return;
    setPrefill({
      hotel_id: selectedHotel.id,
      check_in: selectedDate,
      type: "room",
      room_id: room.id,
    });
    setShowModal(true);
  };
  
  const handleSiteClick = (site) => {
    if (bookedSiteIds.includes(site.id)) return;
    setPrefill({
      hotel_id: selectedHotel.id,
      check_in: selectedDate,
      type: "site",
      site_id: site.id,
    });
    setShowModal(true);
  };

  useEffect(() => {
    if (selectedHotel) {
      fetchBookedRoomsAndSites(selectedHotel.id, selectedDate);
    }
  }, [selectedDate, selectedHotel]);

  return (
     <div className="p-6">
      {!selectedHotel ? (
        loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : hotels.length === 0 ? (
          <p className="text-gray-500 italic">No hotels assigned to you.</p>
        ) : (
          <div className="grid gap-4">
            {hotels.map((hotel) => (
              <div
                key={hotel.id}
                onClick={() => handleHotelPress(hotel)}
                className="p-4 bg-white shadow-md rounded-lg border border-green-700 cursor-pointer hover:shadow-lg transition"
              >
                <h3 className="text-xl font-bold text-green-800">{hotel.hotel_name}</h3>
                <p className="text-gray-600 mt-1">{hotel.address}</p>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-6">
          <button onClick={() => setSelectedHotel(null)} className="text-green-700 hover:underline">← Back to Hotels</button>
          <h2 className="text-2xl font-semibold text-green-800">Hotel Name: {selectedHotel.hotel_name}</h2>
          <div>
            <label className="block mb-2 font-medium">Select Date to Check Availability</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={moment().format("YYYY-MM-DD")}
              className="border border-green-700 rounded px-3 py-2 w-full max-w-sm"
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Rooms (disabled if booked)</h3>
            {rooms.length === 0 ? (
              <p className="text-gray-500 italic">No rooms found.</p>
            ) : (
              <div className="space-y-3">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => handleRoomClick(room)}
                    className={`p-3 rounded flex justify-between items-center ${bookedRoomIds.includes(room.id) ? "bg-red-100 opacity-60" : "bg-green-100 hover:bg-green-200 cursor-pointer"}`}
                  >
                    <span className="text-gray-700">
                      {room.room_number || "Room"} {bookedRoomIds.includes(room.id) ? "(Booked)" : "(Available)"}
                    </span>
                    <strong className="text-gray-800">${room.room_price || "0"}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Sites</h3>
            {sites.length === 0 ? (
              <p className="text-gray-500 italic">No sites found.</p>
            ) : (
              <div className="space-y-3">
                {sites.map((site) => (
                  <div
                    key={site.id}
                    onClick={() => handleSiteClick(site)}
                    className={`p-3 rounded ${bookedSiteIds.includes(site.id) ? "bg-red-100 opacity-60" : "bg-green-100 hover:bg-green-200 cursor-pointer"}`}
                    >
                    <span className="text-gray-700">
                      {site.site_number} {bookedSiteIds.includes(site.id) ? "(Booked)" : "(Available)"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {showModal && (
  <AddBookingModal
    visible={showModal}
    onClose={async (isClose) => {
      setShowModal(false);
      setPrefill(null);
      if (!isClose) {
        await fetchBookedRoomsAndSites(selectedHotel.id, selectedDate);
      }
    }}
    selectedDate={selectedDate}
    prefill={prefill}
  />
)}
    </div>
  );
}
