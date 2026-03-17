import type { Shop } from '../types';

// ── OSRM Table API: build real travel-time matrix ─────────────────

interface OSRMTableResponse {
  code: string;
  durations: number[][];  // seconds
  distances: number[][];  // meters
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
  } catch {
    return null;
  }
}

// ── OSRM Route API: get actual road geometry ──────────────────────

interface OSRMRouteResponse {
  code: string;
  routes: Array<{
    geometry: string; // encoded polyline
    distance: number;
    duration: number;
  }>;
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
    // GeoJSON coordinates are [lng, lat], convert to [lat, lng] for Leaflet
    const geojson = route.geometry as unknown as { coordinates: [number, number][] };
    const geometry: [number, number][] = geojson.coordinates.map(
      ([lng, lat]) => [lat, lng]
    );

    return {
      geometry,
      distance: route.distance / 1000, // meters to km
      duration: route.duration,         // seconds
    };
  } catch {
    return null;
  }
}

// ── TSP Solver: Held-Karp (exact, for ≤ 18 nodes) ────────────────

function heldKarpTSP(
  matrix: number[][],
  startIdx: number,
  endIdx: number | null,
): number[] {
  const n = matrix.length;

  // For very small inputs, return trivially
  if (n <= 2) return Array.from({ length: n }, (_, i) => i);

  // Nodes to visit (excluding start and end if fixed)
  const fixedEnd = endIdx != null && endIdx !== startIdx;
  const visitNodes: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i !== startIdx && (!fixedEnd || i !== endIdx)) visitNodes.push(i);
  }

  const m = visitNodes.length;

  // If too many for bitmask DP, fall back to nearest-neighbor + 2-opt
  if (m > 18) {
    return nnTwoOptTSP(matrix, startIdx, endIdx);
  }

  const FULL = (1 << m) - 1;
  // dp[mask][i] = minimum cost to visit the subset 'mask' of visitNodes ending at visitNodes[i]
  const dp: number[][] = Array.from({ length: 1 << m }, () =>
    new Array(m).fill(Infinity)
  );
  const parent: number[][] = Array.from({ length: 1 << m }, () =>
    new Array(m).fill(-1)
  );

  // Initialize: go from start to each visit node
  for (let i = 0; i < m; i++) {
    dp[1 << i][i] = matrix[startIdx][visitNodes[i]];
  }

  // Fill DP table
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

  // Find the best last node
  let bestLast = 0;
  let bestCost = Infinity;
  for (let last = 0; last < m; last++) {
    let cost = dp[FULL][last];
    if (fixedEnd) {
      cost += matrix[visitNodes[last]][endIdx!];
    }
    if (cost < bestCost) {
      bestCost = cost;
      bestLast = last;
    }
  }

  // Reconstruct path
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

  // Build full route: start + path + end
  const result = [startIdx, ...path];
  if (fixedEnd) result.push(endIdx!);
  return result;
}

// ── Nearest-Neighbor + 2-Opt (for larger sets, using real matrix) ─

