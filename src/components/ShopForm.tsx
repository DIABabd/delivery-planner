import { useState, useRef, useEffect, useCallback } from 'react';
import type { Shop } from '../types';
import { geocodeAddress, searchShops, type PlaceSuggestion } from '../utils/geocode';

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

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const doSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchShops(query);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch {
      setSuggestions([]);
    }
    setSearching(false);
  }, []);

  const handleNameChange = (value: string) => {
    setName(value);
    // Debounce search
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => doSearch(value), 600);
  };

  const selectSuggestion = (s: PlaceSuggestion) => {
    setName(s.name || name);
    setAddress(s.address);
    setCity(s.city);
    setLat(s.lat);
    setLng(s.lng);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
          {/* Shop name with autocomplete */}
          <div className="relative" ref={suggestionsRef}>
            <input
              type="text"
              placeholder="Shop Name *"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              autoFocus
              autoComplete="off"
            />
            {searching && (
              <span className="absolute right-3 top-3 text-xs text-gray-400">Searching...</span>
            )}

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto z-[1200]">
                {suggestions.map((s, i) => (
                  <button
                    key={`${s.lat}-${s.lng}-${i}`}
                    type="button"
                    onClick={() => selectSuggestion(s)}
                    className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-start gap-2">
                      {s.isBremen && (
                        <span className="shrink-0 mt-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded">
                          Bremen
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{s.name || 'Unnamed'}</p>
                        <p className="text-xs text-gray-500 truncate">{s.address}{s.city ? `, ${s.city}` : ''}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

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
