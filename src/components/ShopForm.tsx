import { useState } from 'react';
import type { Shop } from '../types';
import { geocodeAddress } from '../utils/geocode';

interface Props {
  shop?: Shop | null;
  onSave: (data: { name: string; address: string; city: string; notes: string; lat: number | null; lng: number | null }) => void;
  onClose: () => void;
}

export function ShopForm({ shop, onSave, onClose }: Props) {
  const [name, setName] = useState(shop?.name ?? '');
  const [address, setAddress] = useState(shop?.address ?? '');
  const [city, setCity] = useState(shop?.city ?? '');
  const [notes, setNotes] = useState(shop?.notes ?? '');
  const [lat, setLat] = useState<number | null>(shop?.lat ?? null);
  const [lng, setLng] = useState<number | null>(shop?.lng ?? null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState('');

  const handleGeocode = async () => {
    if (!address || !city) return;
    setGeocoding(true);
    setGeocodeError('');
    try {
      const result = await geocodeAddress(address, city);
      if (result) {
        setLat(result.lat);
        setLng(result.lng);
      } else {
        setGeocodeError('Address not found. You can still save without location.');
      }
    } catch {
      setGeocodeError('Geocoding failed. Try again later.');
    }
    setGeocoding(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !city.trim()) return;
    onSave({ name: name.trim(), address: address.trim(), city: city.trim(), notes: notes.trim(), lat, lng });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-[1100]" onClick={onClose}>
      <div
        className="bg-white w-full rounded-t-2xl p-4 pb-8 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{shop ? 'Edit Shop' : 'Add Shop'}</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Shop Name *"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            autoFocus
          />
          <input
            type="text"
            placeholder="Address"
            value={address}
            onChange={e => setAddress(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="City *"
            value={city}
            onChange={e => setCity(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
              <span className="text-xs text-green-600">
                Location set ({lat.toFixed(4)}, {lng?.toFixed(4)})
              </span>
            )}
          </div>
          {geocodeError && <p className="text-xs text-amber-600">{geocodeError}</p>}

          <button
            type="submit"
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
          >
            {shop ? 'Update Shop' : 'Add Shop'}
          </button>
        </form>
      </div>
    </div>
  );
}
