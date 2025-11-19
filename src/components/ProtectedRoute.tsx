import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  const { currentUser } = useAuth();

  if (!currentUser) return <Navigate to="/admin/login" replace />;
  if (currentUser.role !== 'admin') return <Navigate to="/" replace />;
  return <Outlet />;
};

export default ProtectedRoute;