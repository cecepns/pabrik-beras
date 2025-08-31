import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LocationProvider, useLocation as useLocationContext } from './contexts/LocationContext';
import LocationEnforcer from './components/LocationEnforcer';
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
  requireLocation = true,
  forceLocationUpdate = true // Default true untuk selalu update lokasi
}: { 
  children: React.ReactNode; 
  requireAdmin?: boolean; 
  requireLocation?: boolean;
  forceLocationUpdate?: boolean;
}) {
  const { setLocation, hasLocation } = useLocationContext();
  const location = useLocation(); // React Router location

  // Jika tidak memerlukan lokasi, gunakan ProtectedRoute biasa
  if (!requireLocation) {
    return <ProtectedRoute requireAdmin={requireAdmin}>{children}</ProtectedRoute>;
  }

  // Jika memerlukan lokasi, selalu coba dapatkan lokasi baru setiap route change
  React.useEffect(() => {
    if (requireLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          });
        },
        () => {
          // Silent fail for background location request
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0 // Tidak ada cache, selalu request lokasi baru
        }
      );
    }
  }, [requireLocation, setLocation, location.pathname]); // Selalu trigger ketika route berubah

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
            <LocationEnforcer />
            <Toaster position="top-right" />
          </div>
        </Router>
      </LocationProvider>
    </AuthProvider>
  );
}

export default App;