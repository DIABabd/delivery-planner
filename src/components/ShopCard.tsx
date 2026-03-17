import type { Shop } from '../types';

interface Props {
  shop: Shop;
  onEdit: (shop: Shop) => void;
  onDelete: (id: string) => void;
}

export function ShopCard({ shop, onEdit, onDelete }: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0" onClick={() => onEdit(shop)}>
        <h3 className="font-medium text-gray-900 truncate">{shop.name || shop.address}</h3>
        {shop.name && <p className="text-sm text-gray-500 truncate">{shop.address}</p>}
        <p className="text-xs text-gray-400">{shop.district ? `${shop.district}, ${shop.city}` : shop.city}</p>
        {!shop.lat && (
          <p className="text-xs text-amber-600 mt-1">No location set</p>
        )}
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDelete(shop.id); }}
        className="text-gray-400 hover:text-red-500 p-1 text-lg shrink-0"
        aria-label="Delete"
      >
        &times;
      </button>
    </div>
  );
}
