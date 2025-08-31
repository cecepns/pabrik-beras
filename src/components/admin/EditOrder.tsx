import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../Layout';
import { ArrowLeft, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiUrl, API_CONFIG } from '../../config/api';

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
  dibuat_pada: string;
  nama_operator: string;
  kode_mesin: string;
  estimasi_harga: number;
  estimasi_konsumsi_bbm: number;
  photos?: Photo[];
}

const EditOrder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  
  const [formData, setFormData] = useState({
    nama_pelanggan: '',
    kontak_pelanggan: '',
    nama_karnet: '',
    jumlah_karung: '',
    berat_gabah_kg: '',
    lokasi_pengolahan: '',
    catatan: '',
    alamat_pengambilan: ''
  });

  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [photosToDelete, setPhotosToDelete] = useState<number[]>([]);

  useEffect(() => {
    if (id) {
      fetchOrderDetail();
    }
  }, [id]);

  const fetchOrderDetail = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.ORDER_DETAIL(id!)), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOrder(data);
                 setFormData({
           nama_pelanggan: data.nama_pelanggan || '',
           kontak_pelanggan: data.kontak_pelanggan || '',
           nama_karnet: data.nama_karnet || '',
           jumlah_karung: data.jumlah_karung?.toString() || '',
           berat_gabah_kg: data.berat_gabah_kg?.toString() || '',
           lokasi_pengolahan: data.lokasi_pengolahan || '',
           catatan: data.catatan || '',
           alamat_pengambilan: data.alamat_pengambilan || ''
         });
      } else {
        toast.error('Order tidak ditemukan');
        navigate('/admin/orders');
      }
    } catch {
      toast.error('Terjadi kesalahan saat memuat data');
      navigate('/admin/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setNewPhotos(prev => [...prev, ...files]);
    }
  };

  const removeNewPhoto = (index: number) => {
    setNewPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const togglePhotoDelete = (photoId: number) => {
    setPhotosToDelete(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const submitData = new FormData();
    
    // Add form data
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== null && value !== '') {
        submitData.append(key, value as string);
      }
    });

    // Add new photos
    newPhotos.forEach((file: File) => {
      submitData.append('new_photos', file);
    });

    // Add photos to delete
    if (photosToDelete.length > 0) {
      submitData.append('photos_to_delete', JSON.stringify(photosToDelete));
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.ORDER_DETAIL(id!)), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: submitData
      });

      if (response.ok) {
        toast.success('Order berhasil diperbarui');
        navigate('/admin/orders');
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Gagal memperbarui order');
      }
    } catch {
      toast.error('Terjadi kesalahan saat memperbarui order');
    } finally {
      setSubmitting(false);
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
            onClick={() => navigate('/admin/orders')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Manajemen Order</span>
          </button>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Edit Order #{order.id}</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Edit informasi order dan bukti foto</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Customer Information */}
            <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Informasi Pelanggan</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Pelanggan *
                  </label>
                  <input
                    type="text"
                    name="nama_pelanggan"
                    value={formData.nama_pelanggan}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kontak Pelanggan
                  </label>
                  <input
                    type="text"
                    name="kontak_pelanggan"
                    value={formData.kontak_pelanggan}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  />
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  />
                </div>
                
              </div>
            </div>

            {/* Order Details */}
            <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Detail Order</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jumlah Karung *
                  </label>
                  <input
                    type="number"
                    name="jumlah_karung"
                    value={formData.jumlah_karung}
                    onChange={handleInputChange}
                    required
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Berat Gabah (kg) *
                  </label>
                  <input
                    type="number"
                    name="berat_gabah_kg"
                    value={formData.berat_gabah_kg}
                    onChange={handleInputChange}
                    required
                    min="0.1"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lokasi Pengolahan
                  </label>
                  <input
                    type="text"
                    name="lokasi_pengolahan"
                    value={formData.lokasi_pengolahan}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alamat Pengambilan
                  </label>
                  <textarea
                    name="alamat_pengambilan"
                    value={formData.alamat_pengambilan}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Catatan
                  </label>
                  <textarea
                    name="catatan"
                    value={formData.catatan}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Existing Photos */}
            {order.photos && order.photos.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Bukti Foto Saat Ini</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {order.photos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={`${API_CONFIG.BASE_URL}${photo.url_bukti_foto}`}
                        alt={`Bukti foto ${photo.id}`}
                        className={`w-full h-32 sm:h-40 object-cover rounded-lg shadow-sm border transition-all ${
                          photosToDelete.includes(photo.id) ? 'opacity-50' : ''
                        }`}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Foto+Tidak+Tersedia';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => togglePhotoDelete(photo.id)}
                        className={`absolute top-2 right-2 p-1 rounded-full transition-colors ${
                          photosToDelete.includes(photo.id)
                            ? 'bg-red-500 text-white'
                            : 'bg-white text-gray-600 hover:bg-red-500 hover:text-white'
                        }`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                      {photosToDelete.includes(photo.id) && (
                        <div className="absolute inset-0 bg-red-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                          <span className="text-red-600 font-medium text-sm">Akan dihapus</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Photos */}
            <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Tambah Foto Baru</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Foto Bukti
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  />
                </div>
                
                {newPhotos.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Foto yang akan ditambahkan:</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {newPhotos.map((file, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${file.name}`}
                            className="w-full h-32 sm:h-40 object-cover rounded-lg shadow-sm border"
                          />
                          <button
                            type="button"
                            onClick={() => removeNewPhoto(index)}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 rounded-b-lg">
                            <p className="text-xs truncate">{file.name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/admin/orders')}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default EditOrder;
