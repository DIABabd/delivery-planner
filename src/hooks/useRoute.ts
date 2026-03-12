import { useState, useCallback } from 'react';
import type { Shop } from '../types';
import { optimizeRoute } from '../utils/routeOptimizer';

export function useRoute() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [orderedStops, setOrderedStops] = useState<Shop[]>([]);
  const [isOptimized, setIsOptimized] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);

  const toggleShop = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setIsOptimized(false);
    setOrderedStops([]);
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
    setIsOptimized(false);
    setOrderedStops([]);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setOrderedStops([]);
    setIsOptimized(false);
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

  const optimize = useCallback(async (allShops: Shop[]) => {
    const selected = allShops.filter(s => selectedIds.has(s.id));

    // Get current location to use as starting point
    const loc = await fetchLocation();

    const optimized = optimizeRoute(
      selected,
      loc ? loc[0] : undefined,
      loc ? loc[1] : undefined,
    );
    setOrderedStops(optimized);
    setIsOptimized(true);
  }, [selectedIds, fetchLocation]);

  return {
    selectedIds,
    orderedStops,
    isOptimized,
    userLocation,
    locating,
    toggleShop,
    selectAll,
    clearSelection,
    optimize,
    fetchLocation,
  };
}
