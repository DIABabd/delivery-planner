interface Stop {
  lat: number;
  lng: number;
}

const EXTERNAL_NAV_KEY = 'route-planner-external-nav-at';

function rememberExternalNavigation() {
  try {
    sessionStorage.setItem(EXTERNAL_NAV_KEY, String(Date.now()));
  } catch {
    // Ignore storage failures; navigation should still work.
  }
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

function isIOS() {
  return /iPad|iPhone|iPod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isMobileBrowser() {
  return isAndroid() || isIOS() || /Mobile/i.test(navigator.userAgent);
}

function toAndroidIntentUrl(webUrl: string) {
  const withoutScheme = webUrl.replace(/^https?:\/\//, '');
  return `intent://${withoutScheme}#Intent;scheme=https;package=com.google.android.apps.maps;S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;
}

function coord(stop: Stop) {
  return `${stop.lat},${stop.lng}`;
}

function buildMapsUrl(options: {
  origin?: string;
  destination: string;
  waypoints?: string[];
  navigate?: boolean;
}) {
  const params = new URLSearchParams({
    api: '1',
    destination: options.destination,
    travelmode: 'driving',
  });

  if (options.origin) params.set('origin', options.origin);
  if (options.waypoints?.length) params.set('waypoints', options.waypoints.join('|'));
  if (options.navigate) params.set('dir_action', 'navigate');

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

// On phones, opening Maps in a new browser tab creates the unwanted extra
// Google Maps tab after the native app takes over. Use a same-tab native
// handoff on mobile, and keep desktop behavior as a normal new tab.
function openMapsUrl(url: string) {
  rememberExternalNavigation();

  if (isAndroid()) {
    window.location.assign(toAndroidIntentUrl(url));
    return;
  }

  if (isMobileBrowser()) {
    window.location.assign(url);
    return;
  }

  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (!win) window.location.assign(url);
}

export function openSingleNavigation(lat: number, lng: number) {
  const url = buildMapsUrl({ destination: `${lat},${lng}`, navigate: true });
  openMapsUrl(url);
}

export function openFullRoute(stops: Stop[], userLocation?: { lat: number; lng: number } | null) {
  if (stops.length === 0) return;
  if (stops.length === 1) {
    openSingleNavigation(stops[0].lat, stops[0].lng);
    return;
  }

  // Origin is user's current location if available, otherwise first stop
  const shouldUseMapsCurrentLocation = Boolean(userLocation && isMobileBrowser());
  const origin = shouldUseMapsCurrentLocation
    ? undefined
    : (userLocation ? coord(userLocation) : coord(stops[0]));

  const destination = coord(stops[stops.length - 1]);

  // When using user location, all stops are waypoints except the last (destination)
  // When no user location, first stop is origin so middle stops are waypoints
  const waypoints = userLocation || shouldUseMapsCurrentLocation
    ? stops.slice(0, -1)
    : stops.slice(1, -1);

  // Google Maps supports up to 9 waypoints
  const maxWaypoints = 9;
  const wpSlice = waypoints.slice(0, maxWaypoints);
  const url = buildMapsUrl({
    origin,
    destination,
    waypoints: wpSlice.map(coord),
    navigate: true,
  });
  openMapsUrl(url);
}
