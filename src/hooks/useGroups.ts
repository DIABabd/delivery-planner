import { useState, useCallback } from 'react';
import type { ShopGroup } from '../types';
import { loadGroups, saveGroup, updateGroupInDb, deleteGroupFromDb } from '../utils/storage';

export function useGroups() {
  const [groups, setGroups] = useState<ShopGroup[]>([]);

  const reload = useCallback(async () => {
    const data = await loadGroups();
    setGroups(data);
  }, []);

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

  return { groups, reload, addGroup, updateGroup, deleteGroup };
}
