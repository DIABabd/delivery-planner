import { useState, useCallback } from 'react';
import type { Shop } from '../types';
import { optimizeRoute, type OptimizeResult } from '../utils/routeOptimizer';

export function useRoute() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [orderedStops, setOrderedStops] = useState<Shop[]>([]);
  const [isOptimized, setIsOptimized] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number; usedOSRM: boolean } | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | null>(null);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());

  const toggleShop = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // Only clear route if not currently optimized (i.e. still in selection phase)
    // This preserves the route when adding shops mid-delivery
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

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setOrderedStops([]);
    setIsOptimized(false);
    setRouteInfo(null);
    setRouteGeometry(null);
    setDoneIds(new Set());
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
    clearSelection,
    optimize,
    reorderStops,
    toggleDone,
    markBatchDone,
  };
}
