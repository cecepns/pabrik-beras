import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LocationData {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  timestamp: number | null;
  address?: string;
}

interface LocationContextType {
  location: LocationData | null;
  setLocation: (location: LocationData | null) => void;
  hasLocation: boolean;
  clearLocation: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

interface LocationProviderProps {
  children: ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [location, setLocation] = useState<LocationData | null>(null);

  const hasLocation = location !== null && location.latitude !== null && location.longitude !== null;

  const clearLocation = () => {
    setLocation(null);
  };

  const value: LocationContextType = {
    location,
    setLocation,
    hasLocation,
    clearLocation
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};
