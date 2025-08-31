import React, { useEffect, useState, useRef } from 'react';
import { MapPin, AlertCircle } from 'lucide-react';
import { useLocation } from '../contexts/LocationContext';
import { useAuth } from '../contexts/AuthContext';
import { useLocation as useRouterLocation } from 'react-router-dom';

const LocationEnforcer: React.FC = () => {
  const { hasLocation, setLocation } = useLocation();
  const { user } = useAuth();
  const routerLocation = useRouterLocation();
  const [locationError, setLocationError] = useState<string | null>(null);
  const requestTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Browser tidak mendukung geolokasi');
      return;
    }

    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationError(null);
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
      },
      (error) => {        
        let errorMessage = 'Gagal mendapatkan lokasi';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Akses lokasi ditolak';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Lokasi tidak tersedia';
            break;
          case error.TIMEOUT:
            errorMessage = 'Waktu habis';
            break;
          default:
            errorMessage = 'Terjadi kesalahan';
        }
        
        setLocationError(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Request location setiap kali halaman berubah atau komponen mount
  useEffect(() => {
    if (user?.peran === 'operator' && navigator.geolocation) {
      // Clear previous timeout if exists
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
      }
      
      // Delay sedikit untuk memastikan halaman sudah fully loaded
      requestTimeoutRef.current = setTimeout(() => {
        requestLocation();
      }, 200);
      
      return () => {
        if (requestTimeoutRef.current) {
          clearTimeout(requestTimeoutRef.current);
        }
      };
    }
  }, [user?.peran, routerLocation.pathname]); // Trigger setiap kali pathname berubah

  // Show modal if location is not available and user is operator
  if (!hasLocation && user?.peran === 'operator') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
          <div className="flex items-center justify-center mb-4">
            <MapPin className="w-10 h-10 text-blue-500" />
          </div>
          
          <h2 className="text-lg font-semibold text-center mb-2">
            Lokasi Diperlukan
          </h2>
          
          <p className="text-gray-600 text-center mb-4 text-sm">
            Aplikasi memerlukan akses lokasi untuk berfungsi.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="text-blue-700 text-sm space-y-1">
              <p>• Klik ikon kunci di address bar browser</p>
              <p>• Pilih "Allow" untuk mengizinkan lokasi</p>
              <p>• Refresh halaman setelah mengizinkan</p>
            </div>
          </div>

          {locationError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                <span className="text-red-700 text-sm">{locationError}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default LocationEnforcer;
