import React, { useState, useEffect } from 'react';
import Layout from '../Layout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, FileText, Download, TrendingUp } from 'lucide-react';

interface ReportData {
  orders: Array<{
    id: number;
    nama_pelanggan: string;
    berat_gabah_kg: number;
    jumlah_karung: number;
    dibuat_pada: string;
    nama_operator: string;
    kode_mesin: string;
  }>;
  summary: {
    totalOrders: number;
    totalWeight: number;
    totalKarung: number;
  };
}

interface Operator {
  id: number;
  nama_lengkap: string;
}

const Reports: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [filters, setFilters] = useState({
    type: 'harian',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    operator_id: ''
  });

  useEffect(() => {
    fetchOperators();
    generateReport();
  }, []);

  const fetchOperators = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/operators', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setOperators(data);
      }
    } catch (error) {
      console.error('Error fetching operators:', error);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        type: filters.type,
        start_date: filters.start_date,
        end_date: filters.end_date,
        ...(filters.operator_id && { operator_id: filters.operator_id })
      });

      const response = await fetch(`http://localhost:5000/api/reports?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const exportToCSV = () => {
    if (!reportData || reportData.orders.length === 0) {
      return;
    }

    const headers = ['ID', 'Tanggal', 'Pelanggan', 'Berat (kg)', 'Karung', 'Operator', 'Mesin'];
    const csvContent = [
      headers.join(','),
      ...reportData.orders.map(order => [
        order.id,
        new Date(order.dibuat_pada).toLocaleDateString('id-ID'),
        `"${order.nama_pelanggan}"`,
        order.berat_gabah_kg,
        order.jumlah_karung,
        `"${order.nama_operator}"`,
        order.kode_mesin
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `laporan-order-${filters.start_date}-${filters.end_date}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Prepare chart data
  const chartData = reportData ? [
    {
      name: 'Total',
      orders: reportData.summary.totalOrders,
      weight: reportData.summary.totalWeight,
      karung: reportData.summary.totalKarung
    }
  ] : [];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Laporan</h1>
          <p className="text-gray-600">Analisis data operasional pabrik</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Calendar className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Filter Laporan</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipe Laporan
              </label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
              >
                <option value="harian">Harian</option>
                <option value="mingguan">Mingguan</option>
                <option value="bulanan">Bulanan</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tanggal Mulai
              </label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tanggal Akhir
              </label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Operator (Opsional)
              </label>
              <select
                value={filters.operator_id}
                onChange={(e) => handleFilterChange('operator_id', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
              >
                <option value="">Semua Operator</option>
                {operators.map((operator) => (
                  <option key={operator.id} value={operator.id}>
                    {operator.nama_lengkap}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              onClick={generateReport}
              disabled={loading}
              className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              <TrendingUp className="w-4 h-4" />
              <span>{loading ? 'Memproses...' : 'Tampilkan'}</span>
            </button>
            
            {reportData && reportData.orders.length > 0 && (
              <button
                onClick={exportToCSV}
                className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Ekspor CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        {reportData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Order</p>
                  <p className="text-3xl font-bold text-gray-900">{reportData.summary.totalOrders}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Berat (kg)</p>
                  <p className="text-3xl font-bold text-gray-900">{reportData.summary.totalWeight.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Karung</p>
                  <p className="text-3xl font-bold text-gray-900">{reportData.summary.totalKarung.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <FileText className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chart */}
        {reportData && reportData.orders.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Grafik Ringkasan</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="orders" fill="#22c55e" name="Jumlah Order" />
                <Bar dataKey="weight" fill="#3b82f6" name="Total Berat (kg)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Detailed Report Table */}
        {reportData && (
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Detail Order</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pelanggan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Berat (kg)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Karung</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operator</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mesin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reportData.orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        Tidak ada data untuk periode yang dipilih
                      </td>
                    </tr>
                  ) : (
                    reportData.orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          #{order.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(order.dibuat_pada).toLocaleDateString('id-ID')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{order.nama_pelanggan}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {order.berat_gabah_kg.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {order.jumlah_karung}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {order.nama_operator}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {order.kode_mesin}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Reports;