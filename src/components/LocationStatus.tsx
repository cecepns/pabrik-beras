import React, { useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { useLocation } from '../contexts/LocationContext';

const LocationStatus: React.FC = () => {
  const { location, hasLocation, setLocation } = useLocation();

  // Debug logging
  console.log('LocationStatus - location:', location);
  console.log('LocationStatus - hasLocation:', hasLocation);

  const formatAddress = (address: string) => {
    // Split address by commas and take the most relevant parts
    const parts = address.split(', ');
    
    // For Indonesian addresses, we usually want: Street, District, City, Province
    if (parts.length >= 4) {
      // Take first 4 parts for better readability
      return parts.slice(0, 4).join(', ');
    }
    
    return address;
  };

  const getAddressFromCoordinates = async (lat: number, lng: number) => {
    try {
      // Check if we have cached address
      const cacheKey = `address_${lat.toFixed(6)}_${lng.toFixed(6)}`;
      const cachedAddress = localStorage.getItem(cacheKey);
      
      if (cachedAddress) {
        setLocation({
          latitude: lat,
          longitude: lng,
          accuracy: null,
          timestamp: Date.now(),
          address: cachedAddress
        });
        return cachedAddress;
      }

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'id,en'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const fullAddress = data.display_name || 'Alamat tidak tersedia';
        const formattedAddress = formatAddress(fullAddress);
        
        // Save full address to localStorage for future use
        localStorage.setItem(cacheKey, fullAddress);
        
        // Update location dengan alamat yang diformat
        setLocation({
          latitude: lat,
          longitude: lng,
          accuracy: null,
          timestamp: Date.now(),
          address: formattedAddress
        });
        
        return formattedAddress;
      } else {
        throw new Error('Gagal mendapatkan alamat');
      }
    } catch (error) {
      console.error('Error mendapatkan alamat:', error);
      return 'Gagal mendapatkan alamat';
    }
  };

  // Auto-request location when component mounts if not available
  useEffect(() => {
    if (!hasLocation && navigator.geolocation) {
      console.log('Auto-requesting location...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Lokasi berhasil diperoleh secara otomatis:', position.coords);
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
            address: ''
          });
        },
        (error) => {
          console.log('Auto-request lokasi gagal:', error.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    }
  }, [hasLocation, setLocation]);

  // Auto-request address when location is available but address is empty
  useEffect(() => {
    if (hasLocation && location?.latitude && location?.longitude && !location?.address) {
      console.log('Auto-requesting address...');
      getAddressFromCoordinates(location.latitude, location.longitude);
    }
  }, [hasLocation, location?.latitude, location?.longitude, location?.address]);

  if (!hasLocation) {
    return (
      <div className="flex items-center space-x-2 text-yellow-700">
        <XCircle className="w-4 h-4" />
        <span className="text-sm">Mengambil lokasi...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 text-green-700">
      <CheckCircle className="w-4 h-4" />
      <span className="text-sm">
        {location?.address ? (
          <>
            {location.address}
            <span className="text-green-600 ml-1">
              ({location.longitude?.toFixed(6)}, {location.latitude?.toFixed(6)})
            </span>
          </>
        ) : (
          `Lat: ${location?.latitude?.toFixed(6)}, Lng: ${location?.longitude?.toFixed(6)}`
        )}
      </span>
    </div>
  );
};

export default LocationStatus;
