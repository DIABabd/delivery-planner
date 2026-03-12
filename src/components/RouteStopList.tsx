import type { Shop } from '../types';
import { openSingleNavigation, openFullRoute } from '../utils/navigation';
import { getRouteDistance } from '../utils/routeOptimizer';

interface Props {
  stops: Shop[];
  userLocation?: [number, number] | null;
}

export function RouteStopList({ stops, userLocation }: Props) {
  if (stops.length === 0) return null;

  const validStops = stops.filter(s => s.lat != null && s.lng != null);
  const distance = getRouteDistance(validStops);
  const userLoc = userLocation ? { lat: userLocation[0], lng: userLocation[1] } : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {stops.length} stops &middot; ~{distance.toFixed(1)} km
        </p>
        {validStops.length >= 1 && (
          <button
            onClick={() => openFullRoute(validStops.map(s => ({ lat: s.lat!, lng: s.lng! })), userLoc)}
            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700"
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
      </div>
    </div>
  );
}
