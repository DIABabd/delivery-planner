# Delivery Planner — Complete Project Documentation

## Overview

A mobile-first PWA for delivery route planning, built for small delivery businesses in Germany (Bremen area). The app lets users manage shops (delivery stops), optimize multi-stop delivery routes using real road data, and navigate via Google Maps.

**Live:** Hosted on GitHub Pages as a static site.
**Stack:** React 19 + TypeScript + Vite 7 + Tailwind CSS 4 + Leaflet maps.
**Data:** All data stored in browser localStorage. No backend. No database.
**Auth:** Simple SHA-256 hash-based login with a hardcoded hash.

---

## Tech Stack

- **React 19.2.0** — UI framework
- **TypeScript 5.9.3** — strict mode
- **Vite 7.3.1** — build tool with HMR
- **Tailwind CSS 4.2.1** — styling (via @tailwindcss/vite plugin)
- **Leaflet 1.9.4 + react-leaflet 5.0.0** — interactive maps
- **ESLint 9.39.1** — linting

No state management library (just React hooks). No backend. No database.

---

## Project Structure

```
delivery-planner/
├── src/
│   ├── main.tsx                  # React entry point
│   ├── App.tsx                   # Root component — auth check, tab routing, state orchestration
│   ├── types.ts                  # Shop, DailyRoute, TabId types
│   ├── index.css                 # Tailwind imports + Leaflet CSS overrides
│   ├── components/
│   │   ├── BottomNav.tsx         # Tab navigation (Shops / Route)
│   │   ├── CityFilter.tsx        # Dropdown filters for city and district
│   │   ├── HomeForm.tsx          # Modal to set/edit home address
│   │   ├── LoginScreen.tsx       # Login form
│   │   ├── RouteMap.tsx          # Leaflet map with all markers and route polyline
│   │   ├── RoutePlanner.tsx      # Checkbox list to select shops for route optimization
│   │   ├── RouteStopList.tsx     # Ordered list of optimized stops with drag reorder
│   │   ├── ShopCard.tsx          # Individual shop display card
│   │   ├── ShopForm.tsx          # Modal to add/edit a shop with address autocomplete
│   │   └── ShopList.tsx          # Vertical list of ShopCards
│   ├── hooks/
│   │   ├── useShops.ts           # Shop CRUD state + localStorage persistence
│   │   └── useRoute.ts           # Route selection, optimization, geometry state
│   └── utils/
│       ├── auth.ts               # SHA-256 hash login, session check, logout
│       ├── geocode.ts            # Nominatim geocoding + address autocomplete
│       ├── navigation.ts         # Google Maps navigation links
│       ├── routeOptimizer.ts     # TSP solver (Held-Karp + NN+2-Opt) with OSRM
│       └── storage.ts            # localStorage read/write for shops, routes, home
├── public/
│   ├── manifest.json             # PWA manifest
│   ├── sw.js                     # Service worker (cache-first for app shell)
│   └── icon.svg                  # App icon
├── package.json
├── vite.config.ts                # Vite config (base: /delivery-planner/ for GitHub Pages)
├── tsconfig.app.json
├── eslint.config.js
├── index.html
└── .github/workflows/deploy.yml  # GitHub Actions: build + deploy to GitHub Pages
```

---

## Data Model

### Types (src/types.ts)

```typescript
export interface Shop {
  id: string;           // crypto.randomUUID()
  name: string;         // shop name (optional)
  address: string;      // street address
  city: string;         // city name
  district: string;     // district/Stadtteil
  notes: string;        // user notes
  lat: number | null;   // latitude (from geocoding)
  lng: number | null;   // longitude (from geocoding)
  createdAt: string;    // ISO timestamp
}

export interface DailyRoute {
  date: string;         // ISO date
  shopIds: string[];    // ordered array of shop IDs
  optimized: boolean;   // was this route optimized?
}

export type TabId = 'shops' | 'route';
```

### HomeAddress (src/utils/storage.ts)

```typescript
export interface HomeAddress {
  address: string;
  city: string;
  lat: number;
  lng: number;
}
```

### localStorage Keys
- `dp_shops` — JSON array of Shop objects
- `dp_routes` — JSON array of DailyRoute objects (defined but not actively used for persistence)
- `dp_home` — JSON HomeAddress object
- `dp_auth` — session hash string

---

## Complete Source Code

### src/App.tsx
```typescript
import { useState } from 'react';
import type { TabId } from './types';
import { useShops } from './hooks/useShops';
import { useRoute } from './hooks/useRoute';
import { isLoggedIn, logout } from './utils/auth';
import { loadHome, saveHome, type HomeAddress } from './utils/storage';
import { LoginScreen } from './components/LoginScreen';
import { BottomNav } from './components/BottomNav';
import { RouteMap } from './components/RouteMap';
import { ShopsPage } from './pages/ShopsPage';
import { RoutePage } from './pages/RoutePage';

function App() {
  const [authed, setAuthed] = useState(isLoggedIn);
  const [tab, setTab] = useState<TabId>('shops');
  const [home, setHome] = useState<HomeAddress | null>(() => loadHome());
  const { shops, addShop, updateShop, deleteShop, replaceAll } = useShops();
  const {
    selectedIds, orderedStops, isOptimized, userLocation, locating, routeInfo, routeGeometry,
    toggleShop, selectAll, clearSelection, optimize, reorderStops,
  } = useRoute();

  if (!authed) {
    return <LoginScreen onLogin={() => setAuthed(true)} />;
  }

  const handleLogout = () => {
    logout();
    setAuthed(false);
  };

  const handleHomeChange = (h: HomeAddress | null) => {
    setHome(h);
    saveHome(h);
  };

  return (
    <div className="flex flex-col h-dvh bg-gray-50">
      <div className="h-[40vh] min-h-[200px] shrink-0 border-b border-gray-300">
        <RouteMap
          allShops={shops}
          routeStops={orderedStops}
          userLocation={userLocation}
          home={home}
          routeGeometry={routeGeometry}
        />
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto">
          {tab === 'shops' && (
            <ShopsPage
              shops={shops}
              home={home}
              onAdd={addShop}
              onUpdate={updateShop}
              onDelete={deleteShop}
              onReplaceAll={replaceAll}
              onHomeChange={handleHomeChange}
              onLogout={handleLogout}
            />
          )}
          {tab === 'route' && (
            <RoutePage
              shops={shops}
              selectedIds={selectedIds}
              orderedStops={orderedStops}
              isOptimized={isOptimized}
              locating={locating}
              userLocation={userLocation}
              home={home}
              routeInfo={routeInfo}
              onToggle={toggleShop}
              onSelectAll={selectAll}
              onClear={clearSelection}
              onOptimize={() => optimize(shops, home?.lat, home?.lng)}
              onReorder={reorderStops}
            />
          )}
        </div>
        <BottomNav active={tab} onChange={setTab} />
      </div>
    </div>
  );
}

export default App;
```

