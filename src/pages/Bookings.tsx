import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Loading from '@/components/Loading';
import { fetchRoomTypesByType, RoomType } from '@/lib/roomService';

interface Booking {
  id: string;
  hotel_id: string;
  room_id: string;
  client_name: string;
  check_in: string | null;
  check_out: string | null;
  invoice_created_date: Date | null;
  invoice_number?: string;
  payment_received_date?: string | null;
  createId: string;
  amount?: string;
  created_at: Date | null;
  updated_at: Date | null;
  status: string;
}

interface Hotel {
  id: string;
  hotel_name: string;
}

interface Room {
  id: string;
  room_number: string;
  hotel_id: string;
  room_type: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  client_email ? : string
  // Add more fields as needed, e.g. total, status, etc.
}

const AdminBookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        // Fetch hotels
        const hotelsSnapshot = await getDocs(collection(db, 'hotels'));
        const hotelsData = hotelsSnapshot.docs.map(doc => ({
          id: doc.id,
          hotel_name: doc.data().hotel_name || '',
        }));
        setHotels(hotelsData);

        // Fetch room types
        const types = await fetchRoomTypesByType('room');
        setRoomTypes(types);

        // Fetch rooms
        const roomsSnapshot = await getDocs(collection(db, 'rooms'));
        const roomsData = roomsSnapshot.docs.map(doc => ({
          id: doc.id,
          room_number: doc.data().room_number || '',
          hotel_id: doc.data().hotel_id || '',
          room_type: doc.data().room_type || '',
        }));
        setRooms(roomsData);

        // 3. Fetch invoices
        const invoicesSnapshot = await getDocs(collection(db, 'invoices'));
        const invoicesData = invoicesSnapshot.docs.map(doc => ({
          id: doc.id,
          invoice_number: doc.data().invoice_number || '',
          client_email: doc.data().client_email || '',
        }));
        setInvoices(invoicesData);

        // 4. Fetch bookings (from Firestore or API)
        let bookingsData: Booking[] = [];
        // If from Firestore:
        const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
        bookingsData = bookingsSnapshot.docs.map(doc => {
          const data = doc.data();
          const invoice = invoices.find(inv => inv.id === data.invoice_id);
          console.log(invoice,"...invoice");
          return {
            id: doc.id,
            hotel_id: data.hotel_id || '',
            room_id: data.room_id || '',
            client_name: data.client_name || '',
            client_email: invoice?.client_email || '',
            check_in: data.check_in || null,
            check_out: data.check_out || null,
            invoice_created_date: data.invoice_created_date?.toDate ? data.invoice_created_date.toDate() : null,
            invoice_number: data.invoice_number || '',
            payment_received_date: data.payment_received_date || null,
            createId: data.createId || '',
            amount:  data.amount,
            created_at: data.created_at?.toDate ? data.created_at.toDate() : null,
            updated_at: data.updated_at?.toDate ? data.updated_at.toDate() : null,
            status: data.status || '',
          };
        });
        // If from API, replace above with your API fetch and mapping logic

        console.log(bookingsData,"...data");

        setBookings(bookingsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  const columns: GridColDef[] = [
    {
      field: 'hotel_id',
      headerName: 'Hotel',
      flex: 1,
      valueGetter: (params) => {
        const hotel = hotels.find(h => h.id === params.row.hotel_id);
        return hotel ? hotel.hotel_name : '-';
      },
    },
    {
      field: 'room_id',
      headerName: 'Room',
      flex: 1,
      valueGetter: (params) => {
        const room = rooms.find(r => r.id === params.row.room_id);
        const type = roomTypes.find(rt => rt.uid === room?.room_type);
        return room ? `${room.room_number}${type ? ' - ' + type.title : ''}` : '-';
      },
    },
    {
      field: 'room_type',
      headerName: 'Room Type',
      flex: 1,
      valueGetter: (params) => {
        const room = rooms.find(r => r.id === params.row.room_id);
        const type = roomTypes.find(rt => rt.uid === room?.room_type);
        return type ? type.title : '-';
      },
    },
    {
      field: 'client_name',
      headerName: 'Client Name',
      flex: 1,
    },

    {
      field: 'client_email',
      headerName: 'Client Email',
      flex: 1,
      valueGetter: (params) => {
        const val = params.row.invoice_created_date;
        return val instanceof Date ? val.toLocaleDateString() : '-';
      },
    },
    
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
    },
    
    {
      field: 'payment_received_date',
      headerName: 'Payment Date',
      flex: 1,
      valueGetter: (params: { row: Booking }) => {
        return params.row.payment_received_date ? new Date(params.row.payment_received_date).toLocaleDateString() : '-';
      },
    },
    {
      field: 'amount',
      headerName: 'Amount',
      flex: 1,
      valueGetter: (params: { row: Booking }) => {
        const value = params.row.amount;
        return value ? `$${parseInt(value).toFixed(2)}` : '$0';
      },
    },
  ];

  if (loading) {
    return <Loading />;
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Bookings
        </Typography>
      </Box>
      <Box sx={{ height: 400, width: '100%' }}>
        <DataGrid
          rows={bookings}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 5, page: 0 },
            },
          }}
          pageSizeOptions={[5]}
          checkboxSelection={false}
          disableRowSelectionOnClick
        />
      </Box>
    </Box>
  );
};

export default AdminBookings;