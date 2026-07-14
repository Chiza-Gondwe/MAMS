// components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="flex items-center justify-center h-screen text-slate-400">Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  const currentPath = window.location.pathname;

  if (user.status === 'pending_review' && currentPath !== '/holding-tank') {
    return <Navigate to="/holding-tank" />;
  }

  if (user.is_temporary_password && currentPath !== '/change-password' && currentPath !== '/holding-tank') {
    return <Navigate to="/change-password" />;
  }

  return children;
}