### src/utils/auth.ts
```typescript
const VALID_HASH = 'b79e885b8738701289d506b9bb5d0fb808929214ee55238f9c81df3caa746f9d';
const SESSION_KEY = 'dp_auth';

async function sha256(text: string): Promise<string> {
  const encoded = new TextEncoder().encode(text);
  const buffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function login(username: string, password: string): Promise<boolean> {
  const hash = await sha256(username.toLowerCase().trim() + ':' + password);
  if (hash === VALID_HASH) {
    localStorage.setItem(SESSION_KEY, hash);
    return true;
  }
  return false;
}

export function isLoggedIn(): boolean {
  return localStorage.getItem(SESSION_KEY) === VALID_HASH;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}
```

### src/utils/storage.ts
```typescript
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
  } catch { return null; }
}

export function saveHome(home: HomeAddress | null) {
  if (home) localStorage.setItem(HOME_KEY, JSON.stringify(home));
  else localStorage.removeItem(HOME_KEY);
}

export function loadShops(): Shop[] {
  try {
    const raw = localStorage.getItem(SHOPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveShops(shops: Shop[]) {
  localStorage.setItem(SHOPS_KEY, JSON.stringify(shops));
}

export function loadRoutes(): DailyRoute[] {
  try {
    const raw = localStorage.getItem(ROUTES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
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
```

### src/utils/geocode.ts
```typescript
interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
  district: string;
  city: string;
}

export interface PlaceSuggestion {
  name: string;
  address: string;
  city: string;
  district: string;
  lat: number;
  lng: number;
  displayName: string;
  isBremen: boolean;
}

let lastRequestTime = 0;

async function throttle() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < 1100) {
    await new Promise(r => setTimeout(r, 1100 - elapsed));
  }
  lastRequestTime = Date.now();
}

export async function geocodeAddress(address: string, city: string): Promise<GeocodingResult | null> {
  await throttle();
  const query = encodeURIComponent(`${address}, ${city}, Germany`);
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=de&addressdetails=1`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'DeliveryRoutePlanner/1.0' },
  });
  if (!res.ok) return null;

  const data = await res.json();
  if (!data.length) return null;

  const item = data[0];
  const addr = item.address as Record<string, string> | undefined;
  const resultCity = addr?.city || addr?.town || addr?.village || addr?.municipality || extractCity(item.display_name);
  const district = addr?.suburb || addr?.city_district || addr?.quarter || '';

  return {
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    displayName: item.display_name,
    district,
    city: resultCity,
  };
}

function extractCity(displayName: string): string {
  const parts = displayName.split(',').map(p => p.trim());
  const cityPart = parts.find(p =>
    /^(Bremen|Hamburg|Berlin|München|Köln|Frankfurt|Stuttgart|Düsseldorf|Hannover|Dortmund|Essen|Leipzig|Dresden|Nürnberg|Bremerhaven|Oldenburg|Delmenhorst|Verden|Achim|Stuhr|Weyhe|Lilienthal|Schwanewede|Oyten)/i.test(p)
  );
  if (cityPart) return cityPart;
  if (parts.length >= 5) return parts[parts.length - 4];
  if (parts.length >= 3) return parts[parts.length - 3];
  return parts[1] || parts[0] || '';
}

function extractAddress(displayName: string, shopName: string): string {
  const parts = displayName.split(',').map(p => p.trim());
  const filtered = parts.filter(p =>
    p !== shopName &&
    !/^\d{5}$/.test(p) &&
    p !== 'Deutschland' &&
    p !== 'Germany'
  );
  if (filtered.length >= 3) return filtered.slice(1, 3).join(', ');
  return filtered.slice(0, 2).join(', ');
}

export async function searchAddresses(query: string): Promise<PlaceSuggestion[]> {
  if (query.trim().length < 2) return [];
  await throttle();

  const q = encodeURIComponent(query);
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=15&countrycodes=de&addressdetails=1&viewbox=8.5,53.2,9.0,52.9&bounded=0`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'DeliveryRoutePlanner/1.0' },
  });
  if (!res.ok) return [];

  const data = await res.json();

  const suggestions: PlaceSuggestion[] = data.map((item: Record<string, unknown>) => {
    const addr = item.address as Record<string, string> | undefined;
    const city = addr?.city || addr?.town || addr?.village || addr?.municipality || extractCity(item.display_name as string);
    const district = addr?.suburb || addr?.city_district || addr?.quarter || '';
    const road = addr?.road || '';
    const houseNumber = addr?.house_number || '';
    const streetAddr = road ? (houseNumber ? `${road} ${houseNumber}` : road) : extractAddress(item.display_name as string, item.name as string || '');
    const isBremen = /bremen/i.test(city) || /bremen/i.test(item.display_name as string);

    return { name: (item.name as string) || '', address: streetAddr, city, district, lat: parseFloat(item.lat as string), lng: parseFloat(item.lon as string), displayName: item.display_name as string, isBremen };
  });

  suggestions.sort((a, b) => {
    if (a.isBremen && !b.isBremen) return -1;
    if (!a.isBremen && b.isBremen) return 1;
    return 0;
  });

  return suggestions;
}
```

### src/utils/routeOptimizer.ts
```typescript
import type { Shop } from '../types';

interface OSRMTableResponse {
  code: string;
  durations: number[][];
  distances: number[][];
}

async function fetchTimeMatrix(
  coordinates: [number, number][],
): Promise<{ durations: number[][]; distances: number[][] } | null> {
  const coords = coordinates.map(c => `${c[0]},${c[1]}`).join(';');
  const url = `https://router.project-osrm.org/table/v1/driving/${coords}?annotations=duration,distance`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data: OSRMTableResponse = await res.json();
    if (data.code !== 'Ok') return null;
    return { durations: data.durations, distances: data.distances };
  } catch { return null; }
}

interface OSRMRouteResponse {
  code: string;
  routes: Array<{ geometry: string; distance: number; duration: number }>;
}

