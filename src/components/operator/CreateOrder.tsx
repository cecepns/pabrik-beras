import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import Layout from '../Layout';
import LocationStatus from '../LocationStatus';
import toast from 'react-hot-toast';
import { ArrowLeft, Upload, MapPin, Calculator, Fuel } from 'lucide-react';
import { getApiUrl, API_CONFIG } from '../../config/api';

const CreateOrder: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const { location, hasLocation } = useLocation();
  const [settings, setSettings] = useState({ harga_per_kg: 0, konsumsi_bbm_per_kg: 0 });
  
  const [formData, setFormData] = useState({
    nama_pelanggan: '',
    kontak_pelanggan: '',
    nama_karnet: '',
    jumlah_karung: '',
    berat_gabah_kg: '',
    bukti_foto: [] as File[],
    lokasi_pengolahan: '',
    catatan: '',
    alamat_pengambilan: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);



  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.SETTINGS), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        console.error('Failed to fetch settings:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  // Update alamat pengambilan ketika lokasi tersedia
  useEffect(() => {
    if (location && location.latitude !== null && location.longitude !== null) {
      const lat = location.latitude;
      const lng = location.longitude;
      setFormData(prev => ({
        ...prev,
        alamat_pengambilan: `Koordinat: ${lng.toFixed(6)}, ${lat.toFixed(6)}`
      }));
    }
  }, [location]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setFormData(prev => ({
        ...prev,
        bukti_foto: files
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const submitData = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'bukti_foto') {
        // Handle multiple files
        if (Array.isArray(value) && value.length > 0) {
          value.forEach((file: File) => {
            submitData.append('bukti_foto', file);
          });
        }
      } else if (value !== null && value !== '') {
        submitData.append(key, value as string);
      }
    });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.ORDERS), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: submitData
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Order berhasil dibuat');
        navigate('/');
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setLoading(false);
    }
  };

  // Kalkulasi estimasi harga dan konsumsi BBM
  const estimasiHarga = useMemo(() => {
    const berat = parseFloat(formData.berat_gabah_kg) || 0;
    const hargaPerKg = settings.harga_per_kg || 0;
    const result = berat * hargaPerKg;
    return result;
  }, [formData.berat_gabah_kg, settings.harga_per_kg]);

  const estimasiKonsumsi = useMemo(() => {
    const berat = parseFloat(formData.berat_gabah_kg) || 0;
    const konsumsiPerKg = settings.konsumsi_bbm_per_kg || 0;
    const result = berat * konsumsiPerKg;
    return result;
  }, [formData.berat_gabah_kg, settings.konsumsi_bbm_per_kg]);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard</span>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Buat Order Baru</h1>

          {/* Location Status */}
          <LocationStatus />

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Customer Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Pemilik Gabah/Padi *
                </label>
                <input
                  type="text"
                  name="nama_pelanggan"
                  value={formData.nama_pelanggan}
                  onChange={handleInputChange}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-sm sm:text-base"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kontak Pemilik
                </label>
                <input
                  type="text"
                  name="kontak_pelanggan"
                  value={formData.kontak_pelanggan}
                  onChange={handleInputChange}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-sm sm:text-base"
                  placeholder="Nomor telepon (opsional)"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Karnet
              </label>
              <input
                type="text"
                name="nama_karnet"
                value={formData.nama_karnet}
                onChange={handleInputChange}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-sm sm:text-base"
                placeholder="Nama karnet (opsional)"
              />
            </div>

            {/* Gabah Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jumlah Karung *
                </label>
                <input
                  type="number"
                  name="jumlah_karung"
                  value={formData.jumlah_karung}
                  onChange={handleInputChange}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-sm sm:text-base"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Berat Gabah (kg) *
                </label>
                <input
                  type="number"
                  name="berat_gabah_kg"
                  value={formData.berat_gabah_kg}
                  onChange={handleInputChange}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-sm sm:text-base"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>
            </div>

            {/* Calculations */}
            {formData.berat_gabah_kg && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calculator className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    <span className="font-medium text-green-800 text-sm sm:text-base">Estimasi Harga Jasa</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-green-900">
                    Rp {estimasiHarga.toLocaleString('id-ID')}
                  </p>
                  <p className="text-xs text-green-600">
                    {formData.berat_gabah_kg} kg × Rp {settings.harga_per_kg.toLocaleString('id-ID')}/kg
                  </p>
                </div>

                <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Fuel className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    <span className="font-medium text-blue-800 text-sm sm:text-base">Estimasi Konsumsi BBM</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-blue-900">
                    {estimasiKonsumsi.toFixed(2)} L
                  </p>
                  <p className="text-xs text-blue-600">
                    {formData.berat_gabah_kg} kg × {settings.konsumsi_bbm_per_kg} L/kg
                  </p>
                </div>
              </div>
            )}

            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bukti Foto *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-green-400 transition-colors">
                <Upload className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
                <div className="mt-3 sm:mt-4">
                  <label htmlFor="bukti_foto" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Upload foto bukti gabah
                    </span>
                    <span className="mt-1 block text-xs sm:text-sm text-gray-600">
                      PNG, JPG, JPEG hingga 5MB (maksimal 10 foto)
                    </span>
                  </label>
                  <input
                    id="bukti_foto"
                    name="bukti_foto"
                    type="file"
                    className="sr-only"
                    accept="image/jpeg,image/jpg,image/png"
                    multiple
                    onChange={handleFileChange}
                    required
                  />
                </div>
                {formData.bukti_foto.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-green-600 font-medium">
                      {formData.bukti_foto.length} file terpilih:
                    </p>
                    <ul className="mt-1 text-xs sm:text-sm text-gray-600">
                      {formData.bukti_foto.map((file, index) => (
                        <li key={index} className="truncate">• {file.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tempat Pengolahan *
              </label>
              <input
                type="text"
                name="lokasi_pengolahan"
                value={formData.lokasi_pengolahan}
                onChange={handleInputChange}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-sm sm:text-base"
                placeholder="Masukkan tempat pengolahan"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catatan
              </label>
              <textarea
                name="catatan"
                value={formData.catatan}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-sm sm:text-base"
                placeholder="Catatan tambahan (opsional)"
              />
            </div>

            {/* Auto-filled Information */}
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg space-y-3">
              <h3 className="font-medium text-gray-900 text-sm sm:text-base">Informasi Otomatis</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm text-gray-600">Operator</label>
                  <p className="text-sm font-medium text-gray-900">{user?.nama_lengkap}</p>
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm text-gray-600">Kode Mesin</label>
                  <p className="text-sm font-medium text-gray-900">{user?.kode_mesin || 'Tidak ada mesin'}</p>
                </div>
              </div>

              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                  <label className="text-xs sm:text-sm text-gray-600">Alamat Pengambilan (GPS)</label>
                  {hasLocation && <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full"></div>}
                </div>
                <p className="text-xs sm:text-sm text-gray-900 bg-white p-2 rounded border">
                  {formData.alamat_pengambilan || 'Lokasi belum diperoleh'}
                </p>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4 sm:pt-6">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full sm:flex-1 px-4 py-2.5 sm:py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading || !user?.kode_mesin}
                className="w-full sm:flex-1 px-4 py-2.5 sm:py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {loading ? 'Menyimpan...' : 'Simpan Order'}
              </button>
            </div>

            {!user?.kode_mesin && (
              <div className="p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs sm:text-sm text-yellow-800">
                  ⚠️ Anda belum ditugaskan ke mesin manapun. Hubungi admin untuk assignment mesin.
                </p>
              </div>
            )}
          </form>
        </div>
      </div>


    </Layout>
  );
};

export default CreateOrder;