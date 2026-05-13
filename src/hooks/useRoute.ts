import { useState, useCallback, useEffect, useRef } from 'react';
import type { Shop } from '../types';
import { optimizeRoute, type OptimizeResult } from '../utils/routeOptimizer';

const STORAGE_KEY = 'route-progress';

interface SavedState {
  selectedIds: string[];
  orderedStopIds: string[];
  isOptimized: boolean;
  doneIds: string[];
  routeInfo: { distance: number; duration: number; usedOSRM: boolean } | null;
  routeGeometry: [number, number][] | null;
  savedAt: number;
}

function saveState(state: SavedState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

function loadState(): SavedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedState;
    // Expire after 24 hours
    if (Date.now() - parsed.savedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch { return null; }
}

export function useRoute() {
  const [saved] = useState<SavedState | null>(() => loadState());

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(saved?.selectedIds ?? [])
  );
  const [orderedStops, setOrderedStops] = useState<Shop[]>([]);
  const [isOptimized, setIsOptimized] = useState(saved?.isOptimized ?? false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number; usedOSRM: boolean } | null>(
    saved?.routeInfo ?? null
  );
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | null>(
    saved?.routeGeometry ?? null
  );
  const [doneIds, setDoneIds] = useState<Set<string>>(
    () => new Set(saved?.doneIds ?? [])
  );

  // Restore ordered stops once shops are available
  const [pendingStopIds] = useState<string[]>(saved?.orderedStopIds ?? []);
  const stopsRestoredRef = useRef(false);

  const restoreStops = useCallback((allShops: Shop[]) => {
    if (stopsRestoredRef.current || pendingStopIds.length === 0) return;
    const shopMap = new Map(allShops.map(s => [s.id, s]));
    const restored = pendingStopIds.map(id => shopMap.get(id)).filter((s): s is Shop => !!s);
    if (restored.length > 0) {
      setOrderedStops(restored);
      stopsRestoredRef.current = true;
    }
  }, [pendingStopIds]);

  // Auto-save on every meaningful change. Debounced so toggling many "done"
  // checkboxes in a row doesn't JSON-stringify the full route geometry every tick.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveState({
        selectedIds: Array.from(selectedIds),
        orderedStopIds: orderedStops.map(s => s.id),
        isOptimized,
        doneIds: Array.from(doneIds),
        routeInfo,
        routeGeometry,
        savedAt: Date.now(),
      });
    }, 250);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [selectedIds, orderedStops, isOptimized, doneIds, routeInfo, routeGeometry]);

  const toggleShop = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (!isOptimized) {
      setOrderedStops([]);
      setRouteInfo(null);
      setRouteGeometry(null);
    }
  }, [isOptimized]);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
    if (!isOptimized) {
      setOrderedStops([]);
      setRouteInfo(null);
      setRouteGeometry(null);
    }
  }, [isOptimized]);

  const addToSelection = useCallback((ids: string[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
    if (!isOptimized) {
      setOrderedStops([]);
      setRouteInfo(null);
      setRouteGeometry(null);
    }
  }, [isOptimized]);

  const removeFromSelection = useCallback((ids: string[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.delete(id));
      return next;
    });
    if (!isOptimized) {
      setOrderedStops([]);
      setRouteInfo(null);
      setRouteGeometry(null);
    }
  }, [isOptimized]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setOrderedStops([]);
    setIsOptimized(false);
    setRouteInfo(null);
    setRouteGeometry(null);
    setDoneIds(new Set());
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const toggleDone = useCallback((id: string) => {
    setDoneIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const markBatchDone = useCallback((ids: string[]) => {
    if (ids.length === 0) {
      setDoneIds(new Set());
      return;
    }
    setDoneIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
  }, []);

  const fetchLocation = useCallback((): Promise<[number, number] | null> => {
    return new Promise(resolve => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        pos => {
          const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(loc);
          setLocating(false);
          resolve(loc);
        },
        () => {
          setLocating(false);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  const optimize = useCallback(async (
    allShops: Shop[],
    homeLat?: number,
    homeLng?: number,
  ) => {
    setLocating(true);
    const selected = allShops.filter(s => selectedIds.has(s.id));

    const loc = await fetchLocation();

    const result: OptimizeResult = await optimizeRoute(
      selected,
      loc ? loc[0] : undefined,
      loc ? loc[1] : undefined,
      homeLat,
      homeLng,
    );

    setOrderedStops(result.shops);
    setRouteInfo({ distance: result.distance, duration: result.duration, usedOSRM: result.usedOSRM });
    setRouteGeometry(result.routeGeometry);
    setIsOptimized(true);
    setLocating(false);
  }, [selectedIds, fetchLocation]);

  const reorderStops = useCallback((fromIndex: number, toIndex: number) => {
    setOrderedStops(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  return {
    selectedIds,
    orderedStops,
    isOptimized,
    userLocation,
    locating,
    routeInfo,
    routeGeometry,
    doneIds,
    toggleShop,
    selectAll,
    addToSelection,
    removeFromSelection,
    clearSelection,
    optimize,
    reorderStops,
    toggleDone,
    markBatchDone,
    restoreStops,
  };
}
