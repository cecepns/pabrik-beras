import React from 'react';
import { CheckCircle, XCircle, MapPin } from 'lucide-react';
import { useLocation } from '../contexts/LocationContext';

const LocationStatus: React.FC = () => {
  const { location, hasLocation } = useLocation();

  if (!hasLocation) {
    return (
      <div className="flex items-center space-x-2 text-yellow-600">
        <XCircle className="w-4 h-4" />
        <span className="text-sm">Lokasi tidak tersedia</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 text-green-600">
      <MapPin className="w-4 h-4" />
      <span className="text-base">
        {location?.longitude?.toFixed(4)}, {location?.latitude?.toFixed(4)}
      </span>
    </div>
  );
};

export default LocationStatus;
