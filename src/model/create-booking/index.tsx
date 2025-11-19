import React, { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  addDoc,
} from "firebase/firestore";
import moment from "moment";
import { toast } from "sonner";
import { fetchRoomTypesByType, RoomType } from '@/lib/roomService';

interface AddBookingModalProps {
  visible: boolean;
  onClose: (isClose? : boolean) => void;
  selectedDate: any;
  data?: any;
  prefill?: {
    hotel_id: string;
    check_in: string;
    type: "room" | "site";
    room_id?: string;
    site_id?: string;
  };
}


const xero_api_url =  import.meta.env.VITE_XERO_APP_API_URL || 'http://localhost:8000';
const basicAuth = 'Basic ' + btoa(import.meta.env.VITE_XERO_USERNAME + ':' + import.meta.env.VITE_XERO_PASSWORD);

const AddBookingModal: React.FC<AddBookingModalProps> = ({
  visible,
  onClose,
  selectedDate: initialDate,
  data,
  prefill,
}) => {
  const [bookingData, setBookingData] = useState<any>({
    hotel_id: "",
    room_id: "",
    site_id: "",
    client_name: "",
    client_email: "",
    client_phone: "",
    client_address: "",
    check_in: moment(initialDate || new Date()).format("YYYY-MM-DD"),
    check_out: moment(initialDate || new Date()).add(1, "days").format("YYYY-MM-DD"),
    created_at: new Date(),
    invoice_number: "",
    payment_received: "no",
    payment_date: "",
    amount: "",
  });

  const [bookingType, setBookingType] = useState("room");
  const [hotels, setHotels] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchHotels();
  }, []);

  useEffect(() => {
    if (data) {
      setBookingData({
        ...data,
        check_in: moment(data.check_in?.toDate?.() || data.check_in).format(
          "YYYY-MM-DD"
        ),
        check_out: moment(data.check_out?.toDate?.() || data.check_out).format(
          "YYYY-MM-DD"
        ),
        room_id : data.room_id,
        payment_date: data.payment_date
        ? moment(data.payment_date?.toDate?.() || data.payment_date).format("YYYY-MM-DD")
        : "",
      });
      setBookingType(data.room_id ? "room" : "site");
      fetchRooms(data.hotel_id);
      fetchSites(data.hotel_id);
    } else if (prefill) {
      setBookingData((prev) => ({
        ...prev,
        hotel_id: prefill.hotel_id,
        check_in: prefill.check_in,
        check_out: moment(prefill.check_in).add(1, "days").format("YYYY-MM-DD"),
        room_id: prefill.type === "room" ? prefill.room_id : "",
        site_id: prefill.type === "site" ? prefill.site_id : "",
      }));
      setBookingType(prefill.type);
    } else {
      setBookingData((prev) => ({
        ...prev,
        check_in: moment(initialDate || new Date()).format("YYYY-MM-DD"),
        check_out: moment(initialDate || new Date()).add(1, "days").format("YYYY-MM-DD"),
      }));
    }
  }, [data, prefill, initialDate]);

  useEffect(() => {
    if (bookingData.hotel_id) {
      fetchRooms(bookingData.hotel_id);
      fetchSites(bookingData.hotel_id);
    }
  }, [bookingData.hotel_id, bookingData.check_in, bookingData.check_out]);

  useEffect(() => {
    const fetchTypes = async () => {
      const types = await fetchRoomTypesByType('room');
      setRoomTypes(types);
    };
    fetchTypes();
  }, []);

  const fetchHotels = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser?.uid) return;

    const snap = await getDocs(collection(db, "hotels"));
    const list = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter(
        (hotel: any) =>
          Array.isArray(hotel.users) && hotel.users.includes(currentUser.uid)
      );

    setHotels(list);
  };

  const fetchRooms = async (hotelId) => {
    const roomsSnapshot = await getDocs(
      query(collection(db, "rooms"), where("hotel_id", "==", hotelId))
    );
    const roomList = roomsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const bookingSnapshot = await getDocs(
      query(collection(db, "bookings"), where("hotel_id", "==", hotelId))
    );

    const isOverlapping = (start1, end1, start2, end2) =>
      start1.isBefore(end2) && start2.isBefore(end1);
  
    const bookedRoomIds = new Set();

    bookingSnapshot.docs.forEach((doc) => {
      const booking = doc.data();
      const bookingId = doc.id;

      const bookingCheckIn = moment(booking.check_in?.toDate?.() || booking.check_in).subtract(1, "days");
      const bookingCheckOut = moment(booking.check_out?.toDate?.() || booking.check_out).add(1, "days");
    
      // Exclude the current booking from overlap check when editing
      if (
        isOverlapping(
          moment(bookingData.check_in),
          moment(bookingData.check_out).subtract(1, "days"),
          bookingCheckIn,
          bookingCheckOut
        )
        && (!data || bookingId !== data.id) // Only count as booked if not the booking being edited
      ) {
        bookedRoomIds.add(booking.room_id);
      }
    });

    // Always include the currently selected room in availableRooms when editing
    const availableRooms = roomList.filter(
      (room) => !bookedRoomIds.has(room.id) || (data && room.id === data.room_id)
    );

    setRooms(availableRooms);
  };

  const fetchSites = async (hotelId) => {
    const q = query(collection(db, "sites"), where("hotel_id", "==", hotelId));
    const querySnapshot = await getDocs(q);
    const siteList = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const bookingSnapshot = await getDocs(
      query(collection(db, "bookings"), where("hotel_id", "==", hotelId))
    );

    const isOverlapping = (start1, end1, start2, end2) =>
      start1.isBefore(end2) && start2.isBefore(end1);

    const bookedSiteIds = new Set();

    bookingSnapshot.docs.forEach((doc) => {
      const booking = doc.data();
      const bookingId = doc.id;
      
      const bookingCheckIn = moment(booking.check_in?.toDate?.() || booking.check_in).subtract(1, "days");
      const bookingCheckOut = moment(booking.check_out?.toDate?.() || booking.check_out).add(1, "days");

      // Exclude the current booking from overlap check when editing
      if (
        isOverlapping(
          moment(bookingData.check_in),
          moment(bookingData.check_out).subtract(1, "days"),
          bookingCheckIn,
          bookingCheckOut
        )
        && (!data || bookingId !== data.id) // Only count as booked if not the booking being edited
      ) {
        bookedSiteIds.add(booking.site_id);
      }
    });

    // Always include the currently selected site in availableSites when editing
    const availableSites = siteList.filter(
      (site) => !bookedSiteIds.has(site.id) || (data && site.id === data.site_id)
    );
    setSites(availableSites);
  };

  async function sendNotificationToAdmins(
    title: string,
    body: string,
    eventType: 'BOOKING' | 'PAYMENT',
    eventSubType: 'CREATED' | 'UPDATED' | 'PAYMENT_SUCCESS' | 'PAYMENT_PENDING',
    bookingId?: string
  ): Promise<void> {
    const q = query(collection(db, "users"), where("role", "==", "admin"));
    const querySnapshot = await getDocs(q);

    const admins = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const adminTokens = admins
      .filter(admin => admin.fcmToken && typeof admin.fcmToken === "string" && admin.fcmToken.trim() !== "")
      .map(admin => ({ token: admin.fcmToken, recipientId: admin.id }));

    if (adminTokens.length === 0) {
      console.log("No admin users with FCM tokens found.");
      return;
    }

    await Promise.all(
      adminTokens.map(({ token, recipientId }) => {
        const notification = {
          recipientId,
          eventType,
          eventSubType,
          title,
          body,
          data: {
            redirect_route: `/dashboard?editBooking=${bookingId}`,
            ...(bookingId && { bookingId }),
          },
          senderId: auth.currentUser?.uid || null,
        };

        return fetch("https://mobile-firebase-be.vercel.app/api/send-and-save-notification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, notification }),
        });
      })
    );

  }

  const updateBookingField = (key: string, value: any) => {
    setBookingData((prev: any) => {
      const updated = { ...prev, [key]: value };
      if (key === "payment_received" && value === "no") {
        updated.payment_date = "";  // Reset if switching to "no"
      }
      return updated;
    });
  };

  const validateForm = () => {
    const {
      client_name,
      client_email,
      client_phone,
      client_address,
      amount,
      hotel_id,
      room_id,
      site_id,
      payment_received,
      payment_date
    } = bookingData;

    if (
      !client_name ||
      !client_email ||
      !client_phone ||
      !client_address ||
      !amount ||
      !hotel_id
    ) {
      toast.error("All fields are required.");
      return false;
    }
    if(payment_received === "yes" && !payment_date){
      toast.error("Payment date is required.");
      return false;
    }
    if (bookingType === "room" && !room_id) {
      toast.error("Please select a room.");
      return false;
    }
    if (bookingType === "site" && !site_id) {
      toast.error("Please select a site.");
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(client_email)) {
      toast.error("Invalid email address.");
      return false;
    }
    if (!/^\d{10}$/.test(client_phone)) {
      toast.error("Invalid phone number.");
      return false;
    }
    if (isNaN(amount)) {
      toast.error("Amount must be a number.");
      return false;
    }
    return true;
  };

  // Helper function to send payment notifications
  async function sendPaymentNotification(
    bookingId,
    paymentReceived,
    isUpdate = false,
    previousPaymentReceived = null
  ) {
    // For updates, skip notification if payment status hasn't changed
    if (isUpdate && previousPaymentReceived === paymentReceived) {
      return;
    }

    const paymentStatus = paymentReceived === "yes" ? "PAYMENT_SUCCESS" : "PAYMENT_PENDING";
    const paymentTitle = paymentReceived === "yes" ? "Payment Received" : "Payment Pending";
    let paymentBody;

    if (paymentReceived === "yes") {
      paymentBody = `Payment received for booking of client ${bookingData.client_name}.`;
    } else {
      paymentBody = isUpdate
        ? `Payment pending for booking of client ${bookingData.client_name}.`
        : `New booking created, payment pending for booking of client ${bookingData.client_name}.`;
    }

    await sendNotificationToAdmins(
      paymentTitle,
      paymentBody,
      "PAYMENT",
      paymentStatus,
      bookingId
    );
  }


  const handleSubmit = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {

      // Step 1: Fetch or create contact for client
      let contactId;
      const emailResponse = await fetch(`${xero_api_url}/api/contacts/email/${encodeURIComponent(bookingData.client_email)}`, {
        method: "GET",
        headers: {
          "Authorization": basicAuth, // Assuming basicAuth is defined (e.g., 'Basic ' + btoa('username:password'))
        },
      });

      if (emailResponse.ok) {
        const emailData = await emailResponse.json();
        contactId = emailData.data.contactId; // Contact exists
      } else if (emailResponse.status === 404) {
        // Contact not found, create new contact
        const contactResponse = await fetch(`${xero_api_url}/api/contacts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": basicAuth,
          },
          body: JSON.stringify({
            name: bookingData.client_email, // Use email as name per requirement
            emailAddress: bookingData.client_email,
            phoneNumber: bookingData.client_phone || "",
            addressLine1: bookingData.client_address || "",
          }),
        });

        if (!contactResponse.ok) {
          if (contactResponse.status === 401) {
            console.error("API Authentication failed for contact creation");
          }
          console.error("Failed to create contact");
        } else {
          const contactData = await contactResponse.json();
          contactId = contactData.data.contactId; // New contact ID
        }
      } else if (emailResponse.status === 401) {
        console.error("API Authentication failed for contact fetch");
      } else {
        console.error("Failed to fetch contact");
      }

      // Step 2: Create lineItems with enhanced details
      const lineItems = [
        {
          description: `Hotel Booking for ${bookingData.client_name} from ${bookingData.check_in} to ${bookingData.check_out}`,
          quantity: 1,
          unitAmount: bookingData.amount || 0,
          accountCode: "200", // Default sales account code (adjust as needed)
        },
      ];

      // Step 3: Create invoice in Xero for new bookings
      // let xeroInvoiceId;
      // if (contactId) {
      //   const invoiceResponse = await fetch(`${xero_api_url}/api/invoices`, {
      //     method: "POST",
      //     headers: {
      //       "Content-Type": "application/json",
      //       "Authorization": basicAuth,
      //     },
      //     body: JSON.stringify({ contactId, lineItems, status: bookingData?.payment_received ? "DRAFT" : "PAID" }),
      //   });

      //   if (!invoiceResponse.ok) {
      //     if (invoiceResponse.status === 401) {
      //       console.error("API Authentication failed for xero invoice creation");
      //     }
      //     console.error("Failed to create xero invoice");
      //   } else {
      //     const invoiceData = await invoiceResponse.json();
      //     xeroInvoiceId = invoiceData.data.invoiceId;
      //   }
      // }

      const invoice_number = bookingData.invoice_number || `INV-${Date.now()}`;
      const invoicePayload = {
        ...bookingData,
        xero_invoice_id: invoice_number,
        invoice_number,
        created_at: new Date(),
        user_id: auth.currentUser?.uid,
        payment_received: bookingData?.payment_received,
        status: bookingData?.payment_received ? "Pending" : "Confirmed",
      };

      if (data?.invoice_id) {
        // Update the invoice
        const invoiceRef = doc(db, "invoices", data.invoice_id);
        await updateDoc(invoiceRef, invoicePayload);

        // Also update the booking
        if (data?.id) {
          const bookingRef = doc(db, "bookings", data.id);
          await updateDoc(bookingRef, {
            ...bookingData,
            invoice_id: data.invoice_id,
            invoice_number,
            updated_at: new Date(),
          });

          await sendNotificationToAdmins(
            "Booking Updated",
            `Booking of client ${bookingData.client_name} has been updated.`,
            "BOOKING",
            "UPDATED",
            data.id
          );

          // Notify admins of payment status change, if applicable
          await sendPaymentNotification(
            data.id,
            bookingData.payment_received,
            true,
            data.payment_received
          );
        }
      } else {
        const invoiceRef = await addDoc(
          collection(db, "invoices"),
          invoicePayload
        );
        const bookingId = await handleCreateBooking(null, invoiceRef.id);

        await sendNotificationToAdmins(
          "New Booking",
          `You have a new booking in the system by client ${bookingData.client_name}.`,
          "BOOKING",
          "CREATED",
          bookingId
        );

      }
      toast.success(data ? "Booking updated" : "Booking created");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    }
    setLoading(false);
  };


  const handleCreateBooking = async (bookingId, invoiceId) => {
    const payload = {
      ...bookingData,
      check_in: new Date(bookingData.check_in),
      check_out: new Date(bookingData.check_out),
      invoice_number: bookingData.invoice_number || `INV-${Date.now()}`,
      invoice_id: invoiceId,
      user_id: auth.currentUser?.uid,
      created_at: new Date(),
      status: "Confirmed",
    };

    if (bookingId) {
      const bookingRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingRef, payload);
      return bookingId;
    } else {
      const bookingRef = await addDoc(collection(db, "bookings"), payload);
      return bookingRef.id; // Return the new booking ID
    }
  };

  if (!visible) return null;

  const minCheckIn = moment().add(1, "days").format("YYYY-MM-DD");
  const minCheckOut: any = bookingData.check_in
    ? new Date(bookingData.check_in)
    : new Date();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-semibold mb-6 text-[#758533]">
          {data ? "Edit Booking" : "Create Booking"}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <select
            value={bookingData.hotel_id}
            onChange={(e) => {
              updateBookingField("hotel_id", e.target.value);
              fetchRooms(e.target.value);
              fetchSites(e.target.value);
            }}
            className="border border-gray-300 px-3 py-2 rounded shadow-sm"
          >
            <option value="">Select Hotel</option>
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>
                {h.hotel_name}
              </option>
            ))}
          </select>

          <select
            value={bookingType}
            onChange={(e) => setBookingType(e.target.value)}
            className="border border-gray-300 px-3 py-2 rounded shadow-sm"
          >
            <option value="room">Room</option>
            <option value="site">Site</option>
          </select>

          <input
            type="date"
            value={bookingData.check_in}
            onChange={(e) => {
              updateBookingField("check_in", e.target.value);
              // Optionally auto-set check_out to next day
              updateBookingField(
                "check_out",
                moment(e.target.value).add(1, "days").format("YYYY-MM-DD")
              );
            }}
            min={minCheckIn}
            className="border border-gray-300 px-3 py-2 rounded shadow-sm"
          />
          <input
            type="date"
            value={bookingData.check_out}
            min={minCheckOut}
            onChange={(e) => updateBookingField("check_out", e.target.value)}
            className="border border-gray-300 px-3 py-2 rounded shadow-sm"
          />

          {bookingType === "room" && (
            <select
              value={bookingData.room_id ?? ""}
              onChange={(e) => updateBookingField("room_id", e.target.value)}
              className="border border-gray-300 px-3 py-2 rounded shadow-sm"
            >
              <option value="">Select Room</option>
              {rooms.map((r) => {
                const type = roomTypes.find(rt => rt.uid === r.room_type);
                return (
                  <option key={r.id} value={r.id}>
                    {r.room_number}{type ? ` - ${type.title}` : ''}
                  </option>
                );
              })}
            </select>
          )}

          {bookingType === "site" && (
            <select
              value={bookingData.site_id}
              onChange={(e) => updateBookingField("site_id", e.target.value)}
              className="border border-gray-300 px-3 py-2 rounded shadow-sm"
            >
              <option value="">Select Site</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.site_number}
                </option>
              ))}
            </select>
          )}

          <input
            type="text"
            placeholder="Client Name"
            value={bookingData.client_name}
            onChange={(e) => updateBookingField("client_name", e.target.value)}
            className="border border-gray-300 px-3 py-2 rounded shadow-sm"
          />

          <select
            value={bookingData.payment_received}
            onChange={(e) =>
              updateBookingField("payment_received", e.target.value)
            }
            className="border border-gray-300 px-3 py-2 rounded shadow-sm"
          >
            <option value="no">Payment Received?</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>

          {bookingData.payment_received === "yes" && (
            <>
              <input
                type="date"
                value={bookingData.payment_date}
                required={bookingData.payment_received === "yes"}
                onChange={(e) =>
                  updateBookingField("payment_date", e.target.value)
                }
                className="border border-gray-300 px-3 py-2 rounded shadow-sm"
              />
            </>
          )}
          <input
            type="email"
            placeholder="Client Email"
            value={bookingData.client_email}
            onChange={(e) => updateBookingField("client_email", e.target.value)}
            className="border border-gray-300 px-3 py-2 rounded shadow-sm"
          />
          <input
            type="tel"
            placeholder="Client Phone"
            value={bookingData.client_phone}
            onChange={(e) => updateBookingField("client_phone", e.target.value)}
            className="border border-gray-300 px-3 py-2 rounded shadow-sm"
          />
          <input
            type="text"
            placeholder="Client Address"
            value={bookingData.client_address}
            onChange={(e) =>
              updateBookingField("client_address", e.target.value)
            }
            className="border border-gray-300 px-3 py-2 rounded shadow-sm"
          />
          <input
            type="number"
            placeholder="Amount"
            value={bookingData.amount}
            onChange={(e) => updateBookingField("amount", e.target.value)}
            className="border border-gray-300 px-3 py-2 rounded shadow-sm"
          />
        </div>

        <div className="flex justify-end mt-8 space-x-3">
          <button
            onClick={() => onClose(true)}
            className="px-5 py-2 rounded bg-gray-200 hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 rounded bg-brand text-white hover:bg-brand disabled:opacity-50"
          >
            {loading ? "Saving..." : data ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddBookingModal;
