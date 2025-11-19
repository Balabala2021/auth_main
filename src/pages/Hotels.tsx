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
  InputLabel,
  FormControl,
  OutlinedInput,
  Checkbox,
  ListItemText,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import Loading from '@/components/Loading';
import { db } from '@/lib/firebase';

interface Hotel {
  id: string;
  hotel_name: string;
  address: string;
  users?: string[];
}

interface User {
  uid: string;
  id: string;
  name: string;
  email: string;
}

const AdminHotels: React.FC = () => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [formData, setFormData] = useState({
    hotel_name: '',
    address: '',
    users: [] as string[],
  });

  useEffect(() => {
    fetchHotels();
    fetchUsers();
  }, []);

  const fetchHotels = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'hotels'));
      const hotelsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setHotels(hotelsData as Hotel[]);
    } catch (error) {
      console.error('Error fetching hotels:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsersList(usersData as User[]);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleOpen = (hotel?: Hotel) => {
    if (hotel) {
      setSelectedHotel(hotel);
      setFormData({
        hotel_name: hotel.hotel_name,
        address: hotel.address,
        users: hotel.users || [],
      });
    } else {
      setSelectedHotel(null);
      setFormData({
        hotel_name: '',
        address: '',
        users: [],
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedHotel(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (selectedHotel) {
        await updateDoc(doc(db, 'hotels', selectedHotel.id), formData);
      } else {
        await addDoc(collection(db, 'hotels'), formData);
      }
      handleClose();
      await fetchHotels();
    } catch (error) {
      console.error('Error saving hotel:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this hotel?')) {
      setActionLoading(true);
      try {
        await deleteDoc(doc(db, 'hotels', id));
        await fetchHotels();
      } catch (error) {
        console.error('Error deleting hotel:', error);
      } finally {
        setActionLoading(false);
      }
    }
  };

  const columns: GridColDef[] = [
    { field: 'hotel_name', headerName: 'Hotel Name', flex: 1 },
    { field: 'address', headerName: 'Address', flex: 1 },
    {
      field: 'users',
      headerName: 'Assigned Users',
      flex: 1,
      valueGetter: (params) => {
        const assigned = params.row.users || [];
        const names = usersList
          .filter((u) => assigned.includes(u.uid))
          .map((u) => u.name || u.email);
        return names.join(', ');
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
            size="small"
            onClick={() => handleOpen(params.row)}
            sx={{ mr: 1,background : "#758533" }}
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

  console.log('usersList:', usersList);
  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Hotels
        </Typography>
        <Button
          variant="contained"
          sx={{
            background : "#758533"
          }}
          onClick={() => handleOpen()}
          disabled={actionLoading}
        >
          Add Hotel
        </Button>
      </Box>

      <Box sx={{ height: 500, width: '100%', position: 'relative' }}>
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
          rows={hotels}
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
        <DialogTitle>{selectedHotel ? 'Edit Hotel' : 'Add Hotel'}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Hotel Name"
              fullWidth
              value={formData.hotel_name}
              onChange={(e) =>
                setFormData({ ...formData, hotel_name: e.target.value })
              }
              required
              disabled={actionLoading}
            />
            <TextField
              margin="dense"
              label="Address"
              fullWidth
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              required
              disabled={actionLoading}
            />
            <FormControl fullWidth margin="dense">
              <InputLabel id="users-select-label">Assign Users</InputLabel>
              <Select
                labelId="users-select-label"
                multiple
                value={formData.users}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    users: e.target.value as string[],
                  })
                }
                input={<OutlinedInput label="Assign Users" />}
                renderValue={(selected) =>
                  usersList
                    .filter((u) => selected.includes(u.uid))
                    .map((u) => u.name || u.email)
                    .join(', ')
                }
                disabled={actionLoading}
              >
                {usersList.map((user) => (
                  <MenuItem key={user.id} value={user.uid}>
                    <Checkbox checked={formData.users.includes(user.uid)} />
                    <ListItemText primary={user.name || user.email} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button  sx={{
                color : "#758533"
              }} onClick={handleClose} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                background : "#758533"
              }}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <CircularProgress size={24} />
              ) : selectedHotel ? (
                'Update'
              ) : (
                'Add'
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default AdminHotels;
