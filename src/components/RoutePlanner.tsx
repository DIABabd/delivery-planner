import type { Shop } from '../types';
import { CityFilter } from './CityFilter';
import { useState } from 'react';

interface Props {
  shops: Shop[];
  cities: string[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onClear: () => void;
}

export function RoutePlanner({ shops, cities, selectedIds, onToggle, onSelectAll, onClear }: Props) {
  const [cityFilter, setCityFilter] = useState('');

  const filtered = cityFilter
    ? shops.filter(s => s.city === cityFilter)
    : shops;

  const allFilteredSelected = filtered.length > 0 && filtered.every(s => selectedIds.has(s.id));

  return (
    <div className="space-y-3">
      <CityFilter cities={cities} selected={cityFilter} onChange={setCityFilter} />

      <div className="flex gap-2">
        <button
          onClick={() => {
            if (allFilteredSelected) {
              onClear();
            } else {
              onSelectAll(filtered.map(s => s.id));
            }
          }}
          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs hover:bg-gray-200"
        >
          {allFilteredSelected ? 'Deselect All' : 'Select All'}
        </button>
        <span className="text-xs text-gray-400 self-center">
          {selectedIds.size} selected
        </span>
      </div>

      <div className="space-y-1">
        {filtered.map(shop => (
          <label
            key={shop.id}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
              selectedIds.has(shop.id)
                ? 'bg-blue-50 border-blue-200'
                : 'bg-white border-gray-200'
            }`}
          >
            <input
              type="checkbox"
              checked={selectedIds.has(shop.id)}
              onChange={() => onToggle(shop.id)}
              className="w-5 h-5 rounded accent-blue-600 shrink-0"
            />
            <div className="min-w-0">
              <p className="font-medium text-sm text-gray-900 truncate">{shop.name}</p>
              <p className="text-xs text-gray-500 truncate">{shop.address}</p>
              {!shop.lat && <p className="text-xs text-amber-600">No location</p>}
            </div>
          </label>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-400 py-8 text-sm">
          {shops.length === 0 ? 'Add shops first' : 'No shops in this city'}
        </p>
      )}
    </div>
  );
}
