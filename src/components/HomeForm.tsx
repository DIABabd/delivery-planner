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
    setGeocoding(true);
    setError('');
    try {
      const result = await geocodeAddress(address, city);
      if (result) {
        setLat(result.lat);
        setLng(result.lng);
      } else {
        setError('Address not found');
      }
    } catch {
      setError('Geocoding failed');
    }
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
        <p className="text-xs text-gray-500 mb-3">
          Set your home/office address. The route will end here so you get back home efficiently.
        </p>

        <form onSubmit={handleSave} className="space-y-3">
          <input
            type="text"
            placeholder="Address *"
            value={address}
            onChange={e => setAddress(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="text"
            placeholder="City *"
            value={city}
            onChange={e => setCity(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGeocode}
              disabled={geocoding || !address || !city}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50"
            >
              {geocoding ? 'Finding...' : 'Find Location'}
            </button>
            {lat != null && (
              <span className="text-xs text-green-600">Location set</span>
            )}
          </div>
          {error && <p className="text-xs text-amber-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={lat == null}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Save Home
            </button>
            {home && (
              <button
                type="button"
                onClick={() => onSave(null)}
                className="px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm"
              >
                Remove
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
