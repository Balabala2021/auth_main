import React, { useEffect, useState } from "react";
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import moment from "moment";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  getDoc,
  query,
  where,
  DocumentData,
  doc,
} from "firebase/firestore";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { MdCheckCircle, MdPending } from "react-icons/md";
import AddBookingModal from "@/model/create-booking";
import { useQueryParamBooking } from "@/features/bookings/useQueryParamBooking";
import { fetchBookingById } from "@/features/bookings/api";
import { MuiBookingCalendar } from "./ui/MuiBookingCalendar";
import { Modal } from "@mui/material";
import Slide from "@mui/material/Slide";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
interface Hotel {
  id: string;
  hotel_name: string;
  users: string[];
}

interface Room {
  room_number: string;
}

interface Site {
  site_number: string;
}

interface Booking {
  id: string;
  client_name: string;
  hotel_id: string;
  room_id: string;
  check_in: any;
  check_out: any;
  invoice_number: string;
  status: string;
  user_id: string;
  payment_received: string;
  payment_date?: string;
  hotel: Hotel;
  room: Room;
  site: Site;
}

export function Dashboard() {
  const { user, refreshUser } = useCurrentUser();
  const [viewMode, setViewMode] = useState<string>("calendar");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [bookingsMarked, setBookingsMarked] = useState<Record<string, any>>({});
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<string>("");
  const [data, selectData] = useState<Booking | undefined>();
  const [showBookings, setShowBookings] = useState(false);

  // Detect ?editBooking=BOOKING_ID in the URL and open modal
  useQueryParamBooking(async (bookingId) => {
    const booking = await fetchBookingById(bookingId);
    if (booking) {
      selectData(booking);
      setShowBookings(false)
      setModalVisible(true);
    }
  });

  const fetchHotels = async () => {
    if (!user?.uid) return;
    const snap = await getDocs(collection(db, "hotels"));
    const list: Hotel[] = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Hotel))
      .filter((h) => Array.isArray(h.users) && h.users.includes(user.uid));
    setHotels(list);
  };

  const getDate = (val: any): Date | null => {
    if (!val) return null;
    if (val.toDate) return val.toDate();
    if (typeof val === "string") return new Date(val);
    if (val.seconds) return new Date(val.seconds * 1000);
    return null;
  };

  const fetchAllBookings = async () => {
    setLoading(true);
    try {
      let q: any;

      if (user?.role === "staff") {
        const baseQuery = query(
          collection(db, "bookings"),
          where("user_id", "==", user.uid)
        );
        q = selectedHotelId
          ? query(baseQuery, where("hotel_id", "==", selectedHotelId))
          : baseQuery;
      } else {
        q = selectedHotelId
          ? query(
              collection(db, "bookings"),
              where("hotel_id", "==", selectedHotelId)
            )
          : collection(db, "bookings");
      }

      const snap = await getDocs(q);
      const marked: Record<string, any> = {};

      for (const d of snap.docs) {
        const dt: any = d.data();

        const ci = getDate(dt.check_in);
        if (ci) {
          marked[moment(ci).format("YYYY-MM-DD")] = { marked: true };
        }
      }

      setBookingsMarked(marked);
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
    }
    setLoading(false);
  };

  const fetchBookingsByDate = async (date: Date, isCreate = false) => {
    setLoading(true);
    try {
      const snap = await getDocs(
        selectedHotelId
          ? query(
              collection(db, "bookings"),
              where("hotel_id", "==", selectedHotelId)
            )
          : collection(db, "bookings")
      );
      const list: any[] = [];
      for (const d of snap.docs) {
        const dt = d.data();
        if (user?.role === "staff" && dt.user_id !== user.uid) continue;
        const ci = getDate(dt.check_in);
        if (ci && moment(ci).isSame(date, "day")) {
          const hotelSnap = await getDoc(doc(db, "hotels", dt.hotel_id));
          let roomSnap = null;
          let siteSnap = null;

          if(dt.room_id){
            roomSnap = await getDoc(doc(db, "rooms", dt.room_id));
          } else {
            siteSnap = await getDoc(doc(db, "sites", dt.site_id));
          }
          list.push({
            id: d.id,
            ...dt,
            hotel: hotelSnap.data() as Hotel,
            room: roomSnap?.data() as Room,
            site: siteSnap?.data() as Site,
          });
        }
      }
      
    if(list?.length > 0){
          setShowBookings(true);
      }
    // setShowBookings
      setTodayBookings(list);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchHotels();
  }, [user]);

  useEffect(() => {
    if (user) fetchAllBookings();
  }, [user, selectedHotelId, modalVisible]);

  useEffect(() => {
    refreshUser();
  }, []);

  const hotelOptions = [
    { value: "", label: "All Hotels" },
    ...hotels.map((h) => ({ value: h.id, label: h.hotel_name })),
  ];

  const renderPaymentStatus = (paid: string) =>
    paid === "yes" ? (
      <MdCheckCircle size={22} color="#4CAF50" />
    ) : (
      <MdPending size={22} color="#FF5722" />
    );

  return (
    <div className="p-4 bg-white min-h-screen">
      <div className=" md:flex block justify-between mb-4">
        <div className="w-full  md:mb-0 mb-8 md:w-1/3">
          {user?.role !== "staff" && (
            <Select
              value={hotelOptions.find((o) => o.value === selectedHotelId)}
              onChange={(o) => setSelectedHotelId(o?.value || "")}
              options={hotelOptions}
              styles={{
                control: (base) => ({
                  ...base,
                  backgroundColor: "#f3f3f3",
                  borderColor: "#d1d5db",
                  borderRadius: 6,
                  minHeight: 40,
                }),
              }}
            />
          )}
        </div>

        <div className="flex justify-end md:mb-0 mb-8 space-x-2">
          <button
            className={`p-2 rounded ${
              viewMode === "calendar" ? "bg-brand text-white" : "bg-gray-200"
            }`}
            onClick={() => setViewMode("calendar")}
          >
            Calendar
          </button>
          <button
            className={`p-2 rounded ${
              viewMode === "list" ? "bg-brand text-white" : "bg-gray-200"
            }`}
            onClick={() => setViewMode("list")}
          >
            List
          </button>
          <button
            className="p-2 rounded bg-brand text-white"
            onClick={() => {setModalVisible(true); selectData(undefined);}}
          >
            + New
          </button>
        </div>
      </div>

      {viewMode === "calendar" && (
        // <div className="mb-4 text-end">
        //   <DatePicker
        //     inline
        //     selected={selectedDate}
        //     onChange={(date: Date) => {
        //       setSelectedDate(date);
        //       fetchBookingsByDate(date, true);
        //     }}
        //     highlightDates={[
        //       {
        //         "react-datepicker__day--highlighted-custom-1": [selectedDate],
        //       },
        //       {
        //         "react-datepicker__day--highlighted-custom-2": Object.keys(
        //           bookingsMarked
        //         ).map((d) => new Date(d)),
        //       },
        //     ]}
        //     dayClassName={(date) => {
        //       const formatted = moment(date).format("YYYY-MM-DD");
        //       if (moment(date).isSame(selectedDate, "day"))
        //         return "react-datepicker__day--highlighted-custom-1";
        //       if (bookingsMarked[formatted])
        //         return "react-datepicker__day--highlighted-custom-2";
        //       return "";
        //     }}
        //   />
        // </div>

         <MuiBookingCalendar
            value={selectedDate}
            onChange={(date) => {
              setSelectedDate(date);
              fetchBookingsByDate(date, true);
            }}
            bookingsMarked={bookingsMarked}
          />
      )}

      {viewMode === "list" && (
        <div className=" mb-4  text-end">
          <DatePicker
            selected={selectedDate}
            onChange={(date: Date) => {
              setSelectedDate(date);
              fetchBookingsByDate(date, true);
            }}
            dateFormat="yyyy-MM-dd"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      )}

      {loading ? (
          <p>Loading...</p>
        ) : todayBookings.length === 0 && (
          <p className="text-gray-500">No bookings found</p>
        )}

      {/* <div className="mt-4">
        <h2 className="text-xl font-bold mb-2">
          Bookings on {moment(selectedDate).format("YYYY-MM-DD")}
        </h2>
        {loading ? (
          <p>Loading...</p>
        ) : todayBookings.length === 0 ? (
          <p className="text-gray-500">No bookings found</p>
        ) : (
          todayBookings.map((b) => (
            <div
              key={b.id}
              className="border rounded-lg p-4 mb-2 shadow-sm cursor-pointer"
              onClick={() => {
                selectData(b);
                setModalVisible(true);
              }}
            >
              <div className="flex justify-between items-center mb-1">
                <p className="font-semibold">
                  {moment(getDate(b.check_in)).format("MMM Do YYYY")} to{" "}
                  {moment(getDate(b.check_out)).format("MMM Do YYYY")}
                </p>
                {renderPaymentStatus(b.payment_received)}
              </div>
              <p>Invoice: {b.invoice_number}</p>
              <p>Client: {b.client_name}</p>
              <p>Room: {b.room?.room_number}</p>
              <p>Hotel: {b.hotel?.hotel_name}</p>
              <p>Status: {b.status}</p>
            </div>
          ))
        )}
      </div> */}

     <Modal
  open={showBookings}
  onClose={() => setShowBookings(false)}
  closeAfterTransition
  slotProps={{
    backdrop: {
      style: { background: "rgba(0,0,0,0.2)" },
    },
  }}
>
  <Slide
    direction="up"
    in={ showBookings}
    mountOnEnter
    unmountOnExit
  >
    <div
      className="absolute bottom-0 left-0 w-full max-w-none bg-white rounded-t-lg shadow-lg p-6"
      style={{ maxHeight: "80vh", overflowY: "auto" }}
    >
      <div style={{textAlign: "right", marginBottom : "30px"}}>
            <IconButton
        aria-label="close"
        onClick={() => setShowBookings(false)}
        className="absolute top-2 right-2"
        size="small"
      >
        <CloseIcon />
      </IconButton>
      </div>
      <h2 className="text-xl font-bold mb-2">
        Bookings on {moment(selectedDate).format("YYYY-MM-DD")}
      </h2>
      {loading ? (
        <p>Loading...</p>
      ) : (
        todayBookings.map((b) => (
          <div
            key={b.id}
            className="border rounded-lg p-4 mb-2 shadow-sm cursor-pointer"
            onClick={() => {
              selectData(b);
              setModalVisible(true);
              setShowBookings(false)
            }}
          >
            <div className="flex justify-between items-center mb-1">
              <p className="font-semibold">
                {moment(getDate(b.check_in)).format("MMM Do YYYY")} to{" "}
                {moment(getDate(b.check_out)).format("MMM Do YYYY")}
              </p>
              {renderPaymentStatus(b.payment_received)}
            </div>
            <p>Invoice: {b.invoice_number}</p>
            <p>Client: {b.client_name}</p>
            <p>{b.room?.room_number ? "Room:" : "Site:"} {b.room?.room_number ? b.room?.room_number : b.site?.site_number}</p>
            <p>Hotel: {b.hotel?.hotel_name}</p>
            <p>Status: {b.status}</p>
          </div>
        ))
      )}
    </div>
  </Slide>
</Modal>


      {modalVisible && (
        <AddBookingModal
          visible={modalVisible}
          data={data}
          onClose={(isClose? : boolean) => {
             setModalVisible(false);
            if(!isClose){
  
            fetchAllBookings();
            fetchBookingsByDate(selectedDate, true);
            selectData(undefined);
            }
         
          }}
          selectedDate={
            moment(selectedDate).isSame(moment(), "day")
              ? moment().add(1, "day").format("YYYY-MM-DD")
              : selectedDate
          }
        />
      )}
    </div>
  );
}
