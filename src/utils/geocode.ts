interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
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
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'DeliveryRoutePlanner/1.0' },
  });

  if (!res.ok) return null;

  const data = await res.json();
  if (!data.length) return null;

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    displayName: data[0].display_name,
  };
}
