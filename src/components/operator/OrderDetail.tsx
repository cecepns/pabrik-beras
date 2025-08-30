import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../Layout';
import { ArrowLeft, User, Phone, FileText, Package, Scale, MapPin, Camera, Calendar, Cog } from 'lucide-react';
import toast from 'react-hot-toast';

interface Photo {
  id: number;
  id_pesanan: number;
  url_bukti_foto: string;
  nama_file: string;
  ukuran_file: number;
  tipe_file: string;
  dibuat_pada: string;
}

interface OrderDetail {
  id: number;
  nama_pelanggan: string;
  kontak_pelanggan?: string;
  nama_karnet?: string;
  jumlah_karung: number;
  berat_gabah_kg: number;
  lokasi_pengolahan: string;
  catatan?: string;
  alamat_pengambilan: string;
  status: string;
  dibuat_pada: string;
  nama_operator: string;
  kode_mesin: string;
  estimasi_harga: number;
  estimasi_konsumsi_bbm: number;
  photos: Photo[];
}

const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchOrderDetail();
    }
  }, [id]);

  const fetchOrderDetail = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/orders/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOrder(data);
      } else {
        toast.error('Order tidak ditemukan');
        navigate('/');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat memuat data');
      navigate('/');
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

  if (!order) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p className="text-gray-500">Order tidak ditemukan</p>
        </div>
      </Layout>
    );
  }

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

        <div className="space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Detail Order #{order.id}</h1>
                <p className="text-sm sm:text-base text-gray-600 truncate">{order.nama_pelanggan}</p>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
                <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs sm:text-sm font-medium">
                  {order.status}
                </span>
                <div className="text-right text-xs sm:text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>{new Date(order.dibuat_pada).toLocaleDateString('id-ID')}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(order.dibuat_pada).toLocaleTimeString('id-ID')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Informasi Pelanggan</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-start space-x-2 sm:space-x-3">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600">Nama Pemilik</p>
                    <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{order.nama_pelanggan}</p>
                  </div>
                </div>

                {order.kontak_pelanggan && (
                  <div className="flex items-start space-x-2 sm:space-x-3">
                    <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-gray-600">Kontak</p>
                      <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{order.kontak_pelanggan}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 sm:space-y-4">
                {order.nama_karnet && (
                  <div className="flex items-start space-x-2 sm:space-x-3">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-gray-600">Nama Karnet</p>
                      <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{order.nama_karnet}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start space-x-2 sm:space-x-3">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600">Alamat Pengambilan</p>
                    <p className="font-medium text-gray-900 text-sm sm:text-base">{order.alamat_pengambilan}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Information */}
          <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Informasi Order</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              <div className="text-center bg-gray-50 p-3 sm:p-4 rounded-lg">
                <Package className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 mx-auto mb-2" />
                <p className="text-xs sm:text-sm text-gray-600">Jumlah Karung</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{order.jumlah_karung}</p>
              </div>

              <div className="text-center bg-gray-50 p-3 sm:p-4 rounded-lg">
                <Scale className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 mx-auto mb-2" />
                <p className="text-xs sm:text-sm text-gray-600">Total Berat</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{order.berat_gabah_kg.toLocaleString()} kg</p>
              </div>

              <div className="text-center bg-gray-50 p-3 sm:p-4 rounded-lg sm:col-span-2 lg:col-span-1">
                <Cog className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500 mx-auto mb-2" />
                <p className="text-xs sm:text-sm text-gray-600">Tempat Pengolahan</p>
                <p className="text-base sm:text-lg font-medium text-gray-900">{order.lokasi_pengolahan}</p>
              </div>
            </div>

            {order.catatan && (
              <div className="mt-4 sm:mt-6">
                <p className="text-xs sm:text-sm text-gray-600 mb-2">Catatan</p>
                <p className="text-sm sm:text-base text-gray-900 bg-gray-50 p-3 rounded-lg">{order.catatan}</p>
              </div>
            )}
          </div>

          {/* Calculations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-green-800 mb-3 sm:mb-4">Estimasi Harga Jasa</h3>
              <p className="text-2xl sm:text-3xl font-bold text-green-900">
                Rp {order.estimasi_harga.toLocaleString('id-ID')}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-blue-800 mb-3 sm:mb-4">Estimasi Konsumsi BBM</h3>
              <p className="text-2xl sm:text-3xl font-bold text-blue-900">
                {order.estimasi_konsumsi_bbm.toFixed(2)} Liter
              </p>
            </div>
          </div>

          {/* System Information */}
          <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Informasi Sistem</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Operator</p>
                <p className="font-medium text-gray-900 text-sm sm:text-base">{order.nama_operator}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Kode Mesin</p>
                <p className="font-medium text-gray-900 text-sm sm:text-base">{order.kode_mesin}</p>
              </div>
            </div>
          </div>

          {/* Photo Evidence */}
          <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
            <div className="flex items-center space-x-2 mb-3 sm:mb-4">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Bukti Foto ({order.photos?.length || 0})</h2>
            </div>
            {order.photos && order.photos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {order.photos.map((photo, index) => (
                  <div key={photo.id} className="relative group">
                    <img
                      src={`http://localhost:5000${photo.url_bukti_foto}`}
                      alt={`Bukti foto ${index + 1}`}
                      className="w-full h-32 sm:h-40 lg:h-48 object-cover rounded-lg shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Foto+Tidak+Tersedia';
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-xs truncate">{photo.nama_file}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8">
                <Camera className="w-8 h-8 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm sm:text-base text-gray-500">Tidak ada foto bukti</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default OrderDetail;