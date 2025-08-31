import React from 'react';
import { MapPin } from 'lucide-react';
import { useLocation } from '../contexts/LocationContext';

const LocationStatus: React.FC = () => {
  const { hasLocation, location } = useLocation();

  console.log(location);

  if (!hasLocation || !location || !location.latitude || !location.longitude) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
      <h2 className="text-sm font-semibold text-gray-900 mb-2">Status Lokasi</h2>
      <div className="flex items-center space-x-2 text-green-500">
        <MapPin className="w-4 h-4" />
        <span className="text-sm">
          {location.longitude.toFixed(4)}, {location.latitude.toFixed(4)}
        </span>
      </div>
    </div>
  );
};

export default LocationStatus;
