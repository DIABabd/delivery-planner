import type { Shop } from '../types';

interface Props {
  shops: Shop[];
  cityFilter: string;
  districtFilter: string;
  onCityChange: (city: string) => void;
  onDistrictChange: (district: string) => void;
}

export function CityFilter({ shops, cityFilter, districtFilter, onCityChange, onDistrictChange }: Props) {
  if (shops.length === 0) return null;

  // Get unique cities
  const cities = Array.from(new Set(shops.map(s => s.city).filter(Boolean))).sort();

  // Get unique districts for the selected city
  const districts = cityFilter
    ? Array.from(new Set(
        shops
          .filter(s => s.city === cityFilter && s.district)
          .map(s => s.district)
      )).sort()
    : [];

  return (
    <div className="flex gap-2">
      <select
        value={cityFilter}
        onChange={e => {
          onCityChange(e.target.value);
          onDistrictChange('');
        }}
        className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Cities</option>
        {cities.map(city => (
          <option key={city} value={city}>{city}</option>
        ))}
      </select>

      {districts.length > 0 && (
        <select
          value={districtFilter}
          onChange={e => onDistrictChange(e.target.value)}
          className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Districts</option>
          {districts.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      )}
    </div>
  );
}
