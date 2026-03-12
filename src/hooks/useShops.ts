import { useState, useCallback, useMemo } from 'react';
import type { Shop } from '../types';
import { loadShops, saveShops } from '../utils/storage';

export function useShops() {
  const [shops, setShops] = useState<Shop[]>(() => loadShops());

  const persist = useCallback((updated: Shop[]) => {
    setShops(updated);
    saveShops(updated);
  }, []);

  const addShop = useCallback((shop: Omit<Shop, 'id' | 'createdAt'>) => {
    const newShop: Shop = {
      ...shop,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    persist([...loadShops(), newShop]);
    return newShop;
  }, [persist]);

  const updateShop = useCallback((id: string, updates: Partial<Shop>) => {
    const current = loadShops();
    persist(current.map(s => (s.id === id ? { ...s, ...updates } : s)));
  }, [persist]);

  const deleteShop = useCallback((id: string) => {
    persist(loadShops().filter(s => s.id !== id));
  }, [persist]);

  const cities = useMemo(() => {
    const set = new Set(shops.map(s => s.city).filter(Boolean));
    return Array.from(set).sort();
  }, [shops]);

  const replaceAll = useCallback((newShops: Shop[]) => {
    persist(newShops);
  }, [persist]);

  return { shops, cities, addShop, updateShop, deleteShop, replaceAll };
}
