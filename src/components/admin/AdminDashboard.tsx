import React, { useState, useEffect } from 'react';
import Layout from '../Layout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  TrendingUp, 
  Package, 
  Scale, 
  Clock,
  Users,
  FileText
} from 'lucide-react';

interface DashboardStats {
  todayOrders: number;
  todayWeight: number;
  monthOrders: number;
  monthWeight: number;
  recentOrders: Array<{
    id: number;
    nama_pelanggan: string;
    berat_gabah_kg: number;
    dibuat_pada: string;
    nama_operator: string;
    kode_mesin: string;
  }>;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      </Layout>
    );
  }

  const chartData = [
    { name: 'Hari Ini', orders: stats?.todayOrders || 0, weight: stats?.todayWeight || 0 },
    { name: 'Bulan Ini', orders: stats?.monthOrders || 0, weight: stats?.monthWeight || 0 },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Admin</h1>
          <p className="text-gray-600">Ringkasan operasional pabrik beras</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Order Hari Ini</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.todayOrders || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Berat Hari Ini (kg)</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.todayWeight?.toLocaleString() || 0}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Scale className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Order Bulan Ini</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.monthOrders || 0}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Berat Bulan Ini (kg)</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.monthWeight?.toLocaleString() || 0}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Scale className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Statistik Order</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="orders" fill="#22c55e" name="Jumlah Order" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Order Terbaru</h2>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pelanggan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Berat (kg)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operator</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mesin</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats?.recentOrders?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      Belum ada order hari ini
                    </td>
                  </tr>
                ) : (
                  stats?.recentOrders?.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{order.nama_pelanggan}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {order.berat_gabah_kg.toLocaleString()} kg
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {order.nama_operator}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {order.kode_mesin}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {new Date(order.dibuat_pada).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;