import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  timestamp: number | null;
  error: string | null;
  isLoading: boolean;
  permissionStatus: 'idle' | 'requesting' | 'granted' | 'denied' | 'error';
}

interface UseLocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  required?: boolean;
  autoRequest?: boolean;
}

const useLocation = (options: UseLocationOptions = {}) => {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 60000,
    autoRequest = false
  } = options;

  const [locationState, setLocationState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    timestamp: null,
    error: null,
    isLoading: false,
    permissionStatus: 'idle'
  });

  const checkPermission = useCallback(async (): Promise<boolean> => {
    if (!navigator.geolocation) {
      setLocationState(prev => ({
        ...prev,
        error: 'Geolokasi tidak didukung di browser ini',
        permissionStatus: 'error'
      }));
      return false;
    }

    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        
        if (result.state === 'granted') {
          setLocationState(prev => ({ ...prev, permissionStatus: 'granted' }));
          return true;
        } else if (result.state === 'denied') {
          setLocationState(prev => ({
            ...prev,
            error: 'Akses lokasi ditolak. Silakan izinkan akses lokasi di pengaturan browser.',
            permissionStatus: 'denied'
          }));
          return false;
        } else {
          setLocationState(prev => ({ ...prev, permissionStatus: 'idle' }));
          return false;
        }
      } catch {
        // Fallback untuk browser yang tidak mendukung permissions API
        setLocationState(prev => ({ ...prev, permissionStatus: 'idle' }));
        return false;
      }
    } else {
      // Fallback untuk browser yang tidak mendukung permissions API
      setLocationState(prev => ({ ...prev, permissionStatus: 'idle' }));
      return false;
    }
  }, []);

  const getCurrentPosition = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = new Error('Geolokasi tidak didukung di browser ini');
        reject(error);
        return;
      }

      setLocationState(prev => ({
        ...prev,
        isLoading: true,
        permissionStatus: 'requesting',
        error: null
      }));

      const geolocationOptions = {
        enableHighAccuracy,
        timeout,
        maximumAge
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationState({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
            error: null,
            isLoading: false,
            permissionStatus: 'granted'
          });
          resolve(position);
        },
        (error) => {
          let errorMessage = '';
          let permissionStatus: 'denied' | 'error' = 'error';

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Akses lokasi ditolak. Silakan izinkan akses lokasi untuk melanjutkan.';
              permissionStatus = 'denied';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Informasi lokasi tidak tersedia.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Waktu permintaan lokasi habis. Silakan coba lagi.';
              break;
            default:
              errorMessage = 'Terjadi kesalahan saat mendapatkan lokasi.';
              break;
          }

          setLocationState(prev => ({
            ...prev,
            error: errorMessage,
            isLoading: false,
            permissionStatus
          }));

          reject(error);
        },
        geolocationOptions
      );
    });
  }, [enableHighAccuracy, timeout, maximumAge]);

  const requestLocation = useCallback(async () => {
    try {
      const hasPermission = await checkPermission();
      
      if (hasPermission) {
        const position = await getCurrentPosition();
        toast.success('Lokasi berhasil diperoleh!');
        return position;
      } else {
        const position = await getCurrentPosition();
        toast.success('Lokasi berhasil diperoleh!');
        return position;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan saat mendapatkan lokasi';
      toast.error(errorMessage);
      throw error;
    }
  }, [checkPermission, getCurrentPosition]);

  const clearLocation = useCallback(() => {
    setLocationState({
      latitude: null,
      longitude: null,
      accuracy: null,
      timestamp: null,
      error: null,
      isLoading: false,
      permissionStatus: 'idle'
    });
  }, []);

  const retryLocation = useCallback(async () => {
    clearLocation();
    const position = await requestLocation();
    return position;
  }, [clearLocation, requestLocation]);

  // Auto request location jika diaktifkan
  useEffect(() => {
    if (autoRequest) {
      requestLocation().catch(() => {
        // Error handling sudah ada di dalam requestLocation
      });
    }
  }, [autoRequest, requestLocation]);

  return {
    ...locationState,
    requestLocation,
    retryLocation,
    clearLocation,
    checkPermission
  };
};

export default useLocation;
