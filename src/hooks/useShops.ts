import { useState, useCallback, useEffect } from 'react';
import type { Shop } from '../types';
import { fetchShops, saveShop, updateShopInDb, deleteShopFromDb } from '../utils/storage';
import { CACHE_KEYS, readCache, writeCache } from '../utils/localCache';

export function useShops() {
  const [shops, setShops] = useState<Shop[]>(() => readCache<Shop[]>(CACHE_KEYS.shops, []));
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
    return ok;
  }, []);

  const deleteShop = useCallback(async (id: string) => {
    const ok = await deleteShopFromDb(id);
    if (ok) {
      setShops(prev => prev.filter(s => s.id !== id));
    }
  }, []);

  // Keep the on-phone copy in step with what is on screen.
  useEffect(() => {
    writeCache(CACHE_KEYS.shops, shops);
  }, [shops]);

  // If the request fails (no signal), keep the shops we already have.
  const reload = useCallback(async () => {
    setLoading(true);
    const data = await fetchShops();
    if (data) setShops(data);
    setLoading(false);
  }, []);

  const clear = useCallback(() => setShops([]), []);

  return { shops, loading, addShop, updateShop, deleteShop, replaceAll: reload, reload, clear };
}
