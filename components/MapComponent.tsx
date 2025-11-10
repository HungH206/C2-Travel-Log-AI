// Fix: Corrected the Google Maps type reference to "googlemaps" to resolve type definition errors.
// <reference types="googlemaps" />
import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { LocateIcon } from './icons';

interface MapComponentProps {
  onRouteCalculated: (details: { distance: number; startAddress: string; endAddress: string }) => void;
  onLocationError: (message: string) => void;
}

export interface MapComponentHandles {
  findRouteFromAddresses: (startAddress: string, endAddress: string) => void;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const MapComponent = forwardRef<MapComponentHandles, MapComponentProps>(({ onRouteCalculated, onLocationError }, ref) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const startMarkerRef = useRef<google.maps.Marker | null>(null);
  const endMarkerRef = useRef<google.maps.Marker | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const [startPoint, setStartPoint] = useState<google.maps.LatLngLiteral | null>(null);
  const [endPoint, setEndPoint] = useState<google.maps.LatLngLiteral | null>(null);

  const initMap = useCallback(() => {
    if (!mapContainerRef.current || !window.google?.maps) return;
    const map = new google.maps.Map(mapContainerRef.current, {
      center: { lat: 40.7128, lng: -74.0060 }, // Default to New York
      zoom: 5
    });
    mapRef.current = map;

    map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;
      const clickedLatLng = event.latLng.toJSON();

      if (!startPoint || (startPoint && endPoint)) {
        setStartPoint(clickedLatLng);
        setEndPoint(null);
      } else {
        setEndPoint(clickedLatLng);
      }
    });
  }, [startPoint, endPoint]);

  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.Map) {
        setIsApiLoaded(true);
        return;
    }
    
    if (!GOOGLE_MAPS_API_KEY) {
        onLocationError("Google Maps API key is not configured. Please set VITE_GOOGLE_MAPS_API_KEY.");
        return;
    }

    const scriptId = 'google-maps-script';
    if(document.getElementById(scriptId)) {
        setIsApiLoaded(true);
        return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=routes,geocoding&loading=async`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
        // Wait for google.maps to be fully available
        const checkGoogleMaps = setInterval(() => {
            if (window.google && window.google.maps && window.google.maps.Map) {
                clearInterval(checkGoogleMaps);
                setIsApiLoaded(true);
            }
        }, 100);
    };
    script.onerror = () => {
        onLocationError("Failed to load Google Maps script.");
    };
    document.head.appendChild(script);

  }, [onLocationError]);

  useEffect(() => {
    if (isApiLoaded && !mapRef.current && window.google?.maps) {
        initMap();
    }
  }, [isApiLoaded, initMap]);
  
  const clearMap = useCallback(() => {
    startMarkerRef.current?.setMap(null);
    endMarkerRef.current?.setMap(null);
    directionsRendererRef.current?.setMap(null);
  }, []);

  const calculateAndDisplayRoute = useCallback((origin: google.maps.LatLngLiteral, destination: google.maps.LatLngLiteral) => {
    if (!mapRef.current || !window.google?.maps) return;
    const directionsService = new google.maps.DirectionsService();
    if (!directionsRendererRef.current) {
        directionsRendererRef.current = new google.maps.DirectionsRenderer({ suppressMarkers: true });
    }
    directionsRendererRef.current.setMap(mapRef.current);

    directionsService.route({
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
    }).then((response) => {
        directionsRendererRef.current?.setDirections(response);
        const route = response.routes[0];
        if(route && route.legs[0]) {
            const leg = route.legs[0];
            onRouteCalculated({
                distance: (leg.distance?.value || 0) / 1000, // meters to km
                startAddress: leg.start_address || 'Unknown Address',
                endAddress: leg.end_address || 'Unknown Address',
            });
        }
    }).catch((e) => {
        onLocationError(`Directions request failed due to ${e.toString()}`);
        setStartPoint(null);
        setEndPoint(null);
    });
  }, [onRouteCalculated, onLocationError]);

  useEffect(() => {
    if (!window.google?.maps) return;
    clearMap();
    if (startPoint && mapRef.current) {
        startMarkerRef.current = new google.maps.Marker({ position: startPoint, map: mapRef.current, label: 'A' });
    }
    if (endPoint && mapRef.current) {
        endMarkerRef.current = new google.maps.Marker({ position: endPoint, map: mapRef.current, label: 'B' });
        calculateAndDisplayRoute(startPoint!, endPoint);
    }
  }, [startPoint, endPoint, clearMap, calculateAndDisplayRoute]);

  useImperativeHandle(ref, () => ({
    findRouteFromAddresses: (startAddress, endAddress) => {
      if (!window.google?.maps) {
        onLocationError("Google Maps API not loaded yet.");
        return;
      }
      
      if (!geocoderRef.current) {
        geocoderRef.current = new google.maps.Geocoder();
      }

      const geocode = (address: string): Promise<google.maps.LatLngLiteral> => {
        return new Promise((resolve, reject) => {
          geocoderRef.current!.geocode({ address }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              resolve(results[0].geometry.location.toJSON());
              return;
            }

            // Map common GeocoderStatus codes to actionable messages so the
            // UI can show helpful guidance (e.g. API key restrictions / billing).
            let message = `Geocode was not successful for '${address}'. Reason: ${status}`;
            if (status === 'ZERO_RESULTS') {
              message = `No results found for '${address}'. Please check the spelling or try a different query.`;
            } else if (status === 'OVER_QUERY_LIMIT') {
              message = `Geocoding quota exceeded (OVER_QUERY_LIMIT). You may need to enable billing or reduce request frequency.`;
            } else if (status === 'REQUEST_DENIED') {
              // This is the most likely for "API project is not authorized to use this API".
              message = `Request denied by Google Geocoding service. Common causes: the API key is missing, the key's API restrictions do not include the Maps JavaScript API / Geocoding service, or the key's HTTP referrer restrictions don't include your origin (e.g. http://localhost:3000). Check the Google Cloud Console API credentials.`;
            } else if (status === 'INVALID_REQUEST') {
              message = `Invalid geocoding request for '${address}'. This may indicate a malformed address or missing parameters.`;
            } else if (status === 'UNKNOWN_ERROR') {
              message = `An unknown error occurred while geocoding '${address}'. Try again.`;
            }

            reject(message);
          });
        });
      };

      Promise.all([geocode(startAddress), geocode(endAddress)])
        .then(([startCoords, endCoords]) => {
          if (!window.google?.maps) return;
          setStartPoint(startCoords);
          setEndPoint(endCoords);
          const bounds = new google.maps.LatLngBounds();
          bounds.extend(startCoords);
          bounds.extend(endCoords);
          mapRef.current?.fitBounds(bounds, 50); // 50px padding
        })
        .catch(error => {
          onLocationError(`Error finding addresses: ${error}`);
        });
    }
  }));

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const latLng = { lat: latitude, lng: longitude };
          setStartPoint(latLng);
          setEndPoint(null);
          mapRef.current?.setCenter(latLng);
          mapRef.current?.setZoom(13);
        },
        (error) => {
          onLocationError(`Geolocation error: ${error.message}`);
        }
      );
    } else {
      onLocationError("Geolocation is not supported by this browser.");
    }
  };

  return (
    <div className="space-y-4">
        <div ref={mapContainerRef} className="h-64 md:h-80 w-full rounded-lg border bg-secondary" >
            {!isApiLoaded && (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Loading Map...</p>
                </div>
            )}
        </div>
        <button
            type="button"
            onClick={handleUseCurrentLocation}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 border rounded-md text-sm font-medium hover:bg-secondary disabled:opacity-50"
            disabled={!isApiLoaded}
        >
            <LocateIcon className="h-4 w-4" />
            Use Current Location as Start
        </button>
        <p className="text-xs text-center text-muted-foreground">
            { startPoint && endPoint ? 'To select a new route, click the map again.' : 'Click on the map or type addresses to set start and destination points.'}
        </p>
    </div>
  );
});

MapComponent.displayName = 'MapComponent';

export default MapComponent;