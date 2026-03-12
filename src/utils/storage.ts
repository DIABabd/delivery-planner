import type { Shop, DailyRoute } from '../types';

const SHOPS_KEY = 'dp_shops';
const ROUTES_KEY = 'dp_routes';
const HOME_KEY = 'dp_home';

export interface HomeAddress {
  address: string;
  city: string;
  lat: number;
  lng: number;
}

export function loadHome(): HomeAddress | null {
  try {
    const raw = localStorage.getItem(HOME_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveHome(home: HomeAddress | null) {
  if (home) {
    localStorage.setItem(HOME_KEY, JSON.stringify(home));
  } else {
    localStorage.removeItem(HOME_KEY);
  }
}

export function loadShops(): Shop[] {
  try {
    const raw = localStorage.getItem(SHOPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveShops(shops: Shop[]) {
  localStorage.setItem(SHOPS_KEY, JSON.stringify(shops));
}

export function loadRoutes(): DailyRoute[] {
  try {
    const raw = localStorage.getItem(ROUTES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRoutes(routes: DailyRoute[]) {
  localStorage.setItem(ROUTES_KEY, JSON.stringify(routes));
}

export function exportData(): string {
  return JSON.stringify({
    shops: loadShops(),
    routes: loadRoutes(),
    home: loadHome(),
    exportedAt: new Date().toISOString(),
  }, null, 2);
}

export function importData(json: string): { shops: Shop[]; routes: DailyRoute[] } {
  const data = JSON.parse(json);
  if (!Array.isArray(data.shops)) throw new Error('Invalid data: missing shops array');
  saveShops(data.shops);
  saveRoutes(data.routes || []);
  if (data.home) saveHome(data.home);
  return { shops: data.shops, routes: data.routes || [] };
}
