import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Layout from './Layout';
import { Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react';

const ChangePassword: React.FC = () => {
  const navigate = useNavigate();
  const [passwords, setPasswords] = useState({
    kata_sandi_lama: '',
    kata_sandi_baru: '',
    konfirmasi_kata_sandi: ''
  });
  const [loading, setLoading] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwords.kata_sandi_baru !== passwords.konfirmasi_kata_sandi) {
      toast.error('Konfirmasi kata sandi tidak cocok');
      return;
    }

    if (passwords.kata_sandi_baru.length < 6) {
      toast.error('Kata sandi baru minimal 6 karakter');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          kata_sandi_lama: passwords.kata_sandi_lama,
          kata_sandi_baru: passwords.kata_sandi_baru
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
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

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
          <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
            <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Ubah Kata Sandi</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kata Sandi Lama
              </label>
              <div className="relative">
                <input
                  type={showOldPassword ? "text" : "password"}
                  value={passwords.kata_sandi_lama}
                  onChange={(e) => setPasswords(prev => ({ ...prev, kata_sandi_lama: e.target.value }))}
                  className="w-full pr-10 sm:pr-12 px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-sm sm:text-base"
                  placeholder="Masukkan kata sandi lama"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showOldPassword ? (
                    <EyeOff className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kata Sandi Baru
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={passwords.kata_sandi_baru}
                  onChange={(e) => setPasswords(prev => ({ ...prev, kata_sandi_baru: e.target.value }))}
                  className="w-full pr-10 sm:pr-12 px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-sm sm:text-base"
                  placeholder="Masukkan kata sandi baru"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Konfirmasi Kata Sandi Baru
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwords.konfirmasi_kata_sandi}
                  onChange={(e) => setPasswords(prev => ({ ...prev, konfirmasi_kata_sandi: e.target.value }))}
                  className="w-full pr-10 sm:pr-12 px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-sm sm:text-base"
                  placeholder="Konfirmasi kata sandi baru"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {loading ? 'Memproses...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default ChangePassword;