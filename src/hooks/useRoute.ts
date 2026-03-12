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

  const toggleShop = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setIsOptimized(false);
    setOrderedStops([]);
    setRouteInfo(null);
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
    setIsOptimized(false);
    setOrderedStops([]);
    setRouteInfo(null);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setOrderedStops([]);
    setIsOptimized(false);
    setRouteInfo(null);
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
    setIsOptimized(true);
    setLocating(false);
  }, [selectedIds, fetchLocation]);

  return {
    selectedIds,
    orderedStops,
    isOptimized,
    userLocation,
    locating,
    routeInfo,
    toggleShop,
    selectAll,
    clearSelection,
    optimize,
  };
}
