export interface Shop {
  id: string;
  name: string;
  address: string;
  city: string;
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

export type TabId = 'shops' | 'route';
