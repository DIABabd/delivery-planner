import type { Shop, DailyRoute, ShopGroup } from '../types';
import { supabase } from './supabase';

export interface HomeAddress {
  address: string;
  city: string;
  lat: number;
  lng: number;
}

// ── Shops ─────────────────────────────────────────────────────

export async function loadShops(): Promise<Shop[]> {
  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) { console.error('loadShops error:', error); return []; }
  if (!data) return [];

  return data.map(row => ({
    id: row.id,
    name: row.name ?? '',
    address: row.address,
    city: row.city,
    district: row.district ?? '',
    notes: row.notes ?? '',
    lat: row.lat,
    lng: row.lng,
    createdAt: row.created_at,
  }));
}

export async function saveShop(shop: Omit<Shop, 'id' | 'createdAt'>): Promise<Shop | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { console.error('saveShop: no user'); return null; }

  const { data, error } = await supabase
    .from('shops')
    .insert({
      user_id: user.id,
      name: shop.name,
      address: shop.address,
      city: shop.city,
      district: shop.district,
      notes: shop.notes,
      lat: shop.lat,
      lng: shop.lng,
    })
    .select()
    .single();

  if (error) { console.error('saveShop error:', error); return null; }
  if (!data) return null;

  return {
    id: data.id,
    name: data.name ?? '',
    address: data.address,
    city: data.city,
    district: data.district ?? '',
    notes: data.notes ?? '',
    lat: data.lat,
    lng: data.lng,
    createdAt: data.created_at,
  };
}

export async function updateShopInDb(id: string, updates: Partial<Shop>): Promise<boolean> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.address !== undefined) dbUpdates.address = updates.address;
  if (updates.city !== undefined) dbUpdates.city = updates.city;
  if (updates.district !== undefined) dbUpdates.district = updates.district;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
  if (updates.lat !== undefined) dbUpdates.lat = updates.lat;
  if (updates.lng !== undefined) dbUpdates.lng = updates.lng;

  const { error } = await supabase
    .from('shops')
    .update(dbUpdates)
    .eq('id', id);

  return !error;
}

export async function deleteShopFromDb(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('shops')
    .delete()
    .eq('id', id);

  return !error;
}

// ── Home Address ──────────────────────────────────────────────

export async function loadHome(): Promise<HomeAddress | null> {
  const { data, error } = await supabase
    .from('home_addresses')
    .select('*')
    .single();

  if (error || !data) return null;

  return {
    address: data.address,
    city: data.city,
    lat: data.lat,
    lng: data.lng,
  };
}

export async function saveHome(home: HomeAddress | null): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  if (!home) {
    await supabase.from('home_addresses').delete().eq('user_id', user.id);
    return;
  }

  // Upsert: insert or update if exists
  await supabase.from('home_addresses').upsert({
    user_id: user.id,
    address: home.address,
    city: home.city,
    lat: home.lat,
    lng: home.lng,
  }, { onConflict: 'user_id' });
}

// ── Routes ────────────────────────────────────────────────────

export async function loadRoutes(): Promise<DailyRoute[]> {
  const { data, error } = await supabase
    .from('routes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map(row => ({
    date: row.date,
    shopIds: row.shop_ids,
    optimized: row.optimized,
  }));
}

export async function saveRoute(route: {
  name?: string;
  date?: string;
  shopIds: string[];
  optimized: boolean;
  distanceKm?: number;
  durationSec?: number;
}): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from('routes').insert({
    user_id: user.id,
    name: route.name,
    date: route.date,
    shop_ids: route.shopIds,
    optimized: route.optimized,
    distance_km: route.distanceKm,
    duration_sec: route.durationSec,
  });

  return !error;
}

// ── Groups ───────────────────────────────────────────────────

export async function loadGroups(): Promise<ShopGroup[]> {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) { console.error('loadGroups error:', error); return []; }
  if (!data) return [];

  return data.map(row => ({
    id: row.id,
    name: row.name,
    shopIds: row.shop_ids ?? [],
    createdAt: row.created_at,
  }));
}

export async function saveGroup(name: string, shopIds: string[]): Promise<ShopGroup | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { console.error('saveGroup: no user'); return null; }

  const { data, error } = await supabase
    .from('groups')
    .insert({ user_id: user.id, name, shop_ids: shopIds })
    .select()
    .single();

  if (error) { console.error('saveGroup error:', error); return null; }
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    shopIds: data.shop_ids ?? [],
    createdAt: data.created_at,
  };
}

export async function updateGroupInDb(id: string, updates: { name?: string; shopIds?: string[] }): Promise<boolean> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.shopIds !== undefined) dbUpdates.shop_ids = updates.shopIds;

  const { error } = await supabase
    .from('groups')
    .update(dbUpdates)
    .eq('id', id);

  return !error;
}

export async function deleteGroupFromDb(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', id);

  return !error;
}

// ── Export / Import ───────────────────────────────────────────

export async function exportData(): Promise<string> {
  const shops = await loadShops();
  const routes = await loadRoutes();
  const home = await loadHome();

  return JSON.stringify({
    shops,
    routes,
    home,
    exportedAt: new Date().toISOString(),
  }, null, 2);
}

export async function importData(json: string): Promise<{ shops: Shop[]; routes: DailyRoute[] }> {
  const data = JSON.parse(json);
  if (!Array.isArray(data.shops)) throw new Error('Invalid data: missing shops array');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not logged in');

  // Insert all shops
  const shopRows = data.shops.map((s: Shop) => ({
    user_id: user.id,
    name: s.name ?? '',
    address: s.address,
    city: s.city,
    district: s.district ?? '',
    notes: s.notes ?? '',
    lat: s.lat,
    lng: s.lng,
  }));

  if (shopRows.length > 0) {
    await supabase.from('shops').insert(shopRows);
  }

  // Import home if present
  if (data.home) {
    await saveHome(data.home);
  }

  const shops = await loadShops();
  const routes = await loadRoutes();
  return { shops, routes };
}
