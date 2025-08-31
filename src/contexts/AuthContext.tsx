import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import toast from 'react-hot-toast';
import { getApiUrl, API_CONFIG } from '../config/api';

interface User {
  id: number;
  nama_pengguna: string;
  nama_lengkap: string;
  peran: 'admin' | 'operator';
  id_mesin_ditugaskan?: number;
  kode_mesin?: string;
}

interface AuthContextType {
  user: User | null;
  login: (nama_pengguna: string, kata_sandi: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.ME), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        // Token invalid, clear storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      }
    } catch {
      console.error('Error fetching user');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (nama_pengguna: string, kata_sandi: string): Promise<boolean> => {
    try {
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.LOGIN), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nama_pengguna, kata_sandi }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        // Fetch user details after successful login
        await fetchUser();
        toast.success('Login berhasil');
        return true;
      } else {
        toast.error(data.message || 'Login gagal');
        return false;
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    toast.success('Logout berhasil');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};