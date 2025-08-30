import React, { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Settings, Wheat, FileText, Users, Cog } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const adminMenuItems = [
    { path: '/', icon: Cog, label: 'Dashboard' },
    { path: '/admin/orders', icon: FileText, label: 'Manajemen Order' },
    { path: '/admin/users', icon: Users, label: 'Operator' },
    { path: '/admin/machines', icon: Cog, label: 'Mesin' },
    { path: '/admin/reports', icon: FileText, label: 'Laporan' },
    { path: '/admin/settings', icon: Settings, label: 'Pengaturan' },
  ];

  const operatorMenuItems = [
    { path: '/', icon: FileText, label: 'Order Saya' },
    { path: '/create-order', icon: FileText, label: 'Buat Order' },
  ];

  const menuItems = user?.peran === 'admin' ? adminMenuItems : operatorMenuItems;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Wheat className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Pabrik Beras</h1>
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Sistem Manajemen Order</p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Link
                to="/change-password"
                className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Ubah Password"
              >
                <User className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
              
              <button
                onClick={logout}
                className="p-1.5 sm:p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Sub Header - User Info */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-2 sm:py-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 truncate max-w-32 lg:max-w-48">{user?.nama_lengkap}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.peran}</p>
              </div>
            </div>
            {user?.kode_mesin && (
              <div className="flex items-center space-x-1 px-2 py-1 bg-green-50 rounded-md">
                <Cog className="w-3 h-3 text-green-600" />
                <span className="text-sm text-green-700 font-medium">Mesin: {user.kode_mesin}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4 sm:space-x-6 lg:space-x-8 overflow-x-auto scrollbar-hide">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-3 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap min-w-fit ${
                    isActive 
                      ? 'text-green-600 border-green-500' 
                      : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;