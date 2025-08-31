import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import { LocationProvider, useLocation } from './contexts/LocationContext';
import Login from './components/Login';
import AdminDashboard from './components/admin/AdminDashboard';
import OperatorDashboard from './components/operator/OperatorDashboard';
import CreateOrder from './components/operator/CreateOrder';
import OrderDetail from './components/OrderDetail';
import ChangePassword from './components/ChangePassword';
import ManageOrders from './components/admin/ManageOrders';
import ManageUsers from './components/admin/ManageUsers';
import ManageMachines from './components/admin/ManageMachines';
import Settings from './components/admin/Settings';
import Reports from './components/admin/Reports';

function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.peran !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}

function LocationProtectedRoute({ 
  children, 
  requireAdmin = false, 
  requireLocation = true 
}: { 
  children: React.ReactNode; 
  requireAdmin?: boolean; 
  requireLocation?: boolean;
}) {
  const { user } = useAuth();
  const { setLocation, hasLocation } = useLocation();

  // Jika tidak memerlukan lokasi, gunakan ProtectedRoute biasa
  if (!requireLocation) {
    return <ProtectedRoute requireAdmin={requireAdmin}>{children}</ProtectedRoute>;
  }

  // Jika memerlukan lokasi tapi belum ada lokasi, coba dapatkan di background
  React.useEffect(() => {
    if (requireLocation && !hasLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Lokasi berhasil diperoleh di background:', position.coords);
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
            address: '' // Alamat akan diisi oleh LocationStatus component
          });
        },
        (error) => {
          console.log('Lokasi ditolak atau gagal diperoleh di background:', error.message);
          // Tidak perlu menampilkan error, user bisa request manual melalui LocationStatus
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    }
  }, [requireLocation, hasLocation, setLocation]);

  // Selalu render children, tidak peduli status lokasi
  return <ProtectedRoute requireAdmin={requireAdmin}>{children}</ProtectedRoute>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route 
        path="/login" 
        element={user ? <Navigate to="/" replace /> : <Login />} 
      />
      
      <Route path="/" element={
        <LocationProtectedRoute requireLocation={user?.peran === 'operator'}>
          {user?.peran === 'admin' ? <AdminDashboard /> : <OperatorDashboard />}
        </LocationProtectedRoute>
      } />

      {/* Operator Routes */}
      <Route path="/create-order" element={
        <LocationProtectedRoute requireLocation={true}>
          <CreateOrder />
        </LocationProtectedRoute>
      } />
      
      <Route path="/orders/:id" element={
        <LocationProtectedRoute requireLocation={false}>
          <OrderDetail />
        </LocationProtectedRoute>
      } />

      <Route path="/change-password" element={
        <LocationProtectedRoute requireLocation={false}>
          <ChangePassword />
        </LocationProtectedRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin/orders" element={
        <LocationProtectedRoute requireAdmin requireLocation={false}>
          <ManageOrders />
        </LocationProtectedRoute>
      } />

      <Route path="/admin/orders/:id" element={
        <LocationProtectedRoute requireAdmin requireLocation={false}>
          <OrderDetail isAdmin={true} />
        </LocationProtectedRoute>
      } />

      <Route path="/admin/users" element={
        <LocationProtectedRoute requireAdmin requireLocation={false}>
          <ManageUsers />
        </LocationProtectedRoute>
      } />

      <Route path="/admin/machines" element={
        <LocationProtectedRoute requireAdmin requireLocation={false}>
          <ManageMachines />
        </LocationProtectedRoute>
      } />

      <Route path="/admin/settings" element={
        <LocationProtectedRoute requireAdmin requireLocation={false}>
          <Settings />
        </LocationProtectedRoute>
      } />

      <Route path="/admin/reports" element={
        <LocationProtectedRoute requireAdmin requireLocation={false}>
          <Reports />
        </LocationProtectedRoute>
      } />

      {/* Catch all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <AppRoutes />
            <Toaster position="top-right" />
          </div>
        </Router>
      </LocationProvider>
    </AuthProvider>
  );
}

export default App;