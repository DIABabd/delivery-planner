import type { Shop } from '../types';
import { ShopCard } from './ShopCard';

interface Props {
  shops: Shop[];
  onEdit: (shop: Shop) => void;
  onDelete: (id: string) => void;
}

export function ShopList({ shops, onEdit, onDelete }: Props) {
  if (shops.length === 0) {
    return (
      <div className="text-center text-gray-400 py-12">
        <p className="text-4xl mb-2">🏪</p>
        <p>No shops yet. Tap + to add one.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {shops.map(shop => (
        <ShopCard key={shop.id} shop={shop} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
