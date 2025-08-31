import React from 'react';
import { MapPin, CheckCircle, XCircle } from 'lucide-react';
import { useLocation } from '../contexts/LocationContext';

const LocationStatus: React.FC = () => {
  const { location, hasLocation } = useLocation();

  if (!hasLocation) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <div className="flex items-center space-x-2">
          <XCircle className="w-4 h-4 text-yellow-600" />
          <span className="text-sm text-yellow-800">Lokasi tidak tersedia</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
      <div className="flex items-center space-x-2">
        <CheckCircle className="w-4 h-4 text-green-600" />
        <span className="text-sm text-green-800">Lokasi tersedia</span>
      </div>
      {location && (
        <div className="mt-2 text-xs text-green-700">
          <p>Lat: {location.latitude?.toFixed(6)}</p>
          <p>Lng: {location.longitude?.toFixed(6)}</p>
          {location.accuracy && (
            <p>Akurasi: ±{location.accuracy.toFixed(1)}m</p>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationStatus;
