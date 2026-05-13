import { useRef, useState, useEffect, useCallback } from 'react';
import type { Shop } from '../types';
import type { HomeAddress } from '../utils/storage';
import { openSingleNavigation, openFullRoute } from '../utils/navigation';

interface Props {
  stops: Shop[];
  userLocation?: [number, number] | null;
  home?: HomeAddress | null;
  routeInfo?: { distance: number; duration: number; usedOSRM: boolean } | null;
  onReorder?: (from: number, to: number) => void;
  doneIds: Set<string>;
  onToggleDone: (id: string) => void;
  onMarkBatchDone: (ids: string[]) => void;
  onBeforeNavigate?: () => void;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.ceil((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m} min`;
}

export function RouteStopList({ stops, userLocation, home, routeInfo, onReorder, doneIds, onToggleDone, onMarkBatchDone, onBeforeNavigate }: Props) {
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Touch drag-and-drop state
  const touchDragRef = useRef<number | null>(null);
  const touchOverRef = useRef<number | null>(null);
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [touchDragIndex, setTouchDragIndex] = useState<number | null>(null);
  const [touchOverIndex, setTouchOverIndex] = useState<number | null>(null);

  // doneIds, onToggleDone, onMarkBatchDone come from props (persisted in useRoute)

  // Document-level touch handlers for drag
  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (touchDragRef.current === null) return;
      e.preventDefault();

      const touch = e.touches[0];
      let found = false;
      for (const [index, el] of rowRefs.current.entries()) {
        const rect = el.getBoundingClientRect();
        if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
          if (touchOverRef.current !== index) {
            touchOverRef.current = index;
            setTouchOverIndex(index);
          }
          found = true;
          break;
        }
      }
      if (!found) {
        touchOverRef.current = null;
        setTouchOverIndex(null);
      }
    };

    const handleTouchEnd = () => {
      if (touchDragRef.current !== null && touchOverRef.current !== null && touchDragRef.current !== touchOverRef.current && onReorder) {
        onReorder(touchDragRef.current, touchOverRef.current);
      }
      touchDragRef.current = null;
      touchOverRef.current = null;
      setTouchDragIndex(null);
      setTouchOverIndex(null);
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [onReorder]);

  // Desktop drag handlers
  const handleDragStart = (i: number) => {
    dragItem.current = i;
  };
  const handleDragEnter = (i: number) => {
    dragOverItem.current = i;
  };
  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current && onReorder) {
      onReorder(dragItem.current, dragOverItem.current);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  // Touch drag start
  const handleTouchStart = (i: number, e: React.TouchEvent) => {
    touchDragRef.current = i;
    touchOverRef.current = null;
    setTouchDragIndex(i);
    setTouchOverIndex(null);
    e.preventDefault();
  };

  const setRowRef = useCallback((index: number, el: HTMLDivElement | null) => {
    if (el) {
      rowRefs.current.set(index, el);
    } else {
      rowRefs.current.delete(index);
    }
  }, []);

  if (stops.length === 0) return null;

  const validStops = stops.filter(s => s.lat != null && s.lng != null);
  const userLoc = userLocation ? { lat: userLocation[0], lng: userLocation[1] } : null;

  // Remaining stops (not done) for navigation
  const remainingStops = validStops.filter(s => !doneIds.has(s.id));
  const remainingNav = remainingStops.map(s => ({ lat: s.lat!, lng: s.lng! }));
  if (home) remainingNav.push({ lat: home.lat, lng: home.lng });

  // Google Maps supports origin + destination + 9 waypoints = 11 stops max per batch
  const MAX_BATCH = 10; // destination + 9 waypoints
  const needsBatching = remainingStops.length > MAX_BATCH;
  const currentBatchStops = remainingStops.slice(0, MAX_BATCH);
  const currentBatchNav = currentBatchStops.map(s => ({ lat: s.lat!, lng: s.lng! }));
  // Only add home if this is the last batch
  if (home && !needsBatching) currentBatchNav.push({ lat: home.lat, lng: home.lng });

  const doneCount = doneIds.size;
  const totalCount = stops.length;

  const handleNavigateBatch = () => {
    onBeforeNavigate?.();
    openFullRoute(currentBatchNav, userLoc);
  };

  const handleMarkBatchDone = () => {
    onMarkBatchDone(currentBatchStops.map(s => s.id));
  };

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
      </div>

      {/* Progress + Navigation */}
      {doneCount > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${(doneCount / totalCount) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 shrink-0">{doneCount}/{totalCount} done</span>
        </div>
      )}

      <div className="flex gap-2">
        {remainingStops.length > 0 && (
          <button
            onClick={handleNavigateBatch}
            className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
          >
            {needsBatching
              ? `Navigate Next ${currentBatchStops.length} Stops`
              : doneCount > 0
                ? `Navigate Remaining ${remainingStops.length}`
                : 'Navigate All'
            }
          </button>
        )}
        {needsBatching && (
          <button
            onClick={handleMarkBatchDone}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            Mark Batch Done
          </button>
        )}
        {doneCount > 0 && (
          <button
            onClick={() => onMarkBatchDone([])}
            className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200"
          >
            Reset
          </button>
        )}
      </div>

      {onReorder && (
        <p className="text-xs text-gray-400 text-center">Hold and drag to reorder stops</p>
      )}

      <div className="space-y-1">
        {stops.map((stop, i) => {
          const isDone = doneIds.has(stop.id);
          return (
            <div
              key={stop.id}
              ref={el => setRowRef(i, el)}
              draggable={!!onReorder}
              onDragStart={() => handleDragStart(i)}
              onDragEnter={() => handleDragEnter(i)}
              onDragEnd={handleDragEnd}
              onDragOver={e => e.preventDefault()}
              className={`flex items-center gap-2 p-3 rounded-lg border select-none transition-all duration-150 ${
                isDone
                  ? 'bg-green-50 border-green-200 opacity-60'
                  : touchDragIndex === i
                    ? 'opacity-50 scale-95 border-blue-400 bg-blue-50 shadow-lg'
                    : touchOverIndex === i && touchDragIndex !== null
                      ? 'border-blue-500 border-2 bg-blue-50'
                      : 'bg-white border-gray-200'
              }`}
            >
              {/* Drag handle */}
              {onReorder && (
                <div
                  className="flex items-center justify-center w-10 h-12 shrink-0 rounded-md bg-gray-100 active:bg-gray-200"
                  style={{ touchAction: 'none', cursor: 'grab' }}
                  onTouchStart={e => handleTouchStart(i, e)}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-gray-400">
                    <circle cx="7" cy="4" r="1.5" fill="currentColor" />
                    <circle cx="13" cy="4" r="1.5" fill="currentColor" />
                    <circle cx="7" cy="10" r="1.5" fill="currentColor" />
                    <circle cx="13" cy="10" r="1.5" fill="currentColor" />
                    <circle cx="7" cy="16" r="1.5" fill="currentColor" />
                    <circle cx="13" cy="16" r="1.5" fill="currentColor" />
                  </svg>
                </div>
              )}

              {/* Done checkbox */}
              <button
                onClick={() => onToggleDone(stop.id)}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                  isDone
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-600 text-white'
                }`}
              >
                {isDone ? '✓' : i + 1}
              </button>

              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm truncate ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                  {stop.name || stop.address}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {stop.name ? `${stop.address}, ` : ''}{stop.district ? `${stop.district}, ` : ''}{stop.city}
                </p>
              </div>

              {stop.lat != null && (
                <button
                  onClick={() => {
                    onBeforeNavigate?.();
                    openSingleNavigation(stop.lat!, stop.lng!);
                  }}
                  className="px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 shrink-0"
                >
                  Go
                </button>
              )}
            </div>
          );
        })}

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
              onClick={() => {
                onBeforeNavigate?.();
                openSingleNavigation(home.lat, home.lng);
              }}
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
