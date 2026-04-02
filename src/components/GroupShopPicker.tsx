import { useState } from 'react';
import type { Shop, ShopGroup } from '../types';

interface Props {
  group: ShopGroup;
  shops: Shop[];
  onAdd: (shopId: string) => Promise<void>;
  onClose: () => void;
}

export function GroupShopPicker({ group, shops, onAdd, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<Set<string>>(new Set());

  const query = search.trim().toLowerCase();
  const isInGroup = (id: string) => group.shopIds.includes(id) || added.has(id);

  const sorted = [...shops].sort((a, b) => {
    const aIn = isInGroup(a.id);
    const bIn = isInGroup(b.id);
    if (aIn !== bIn) return aIn ? 1 : -1;
    return (a.name || a.address).localeCompare(b.name || b.address);
  });

  const filtered = query
    ? sorted.filter(s =>
        (s.name || '').toLowerCase().includes(query) ||
        s.address.toLowerCase().includes(query) ||
        s.district.toLowerCase().includes(query)
      )
    : sorted;

  const handleAdd = async (shopId: string) => {
    setAdding(prev => new Set(prev).add(shopId));
    await onAdd(shopId);
    setAdding(prev => { const n = new Set(prev); n.delete(shopId); return n; });
    setAdded(prev => new Set(prev).add(shopId));
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-[1100]" onClick={onClose}>
      <div
        className="bg-white w-full rounded-t-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Add to {group.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 text-2xl"
          >
            &times;
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3 shrink-0">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search shops..."
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Shop list */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 pb-4 space-y-2">
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 py-8 text-sm">No shops found.</p>
          )}
          {filtered.map(shop => {
            const inGroup = isInGroup(shop.id);
            const isAdding = adding.has(shop.id);
            return (
              <div
                key={shop.id}
                className={`rounded-lg border p-3 flex items-center justify-between gap-3 ${
                  inGroup ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <h3 className={`font-medium truncate ${inGroup ? 'text-gray-400' : 'text-gray-900'}`}>
                    {shop.name || shop.address}
                  </h3>
                  {shop.name && (
                    <p className="text-sm text-gray-500 truncate">{shop.address}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    {shop.district ? `${shop.district}, ${shop.city}` : shop.city}
                  </p>
                </div>

                {inGroup ? (
                  <span className="text-xs text-green-600 font-medium shrink-0 px-2 py-1 bg-green-50 rounded-full">
                    Added
                  </span>
                ) : isAdding ? (
                  <span className="text-xs text-blue-500 font-medium shrink-0">Adding...</span>
                ) : (
                  <button
                    onClick={() => handleAdd(shop.id)}
                    className="w-9 h-9 bg-blue-600 text-white rounded-full text-xl font-bold flex items-center justify-center hover:bg-blue-700 shrink-0 transition-colors"
                  >
                    +
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Done */}
        <div className="px-4 py-3 border-t border-gray-200 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}