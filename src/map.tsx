import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, DirectionsRenderer, Marker } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '400px'
};

function MapComponent({ setDistance, setNextStop, setTime }: {
  setTime: React.Dispatch<React.SetStateAction<string>>;
  setDistance: React.Dispatch<React.SetStateAction<string>>;
  setNextStop: React.Dispatch<React.SetStateAction<string>>;
}) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_MAP_KEY ?? ''
  });

  const [map, setMap] = useState(null);
  const [directions, setDirections] = useState<any>(null);
  const [currentLocation, setCurrentLocation] = useState<google.maps.LatLng | null>(null);
  const [eta, setEta] = useState<any>(null);

  const onLoad = useCallback(function callback(map: any) {

    setMap(map);


    const directionsService = new window.google.maps.DirectionsService();
    const startPoint = new window.google.maps.LatLng(-1.939826787816454, 30.0445426438232);
    const intermediates = [
      new window.google.maps.LatLng(-1.9355377074007851, 30.060163829002217),
      new window.google.maps.LatLng(-1.9358808342336546, 30.08024820994666),
      new window.google.maps.LatLng(-1.9489196023037583, 30.092607828989397),
      new window.google.maps.LatLng(-1.9592132952818164, 30.106684061788073),
      new window.google.maps.LatLng(-1.9487480402200394, 30.126596781356923),
    ];
    const endPoint = new window.google.maps.LatLng(-1.9365670876910166, 30.13020167024439);

    new window.google.maps.Marker({
      position: startPoint,
      map: map,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#FFF',
        fillOpacity: 1,
        strokeWeight: 2
      },
      title: 'Start Point'
    });
    new window.google.maps.Marker({
      position: endPoint,
      map: map,
      title: 'End Point'
    });

    intermediates.forEach(((e: google.maps.LatLng, index: number) => {
      new window.google.maps.Marker({
        position: e,
        map: map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 4,
          fillColor: '#FFF',
          fillOpacity: 1,
          strokeWeight: 2
        },
        title: `Stop ${index + 1}`
      });
    }));

    const bounds = new window.window.google.maps.LatLngBounds();
    bounds.extend(startPoint);
    bounds.extend(endPoint);
    map.fitBounds(bounds);

    directionsService.route({
      origin: startPoint,
      destination: endPoint,
      waypoints: intermediates.map(e => ({ location: e, stopover: true })),
      optimizeWaypoints: true,
      travelMode: window.google.maps.TravelMode.DRIVING,
    }, (result, status) => {
      if (status === window.google.maps.DirectionsStatus.OK) {
        setDirections(result);
      } else {
        console.error(`error fetching directions ${result}`);
      }
    });

    navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const currentPos = new window.google.maps.LatLng(latitude, longitude);
        setCurrentLocation(currentPos);
        if (directions) {
          calculateETA(currentPos, directions);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
      },
      { enableHighAccuracy: true }
    );
  }, [directions]);

  const calculateETA = (currentPos: google.maps.LatLng, directions: any) => {
    const legs = directions.routes[0].legs;
    const distances = legs.map((leg: any) => ({
      startLocation: leg.start_location,
      distance: google.maps.geometry.spherical.computeDistanceBetween(currentPos, leg.start_location)
    }));
    const nearestLegIndex = distances.reduce((minIndex: any, current: any, index: any, array: any) => {
      return current.distance < array[minIndex].distance ? index : minIndex;
    }, 0);

    const remainingLegs = legs.slice(nearestLegIndex);
    const remainingDistance = remainingLegs.reduce((total: any, leg: any) => total + leg.distance.value, 0);
    const nextLeg = remainingLegs.reduce((total: any, leg: any) => total + leg.end_address, 0);
    const averageSpeedKmH = 50;
    const remainingTimeHours = remainingDistance / 1000 / averageSpeedKmH;
    const remainingTimeMinutes = remainingTimeHours * 60;
    console.log(remainingLegs)
    setEta(Math.round(remainingTimeMinutes))
    setNextStop(nextLeg);
    setDistance((remainingDistance / 1000).toString())
    setTime(Math.round(remainingTimeMinutes).toString());
  };

  const onUnmount = useCallback(function callback(map: any) {
    setMap(null);
  }, []);

  useEffect(() => {
    if (directions) {
      calculateETA(currentLocation!, directions)
    }
  }, [directions]);

  return isLoaded ? (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={currentLocation || { lat: -1.9398, lng: 30.0445 }}
      zoom={12}
      onLoad={onLoad}
      onUnmount={onUnmount}
    >
      {directions && (
        <DirectionsRenderer
          directions={directions}
          options={{
            polylineOptions: {
              strokeColor: '#FF0000',
              strokeOpacity: 0.8,
              strokeWeight: 4,
            },
            markerOptions: {
              visible: false,
            }
          }}
        />
      )}
      {currentLocation && (
        <Marker
          position={currentLocation}
          icon={{
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: '#4285F4',
            fillOpacity: 1,
            strokeWeight: 2
          }}
        />
      )}
      {eta && <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'white', padding: '10px', borderRadius: '8px' }}>
        ETA to next stop: {eta} minutes
      </div>}
    </GoogleMap>
  ) : <></>;
}

export default React.memo(MapComponent);
