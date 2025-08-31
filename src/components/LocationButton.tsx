import React, { useState } from 'react';
import { MapPin, Loader2, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface LocationButtonProps {
  onLocationGranted?: (position: GeolocationPosition) => void;
  onLocationDenied?: () => void;
  className?: string;
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

const LocationButton: React.FC<LocationButtonProps> = ({
  onLocationGranted,
  onLocationDenied,
  className = '',
  children,
  variant = 'primary',
  size = 'md',
  disabled = false
}) => {
  const [status, setStatus] = useState<'idle' | 'requesting' | 'success' | 'error'>('idle');

  const getButtonClasses = () => {
    const baseClasses = 'inline-flex items-center justify-center space-x-2 font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    };

    const variantClasses = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
      secondary: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500',
      outline: 'border border-gray-300 hover:bg-gray-50 text-gray-700 focus:ring-gray-500'
    };

    const disabledClasses = disabled || status === 'requesting' ? 'opacity-50 cursor-not-allowed' : '';

    return `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${disabledClasses} ${className}`;
  };

  const getIcon = () => {
    switch (status) {
      case 'requesting':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  const getButtonText = () => {
    switch (status) {
      case 'requesting':
        return 'Mendapatkan Lokasi...';
      case 'success':
        return 'Lokasi Berhasil';
      case 'error':
        return 'Gagal Mendapatkan Lokasi';
      default:
        return children || 'Dapatkan Lokasi';
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolokasi tidak didukung di browser ini');
      setStatus('error');
      onLocationDenied?.();
      return;
    }

    setStatus('requesting');

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStatus('success');
        onLocationGranted?.(position);
        toast.success('Lokasi berhasil diperoleh!');
        
        // Reset status after 2 seconds
        setTimeout(() => {
          setStatus('idle');
        }, 2000);
      },
      (error) => {
        let message = '';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Akses lokasi ditolak. Silakan izinkan akses lokasi di pengaturan browser.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Informasi lokasi tidak tersedia.';
            break;
          case error.TIMEOUT:
            message = 'Waktu permintaan lokasi habis. Silakan coba lagi.';
            break;
          default:
            message = 'Terjadi kesalahan saat mendapatkan lokasi.';
            break;
        }
        
        setStatus('error');
        onLocationDenied?.();
        toast.error(message);
        
        // Reset status after 3 seconds
        setTimeout(() => {
          setStatus('idle');
        }, 3000);
      },
      options
    );
  };

  return (
    <button
      type="button"
      onClick={requestLocation}
      disabled={disabled || status === 'requesting'}
      className={getButtonClasses()}
    >
      {getIcon()}
      <span>{getButtonText()}</span>
    </button>
  );
};

export default LocationButton;
