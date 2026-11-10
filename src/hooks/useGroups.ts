import { useState, useCallback, useEffect } from 'react';
import type { ShopGroup } from '../types';
import { fetchGroups, saveGroup, updateGroupInDb, deleteGroupFromDb } from '../utils/storage';
import { CACHE_KEYS, readCache, writeCache } from '../utils/localCache';

export function useGroups() {
  const [groups, setGroups] = useState<ShopGroup[]>(() => readCache<ShopGroup[]>(CACHE_KEYS.groups, []));

  useEffect(() => {
    writeCache(CACHE_KEYS.groups, groups);
  }, [groups]);

  const reload = useCallback(async () => {
    const data = await fetchGroups();
    if (data) setGroups(data);
  }, []);

  const clear = useCallback(() => setGroups([]), []);

  const addGroup = useCallback(async (name: string, shopIds: string[]) => {
    const group = await saveGroup(name, shopIds);
    if (group) setGroups(prev => [...prev, group]);
    return group;
  }, []);

  const updateGroup = useCallback(async (id: string, updates: { name?: string; shopIds?: string[] }) => {
    const ok = await updateGroupInDb(id, updates);
    if (ok) {
      setGroups(prev => prev.map(g =>
        g.id === id ? { ...g, ...updates } : g
      ));
    }
    return ok;
  }, []);

  const deleteGroup = useCallback(async (id: string) => {
    const ok = await deleteGroupFromDb(id);
    if (ok) setGroups(prev => prev.filter(g => g.id !== id));
    return ok;
  }, []);

  return { groups, reload, clear, addGroup, updateGroup, deleteGroup };
}
