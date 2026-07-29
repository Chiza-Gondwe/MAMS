import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import RegisterChurch from './pages/RegisterChurch';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import DashboardLayout from './components/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import ScanPage from './pages/ScanPage';

import HoldingTank from './pages/HoldingTank';
import ChangePassword from './pages/ChangePassword';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register-church" element={<RegisterChurch />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/scan/:sessionId" element={<ScanPage />} />
          
          {/* Protected Routes */}
          <Route path="/holding-tank" element={
            <ProtectedRoute>
              <HoldingTank />
            </ProtectedRoute>
          } />
          
          <Route path="/change-password" element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          } />

          <Route path="/dashboard/*" element={
            <ProtectedRoute>
              <ErrorBoundary>
                <DashboardLayout />
              </ErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;