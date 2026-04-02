import { useState } from 'react';
import type { Shop, ShopGroup } from '../types';
import type { HomeAddress } from '../utils/storage';
import { saveHistory } from '../utils/storage';
import { RoutePlanner } from '../components/RoutePlanner';
import { RouteStopList } from '../components/RouteStopList';

interface Props {
  shops: Shop[];
  selectedIds: Set<string>;
  orderedStops: Shop[];
  isOptimized: boolean;
  locating: boolean;
  userLocation: [number, number] | null;
  home: HomeAddress | null;
  routeInfo: { distance: number; duration: number; usedOSRM: boolean } | null;
  groups: ShopGroup[];
  onToggle: (id: string) => void;
  onAddToSelection: (ids: string[]) => void;
  onRemoveFromSelection: (ids: string[]) => void;
  onClear: () => void;
  onOptimize: () => void;
  onReorder: (from: number, to: number) => void;
  doneIds: Set<string>;
  onToggleDone: (id: string) => void;
  onMarkBatchDone: (ids: string[]) => void;
  onSaveGroup: (name: string, shopIds: string[]) => Promise<ShopGroup | null>;
  onUpdateGroup: (id: string, updates: { shopIds?: string[] }) => Promise<boolean>;
  onDeleteGroup: (id: string) => Promise<boolean>;
}

export function RoutePage({
  shops, selectedIds, orderedStops, isOptimized, locating, userLocation, home, routeInfo,
  groups, onToggle, onAddToSelection, onRemoveFromSelection, onClear, onOptimize, onReorder,
  doneIds, onToggleDone, onMarkBatchDone,
  onSaveGroup, onUpdateGroup, onDeleteGroup,
}: Props) {
  const [finishing, setFinishing] = useState(false);

  const hasSelection = selectedIds.size > 0;
  const hasLocations = shops.filter(s => selectedIds.has(s.id) && s.lat != null).length >= 2;

  const handleFinishRoute = async () => {
    if (!isOptimized) return;
    setFinishing(true);
    await saveHistory({
      shopIds: orderedStops.map(s => s.id),
      shopNames: orderedStops.map(s => s.name || s.address),
      totalShops: orderedStops.length,
      doneShops: orderedStops.filter(s => doneIds.has(s.id)).length,
      distanceKm: routeInfo?.distance ?? null,
      durationMin: routeInfo?.duration ? routeInfo.duration / 60 : null,
    });
    setFinishing(false);
    onClear();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 bg-white border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900">Plan Route</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 pb-4 space-y-4">
        <RoutePlanner
          shops={shops}
          selectedIds={selectedIds}
          groups={groups}
          onToggle={onToggle}
          onAddToSelection={onAddToSelection}
          onRemoveFromSelection={onRemoveFromSelection}
          onClear={onClear}
          onSaveGroup={onSaveGroup}
          onUpdateGroup={onUpdateGroup}
          onDeleteGroup={onDeleteGroup}
        />

        {hasSelection && (
          <button
            onClick={onOptimize}
            disabled={!hasLocations || locating}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {locating ? 'Optimizing route...' : `Optimize Route (${selectedIds.size} stops)`}
          </button>
        )}

        {!home && hasSelection && (
          <p className="text-xs text-gray-400 text-center">
            Tip: Set your home address in Settings so the route ends at home.
          </p>
        )}

        {!hasLocations && hasSelection && (
          <p className="text-xs text-amber-600 text-center">
            At least 2 shops need locations to optimize. Use "Find Location" when adding shops.
          </p>
        )}

        {isOptimized && (
          <>
            <RouteStopList
              stops={orderedStops}
              userLocation={userLocation}
              home={home}
              routeInfo={routeInfo}
              onReorder={onReorder}
              doneIds={doneIds}
              onToggleDone={onToggleDone}
              onMarkBatchDone={onMarkBatchDone}
            />

            <button
              onClick={handleFinishRoute}
              disabled={finishing}
              className="w-full py-2.5 bg-gray-900 text-white rounded-lg font-medium text-sm hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {finishing ? 'Saving...' : 'Finish Route & Save to History'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}