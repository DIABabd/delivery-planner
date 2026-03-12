interface Props {
  cities: string[];
  selected: string;
  onChange: (city: string) => void;
}

export function CityFilter({ cities, selected, onChange }: Props) {
  if (cities.length === 0) return null;

  return (
    <select
      value={selected}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="">All Cities</option>
      {cities.map(city => (
        <option key={city} value={city}>{city}</option>
      ))}
    </select>
  );
}
