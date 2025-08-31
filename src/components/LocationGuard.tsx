import React, { useState, useEffect } from 'react';
import { MapPin, AlertCircle, CheckCircle, XCircle, RefreshCw, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

interface LocationGuardProps {
  children: React.ReactNode;
  onLocationGranted?: (position: GeolocationPosition) => void;
  onLocationDenied?: () => void;
  title?: string;
  description?: string;
  allowSkip?: boolean;
  skipText?: string;
}

const LocationGuard: React.FC<LocationGuardProps> = ({
  children,
  onLocationGranted,
  onLocationDenied,
  title = 'Akses Lokasi Diperlukan',
  description = 'Untuk memberikan layanan terbaik, kami memerlukan akses ke lokasi Anda. Lokasi akan digunakan untuk perhitungan estimasi dan pengiriman yang akurat.',
  allowSkip = false,
  skipText = 'Lanjutkan Tanpa Lokasi'
}) => {
  const [permissionStatus, setPermissionStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied' | 'error'>('idle');
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSkipped, setIsSkipped] = useState(false);

  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = () => {
    if (!navigator.geolocation) {
      setPermissionStatus('error');
      setErrorMessage('Geolokasi tidak didukung di browser ini');
      return;
    }

    // Cek status permission yang sudah ada
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          setPermissionStatus('granted');
          getCurrentPosition();
        } else if (result.state === 'denied') {
          setPermissionStatus('denied');
          setErrorMessage('Akses lokasi ditolak. Silakan izinkan akses lokasi di pengaturan browser.');
        } else {
          setPermissionStatus('idle');
        }
      });
    } else {
      // Fallback untuk browser yang tidak mendukung permissions API
      setPermissionStatus('idle');
    }
  };

  const getCurrentPosition = () => {
    setPermissionStatus('requesting');
    
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition(pos);
        setPermissionStatus('granted');
        onLocationGranted?.(pos);
        toast.success('Lokasi berhasil diperoleh!');
      },
      (error) => {
        let message = '';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Akses lokasi ditolak. Silakan izinkan akses lokasi untuk melanjutkan.';
            setPermissionStatus('denied');
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Informasi lokasi tidak tersedia.';
            setPermissionStatus('error');
            break;
          case error.TIMEOUT:
            message = 'Waktu permintaan lokasi habis. Silakan coba lagi.';
            setPermissionStatus('error');
            break;
          default:
            message = 'Terjadi kesalahan saat mendapatkan lokasi.';
            setPermissionStatus('error');
            break;
        }
        setErrorMessage(message);
        onLocationDenied?.();
        toast.error(message);
      },
      options
    );
  };

  const handleRetry = () => {
    setErrorMessage('');
    setPermissionStatus('idle');
    setTimeout(() => {
      getCurrentPosition();
    }, 500);
  };



  const handleSkip = () => {
    setIsSkipped(true);
    onLocationDenied?.();
    toast.info('Anda melanjutkan tanpa lokasi. Beberapa fitur mungkin tidak optimal.');
  };

  // Jika permission sudah diberikan atau di-skip, tampilkan children
  if (permissionStatus === 'granted' || isSkipped) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6 sm:p-8">
        <div className="text-center">
          {/* Header Icon */}
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
            {permissionStatus === 'requesting' ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            ) : permissionStatus === 'granted' ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : permissionStatus === 'denied' || permissionStatus === 'error' ? (
              <XCircle className="w-8 h-8 text-red-600" />
            ) : (
              <Shield className="w-8 h-8 text-blue-600" />
            )}
          </div>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
            {permissionStatus === 'requesting' && 'Mendapatkan Lokasi...'}
            {permissionStatus === 'granted' && 'Lokasi Berhasil Diperoleh!'}
            {permissionStatus === 'denied' && 'Akses Lokasi Diperlukan'}
            {permissionStatus === 'error' && 'Gagal Mendapatkan Lokasi'}
            {permissionStatus === 'idle' && title}
          </h2>

          {/* Description */}
          <p className="text-gray-600 mb-6 leading-relaxed">
            {permissionStatus === 'requesting' && 'Sedang mendapatkan lokasi Anda, mohon tunggu...'}
            {permissionStatus === 'granted' && 'Lokasi Anda berhasil diperoleh dan dapat digunakan untuk layanan kami.'}
            {permissionStatus === 'denied' && 'Aplikasi memerlukan akses lokasi untuk memberikan layanan yang optimal. Silakan izinkan akses lokasi di pengaturan browser.'}
            {permissionStatus === 'error' && errorMessage}
            {permissionStatus === 'idle' && description}
          </p>

          {/* Error Message */}
          {errorMessage && (permissionStatus === 'denied' || permissionStatus === 'error') && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-medium text-red-800">Pesan Error</p>
                  <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {permissionStatus === 'idle' && (
              <button
                onClick={getCurrentPosition}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <MapPin className="w-5 h-5" />
                <span>Izinkan Akses Lokasi</span>
              </button>
            )}

                         {(permissionStatus === 'denied' || permissionStatus === 'error') && (
               <button
                 onClick={handleRetry}
                 className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
               >
                 <RefreshCw className="w-5 h-5" />
                 <span>Coba Lagi</span>
               </button>
             )}

            {permissionStatus === 'requesting' && (
              <div className="w-full bg-blue-50 text-blue-700 font-medium py-3 px-4 rounded-lg">
                Mohon tunggu...
              </div>
            )}

            {/* Skip Button */}
            {allowSkip && permissionStatus !== 'requesting' && (
              <button
                onClick={handleSkip}
                className="w-full bg-red-100 hover:bg-red-200 text-red-700 font-medium py-3 px-4 rounded-lg transition-colors duration-200"
              >
                {skipText}
              </button>
            )}
          </div>

          {/* Additional Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <MapPin className="w-4 h-4" />
              <span>Lokasi Anda aman dan hanya digunakan untuk layanan ini</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationGuard;
