import React from 'react';
import LocationGuard from './LocationGuard';

interface LocationRequiredRouteProps {
  children: React.ReactNode;
  onLocationGranted?: (position: GeolocationPosition) => void;
  onLocationDenied?: () => void;
  title?: string;
  description?: string;
  allowSkip?: boolean;
  skipText?: string;
}

const LocationRequiredRoute: React.FC<LocationRequiredRouteProps> = ({
  children,
  onLocationGranted,
  onLocationDenied,
  title,
  description,
  allowSkip = false,
  skipText
}) => {
  return (
    <LocationGuard
      onLocationGranted={onLocationGranted}
      onLocationDenied={onLocationDenied}
      title={title}
      description={description}
      allowSkip={allowSkip}
      skipText={skipText}
    >
      {children}
    </LocationGuard>
  );
};

export default LocationRequiredRoute;
