import React, { useState, useEffect } from 'react';
import Layout from '../Layout';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, RotateCcw, X, Eye, EyeOff } from 'lucide-react';

interface User {
  id: number;
  nama_pengguna: string;
  nama_lengkap: string;
  peran: 'admin' | 'operator';
  id_mesin_ditugaskan?: number;
  kode_mesin?: string;
  dibuat_pada: string;
}

interface Machine {
  id: number;
  kode_mesin: string;
}

const ManageUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [pagination, setPagination] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    nama_pengguna: '',
    nama_lengkap: '',
    kata_sandi: '',
    peran: 'operator' as 'admin' | 'operator',
    id_mesin_ditugaskan: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchMachines();
  }, [currentPage]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/users?page=${currentPage}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMachines = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/machines/all', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMachines(data);
      }
    } catch (error) {
      console.error('Error fetching machines:', error);
    }
  };

  const openModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        nama_pengguna: user.nama_pengguna,
        nama_lengkap: user.nama_lengkap,
        kata_sandi: '',
        peran: user.peran,
        id_mesin_ditugaskan: user.id_mesin_ditugaskan?.toString() || ''
      });
    } else {
      setEditingUser(null);
      setFormData({
        nama_pengguna: '',
        nama_lengkap: '',
        kata_sandi: '',
        peran: 'operator',
        id_mesin_ditugaskan: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      const url = editingUser 
        ? `http://localhost:5000/api/users/${editingUser.id}`
        : 'http://localhost:5000/api/users';
      
      const method = editingUser ? 'PUT' : 'POST';

      const submitData: any = {
        nama_pengguna: formData.nama_pengguna,
        nama_lengkap: formData.nama_lengkap,
        peran: formData.peran,
        id_mesin_ditugaskan: formData.id_mesin_ditugaskan ? parseInt(formData.id_mesin_ditugaskan) : null
      };

      // Only include password for new users
      if (!editingUser) {
        submitData.kata_sandi = formData.kata_sandi;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        closeModal();
        fetchUsers();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Terjadi kesalahan koneksi');
    }
  };

  const handleDelete = async (userId: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        fetchUsers();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Terjadi kesalahan koneksi');
    }
  };

  const handleResetPassword = async (userId: number) => {
    if (!confirm('Apakah Anda yakin ingin mereset kata sandi pengguna ini?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Kata sandi direset! Kata sandi baru: ${data.newPassword}`);
        // Show password for a longer time
        setTimeout(() => {
          alert(`Kata sandi baru untuk pengguna: ${data.newPassword}\n\nHarap dicatat dengan baik!`);
        }, 500);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Terjadi kesalahan koneksi');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manajemen Operator</h1>
            <p className="text-gray-600">Kelola akun operator dan assignment mesin</p>
          </div>
          
          <button
            onClick={() => openModal()}
            className="inline-flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Operator</span>
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Lengkap</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Peran</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mesin</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dibuat</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{user.nama_pengguna}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {user.nama_lengkap}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                            user.peran === 'admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.peran}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {user.kode_mesin || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(user.dibuat_pada).toLocaleDateString('id-ID')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          <button
                            onClick={() => openModal(user)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleResetPassword(user.id)}
                            className="text-yellow-600 hover:text-yellow-800"
                            title="Reset Password"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Menampilkan {((pagination.currentPage - 1) * 10) + 1}-{Math.min(pagination.currentPage * 10, pagination.totalItems)} dari {pagination.totalItems} data
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => prev - 1)}
                      disabled={!pagination.hasPrev}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Sebelumnya
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      disabled={!pagination.hasNext}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Selanjutnya
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingUser ? 'Edit Operator' : 'Tambah Operator'}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={formData.nama_pengguna}
                    onChange={(e) => setFormData(prev => ({ ...prev, nama_pengguna: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    value={formData.nama_lengkap}
                    onChange={(e) => setFormData(prev => ({ ...prev, nama_lengkap: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    required
                  />
                </div>

                {!editingUser && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kata Sandi *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formData.kata_sandi}
                        onChange={(e) => setFormData(prev => ({ ...prev, kata_sandi: e.target.value }))}
                        className="w-full pr-10 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-500" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Peran *
                  </label>
                  <select
                    value={formData.peran}
                    onChange={(e) => setFormData(prev => ({ ...prev, peran: e.target.value as 'admin' | 'operator' }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    required
                  >
                    <option value="operator">Operator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {formData.peran === 'operator' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mesin yang Ditugaskan
                    </label>
                    <select
                      value={formData.id_mesin_ditugaskan}
                      onChange={(e) => setFormData(prev => ({ ...prev, id_mesin_ditugaskan: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    >
                      <option value="">Pilih Mesin</option>
                      {machines.map((machine) => (
                        <option key={machine.id} value={machine.id}>
                          {machine.kode_mesin}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    {editingUser ? 'Update' : 'Simpan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ManageUsers;