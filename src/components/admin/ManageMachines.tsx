import React, { useState, useEffect } from 'react';
import Layout from '../Layout';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, X, Cog } from 'lucide-react';

interface Machine {
  id: number;
  kode_mesin: string;
  dibuat_pada: string;
}

const ManageMachines: React.FC = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [pagination, setPagination] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [formData, setFormData] = useState({
    kode_mesin: ''
  });

  useEffect(() => {
    fetchMachines();
  }, [currentPage]);

  const fetchMachines = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/machines?page=${currentPage}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMachines(data.machines);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching machines:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (machine?: Machine) => {
    if (machine) {
      setEditingMachine(machine);
      setFormData({
        kode_mesin: machine.kode_mesin
      });
    } else {
      setEditingMachine(null);
      setFormData({
        kode_mesin: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingMachine(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      const url = editingMachine 
        ? `http://localhost:5000/api/machines/${editingMachine.id}`
        : 'http://localhost:5000/api/machines';
      
      const method = editingMachine ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        closeModal();
        fetchMachines();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi');
    }
  };

  const handleDelete = async (machineId: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus mesin ini?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/machines/${machineId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        fetchMachines();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi');
    }
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Manajemen Mesin</h1>
            <p className="text-sm sm:text-base text-gray-600">Kelola data master mesin giling</p>
          </div>
          
          <button
            onClick={() => openModal()}
            className="inline-flex items-center space-x-2 bg-green-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm sm:text-base"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Mesin</span>
          </button>
        </div>

        {/* Machines Table - Desktop */}
        <div className="hidden lg:block bg-white rounded-xl shadow-sm border">
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
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kode Mesin</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dibuat</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {machines.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 sm:px-6 py-8 text-center text-gray-500">
                          Belum ada mesin
                        </td>
                      </tr>
                    ) : (
                      machines.map((machine) => (
                        <tr key={machine.id} className="hover:bg-gray-50">
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            #{machine.id}
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <Cog className="w-5 h-5 text-green-500" />
                              <span className="font-medium text-gray-900 text-sm sm:text-base">{machine.kode_mesin}</span>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {new Date(machine.dibuat_pada).toLocaleDateString('id-ID')}
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm space-x-2">
                            <button
                              onClick={() => openModal(machine)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(machine.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Machines Cards - Mobile/Tablet */}
        <div className="lg:hidden space-y-3">
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
              </div>
            </div>
          ) : machines.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border p-6 text-center text-gray-500">
              Belum ada mesin
            </div>
          ) : (
            machines.map((machine) => (
              <div key={machine.id} className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">#{machine.id}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Cog className="w-4 h-4 text-green-500" />
                      <h3 className="font-medium text-gray-900 text-sm sm:text-base">{machine.kode_mesin}</h3>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openModal(machine)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(machine.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="text-sm">
                  <p className="text-gray-500 text-xs">Dibuat</p>
                  <p className="font-medium text-gray-900">{new Date(machine.dibuat_pada).toLocaleDateString('id-ID')}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
              <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                Menampilkan {((pagination.currentPage - 1) * 10) + 1}-{Math.min(pagination.currentPage * 10, pagination.totalItems)} dari {pagination.totalItems} data
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  disabled={!pagination.hasPrev}
                  className="px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Sebelumnya
                </button>
                <button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={!pagination.hasNext}
                  className="px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="flex justify-between items-center p-4 sm:p-6 border-b">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                  {editingMachine ? 'Edit Mesin' : 'Tambah Mesin'}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kode Mesin *
                  </label>
                  <input
                    type="text"
                    value={formData.kode_mesin}
                    onChange={(e) => setFormData(prev => ({ ...prev, kode_mesin: e.target.value }))}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-sm sm:text-base"
                    placeholder="Contoh: MG-001"
                    required
                  />
                </div>

                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-3 sm:px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm sm:text-base"
                  >
                    {editingMachine ? 'Update' : 'Simpan'}
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

export default ManageMachines;