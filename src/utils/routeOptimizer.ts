import type { Shop } from '../types';

// ── Haversine fallback ──────────────────────────────────────────────

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestNeighborFallback(
  shops: Shop[],
  startLat?: number,
  startLng?: number,
  homeLat?: number,
  homeLng?: number,
): Shop[] {
  if (shops.length <= 1) return [...shops];

  const remaining = [...shops];
  const route: Shop[] = [];

  let currentLat = startLat ?? remaining[0].lat!;
  let currentLng = startLng ?? remaining[0].lng!;

  if (startLat == null) {
    route.push(remaining.shift()!);
    currentLat = route[0].lat!;
    currentLng = route[0].lng!;
  }

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineDistance(currentLat, currentLng, remaining[i].lat!, remaining[i].lng!);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    route.push(next);
    currentLat = next.lat!;
    currentLng = next.lng!;
  }

  // 2-opt improvement (considers home as final destination)
  if (route.length >= 4) {
    let improved = true;
    while (improved) {
      improved = false;
      for (let i = 0; i < route.length - 2; i++) {
        for (let j = i + 2; j < route.length; j++) {
          const d1 =
            haversineDistance(route[i].lat!, route[i].lng!, route[i + 1].lat!, route[i + 1].lng!) +
            (j + 1 < route.length
              ? haversineDistance(route[j].lat!, route[j].lng!, route[j + 1].lat!, route[j + 1].lng!)
              : homeLat != null
                ? haversineDistance(route[j].lat!, route[j].lng!, homeLat, homeLng!)
                : 0);
          const d2 =
            haversineDistance(route[i].lat!, route[i].lng!, route[j].lat!, route[j].lng!) +
            (j + 1 < route.length
              ? haversineDistance(route[i + 1].lat!, route[i + 1].lng!, route[j + 1].lat!, route[j + 1].lng!)
              : homeLat != null
                ? haversineDistance(route[i + 1].lat!, route[i + 1].lng!, homeLat, homeLng!)
                : 0);
          if (d2 < d1) {
            const segment = route.slice(i + 1, j + 1).reverse();
            route.splice(i + 1, j - i, ...segment);
            improved = true;
          }
        }
      }
    }
  }

  return route;
}

// ── OSRM-powered optimization (real roads, driving time) ────────────

interface OSRMTripResponse {
  code: string;
  trips: Array<{
    distance: number;
    duration: number;
  }>;
  waypoints: Array<{
    waypoint_index: number;
    trips_index: number;
  }>;
}

async function osrmOptimize(
  coordinates: [number, number][],
  hasFixedStart: boolean,
  hasFixedEnd: boolean,
): Promise<{ order: number[]; distance: number; duration: number } | null> {
  const coords = coordinates.map(c => `${c[0]},${c[1]}`).join(';');
  const source = hasFixedStart ? 'first' : 'any';
  const destination = hasFixedEnd ? 'last' : 'any';

  const url = `https://router.project-osrm.org/trip/v1/driving/${coords}?source=${source}&destination=${destination}&roundtrip=false&overview=false`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const data: OSRMTripResponse = await res.json();
    if (data.code !== 'Ok' || !data.waypoints?.length) return null;

    const order = data.waypoints.map(wp => wp.waypoint_index);
    return {
      order,
      distance: data.trips[0].distance / 1000,
      duration: data.trips[0].duration,
    };
  } catch {
    return null;
  }
}

// ── Public API ──────────────────────────────────────────────────────

export interface OptimizeResult {
  shops: Shop[];
  distance: number;
  duration: number;
  usedOSRM: boolean;
}

export async function optimizeRoute(
  shops: Shop[],
  startLat?: number,
  startLng?: number,
  homeLat?: number,
  homeLng?: number,
): Promise<OptimizeResult> {
  const valid = shops.filter(s => s.lat != null && s.lng != null);

  if (valid.length === 0) {
    return { shops: [], distance: 0, duration: 0, usedOSRM: false };
  }
  if (valid.length === 1) {
    return { shops: valid, distance: 0, duration: 0, usedOSRM: false };
  }

  // Build coordinate list: [start?] + shops + [home?]
  // OSRM uses [lng, lat] format
  const coords: [number, number][] = [];
  const hasStart = startLat != null && startLng != null;
  const hasHome = homeLat != null && homeLng != null;

  if (hasStart) coords.push([startLng!, startLat!]);
  for (const s of valid) coords.push([s.lng!, s.lat!]);
  if (hasHome) coords.push([homeLng!, homeLat!]);

  // Try OSRM first (uses real road network, optimizes by driving time)
  const osrmResult = await osrmOptimize(coords, hasStart, hasHome);

  if (osrmResult) {
    const startOffset = hasStart ? 1 : 0;
    const shopIndices = osrmResult.order
      .filter(i => {
        if (hasStart && i === 0) return false;
        if (hasHome && i === coords.length - 1) return false;
        return true;
      })
      .map(i => i - startOffset);

    const orderedShops = shopIndices
      .filter(i => i >= 0 && i < valid.length)
      .map(i => valid[i]);

    return {
      shops: orderedShops,
      distance: osrmResult.distance,
      duration: osrmResult.duration,
      usedOSRM: true,
    };
  }

  // Fallback to Haversine nearest-neighbor + 2-opt
  const fallbackRoute = nearestNeighborFallback(valid, startLat, startLng, homeLat, homeLng);
  let dist = 0;
  for (let i = 0; i < fallbackRoute.length - 1; i++) {
    dist += haversineDistance(fallbackRoute[i].lat!, fallbackRoute[i].lng!, fallbackRoute[i + 1].lat!, fallbackRoute[i + 1].lng!);
  }
  if (hasHome && fallbackRoute.length > 0) {
    const last = fallbackRoute[fallbackRoute.length - 1];
    dist += haversineDistance(last.lat!, last.lng!, homeLat!, homeLng!);
  }

  return { shops: fallbackRoute, distance: dist, duration: 0, usedOSRM: false };
}
