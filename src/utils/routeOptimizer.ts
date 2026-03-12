import type { Shop } from '../types';

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

function totalDistance(shops: Shop[]): number {
  let dist = 0;
  for (let i = 0; i < shops.length - 1; i++) {
    dist += haversineDistance(shops[i].lat!, shops[i].lng!, shops[i + 1].lat!, shops[i + 1].lng!);
  }
  return dist;
}

function nearestNeighbor(shops: Shop[], startLat?: number, startLng?: number): Shop[] {
  if (shops.length <= 1) return [...shops];

  const remaining = [...shops];
  const route: Shop[] = [];

  // Pick the starting shop closest to startLat/startLng, or just the first one
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

  return route;
}

function twoOpt(shops: Shop[]): Shop[] {
  if (shops.length < 4) return shops;

  const route = [...shops];
  let improved = true;

  while (improved) {
    improved = false;
    for (let i = 0; i < route.length - 2; i++) {
      for (let j = i + 2; j < route.length; j++) {
        const d1 =
          haversineDistance(route[i].lat!, route[i].lng!, route[i + 1].lat!, route[i + 1].lng!) +
          (j + 1 < route.length
            ? haversineDistance(route[j].lat!, route[j].lng!, route[j + 1].lat!, route[j + 1].lng!)
            : 0);
        const d2 =
          haversineDistance(route[i].lat!, route[i].lng!, route[j].lat!, route[j].lng!) +
          (j + 1 < route.length
            ? haversineDistance(route[i + 1].lat!, route[i + 1].lng!, route[j + 1].lat!, route[j + 1].lng!)
            : 0);

        if (d2 < d1) {
          // Reverse the segment between i+1 and j
          const segment = route.slice(i + 1, j + 1).reverse();
          route.splice(i + 1, j - i, ...segment);
          improved = true;
        }
      }
    }
  }

  return route;
}

export function optimizeRoute(shops: Shop[], startLat?: number, startLng?: number): Shop[] {
  // Filter out shops without coordinates
  const valid = shops.filter(s => s.lat != null && s.lng != null);
  if (valid.length <= 2) return valid;

  const nnRoute = nearestNeighbor(valid, startLat, startLng);
  return twoOpt(nnRoute);
}

export function getRouteDistance(shops: Shop[]): number {
  const valid = shops.filter(s => s.lat != null && s.lng != null);
  return totalDistance(valid);
}
