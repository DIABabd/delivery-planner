import { useState, useCallback } from 'react';
import type { Shop } from '../types';
import { loadShops, saveShop, updateShopInDb, deleteShopFromDb } from '../utils/storage';

export function useShops() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  const addShop = useCallback(async (shop: Omit<Shop, 'id' | 'createdAt'>) => {
    const newShop = await saveShop(shop);
    if (newShop) {
      setShops(prev => [...prev, newShop]);
    }
    return newShop;
  }, []);

  const updateShop = useCallback(async (id: string, updates: Partial<Shop>) => {
    const ok = await updateShopInDb(id, updates);
    if (ok) {
      setShops(prev => prev.map(s => (s.id === id ? { ...s, ...updates } : s)));
    }
  }, []);

  const deleteShop = useCallback(async (id: string) => {
    const ok = await deleteShopFromDb(id);
    if (ok) {
      setShops(prev => prev.filter(s => s.id !== id));
    }
  }, []);

  const replaceAll = useCallback(async () => {
    const data = await loadShops();
    setShops(data);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    const data = await loadShops();
    setShops(data);
    setLoading(false);
  }, []);

  return { shops, loading, addShop, updateShop, deleteShop, replaceAll, reload };
}