import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import AdminDashboard from './components/admin/AdminDashboard';
import OperatorDashboard from './components/operator/OperatorDashboard';
import CreateOrder from './components/operator/CreateOrder';
import OrderDetail from './components/operator/OrderDetail';
import ChangePassword from './components/ChangePassword';
import ManageOrders from './components/admin/ManageOrders';
import ManageUsers from './components/admin/ManageUsers';
import ManageMachines from './components/admin/ManageMachines';
import Settings from './components/admin/Settings';
import Reports from './components/admin/Reports';

function ProtectedRoute({ children, requireAdmin = false }) {
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

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route 
        path="/login" 
        element={user ? <Navigate to="/" replace /> : <Login />} 
      />
      
      <Route path="/" element={
        <ProtectedRoute>
          {user?.peran === 'admin' ? <AdminDashboard /> : <OperatorDashboard />}
        </ProtectedRoute>
      } />

      {/* Operator Routes */}
      <Route path="/create-order" element={
        <ProtectedRoute>
          <CreateOrder />
        </ProtectedRoute>
      } />
      
      <Route path="/orders/:id" element={
        <ProtectedRoute>
          <OrderDetail />
        </ProtectedRoute>
      } />

      <Route path="/change-password" element={
        <ProtectedRoute>
          <ChangePassword />
        </ProtectedRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin/orders" element={
        <ProtectedRoute requireAdmin>
          <ManageOrders />
        </ProtectedRoute>
      } />

      <Route path="/admin/users" element={
        <ProtectedRoute requireAdmin>
          <ManageUsers />
        </ProtectedRoute>
      } />

      <Route path="/admin/machines" element={
        <ProtectedRoute requireAdmin>
          <ManageMachines />
        </ProtectedRoute>
      } />

      <Route path="/admin/settings" element={
        <ProtectedRoute requireAdmin>
          <Settings />
        </ProtectedRoute>
      } />

      <Route path="/admin/reports" element={
        <ProtectedRoute requireAdmin>
          <Reports />
        </ProtectedRoute>
      } />

      {/* Catch all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <AppRoutes />
          <Toaster position="top-right" />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;