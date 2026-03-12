import type { Shop } from '../types';
import { RoutePlanner } from '../components/RoutePlanner';
import { RouteStopList } from '../components/RouteStopList';

interface Props {
  shops: Shop[];
  cities: string[];
  selectedIds: Set<string>;
  orderedStops: Shop[];
  isOptimized: boolean;
  locating: boolean;
  userLocation: [number, number] | null;
  onToggle: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onClear: () => void;
  onOptimize: () => void;
}

export function RoutePage({
  shops, cities, selectedIds, orderedStops, isOptimized, locating, userLocation,
  onToggle, onSelectAll, onClear, onOptimize,
}: Props) {
  const hasSelection = selectedIds.size > 0;
  const hasLocations = shops.filter(s => selectedIds.has(s.id) && s.lat != null).length >= 2;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 bg-white border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900">Plan Route</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 pb-4 space-y-4">
        <RoutePlanner
          shops={shops}
          cities={cities}
          selectedIds={selectedIds}
          onToggle={onToggle}
          onSelectAll={onSelectAll}
          onClear={onClear}
        />

        {hasSelection && (
          <button
            onClick={onOptimize}
            disabled={!hasLocations || locating}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {locating ? 'Getting your location...' : `Optimize Route (${selectedIds.size} stops)`}
          </button>
        )}

        {!hasLocations && hasSelection && (
          <p className="text-xs text-amber-600 text-center">
            At least 2 shops need locations to optimize. Use "Find Location" when adding shops.
          </p>
        )}

        {isOptimized && <RouteStopList stops={orderedStops} userLocation={userLocation} />}
      </div>
    </div>
  );
}
