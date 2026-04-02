export interface Shop {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string;
  notes: string;
  lat: number | null;
  lng: number | null;
  createdAt: string;
}

export interface DailyRoute {
  date: string;
  shopIds: string[];
  optimized: boolean;
}

export interface ShopGroup {
  id: string;
  name: string;
  shopIds: string[];
  createdAt: string;
}

export interface RouteHistoryEntry {
  id: string;
  completedAt: string;
  shopIds: string[];
  shopNames: string[];
  totalShops: number;
  doneShops: number;
  distanceKm: number | null;
  durationMin: number | null;
}

export type TabId = 'shops' | 'route';
