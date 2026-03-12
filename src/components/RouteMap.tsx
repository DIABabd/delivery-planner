import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';
import type { Shop } from '../types';
import type { HomeAddress } from '../utils/storage';
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
    background: #dc2626;
    width: 26px;
    height: 26px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 3px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
  "><div style="
    background: white;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  "></div></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

const homeIcon = L.divIcon({
  className: '',
  html: `<div style="
    background: #16a34a;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    border: 3px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
  ">🏠</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
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

function FitBounds({ allShops, routeStops, userLocation, home }: {
  allShops: Shop[];
  routeStops: Shop[];
  userLocation: [number, number] | null;
  home: HomeAddress | null;
}) {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = [];

    if (routeStops.length > 0) {
      routeStops.forEach(s => {
        if (s.lat != null && s.lng != null) points.push([s.lat, s.lng]);
      });
      if (home) points.push([home.lat, home.lng]);
    } else {
      allShops.forEach(s => {
        if (s.lat != null && s.lng != null) points.push([s.lat, s.lng]);
      });
      if (home) points.push([home.lat, home.lng]);
    }

    if (userLocation) points.push(userLocation);

    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [allShops, routeStops, userLocation, home, map]);
  return null;
}

interface Props {
  allShops: Shop[];
  routeStops: Shop[];
  userLocation: [number, number] | null;
  home?: HomeAddress | null;
}

export function RouteMap({ allShops, routeStops, userLocation, home }: Props) {
  const allValid = allShops.filter(s => s.lat != null && s.lng != null);
  const routeValid = routeStops.filter(s => s.lat != null && s.lng != null);
  const routeIds = new Set(routeValid.map(s => s.id));

  const defaultCenter: [number, number] = [53.08, 8.80];
  const hasAnything = allValid.length > 0 || userLocation || home;

  // Route line: shops + home at the end
  const routePositions: [number, number][] = routeValid.map(s => [s.lat!, s.lng!]);
  if (routeValid.length > 0 && home) {
    routePositions.push([home.lat, home.lng]);
  }

  return (
    <MapContainer
      center={hasAnything ? (allValid[0] ? [allValid[0].lat!, allValid[0].lng!] : (home ? [home.lat, home.lng] : (userLocation ?? defaultCenter))) : defaultCenter}
      zoom={hasAnything ? 13 : 7}
      className="w-full h-full"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds allShops={allValid} routeStops={routeValid} userLocation={userLocation} home={home ?? null} />

      {/* All shops as red pins (only those NOT in the active route) */}
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

      {/* Route line (includes home as final point) */}
      {routePositions.length >= 2 && (
        <Polyline positions={routePositions} color="#2563eb" weight={3} opacity={0.7} />
      )}

      {/* Home marker */}
      {home && (
        <Marker position={[home.lat, home.lng]} icon={homeIcon}>
          <Popup>
            <div className="text-sm">
              <strong>Home</strong><br />
              {home.address}, {home.city}
            </div>
          </Popup>
        </Marker>
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
