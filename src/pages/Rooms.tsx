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
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Loading from '@/components/Loading';
import { fetchRoomTypesByType, RoomType } from '@/lib/roomService';

interface Hotel {
  id: string;
  hotel_name: string;
  address: string;
}

interface Room {
  id: string;
  hotel_id: string;
  room_number: string;
  room_price: number;
  room_type?: string; // uid of the room type
  hotel?: Hotel;
}

const AdminRooms: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState({
    hotel_id: '',
    room_number: '',
    room_price: '',
    room_type: '',
  });

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        // First fetch hotels
        const hotelsSnapshot = await getDocs(collection(db, "hotels"));
        const hotelsData = hotelsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Hotel[];
        setHotels(hotelsData);

        // Fetch room types
        const types = await fetchRoomTypesByType('room');
        setRoomTypes(types);

        // Then fetch rooms after hotels and types are loaded
        const roomsSnapshot = await getDocs(collection(db, "rooms"));
        const roomsData = roomsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Room[];

        // Join with hotel data
        const roomsWithHotels = roomsData.map(room => {
          const hotel = hotelsData.find(hotel => hotel.id === room.hotel_id);
          return {
            ...room,
            hotel,
            hotel_name: hotel?.hotel_name || 'Unknown Hotel'
          };
        });

        setRooms(roomsWithHotels);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  const fetchRooms = async () => {
    setActionLoading(true);
    try {
      const roomsSnapshot = await getDocs(collection(db, "rooms"));
      const roomsData = roomsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Room[];

      // Join with hotel data using the current hotels state
      const roomsWithHotels = roomsData.map(room => {
        const hotel = hotels.find(hotel => hotel.id === room.hotel_id);
        return {
          ...room,
          hotel,
          hotel_name: hotel?.hotel_name || 'Unknown Hotel'
        };
      });

      setRooms(roomsWithHotels);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpen = (room?: Room) => {
    if (room) {
      setSelectedRoom(room);
      setFormData({
        hotel_id: room.hotel_id,
        room_number: room.room_number,
        room_price: room?.room_price?.toString(),
        room_type: room.room_type || '',
      });
    } else {
      setSelectedRoom(null);
      setFormData({
        hotel_id: '',
        room_number: '',
        room_price: '',
        room_type: '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedRoom(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const roomData = {
        ...formData,
        room_price: Number(formData.room_price),
        room_type: formData.room_type,
      };

      if (selectedRoom) {
        await updateDoc(doc(db, 'rooms', selectedRoom.id), roomData);
      } else {
        await addDoc(collection(db, 'rooms'), roomData);
      }
      handleClose();
      await fetchRooms();
    } catch (error) {
      console.error('Error saving room:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this room?')) {
      setActionLoading(true);
      try {
        await deleteDoc(doc(db, 'rooms', id));
        await fetchRooms();
      } catch (error) {
        console.error('Error deleting room:', error);
      } finally {
        setActionLoading(false);
      }
    }
  };

  const columns: GridColDef[] = [
    { 
      field: 'hotel_name', 
      headerName: 'Hotel', 
      flex: 1,
      valueGetter: (params) => params.row.hotel?.hotel_name || 'Unknown Hotel'
    },
    { field: 'room_number', headerName: 'Room Number', flex: 1 },
    { 
      field: 'room_type',
      headerName: 'Room Type',
      flex: 1,
      valueGetter: (params) => {
        const type = roomTypes.find(rt => rt.uid === params.row.room_type);
        return type ? type.title : 'N/A';
      }
    },
    { 
      field: 'room_price',
      headerName: 'Price', 
      flex: 1,
      valueFormatter: (params) => {
        const value = params.value;
        return value ? `$${Number(value).toFixed(2)}` : '$0.00';
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1,
      renderCell: (params) => (
        <Box>
          <Button
            variant="contained"
            sx={{
                background : "#758533",
                mr : 1
              }}
            size="small"
            onClick={() => handleOpen(params.row)}
          
            disabled={actionLoading}
          >
            Edit
          </Button>
          <Button
            variant="contained"
            color="error"
            size="small"
            onClick={() => handleDelete(params.row.id)}
            disabled={actionLoading}
          >
            Delete
          </Button>
        </Box>
      ),
    },
  ];

  if (loading) {
    return <Loading />;
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Rooms
        </Typography>
        <Button 
          variant="contained" 
          sx={{
                background : "#758533"
              }}
          onClick={() => handleOpen()}
          disabled={actionLoading}
        >
          Add Room
        </Button>
      </Box>

      <Box sx={{ height: 400, width: '100%', position: 'relative' }}>
        {actionLoading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              zIndex: 1,
            }}
          >
            <CircularProgress />
          </Box>
        )}
        <DataGrid
          rows={rooms}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 5, page: 0 },
            },
          }}
          pageSizeOptions={[5]}
          checkboxSelection
          disableRowSelectionOnClick
        />
      </Box>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{selectedRoom ? 'Edit Room' : 'Add Room'}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <FormControl fullWidth margin="dense">
              <InputLabel>Hotel</InputLabel>
              <Select
                value={formData.hotel_id}
                label="Hotel"
                onChange={(e) => setFormData({ ...formData, hotel_id: e.target.value })}
                required
                disabled={actionLoading}
              >
                {hotels.map((hotel) => (
                  <MenuItem key={hotel.id} value={hotel.id}>
                    {hotel.hotel_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              margin="dense"
              label="Room Number"
              fullWidth
              value={formData.room_number}
              onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
              required
              disabled={actionLoading}
            />
            <FormControl fullWidth margin="dense">
              <InputLabel>Room Type</InputLabel>
              <Select
                value={formData.room_type}
                label="Room Type"
                onChange={(e) => setFormData({ ...formData, room_type: e.target.value })}
                required
                disabled={actionLoading}
              >
                {roomTypes.map((type) => (
                  <MenuItem key={type.uid} value={type.uid}>
                    {type.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              margin="dense"
              label="Price"
              type="number"
              fullWidth
              value={formData.room_price}
              onChange={(e) => setFormData({ ...formData, room_price: e.target.value })}
              required
              disabled={actionLoading}
              InputProps={{
                startAdornment: '$',
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button  sx={{
                color : "#758533"
              }} onClick={handleClose} disabled={actionLoading}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained" 
              sx={{
                background : "#758533"
              }}
              disabled={actionLoading}
            >
              {actionLoading ? <CircularProgress size={24} /> : (selectedRoom ? 'Update' : 'Add')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default AdminRooms;