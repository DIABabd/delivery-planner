import type { Shop } from '../types';
import type { HomeAddress } from '../utils/storage';
import { openSingleNavigation, openFullRoute } from '../utils/navigation';

interface Props {
  stops: Shop[];
  userLocation?: [number, number] | null;
  home?: HomeAddress | null;
  routeInfo?: { distance: number; duration: number; usedOSRM: boolean } | null;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.ceil((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m} min`;
}

export function RouteStopList({ stops, userLocation, home, routeInfo }: Props) {
  if (stops.length === 0) return null;

  const validStops = stops.filter(s => s.lat != null && s.lng != null);
  const userLoc = userLocation ? { lat: userLocation[0], lng: userLocation[1] } : null;

  // Build full navigation stops including home
  const navStops = validStops.map(s => ({ lat: s.lat!, lng: s.lng! }));
  if (home) navStops.push({ lat: home.lat, lng: home.lng });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            {stops.length} stops{home ? ' + home' : ''}
            {routeInfo && routeInfo.distance > 0 && (
              <> &middot; {routeInfo.distance.toFixed(1)} km</>
            )}
            {routeInfo && routeInfo.duration > 0 && (
              <> &middot; {formatDuration(routeInfo.duration)}</>
            )}
          </p>
          {routeInfo && (
            <p className="text-xs text-gray-400">
              {routeInfo.usedOSRM ? 'Optimized by real road data' : 'Estimated (straight-line)'}
            </p>
          )}
        </div>
        {navStops.length >= 1 && (
          <button
            onClick={() => openFullRoute(navStops, userLoc)}
            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 shrink-0"
          >
            Navigate All
          </button>
        )}
      </div>

      <div className="space-y-1">
        {stops.map((stop, i) => (
          <div
            key={stop.id}
            className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200"
          >
            <span className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-900 truncate">{stop.name}</p>
              <p className="text-xs text-gray-500 truncate">{stop.address}, {stop.city}</p>
            </div>
            {stop.lat != null && (
              <button
                onClick={() => openSingleNavigation(stop.lat!, stop.lng!)}
                className="px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 shrink-0"
              >
                Go
              </button>
            )}
          </div>
        ))}

        {/* Home as final stop */}
        {home && (
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <span className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center text-xs shrink-0">
              🏠
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-900">Home</p>
              <p className="text-xs text-gray-500 truncate">{home.address}, {home.city}</p>
            </div>
            <button
              onClick={() => openSingleNavigation(home.lat, home.lng)}
              className="px-2.5 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 shrink-0"
            >
              Go
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
