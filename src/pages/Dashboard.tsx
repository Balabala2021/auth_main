import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CardHeader,
} from '@mui/material';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Loading from '@/components/Loading';
import { db } from '@/lib/firebase';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalBookings: 0,
    activeBookings: 0,
    totalHotels: 0,
    totalStaff: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get total bookings
        const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
        const totalBookings = bookingsSnapshot.size;

        // Get active bookings
        const activeBookingsSnapshot = await getDocs(
          query(collection(db, 'bookings'), where('status', '==', 'active'))
        );
        const activeBookings = activeBookingsSnapshot.size;

        // Get total hotels
        const hotelsSnapshot = await getDocs(collection(db, 'hotels'));
        const totalHotels = hotelsSnapshot.size;

        // Get total staff
        const staffSnapshot = await getDocs(
          query(collection(db, 'users'))
        );
        const totalStaff = staffSnapshot.size;

        setStats({
          totalBookings,
          activeBookings,
          totalHotels,
          totalStaff,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const StatCard: React.FC<{ title: string; value: number }> = ({ title, value }) => (
    <Card>
      <CardHeader title={title} />
      <CardContent>
        <Typography variant="h4" component="div">
          {value}
        </Typography>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <Loading />;
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>

      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(4, 1fr)'
        },
        gap: 3
      }}>
        <StatCard title="Total Bookings" value={stats.totalBookings} />
        <StatCard title="Active Bookings" value={stats.activeBookings} />
        <StatCard title="Total Hotels" value={stats.totalHotels} />
        <StatCard title="Total Users" value={stats.totalStaff} />
      </Box>
    </Box>
  );
};

export default AdminDashboard; 