async function fetchRouteGeometry(
  coordinates: [number, number][],
): Promise<{ geometry: [number, number][]; distance: number; duration: number } | null> {
  const coords = coordinates.map(c => `${c[0]},${c[1]}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data: OSRMRouteResponse = await res.json();
    if (data.code !== 'Ok' || !data.routes.length) return null;
    const route = data.routes[0];
    const geojson = route.geometry as unknown as { coordinates: [number, number][] };
    const geometry: [number, number][] = geojson.coordinates.map(([lng, lat]) => [lat, lng]);
    return { geometry, distance: route.distance / 1000, duration: route.duration };
  } catch { return null; }
}

// TSP Solver: Held-Karp (exact, for <= 18 nodes)
function heldKarpTSP(matrix: number[][], startIdx: number, endIdx: number | null): number[] {
  const n = matrix.length;
  if (n <= 2) return Array.from({ length: n }, (_, i) => i);

  const fixedEnd = endIdx != null && endIdx !== startIdx;
  const visitNodes: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i !== startIdx && (!fixedEnd || i !== endIdx)) visitNodes.push(i);
  }

  const m = visitNodes.length;
  if (m > 18) return nnTwoOptTSP(matrix, startIdx, endIdx);

  const FULL = (1 << m) - 1;
  const dp: number[][] = Array.from({ length: 1 << m }, () => new Array(m).fill(Infinity));
  const parent: number[][] = Array.from({ length: 1 << m }, () => new Array(m).fill(-1));

  for (let i = 0; i < m; i++) {
    dp[1 << i][i] = matrix[startIdx][visitNodes[i]];
  }

  for (let mask = 1; mask <= FULL; mask++) {
    for (let last = 0; last < m; last++) {
      if (!(mask & (1 << last))) continue;
      if (dp[mask][last] === Infinity) continue;
      for (let next = 0; next < m; next++) {
        if (mask & (1 << next)) continue;
        const newMask = mask | (1 << next);
        const cost = dp[mask][last] + matrix[visitNodes[last]][visitNodes[next]];
        if (cost < dp[newMask][next]) {
          dp[newMask][next] = cost;
          parent[newMask][next] = last;
        }
      }
    }
  }

  let bestLast = 0;
  let bestCost = Infinity;
  for (let last = 0; last < m; last++) {
    let cost = dp[FULL][last];
    if (fixedEnd) cost += matrix[visitNodes[last]][endIdx!];
    if (cost < bestCost) { bestCost = cost; bestLast = last; }
  }

  const path: number[] = [];
  let mask = FULL;
  let cur = bestLast;
  while (cur !== -1) {
    path.push(visitNodes[cur]);
    const prev = parent[mask][cur];
    mask ^= (1 << cur);
    cur = prev;
  }
  path.reverse();

  const result = [startIdx, ...path];
  if (fixedEnd) result.push(endIdx!);
  return result;
}

// Nearest-Neighbor + 2-Opt (for larger sets)
function nnTwoOptTSP(matrix: number[][], startIdx: number, endIdx: number | null): number[] {
  const n = matrix.length;
  const fixedEnd = endIdx != null && endIdx !== startIdx;
  const toVisit = new Set<number>();
  for (let i = 0; i < n; i++) {
    if (i !== startIdx && (!fixedEnd || i !== endIdx)) toVisit.add(i);
  }

  const path: number[] = [startIdx];
  let current = startIdx;
  while (toVisit.size > 0) {
    let bestNode = -1;
    let bestDist = Infinity;
    for (const node of toVisit) {
      if (matrix[current][node] < bestDist) { bestDist = matrix[current][node]; bestNode = node; }
    }
    path.push(bestNode);
    toVisit.delete(bestNode);
    current = bestNode;
  }
  if (fixedEnd) path.push(endIdx!);

  const lastSwappable = fixedEnd ? path.length - 2 : path.length - 1;
  const routeCost = (p: number[]) => {
    let cost = 0;
    for (let i = 0; i < p.length - 1; i++) cost += matrix[p[i]][p[i + 1]];
    return cost;
  };

  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < lastSwappable; i++) {
      for (let j = i + 1; j <= lastSwappable; j++) {
        const newPath = [...path];
        let left = i, right = j;
        while (left < right) {
          [newPath[left], newPath[right]] = [newPath[right], newPath[left]];
          left++; right--;
        }
        if (routeCost(newPath) < routeCost(path)) {
          for (let k = i; k <= j; k++) path[k] = newPath[k];
          improved = true;
        }
      }
    }
  }
  return path;
}

// Haversine fallback
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function haversineFallback(coords: [number, number][], startIdx: number, endIdx: number | null): number[] {
  const n = coords.length;
  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = haversineDistance(coords[i][1], coords[i][0], coords[j][1], coords[j][0]);
      matrix[i][j] = d; matrix[j][i] = d;
    }
  }
  return nnTwoOptTSP(matrix, startIdx, endIdx);
}

// Public API
export interface OptimizeResult {
  shops: Shop[];
  distance: number;
  duration: number;
  usedOSRM: boolean;
  routeGeometry: [number, number][] | null;
}

export async function optimizeRoute(
  shops: Shop[], startLat?: number, startLng?: number, homeLat?: number, homeLng?: number,
): Promise<OptimizeResult> {
  const valid = shops.filter(s => s.lat != null && s.lng != null);
  if (valid.length === 0) return { shops: [], distance: 0, duration: 0, usedOSRM: false, routeGeometry: null };
  if (valid.length === 1) return { shops: valid, distance: 0, duration: 0, usedOSRM: false, routeGeometry: null };

  // Build coordinate list: [start?] + shops + [home?] — OSRM uses [lng, lat]
  const coords: [number, number][] = [];
  const hasStart = startLat != null && startLng != null;
  const hasHome = homeLat != null && homeLng != null;

  if (hasStart) coords.push([startLng!, startLat!]);
  for (const s of valid) coords.push([s.lng!, s.lat!]);
  if (hasHome) coords.push([homeLng!, homeLat!]);

  const startIdx = 0;
  const endIdx = hasHome ? coords.length - 1 : null;
  const shopOffset = hasStart ? 1 : 0;

  const matrix = await fetchTimeMatrix(coords);
  let orderedIndices: number[];
  let usedOSRM = false;

  if (matrix) {
    orderedIndices = heldKarpTSP(matrix.durations, startIdx, endIdx);
    usedOSRM = true;
  } else {
    orderedIndices = haversineFallback(coords, startIdx, endIdx);
  }

  const shopIndices = orderedIndices.filter(i => {
    if (hasStart && i === 0) return false;
    if (hasHome && i === coords.length - 1) return false;
    return true;
  });

  const orderedShops = shopIndices.map(i => i - shopOffset).filter(i => i >= 0 && i < valid.length).map(i => valid[i]);
  const orderedCoords: [number, number][] = orderedIndices.map(i => coords[i]);

  let routeGeometry: [number, number][] | null = null;
  let distance = 0;
  let duration = 0;

  const geoResult = await fetchRouteGeometry(orderedCoords);
  if (geoResult) {
    routeGeometry = geoResult.geometry; distance = geoResult.distance; duration = geoResult.duration;
  } else if (matrix) {
    for (let i = 0; i < orderedIndices.length - 1; i++) {
      duration += matrix.durations[orderedIndices[i]][orderedIndices[i + 1]];
      distance += matrix.distances[orderedIndices[i]][orderedIndices[i + 1]] / 1000;
    }
  } else {
    for (let i = 0; i < orderedIndices.length - 1; i++) {
      distance += haversineDistance(
        coords[orderedIndices[i]][1], coords[orderedIndices[i]][0],
        coords[orderedIndices[i + 1]][1], coords[orderedIndices[i + 1]][0],
      );
    }
  }

  return { shops: orderedShops, distance, duration, usedOSRM, routeGeometry };
}
```

### src/utils/navigation.ts
```typescript
interface Stop { lat: number; lng: number; }

export function openSingleNavigation(lat: number, lng: number) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  window.open(url, '_blank');
}

export function openFullRoute(stops: Stop[], userLocation?: { lat: number; lng: number } | null) {
  if (stops.length === 0) return;
  if (stops.length === 1) { openSingleNavigation(stops[0].lat, stops[0].lng); return; }

  const origin = userLocation
    ? `${userLocation.lat},${userLocation.lng}`
    : `${stops[0].lat},${stops[0].lng}`;
  const destination = `${stops[stops.length - 1].lat},${stops[stops.length - 1].lng}`;

  const waypoints = userLocation ? stops.slice(0, -1) : stops.slice(1, -1);
  const maxWaypoints = 9;
  const wpSlice = waypoints.slice(0, maxWaypoints);
  const wpStr = wpSlice.map(s => `${s.lat},${s.lng}`).join('|');
  const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${wpStr ? `&waypoints=${wpStr}` : ''}&travelmode=driving`;
  window.open(url, '_blank');
}
```

### src/hooks/useShops.ts
```typescript
import { useState, useCallback } from 'react';
import type { Shop } from '../types';
import { loadShops, saveShops } from '../utils/storage';

export function useShops() {
  const [shops, setShops] = useState<Shop[]>(() => loadShops());

  const persist = useCallback((updated: Shop[]) => {
    setShops(updated);
    saveShops(updated);
  }, []);

  const addShop = useCallback((shop: Omit<Shop, 'id' | 'createdAt'>) => {
    const newShop: Shop = { ...shop, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
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

  const replaceAll = useCallback((newShops: Shop[]) => {
    persist(newShops);
  }, [persist]);

  return { shops, addShop, updateShop, deleteShop, replaceAll };
}
```

### src/hooks/useRoute.ts
```typescript
import { useState, useCallback } from 'react';
import type { Shop } from '../types';
import { optimizeRoute, type OptimizeResult } from '../utils/routeOptimizer';

export function useRoute() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [orderedStops, setOrderedStops] = useState<Shop[]>([]);
  const [isOptimized, setIsOptimized] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number; usedOSRM: boolean } | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | null>(null);

  const toggleShop = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setIsOptimized(false); setOrderedStops([]); setRouteInfo(null); setRouteGeometry(null);
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
    setIsOptimized(false); setOrderedStops([]); setRouteInfo(null); setRouteGeometry(null);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set()); setOrderedStops([]); setIsOptimized(false); setRouteInfo(null); setRouteGeometry(null);
  }, []);

  const fetchLocation = useCallback((): Promise<[number, number] | null> => {
    return new Promise(resolve => {
      if (!navigator.geolocation) { resolve(null); return; }
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        pos => { const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude]; setUserLocation(loc); setLocating(false); resolve(loc); },
        () => { setLocating(false); resolve(null); },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  const optimize = useCallback(async (allShops: Shop[], homeLat?: number, homeLng?: number) => {
    setLocating(true);
    const selected = allShops.filter(s => selectedIds.has(s.id));
    const loc = await fetchLocation();
    const result: OptimizeResult = await optimizeRoute(selected, loc ? loc[0] : undefined, loc ? loc[1] : undefined, homeLat, homeLng);
    setOrderedStops(result.shops);
    setRouteInfo({ distance: result.distance, duration: result.duration, usedOSRM: result.usedOSRM });
    setRouteGeometry(result.routeGeometry);
    setIsOptimized(true);
    setLocating(false);
  }, [selectedIds, fetchLocation]);

  const reorderStops = useCallback((fromIndex: number, toIndex: number) => {
    setOrderedStops(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  return { selectedIds, orderedStops, isOptimized, userLocation, locating, routeInfo, routeGeometry, toggleShop, selectAll, clearSelection, optimize, reorderStops };
}
```

### src/components/LoginScreen.tsx
```typescript
import { useState } from 'react';
import { login } from '../utils/auth';

interface Props { onLogin: () => void; }

export function LoginScreen({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    const ok = await login(username, password);
    setLoading(false);
    if (ok) onLogin(); else setError('Invalid username or password');
  };

  return (
    <div className="h-dvh flex items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🚚</div>
          <h1 className="text-2xl font-bold text-gray-900">Route Planner</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to continue</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" autoComplete="username" autoFocus required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" autoComplete="current-password" required />
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

### src/components/RouteMap.tsx
```typescript
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';
import type { Shop } from '../types';
import type { HomeAddress } from '../utils/storage';
import { openSingleNavigation } from '../utils/navigation';

function createNumberedIcon(num: number) {
  return L.divIcon({
    className: '',
    html: `<div style="background:#2563eb;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${num}</div>`,
    iconSize: [28, 28], iconAnchor: [14, 14],
  });
}

const shopPinIcon = L.divIcon({
  className: '',
  html: `<div style="background:#dc2626;width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);"><div style="background:white;width:8px;height:8px;border-radius:50%;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);"></div></div>`,
  iconSize: [26, 26], iconAnchor: [13, 26],
});

const homeIcon = L.divIcon({
  className: '',
  html: `<div style="background:#16a34a;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);">🏠</div>`,
  iconSize: [30, 30], iconAnchor: [15, 15],
});

const myLocationIcon = L.divIcon({
  className: '',
  html: `<div style="background:#ef4444;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 2px #ef4444,0 2px 6px rgba(0,0,0,0.3);"></div>`,
  iconSize: [16, 16], iconAnchor: [8, 8],
});

function FitBounds({ allShops, routeStops, userLocation, home }: { allShops: Shop[]; routeStops: Shop[]; userLocation: [number, number] | null; home: HomeAddress | null }) {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = [];
    if (routeStops.length > 0) {
      routeStops.forEach(s => { if (s.lat != null && s.lng != null) points.push([s.lat, s.lng]); });
      if (home) points.push([home.lat, home.lng]);
    } else {
      allShops.forEach(s => { if (s.lat != null && s.lng != null) points.push([s.lat, s.lng]); });
      if (home) points.push([home.lat, home.lng]);
    }
    if (userLocation) points.push(userLocation);
    if (points.length === 0) return;
    if (points.length === 1) { map.setView(points[0], 14); return; }
    map.fitBounds(L.latLngBounds(points), { padding: [30, 30] });
  }, [allShops, routeStops, userLocation, home, map]);
  return null;
}

interface Props {
  allShops: Shop[]; routeStops: Shop[]; userLocation: [number, number] | null;
  home?: HomeAddress | null; routeGeometry?: [number, number][] | null;
}

export function RouteMap({ allShops, routeStops, userLocation, home, routeGeometry }: Props) {
  const allValid = allShops.filter(s => s.lat != null && s.lng != null);
  const routeValid = routeStops.filter(s => s.lat != null && s.lng != null);
  const routeIds = new Set(routeValid.map(s => s.id));
  const defaultCenter: [number, number] = [53.08, 8.80]; // Bremen
  const hasAnything = allValid.length > 0 || userLocation || home;

  const fallbackPositions: [number, number][] = routeValid.map(s => [s.lat!, s.lng!]);
  if (routeValid.length > 0 && home) fallbackPositions.push([home.lat, home.lng]);
  const routePositions = routeGeometry && routeGeometry.length > 0 ? routeGeometry : fallbackPositions;

  return (
    <MapContainer center={hasAnything ? (allValid[0] ? [allValid[0].lat!, allValid[0].lng!] : (home ? [home.lat, home.lng] : (userLocation ?? defaultCenter))) : defaultCenter} zoom={hasAnything ? 13 : 7} className="w-full h-full" zoomControl={false}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitBounds allShops={allValid} routeStops={routeValid} userLocation={userLocation} home={home ?? null} />
      {allValid.filter(s => !routeIds.has(s.id)).map(shop => (
        <Marker key={shop.id} position={[shop.lat!, shop.lng!]} icon={shopPinIcon}>
          <Popup><div className="text-sm"><strong>{shop.name || shop.address}</strong><br />{shop.name ? `${shop.address}, ` : ''}{shop.district ? `${shop.district}, ` : ''}{shop.city}</div></Popup>
        </Marker>
      ))}
      {routeValid.map((stop, i) => (
        <Marker key={stop.id} position={[stop.lat!, stop.lng!]} icon={createNumberedIcon(i + 1)}>
          <Popup><div className="text-sm"><strong>#{i + 1} {stop.name || stop.address}</strong><br />{stop.name ? stop.address : ''}{stop.district ? ` - ${stop.district}` : ''}<br />
            <button onClick={() => openSingleNavigation(stop.lat!, stop.lng!)} style={{ color: '#2563eb', fontWeight: 600, marginTop: 4, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>Navigate here</button>
          </div></Popup>
        </Marker>
      ))}
      {routePositions.length >= 2 && <Polyline positions={routePositions} color="#2563eb" weight={3} opacity={0.7} />}
      {home && <Marker position={[home.lat, home.lng]} icon={homeIcon}><Popup><div className="text-sm"><strong>Home</strong><br />{home.address}, {home.city}</div></Popup></Marker>}
      {userLocation && (<><Marker position={userLocation} icon={myLocationIcon}><Popup>Your location</Popup></Marker><Circle center={userLocation} radius={100} color="#ef4444" fillOpacity={0.1} weight={1} /></>)}
    </MapContainer>
  );
}
```

### src/components/ShopForm.tsx
```typescript
import { useState, useRef, useEffect, useCallback } from 'react';
import type { Shop } from '../types';
import { geocodeAddress, searchAddresses, type PlaceSuggestion } from '../utils/geocode';

interface Props {
  shop?: Shop | null;
  onSave: (data: { name: string; address: string; city: string; district: string; notes: string; lat: number | null; lng: number | null }) => void;
  onClose: () => void;
}

export function ShopForm({ shop, onSave, onClose }: Props) {
  const [name, setName] = useState(shop?.name ?? '');
  const [address, setAddress] = useState(shop?.address ?? '');
  const [city, setCity] = useState(shop?.city ?? '');
  const [district, setDistrict] = useState(shop?.district ?? '');
  const [notes, setNotes] = useState(shop?.notes ?? '');
  const [lat, setLat] = useState<number | null>(shop?.lat ?? null);
  const [lng, setLng] = useState<number | null>(shop?.lng ?? null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const doSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) { setSuggestions([]); return; }
    setSearching(true);
    try { const results = await searchAddresses(query); setSuggestions(results); setShowSuggestions(results.length > 0); }
    catch { setSuggestions([]); }
    setSearching(false);
  }, []);

  const handleAddressChange = (value: string) => {
    setAddress(value); setLat(null); setLng(null); setDistrict(''); setCity('');
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => doSearch(value), 600);
  };

  const selectSuggestion = (s: PlaceSuggestion) => {
    setAddress(s.address); setCity(s.city); setDistrict(s.district); setLat(s.lat); setLng(s.lng);
    setSuggestions([]); setShowSuggestions(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleGeocode = async () => {
    if (!address) return;
    setGeocoding(true); setGeocodeError('');
    try {
      const result = await geocodeAddress(address, city || 'Bremen');
      if (result) { setLat(result.lat); setLng(result.lng); if (result.city) setCity(result.city); if (result.district) setDistrict(result.district); }
      else setGeocodeError('Address not found. You can still save without location.');
    } catch { setGeocodeError('Geocoding failed. Try again later.'); }
    setGeocoding(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;
    onSave({ name: name.trim(), address: address.trim(), city: city.trim(), district: district.trim(), notes: notes.trim(), lat, lng });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-[1100]" onClick={onClose}>
      <div className="bg-white w-full rounded-t-2xl p-4 pb-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{shop ? 'Edit Shop' : 'Add Shop'}</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" placeholder="Shop Name (optional)" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" autoComplete="off" />
          <div className="relative" ref={suggestionsRef}>
            <input type="text" placeholder="Address *" value={address} onChange={e => handleAddressChange(e.target.value)} onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required autoFocus autoComplete="off" />
            {searching && <span className="absolute right-3 top-3 text-xs text-gray-400">Searching...</span>}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto z-[1200]">
                {suggestions.map((s, i) => (
                  <button key={`${s.lat}-${s.lng}-${i}`} type="button" onClick={() => selectSuggestion(s)} className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b border-gray-100 last:border-0">
                    <div className="flex items-start gap-2">
                      {s.isBremen && <span className="shrink-0 mt-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded">Bremen</span>}
                      <div className="min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{s.address}</p><p className="text-xs text-gray-500 truncate">{s.district ? `${s.district}, ` : ''}{s.city}</p></div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <input type="text" placeholder="City" value={city} onChange={e => setCity(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="text" placeholder="District" value={district} onChange={e => setDistrict(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleGeocode} disabled={geocoding || !address} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50">{geocoding ? 'Finding...' : 'Find Location'}</button>
            {lat != null && <span className="text-xs text-green-600">Location set ({lat.toFixed(4)}, {lng?.toFixed(4)})</span>}
          </div>
          {geocodeError && <p className="text-xs text-amber-600">{geocodeError}</p>}
          <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors">{shop ? 'Update Shop' : 'Add Shop'}</button>
        </form>
      </div>
    </div>
  );
}
```

### src/components/HomeForm.tsx
```typescript
import { useState } from 'react';
import { geocodeAddress } from '../utils/geocode';
import type { HomeAddress } from '../utils/storage';

interface Props {
  home: HomeAddress | null;
  onSave: (home: HomeAddress | null) => void;
  onClose: () => void;
}

export function HomeForm({ home, onSave, onClose }: Props) {
  const [address, setAddress] = useState(home?.address ?? '');
  const [city, setCity] = useState(home?.city ?? '');
  const [lat, setLat] = useState<number | null>(home?.lat ?? null);
  const [lng, setLng] = useState<number | null>(home?.lng ?? null);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState('');

  const handleGeocode = async () => {
    if (!address || !city) return;
    setGeocoding(true); setError('');
    try {
      const result = await geocodeAddress(address, city);
      if (result) { setLat(result.lat); setLng(result.lng); }
      else setError('Address not found');
    } catch { setError('Geocoding failed'); }
    setGeocoding(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim() || !city.trim() || lat == null || lng == null) return;
    onSave({ address: address.trim(), city: city.trim(), lat, lng });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-[1100]" onClick={onClose}>
      <div className="bg-white w-full rounded-t-2xl p-4 pb-8" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Home Address</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl">&times;</button>
        </div>
        <p className="text-xs text-gray-500 mb-3">Set your home/office address. The route will end here so you get back home efficiently.</p>
        <form onSubmit={handleSave} className="space-y-3">
          <input type="text" placeholder="Address *" value={address} onChange={e => setAddress(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          <input type="text" placeholder="City *" value={city} onChange={e => setCity(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleGeocode} disabled={geocoding || !address || !city} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50">{geocoding ? 'Finding...' : 'Find Location'}</button>
            {lat != null && <span className="text-xs text-green-600">Location set</span>}
          </div>
          {error && <p className="text-xs text-amber-600">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={lat == null} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50">Save Home</button>
            {home && <button type="button" onClick={() => onSave(null)} className="px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm">Remove</button>}
          </div>
        </form>
      </div>
    </div>
  );
}
```

### src/components/RoutePlanner.tsx
```typescript
import type { Shop } from '../types';
import { CityFilter } from './CityFilter';
import { useState } from 'react';

interface Props {
  shops: Shop[]; selectedIds: Set<string>;
  onToggle: (id: string) => void; onSelectAll: (ids: string[]) => void; onClear: () => void;
}

export function RoutePlanner({ shops, selectedIds, onToggle, onSelectAll, onClear }: Props) {
  const [cityFilter, setCityFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');

  const filtered = shops.filter(s => {
    if (cityFilter && s.city !== cityFilter) return false;
    if (districtFilter && s.district !== districtFilter) return false;
    return true;
  });

  const allFilteredSelected = filtered.length > 0 && filtered.every(s => selectedIds.has(s.id));

  return (
    <div className="space-y-3">
      <CityFilter shops={shops} cityFilter={cityFilter} districtFilter={districtFilter} onCityChange={setCityFilter} onDistrictChange={setDistrictFilter} />
      <div className="flex gap-2">
        <button onClick={() => { if (allFilteredSelected) onClear(); else onSelectAll(filtered.map(s => s.id)); }} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs hover:bg-gray-200">
          {allFilteredSelected ? 'Deselect All' : 'Select All'}
        </button>
        <span className="text-xs text-gray-400 self-center">{selectedIds.size} selected</span>
      </div>
      <div className="space-y-1">
        {filtered.map(shop => (
          <label key={shop.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${selectedIds.has(shop.id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
            <input type="checkbox" checked={selectedIds.has(shop.id)} onChange={() => onToggle(shop.id)} className="w-5 h-5 rounded accent-blue-600 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-sm text-gray-900 truncate">{shop.name || shop.address}</p>
              <p className="text-xs text-gray-500 truncate">{shop.name ? shop.address : ''}{shop.district ? ` - ${shop.district}` : ''}</p>
              {!shop.lat && <p className="text-xs text-amber-600">No location</p>}
            </div>
          </label>
        ))}
      </div>
      {filtered.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">{shops.length === 0 ? 'Add shops first' : 'No shops in this city'}</p>}
    </div>
  );
}
```

### src/components/RouteStopList.tsx
```typescript
import { useRef } from 'react';
import type { Shop } from '../types';
import type { HomeAddress } from '../utils/storage';
import { openSingleNavigation, openFullRoute } from '../utils/navigation';

interface Props {
  stops: Shop[]; userLocation?: [number, number] | null; home?: HomeAddress | null;
  routeInfo?: { distance: number; duration: number; usedOSRM: boolean } | null;
  onReorder?: (from: number, to: number) => void;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.ceil((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m} min`;
}

export function RouteStopList({ stops, userLocation, home, routeInfo, onReorder }: Props) {
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  if (stops.length === 0) return null;

  const validStops = stops.filter(s => s.lat != null && s.lng != null);
  const userLoc = userLocation ? { lat: userLocation[0], lng: userLocation[1] } : null;
  const navStops = validStops.map(s => ({ lat: s.lat!, lng: s.lng! }));
  if (home) navStops.push({ lat: home.lat, lng: home.lng });

  const moveUp = (i: number) => { if (i > 0 && onReorder) onReorder(i, i - 1); };
  const moveDown = (i: number) => { if (i < stops.length - 1 && onReorder) onReorder(i, i + 1); };
  const handleDragStart = (i: number) => { dragItem.current = i; };
  const handleDragEnter = (i: number) => { dragOverItem.current = i; };
  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current && onReorder) onReorder(dragItem.current, dragOverItem.current);
    dragItem.current = null; dragOverItem.current = null;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            {stops.length} stops{home ? ' + home' : ''}
            {routeInfo && routeInfo.distance > 0 && <> &middot; {routeInfo.distance.toFixed(1)} km</>}
            {routeInfo && routeInfo.duration > 0 && <> &middot; {formatDuration(routeInfo.duration)}</>}
          </p>
          {routeInfo && <p className="text-xs text-gray-400">{routeInfo.usedOSRM ? 'Optimized by real road data' : 'Estimated (straight-line)'}</p>}
        </div>
        {navStops.length >= 1 && <button onClick={() => openFullRoute(navStops, userLoc)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 shrink-0">Navigate All</button>}
      </div>
      {onReorder && <p className="text-xs text-gray-400 text-center">Drag or use arrows to reorder stops</p>}
      <div className="space-y-1">
        {stops.map((stop, i) => (
          <div key={stop.id} draggable={!!onReorder} onDragStart={() => handleDragStart(i)} onDragEnter={() => handleDragEnter(i)} onDragEnd={handleDragEnd} onDragOver={e => e.preventDefault()} className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 cursor-grab active:cursor-grabbing select-none">
            {onReorder && <span className="text-gray-300 text-sm shrink-0" style={{ cursor: 'grab' }}>⠿</span>}
            <span className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-900 truncate">{stop.name || stop.address}</p>
              <p className="text-xs text-gray-500 truncate">{stop.name ? `${stop.address}, ` : ''}{stop.district ? `${stop.district}, ` : ''}{stop.city}</p>
            </div>
            {onReorder && (
              <div className="flex flex-col gap-0.5 shrink-0">
                <button onClick={() => moveUp(i)} disabled={i === 0} className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-30 text-xs">▲</button>
                <button onClick={() => moveDown(i)} disabled={i === stops.length - 1} className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-30 text-xs">▼</button>
              </div>
            )}
            {stop.lat != null && <button onClick={() => openSingleNavigation(stop.lat!, stop.lng!)} className="px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 shrink-0">Go</button>}
          </div>
        ))}
        {home && (
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <span className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center text-xs shrink-0">🏠</span>
            <div className="flex-1 min-w-0"><p className="font-medium text-sm text-gray-900">Home</p><p className="text-xs text-gray-500 truncate">{home.address}, {home.city}</p></div>
            <button onClick={() => openSingleNavigation(home.lat, home.lng)} className="px-2.5 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 shrink-0">Go</button>
          </div>
        )}
      </div>
    </div>
  );
}
```

### src/components/ShopCard.tsx
```typescript
import type { Shop } from '../types';

interface Props { shop: Shop; onEdit: (shop: Shop) => void; onDelete: (id: string) => void; }

export function ShopCard({ shop, onEdit, onDelete }: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0" onClick={() => onEdit(shop)}>
        <h3 className="font-medium text-gray-900 truncate">{shop.name || shop.address}</h3>
        {shop.name && <p className="text-sm text-gray-500 truncate">{shop.address}</p>}
        <p className="text-xs text-gray-400">{shop.district ? `${shop.district}, ${shop.city}` : shop.city}</p>
        {!shop.lat && <p className="text-xs text-amber-600 mt-1">No location set</p>}
      </div>
      <button onClick={e => { e.stopPropagation(); onDelete(shop.id); }} className="text-gray-400 hover:text-red-500 p-1 text-lg shrink-0" aria-label="Delete">&times;</button>
    </div>
  );
}
```

### src/components/ShopList.tsx
```typescript
import type { Shop } from '../types';
import { ShopCard } from './ShopCard';

interface Props { shops: Shop[]; onEdit: (shop: Shop) => void; onDelete: (id: string) => void; }

export function ShopList({ shops, onEdit, onDelete }: Props) {
  if (shops.length === 0) {
    return (<div className="text-center text-gray-400 py-12"><p className="text-4xl mb-2">🏪</p><p>No shops yet. Tap + to add one.</p></div>);
  }
  return (<div className="space-y-2">{shops.map(shop => <ShopCard key={shop.id} shop={shop} onEdit={onEdit} onDelete={onDelete} />)}</div>);
}
```

### src/components/CityFilter.tsx
```typescript
import type { Shop } from '../types';

interface Props {
  shops: Shop[]; cityFilter: string; districtFilter: string;
  onCityChange: (city: string) => void; onDistrictChange: (district: string) => void;
}

export function CityFilter({ shops, cityFilter, districtFilter, onCityChange, onDistrictChange }: Props) {
  if (shops.length === 0) return null;
  const cities = Array.from(new Set(shops.map(s => s.city).filter(Boolean))).sort();
  const districts = cityFilter
    ? Array.from(new Set(shops.filter(s => s.city === cityFilter && s.district).map(s => s.district))).sort()
    : [];

  return (
    <div className="flex gap-2">
      <select value={cityFilter} onChange={e => { onCityChange(e.target.value); onDistrictChange(''); }} className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        <option value="">All Cities</option>
        {cities.map(city => <option key={city} value={city}>{city}</option>)}
      </select>
      {districts.length > 0 && (
        <select value={districtFilter} onChange={e => onDistrictChange(e.target.value)} className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Districts</option>
          {districts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      )}
    </div>
  );
}
```

### src/components/BottomNav.tsx
```typescript
import type { TabId } from '../types';

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: 'shops', label: 'Shops', icon: '🏪' },
  { id: 'route', label: 'Route', icon: '📋' },
];

interface Props { active: TabId; onChange: (tab: TabId) => void; }

export function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="bg-white border-t border-gray-200 flex z-[1000]">
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => onChange(tab.id)} className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${active === tab.id ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
          <span className="text-xl mb-0.5">{tab.icon}</span>{tab.label}
        </button>
      ))}
    </nav>
  );
}
```

### src/pages/ShopsPage.tsx
```typescript
import { useState } from 'react';
import type { Shop } from '../types';
import type { HomeAddress } from '../utils/storage';
import { CityFilter } from '../components/CityFilter';
import { ShopList } from '../components/ShopList';
import { ShopForm } from '../components/ShopForm';
import { HomeForm } from '../components/HomeForm';
import { exportData, importData } from '../utils/storage';

interface Props {
  shops: Shop[]; home: HomeAddress | null;
  onAdd: (data: Omit<Shop, 'id' | 'createdAt'>) => void;
  onUpdate: (id: string, data: Partial<Shop>) => void;
  onDelete: (id: string) => void;
  onReplaceAll: (shops: Shop[]) => void;
  onHomeChange: (home: HomeAddress | null) => void;
  onLogout: () => void;
}

export function ShopsPage({ shops, home, onAdd, onUpdate, onDelete, onReplaceAll, onHomeChange, onLogout }: Props) {
  const [cityFilter, setCityFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [editing, setEditing] = useState<Shop | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHomeForm, setShowHomeForm] = useState(false);

  const filtered = shops.filter(s => {
    if (cityFilter && s.city !== cityFilter) return false;
    if (districtFilter && s.district !== districtFilter) return false;
    return true;
  });

  const handleSave = (data: { name: string; address: string; city: string; district: string; notes: string; lat: number | null; lng: number | null }) => {
    if (editing) onUpdate(editing.id, data); else onAdd(data);
    setShowForm(false); setEditing(null);
  };

  const handleExport = () => {
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `route-planner-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0]; if (!file) return;
      try { const text = await file.text(); const data = importData(text); onReplaceAll(data.shops); alert(`Imported ${data.shops.length} shops`); }
      catch { alert('Invalid file. Please select a valid backup file.'); }
    };
    input.click();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900">Shops</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="w-8 h-8 bg-blue-600 text-white rounded-full text-lg font-bold flex items-center justify-center hover:bg-blue-700">+</button>
          <button onClick={() => setShowSettings(!showSettings)} className="text-gray-500 text-sm px-2 py-1">{showSettings ? 'Close' : 'Settings'}</button>
        </div>
      </div>
      {showSettings && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 space-y-2">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setShowHomeForm(true)} className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs hover:bg-gray-50">{home ? 'Edit Home' : 'Set Home'}</button>
            <button onClick={handleExport} className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs hover:bg-gray-50">Export Data</button>
            <button onClick={handleImport} className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs hover:bg-gray-50">Import Data</button>
            <button onClick={onLogout} className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs hover:bg-red-100">Logout</button>
          </div>
          {home && <p className="text-xs text-gray-500">Home: {home.address}, {home.city}</p>}
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-4 py-3 pb-4 space-y-3">
        <CityFilter shops={shops} cityFilter={cityFilter} districtFilter={districtFilter} onCityChange={setCityFilter} onDistrictChange={setDistrictFilter} />
        <ShopList shops={filtered} onEdit={shop => { setEditing(shop); setShowForm(true); }} onDelete={id => { if (confirm('Delete this shop?')) onDelete(id); }} />
      </div>
      {showForm && <ShopForm shop={editing} onSave={handleSave} onClose={() => { setShowForm(false); setEditing(null); }} />}
      {showHomeForm && <HomeForm home={home} onSave={h => { onHomeChange(h); setShowHomeForm(false); }} onClose={() => setShowHomeForm(false)} />}
    </div>
  );
}
```

### src/pages/RoutePage.tsx
```typescript
import type { Shop } from '../types';
import type { HomeAddress } from '../utils/storage';
import { RoutePlanner } from '../components/RoutePlanner';
import { RouteStopList } from '../components/RouteStopList';

interface Props {
  shops: Shop[]; selectedIds: Set<string>; orderedStops: Shop[];
  isOptimized: boolean; locating: boolean; userLocation: [number, number] | null;
  home: HomeAddress | null; routeInfo: { distance: number; duration: number; usedOSRM: boolean } | null;
  onToggle: (id: string) => void; onSelectAll: (ids: string[]) => void;
  onClear: () => void; onOptimize: () => void; onReorder: (from: number, to: number) => void;
}

export function RoutePage({ shops, selectedIds, orderedStops, isOptimized, locating, userLocation, home, routeInfo, onToggle, onSelectAll, onClear, onOptimize, onReorder }: Props) {
  const hasSelection = selectedIds.size > 0;
  const hasLocations = shops.filter(s => selectedIds.has(s.id) && s.lat != null).length >= 2;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 bg-white border-b border-gray-200"><h1 className="text-lg font-bold text-gray-900">Plan Route</h1></div>
      <div className="flex-1 overflow-y-auto px-4 py-3 pb-4 space-y-4">
        <RoutePlanner shops={shops} selectedIds={selectedIds} onToggle={onToggle} onSelectAll={onSelectAll} onClear={onClear} />
        {hasSelection && (
          <button onClick={onOptimize} disabled={!hasLocations || locating} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {locating ? 'Optimizing route...' : `Optimize Route (${selectedIds.size} stops)`}
          </button>
        )}
        {!home && hasSelection && <p className="text-xs text-gray-400 text-center">Tip: Set your home address in Settings so the route ends at home.</p>}
        {!hasLocations && hasSelection && <p className="text-xs text-amber-600 text-center">At least 2 shops need locations to optimize. Use "Find Location" when adding shops.</p>}
        {isOptimized && <RouteStopList stops={orderedStops} userLocation={userLocation} home={home} routeInfo={routeInfo} onReorder={onReorder} />}
      </div>
    </div>
  );
}
```

---

## External APIs Used (all free, no API keys needed)

### 1. Nominatim (OpenStreetMap) — Geocoding
- **Endpoint:** `https://nominatim.openstreetmap.org/search`
- **Used for:** Address search autocomplete + geocoding (address to lat/lng)
- **Rate limit:** Throttled to 1100ms between requests (ToS compliance)
- **User-Agent:** `DeliveryRoutePlanner/1.0`
- **Search bias:** Bremen area via viewbox parameter

### 2. OSRM (Open Source Routing Machine) — Route Optimization
- **Table API:** `https://router.project-osrm.org/table/v1/driving/{coords}` — returns travel time/distance matrix
- **Route API:** `https://router.project-osrm.org/route/v1/driving/{coords}` — returns actual road geometry (GeoJSON)
- **Used for:** Building the real driving-time matrix for TSP, and getting the actual road polyline for map display

### 3. Google Maps — Navigation (external links only)
- Opens Google Maps in a new tab with origin/destination/waypoints
- Supports up to 9 waypoints
- No API key needed (just URL parameters)

---

## Key Algorithms

### Route Optimization Pipeline
1. User selects shops from the list
2. Clicks "Optimize Route"
3. App gets user's GPS location (optional)
4. Builds coordinate list: [user location?] + [selected shops] + [home?]
5. Fetches OSRM travel-time matrix (real driving durations between all pairs)
6. Solves TSP (Traveling Salesman Problem):
   - **<=18 stops:** Held-Karp algorithm (exact optimal solution using bitmask DP)
   - **>18 stops:** Nearest-Neighbor construction + 2-opt improvement
   - **Fallback:** Haversine distance matrix if OSRM is unavailable
7. Fetches OSRM route geometry for the optimized sequence (actual road paths)
8. Displays the result with total distance/duration, draggable stop reordering, and Google Maps navigation

---

## Layout

- Mobile-first responsive design
- Fixed 40vh map at top (min 200px)
- Flexible content area below (scrollable)
- Sticky bottom tab navigation (Shops / Route)
- Modals slide up from bottom (ShopForm, HomeForm)
- Default map center: Bremen, Germany (53.08, 8.80)

---

## PWA Features

- Service worker with cache-first strategy for app shell, network-first for API calls
- Web app manifest for installability
- Standalone display mode
- Works offline (cached static assets)

---

## Current Limitations (what needs to change for a sellable product)

1. **No backend** — all data in localStorage, lost if browser data is cleared
2. **No multi-tenant** — single user, hardcoded auth hash
3. **No real authentication** — SHA-256 hash comparison against a hardcoded value
4. **No database** — can't share data across devices or users
5. **GitHub Pages hosting** — no custom domain, no server-side logic
6. **No user registration** — only one predefined user

---

## Goal

Convert this into a sellable SaaS product for delivery businesses. Plan is to use **Vercel** (frontend hosting, free tier) + **Supabase** (PostgreSQL database + auth, free tier) so the entire infrastructure is free to start. The frontend UI/behavior must remain exactly the same — only the data layer (localStorage) gets swapped for Supabase API calls.