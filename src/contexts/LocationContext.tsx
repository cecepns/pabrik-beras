import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LocationData {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  timestamp: number | null;
}

interface LocationContextType {
  location: LocationData | null;
  setLocation: (location: LocationData | null) => void;
  hasLocation: boolean;
  clearLocation: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

interface LocationProviderProps {
  children: ReactNode;
}

const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [location, setLocationState] = useState<LocationData | null>(null);

  const hasLocation = location !== null && location.latitude !== null && location.longitude !== null;

  const setLocation = (newLocation: LocationData | null) => {
    setLocationState(newLocation);
  };

  const clearLocation = () => {
    setLocationState(null);
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

export { useLocation, LocationProvider };
export type { LocationData, LocationContextType };
