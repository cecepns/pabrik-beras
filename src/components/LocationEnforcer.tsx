import React, { useEffect, useState } from 'react';
import { MapPin, AlertCircle, RefreshCw } from 'lucide-react';
import { useLocation } from '../contexts/LocationContext';

const LocationEnforcer: React.FC = () => {
  const { location, hasLocation, setLocation } = useLocation();
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Browser Anda tidak mendukung geolokasi');
      return;
    }

    setIsRequesting(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsRequesting(false);
        setLocationError(null);
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
          address: ''
        });
      },
      (error) => {
        setIsRequesting(false);
        let errorMessage = 'Gagal mendapatkan lokasi';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Akses lokasi ditolak. Silakan aktifkan lokasi di browser Anda.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Informasi lokasi tidak tersedia.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Waktu permintaan lokasi habis.';
            break;
          default:
            errorMessage = 'Terjadi kesalahan saat mendapatkan lokasi.';
        }
        
        setLocationError(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000
      }
    );
  };

  // Auto-request location when component mounts if not available
  useEffect(() => {
    if (!hasLocation && navigator.geolocation) {
      requestLocation();
    }
  }, [hasLocation]);

  // Show modal if location is not available
  if (!hasLocation) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
          <div className="flex items-center justify-center mb-4">
            <MapPin className="w-12 h-12 text-blue-500" />
          </div>
          
          <h2 className="text-xl font-semibold text-center mb-4">
            Lokasi Diperlukan
          </h2>
          
          <p className="text-gray-600 text-center mb-6">
            Aplikasi ini memerlukan akses lokasi untuk berfungsi dengan baik. 
            Silakan aktifkan izin lokasi di browser Anda.
          </p>

          {locationError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-red-700 text-sm">{locationError}</span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={requestLocation}
              disabled={isRequesting}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
            >
              {isRequesting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Mengambil Lokasi...
                </>
              ) : (
                'Aktifkan Lokasi'
              )}
            </button>
            
            <div className="text-xs text-gray-500 text-center space-y-1">
              <p>• Pastikan browser mengizinkan akses lokasi</p>
              <p>• Jika menggunakan Chrome, klik ikon kunci di address bar</p>
              <p>• Pilih "Allow" untuk mengizinkan lokasi</p>
              <p>• Refresh halaman setelah mengizinkan lokasi</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default LocationEnforcer;
