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
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Loading from '@/components/Loading';
import { fetchAllSiteTypes, SiteType } from '@/lib/siteService';

interface Site {
  id: string;
  hotel_id: string;
  site_number: string;
  site_type: string;
  site_price: number;
}

interface Hotel {
  id: string;
  hotel_name: string;
}

const AdminSites: React.FC = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [siteTypes, setSiteTypes] = useState<SiteType[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [formData, setFormData] = useState<{
    hotel_id: string;
    site_number: string;
    site_type: string;
    site_price: number;
  }>({
    hotel_id: '',
    site_number: '',
    site_type: '',
    site_price: 0,
  });

  const fetchHotels = async () => {
    const hotelsSnapshot = await getDocs(collection(db, 'hotels'));
    const hotelsData = hotelsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        hotel_name: data.hotel_name || '',
      };
    }) as Hotel[];
    setHotels(hotelsData);
  };

  const fetchSites = async () => {
    const sitesSnapshot = await getDocs(collection(db, 'sites'));
    const sitesData = sitesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        hotel_id: data.hotel_id || '',
        site_number: data.site_number || '',
        site_price: typeof data.site_price === 'number' ? data.site_price : 0,
      };
    }) as Site[];
    setSites(sitesData);
    setLoading(false);
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      await fetchHotels();
      await fetchSites();
      const types = await fetchAllSiteTypes();
      setSiteTypes(types);
    };
    fetchInitialData();
  }, []);

  const handleOpen = (site?: Site) => {
    if (site) {
      setSelectedSite(site);
      setFormData({
        hotel_id: site.hotel_id,
        site_number: site.site_number,
        site_type: site.site_type,
        site_price: site.site_price,
      });
    } else {
      setSelectedSite(null);
      setFormData({
        hotel_id: '',
        site_number: '',
        site_type: '',
        site_price: 0,
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedSite(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (selectedSite) {
        await updateDoc(doc(db, 'sites', selectedSite.id), {
          ...formData,
        });
      } else {
        await addDoc(collection(db, 'sites'), {
          ...formData,
        });
      }
      handleClose();
      await fetchSites();
    } catch (error) {
      console.error('Error saving site:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this site?')) {
      setActionLoading(true);
      try {
        await deleteDoc(doc(db, 'sites', id));
        await fetchSites();
      } catch (error) {
        console.error('Error deleting site:', error);
      } finally {
        setActionLoading(false);
      }
    }
  };

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
    { field: 'site_number', headerName: 'Site Number', flex: 1 },
    {
      field: 'site_price',
      headerName: 'Site Price',
      flex: 1,
      valueGetter: (params) => {
        const value = params.row.site_price;
        return Number.isFinite(value) ? `$${Number(value).toFixed(2)}` : '-';
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
          Sites
        </Typography>
        <Button
          variant="contained"
           sx={{
                background : "#758533"
              }}
          onClick={() => handleOpen()}
          disabled={actionLoading}
        >
          Add Site
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
          rows={sites}
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

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedSite ? 'Edit Site' : 'Add Site'}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <FormControl fullWidth margin="dense">
              <InputLabel>Hotel</InputLabel>
              <Select
                value={formData.hotel_id}
                onChange={(e) => setFormData({ ...formData, hotel_id: e.target.value })}
                label="Hotel"
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
              label="Site Number"
              fullWidth
              value={formData.site_number}
              onChange={(e) => setFormData({ ...formData, site_number: e.target.value })}
              required
              disabled={actionLoading}
            />
            <FormControl fullWidth margin="dense">
              <InputLabel>Site Type</InputLabel>
              <Select
                value={formData.site_type}
                label="Site Type"
                onChange={(e) => setFormData({ ...formData, site_type: e.target.value })}
                required
                disabled={actionLoading}
              >
                {siteTypes?.map((type) => (
                  <MenuItem key={type.uid} value={type.uid}>
                    {type.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              margin="dense"
              label="Site Price"
              type="number"
              fullWidth
              value={formData.site_price}
              onChange={(e) => setFormData({ ...formData, site_price: Number(e.target.value) })}
              required
              disabled={actionLoading}
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
              {actionLoading ? <CircularProgress size={24} /> : (selectedSite ? 'Update' : 'Add')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default AdminSites; 