function nnTwoOptTSP(
  matrix: number[][],
  startIdx: number,
  endIdx: number | null,
): number[] {
  const n = matrix.length;
  const fixedEnd = endIdx != null && endIdx !== startIdx;

  // Nodes to visit
  const toVisit = new Set<number>();
  for (let i = 0; i < n; i++) {
    if (i !== startIdx && (!fixedEnd || i !== endIdx)) toVisit.add(i);
  }

  // Nearest-neighbor construction
  const path: number[] = [startIdx];
  let current = startIdx;
  while (toVisit.size > 0) {
    let bestNode = -1;
    let bestDist = Infinity;
    for (const node of toVisit) {
      if (matrix[current][node] < bestDist) {
        bestDist = matrix[current][node];
        bestNode = node;
      }
    }
    path.push(bestNode);
    toVisit.delete(bestNode);
    current = bestNode;
  }
  if (fixedEnd) path.push(endIdx!);

  // 2-opt improvement on the path (only swap interior nodes)
  // Start and end are fixed, so swap range is [1..path.length-2] if fixedEnd, else [1..path.length-1]
  const lastSwappable = fixedEnd ? path.length - 2 : path.length - 1;

  const routeCost = (p: number[]) => {
    let cost = 0;
    for (let i = 0; i < p.length - 1; i++) {
      cost += matrix[p[i]][p[i + 1]];
    }
    return cost;
  };

  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < lastSwappable; i++) {
      for (let j = i + 1; j <= lastSwappable; j++) {
        // Reverse segment [i..j]
        const newPath = [...path];
        let left = i, right = j;
        while (left < right) {
          [newPath[left], newPath[right]] = [newPath[right], newPath[left]];
          left++;
          right--;
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

// ── Haversine fallback (no OSRM available at all) ─────────────────

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

function haversineFallback(
  coords: [number, number][], // [lng, lat] pairs
  startIdx: number,
  endIdx: number | null,
): number[] {
  const n = coords.length;
  // Build a haversine distance matrix
  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = haversineDistance(coords[i][1], coords[i][0], coords[j][1], coords[j][0]);
      matrix[i][j] = d;
      matrix[j][i] = d;
    }
  }
  return nnTwoOptTSP(matrix, startIdx, endIdx);
}

// ── Public API ──────────────────────────────────────────────────────

export interface OptimizeResult {
  shops: Shop[];
  distance: number;
  duration: number;
  usedOSRM: boolean;
  routeGeometry: [number, number][] | null; // [lat, lng] pairs for the polyline
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
    return { shops: [], distance: 0, duration: 0, usedOSRM: false, routeGeometry: null };
  }
  if (valid.length === 1) {
    return { shops: valid, distance: 0, duration: 0, usedOSRM: false, routeGeometry: null };
  }

  // Build coordinate list: [start?] + shops + [home?]
  // OSRM uses [lng, lat] format
  const coords: [number, number][] = [];
  const hasStart = startLat != null && startLng != null;
  const hasHome = homeLat != null && homeLng != null;

  if (hasStart) coords.push([startLng!, startLat!]);
  for (const s of valid) coords.push([s.lng!, s.lat!]);
  if (hasHome) coords.push([homeLng!, homeLat!]);

  const startIdx = 0;
  const endIdx = hasHome ? coords.length - 1 : null;
  const shopOffset = hasStart ? 1 : 0;

  // Try OSRM Table for real travel-time matrix
  const matrix = await fetchTimeMatrix(coords);

  let orderedIndices: number[];
  let usedOSRM = false;

  if (matrix) {
    // Solve TSP with real driving times
    orderedIndices = heldKarpTSP(matrix.durations, startIdx, endIdx);
    usedOSRM = true;
  } else {
    // Fallback: build haversine matrix and solve
    orderedIndices = haversineFallback(coords, startIdx, endIdx);
  }

  // Extract shop order from indices (skip start and end)
  const shopIndices = orderedIndices.filter(i => {
    if (hasStart && i === 0) return false;
    if (hasHome && i === coords.length - 1) return false;
    return true;
  });

  const orderedShops = shopIndices
    .map(i => i - shopOffset)
    .filter(i => i >= 0 && i < valid.length)
    .map(i => valid[i]);

  // Build the full ordered coordinate list for route geometry
  const orderedCoords: [number, number][] = orderedIndices.map(i => coords[i]);

  // Fetch real road geometry from OSRM
  let routeGeometry: [number, number][] | null = null;
  let distance = 0;
  let duration = 0;

  const geoResult = await fetchRouteGeometry(orderedCoords);
  if (geoResult) {
    routeGeometry = geoResult.geometry;
    distance = geoResult.distance;
    duration = geoResult.duration;
  } else if (matrix) {
    // Calculate from matrix if geometry fetch failed
    for (let i = 0; i < orderedIndices.length - 1; i++) {
      duration += matrix.durations[orderedIndices[i]][orderedIndices[i + 1]];
      distance += matrix.distances[orderedIndices[i]][orderedIndices[i + 1]] / 1000;
    }
  } else {
    // Haversine fallback distance
    for (let i = 0; i < orderedIndices.length - 1; i++) {
      distance += haversineDistance(
        coords[orderedIndices[i]][1], coords[orderedIndices[i]][0],
        coords[orderedIndices[i + 1]][1], coords[orderedIndices[i + 1]][0],
      );
    }
  }

  return { shops: orderedShops, distance, duration, usedOSRM, routeGeometry };
}
