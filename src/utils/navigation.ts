interface Stop {
  lat: number;
  lng: number;
}

export function openSingleNavigation(lat: number, lng: number) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  window.open(url, '_blank');
}

export function openFullRoute(stops: Stop[], userLocation?: { lat: number; lng: number } | null) {
  if (stops.length === 0) return;
  if (stops.length === 1) {
    openSingleNavigation(stops[0].lat, stops[0].lng);
    return;
  }

  // Origin is user's current location if available, otherwise first stop
  const origin = userLocation
    ? `${userLocation.lat},${userLocation.lng}`
    : `${stops[0].lat},${stops[0].lng}`;

  const destination = `${stops[stops.length - 1].lat},${stops[stops.length - 1].lng}`;

  // When using user location, all stops are waypoints except the last (destination)
  // When no user location, first stop is origin so middle stops are waypoints
  const waypoints = userLocation
    ? stops.slice(0, -1)
    : stops.slice(1, -1);

  // Google Maps supports up to 9 waypoints
  const maxWaypoints = 9;
  const wpSlice = waypoints.slice(0, maxWaypoints);
  const wpStr = wpSlice.map(s => `${s.lat},${s.lng}`).join('|');
  const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${wpStr ? `&waypoints=${wpStr}` : ''}&travelmode=driving`;
  window.open(url, '_blank');
}
