import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';
import type { Shop } from '../types';
import { openSingleNavigation } from '../utils/navigation';

function createNumberedIcon(num: number) {
  return L.divIcon({
    className: '',
    html: `<div style="
      background: #2563eb;
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    ">${num}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

const shopPinIcon = L.divIcon({
  className: '',
  html: `<div style="
    background: #9ca3af;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const myLocationIcon = L.divIcon({
  className: '',
  html: `<div style="
    background: #ef4444;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 0 0 2px #ef4444, 0 2px 6px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function FitBounds({ allShops, routeStops, userLocation }: {
  allShops: Shop[];
  routeStops: Shop[];
  userLocation: [number, number] | null;
}) {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = [];

    // If route is active, fit to route + user location
    if (routeStops.length > 0) {
      routeStops.forEach(s => {
        if (s.lat != null && s.lng != null) points.push([s.lat, s.lng]);
      });
    } else {
      // Otherwise fit to all shops
      allShops.forEach(s => {
        if (s.lat != null && s.lng != null) points.push([s.lat, s.lng]);
      });
    }

    if (userLocation) points.push(userLocation);

    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [allShops, routeStops, userLocation, map]);
  return null;
}

interface Props {
  allShops: Shop[];
  routeStops: Shop[];
  userLocation: [number, number] | null;
}

export function RouteMap({ allShops, routeStops, userLocation }: Props) {
  const allValid = allShops.filter(s => s.lat != null && s.lng != null);
  const routeValid = routeStops.filter(s => s.lat != null && s.lng != null);
  const routeIds = new Set(routeValid.map(s => s.id));

  // Default center: Germany
  const defaultCenter: [number, number] = [53.08, 8.80];
  const hasAnything = allValid.length > 0 || userLocation;

  const routePositions: [number, number][] = routeValid.map(s => [s.lat!, s.lng!]);

  return (
    <MapContainer
      center={hasAnything ? (allValid[0] ? [allValid[0].lat!, allValid[0].lng!] : (userLocation ?? defaultCenter)) : defaultCenter}
      zoom={hasAnything ? 13 : 7}
      className="w-full h-full"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds allShops={allValid} routeStops={routeValid} userLocation={userLocation} />

      {/* All shops as gray pins (only those NOT in the active route) */}
      {allValid.filter(s => !routeIds.has(s.id)).map(shop => (
        <Marker key={shop.id} position={[shop.lat!, shop.lng!]} icon={shopPinIcon}>
          <Popup>
            <div className="text-sm">
              <strong>{shop.name}</strong><br />
              {shop.address}, {shop.city}
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Route stops as blue numbered pins */}
      {routeValid.map((stop, i) => (
        <Marker key={stop.id} position={[stop.lat!, stop.lng!]} icon={createNumberedIcon(i + 1)}>
          <Popup>
            <div className="text-sm">
              <strong>#{i + 1} {stop.name}</strong><br />
              {stop.address}<br />
              <button
                onClick={() => openSingleNavigation(stop.lat!, stop.lng!)}
                style={{ color: '#2563eb', fontWeight: 600, marginTop: 4, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
              >
                Navigate here
              </button>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Route line */}
      {routePositions.length >= 2 && (
        <Polyline positions={routePositions} color="#2563eb" weight={3} opacity={0.7} />
      )}

      {/* User location */}
      {userLocation && (
        <>
          <Marker position={userLocation} icon={myLocationIcon}>
            <Popup>Your location</Popup>
          </Marker>
          <Circle center={userLocation} radius={100} color="#ef4444" fillOpacity={0.1} weight={1} />
        </>
      )}
    </MapContainer>
  );
}
