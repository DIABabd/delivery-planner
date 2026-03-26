interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
  district: string;
  city: string;
  address?: string;
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

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodingResult | null> {
  await throttle();
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'DeliveryRoutePlanner/1.0' },
  });

  if (!res.ok) return null;

  const item = await res.json();
  if (!item || item.error) return null;

  const addr = item.address as Record<string, string> | undefined;
  const road = addr?.road || '';
  const houseNumber = addr?.house_number || '';
  const streetAddr = road ? (houseNumber ? `${road} ${houseNumber}` : road) : '';
  const resultCity = addr?.city || addr?.town || addr?.village || addr?.municipality || extractCity(item.display_name);
  const district = addr?.suburb || addr?.city_district || addr?.quarter || '';

  return {
    lat,
    lng,
    displayName: item.display_name,
    district,
    city: resultCity,
    address: streetAddr,
  };
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
  // Nominatim display_name: "Shop, Street, District, City, State, Postcode, Country"
  const parts = displayName.split(',').map(p => p.trim());
  // Usually city is 3rd or 4th from the end (before state, postcode, country)
  // Try to find a known city-level part
  const cityPart = parts.find(p =>
    /^(Bremen|Hamburg|Berlin|München|Köln|Frankfurt|Stuttgart|Düsseldorf|Hannover|Dortmund|Essen|Leipzig|Dresden|Nürnberg|Bremerhaven|Oldenburg|Delmenhorst|Verden|Achim|Stuhr|Weyhe|Lilienthal|Schwanewede|Oyten)/i.test(p)
  );
  if (cityPart) return cityPart;
  // Fallback: take 4th from end if enough parts
  if (parts.length >= 5) return parts[parts.length - 4];
  if (parts.length >= 3) return parts[parts.length - 3];
  return parts[1] || parts[0] || '';
}

function extractAddress(displayName: string, shopName: string): string {
  const parts = displayName.split(',').map(p => p.trim());
  // Remove shop name from start if present, and country/postcode/state from end
  const filtered = parts.filter(p =>
    p !== shopName &&
    !/^\d{5}$/.test(p) && // postcode
    p !== 'Deutschland' &&
    p !== 'Germany'
  );
  // Take the street-level parts (usually index 1-2 after name)
  if (filtered.length >= 3) {
    return filtered.slice(1, 3).join(', ');
  }
  return filtered.slice(0, 2).join(', ');
}

export async function searchAddresses(query: string): Promise<PlaceSuggestion[]> {
  if (query.trim().length < 2) return [];

  await throttle();

  // Search Germany-wide, biased toward Bremen area using viewbox
  const q = encodeURIComponent(query);
  // viewbox covers Bremen area broadly; bounded=0 means results outside are allowed but ranked lower
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

    return {
      name: (item.name as string) || '',
      address: streetAddr,
      city,
      district,
      lat: parseFloat(item.lat as string),
      lng: parseFloat(item.lon as string),
      displayName: item.display_name as string,
      isBremen,
    };
  });

  // Sort: Bremen first, then alphabetically
  suggestions.sort((a, b) => {
    if (a.isBremen && !b.isBremen) return -1;
    if (!a.isBremen && b.isBremen) return 1;
    return 0;
  });

  return suggestions;
}
