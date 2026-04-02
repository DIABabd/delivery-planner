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
  const sorted = [...shops].sort((a, b) => {
    const aIn = group.shopIds.includes(a.id) || added.has(a.id);
    const bIn = group.shopIds.includes(b.id) || added.has(b.id);
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

  const isInGroup = (id: string) => group.shopIds.includes(id) || added.has(id);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
      {/* backdrop */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }}
        onClick={onClose}
      />

      {/* sheet */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '75vh',
        background: '#fff',
        borderRadius: '20px 20px 0 0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#d1d5db' }} />
        </div>

        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 16px 12px' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Add to "{group.name}"</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
              Tap + on a shop to add it
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: 20,
              background: '#f3f4f6', border: 'none',
              fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#374151',
            }}
          >
            Close
          </button>
        </div>

        {/* search */}
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              fontSize: 14, color: '#9ca3af', pointerEvents: 'none',
            }}>🔍</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or address..."
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '10px 36px 10px 36px',
                background: '#f3f4f6', border: '2px solid transparent',
                borderRadius: 12, fontSize: 14, outline: 'none',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#fff'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = '#f3f4f6'; }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', fontSize: 18, color: '#9ca3af', cursor: 'pointer',
                }}
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div style={{ height: 1, background: '#e5e7eb', flexShrink: 0 }} />

        {/* list — this is the only scrollable part */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 16px', fontSize: 14 }}>
              No shops found.
            </div>
          )}
          {filtered.map(shop => {
            const inGroup = isInGroup(shop.id);
            const isAdding = adding.has(shop.id);
            return (
              <div
                key={shop.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  borderBottom: '1px solid #f3f4f6',
                  background: inGroup ? '#f9fafb' : isAdding ? '#eff6ff' : '#fff',
                }}
              >
                {/* text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 600, fontSize: 14,
                    color: inGroup ? '#9ca3af' : '#111827',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {shop.name || shop.address}
                  </div>
                  <div style={{
                    fontSize: 12, color: '#9ca3af',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {[shop.name ? shop.address : null, shop.district || null].filter(Boolean).join(' · ')}
                  </div>
                </div>

                {/* right action */}
                {inGroup ? (
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: '#16a34a',
                    background: '#dcfce7', padding: '2px 8px', borderRadius: 20, flexShrink: 0,
                  }}>
                    ✓ In group
                  </span>
                ) : isAdding ? (
                  <span style={{ fontSize: 12, color: '#60a5fa', flexShrink: 0 }}>Adding…</span>
                ) : (
                  <button
                    onClick={e => { e.stopPropagation(); handleAdd(shop.id); }}
                    style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: '#2563eb', border: 'none',
                      color: '#fff', fontSize: 22, fontWeight: 700,
                      cursor: 'pointer', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      lineHeight: 1,
                    }}
                  >
                    +
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '13px', borderRadius: 14,
              background: '#111827', color: '#fff', border: 'none',
              fontWeight: 700, fontSize: 15, cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
