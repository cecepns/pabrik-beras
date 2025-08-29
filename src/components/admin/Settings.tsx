import React, { useState, useEffect } from 'react';
import Layout from '../Layout';
import toast from 'react-hot-toast';
import { DollarSign, Fuel, Save } from 'lucide-react';

interface Settings {
  harga_per_kg: number;
  konsumsi_bbm_per_kg: number;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    harga_per_kg: 0,
    konsumsi_bbm_per_kg: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, nilai: number) => {
    setSaving(key);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/settings/${key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nilai })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setSaving(null);
    }
  };

  const handleSubmit = (key: string) => (e: React.FormEvent) => {
    e.preventDefault();
    updateSetting(key, settings[key as keyof Settings]);
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

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pengaturan Sistem</h1>
          <p className="text-gray-600">Kelola parameter global sistem</p>
        </div>

        {/* Settings Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Harga per kg */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Harga Jasa Giling</h2>
                <p className="text-sm text-gray-600">Biaya per kilogram gabah</p>
              </div>
            </div>

            <form onSubmit={handleSubmit('harga_per_kg')}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Harga per Kg (Rupiah)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">Rp</span>
                    <input
                      type="number"
                      value={settings.harga_per_kg}
                      onChange={(e) => setSettings(prev => ({ ...prev, harga_per_kg: parseFloat(e.target.value) || 0 }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                      placeholder="0"
                      min="0"
                      step="50"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving === 'harga_per_kg'}
                  className="w-full flex items-center justify-center space-x-2 bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving === 'harga_per_kg' ? 'Menyimpan...' : 'Simpan Harga'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Konsumsi BBM */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Fuel className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Konsumsi BBM</h2>
                <p className="text-sm text-gray-600">Liter per kilogram gabah</p>
              </div>
            </div>

            <form onSubmit={handleSubmit('konsumsi_bbm_per_kg')}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    BBM per Kg (Liter)
                  </label>
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">L</span>
                    <input
                      type="number"
                      value={settings.konsumsi_bbm_per_kg}
                      onChange={(e) => setSettings(prev => ({ ...prev, konsumsi_bbm_per_kg: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-4 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="0.1"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving === 'konsumsi_bbm_per_kg'}
                  className="w-full flex items-center justify-center space-x-2 bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving === 'konsumsi_bbm_per_kg' ? 'Menyimpan...' : 'Simpan BBM'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-medium text-blue-900 mb-2">Informasi Penting</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Perubahan pengaturan akan langsung berlaku untuk order baru</li>
            <li>• Order yang sudah ada tidak akan terpengaruh oleh perubahan ini</li>
            <li>• Pastikan nilai yang dimasukkan sudah tepat sebelum menyimpan</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;