import { useState } from 'react';
import type { Shop, ShopGroup } from '../types';
import type { HomeAddress } from '../utils/storage';
import { ShopCard } from '../components/ShopCard';
import { ShopForm } from '../components/ShopForm';
import { HomeForm } from '../components/HomeForm';
import { exportData, importData } from '../utils/storage';

interface Props {
  shops: Shop[];
  groups: ShopGroup[];
  home: HomeAddress | null;
  onAdd: (data: Omit<Shop, 'id' | 'createdAt'>) => void;
  onUpdate: (id: string, data: Partial<Shop>) => void;
  onDelete: (id: string) => void;
  onReplaceAll: (shops: Shop[]) => void;
  onHomeChange: (home: HomeAddress | null) => void;
  onLogout: () => void;
  onUpdateGroup: (id: string, updates: { shopIds?: string[] }) => Promise<boolean>;
}

const PREVIEW_COUNT = 3;

export function ShopsPage({ shops, groups, home, onAdd, onUpdate, onDelete, onReplaceAll, onHomeChange, onLogout, onUpdateGroup }: Props) {
  const [editing, setEditing] = useState<Shop | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHomeForm, setShowHomeForm] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [addingToGroupId, setAddingToGroupId] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [savingShopIds, setSavingShopIds] = useState<Set<string>>(new Set());

  const toggleExpand = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const openGroupPicker = (groupId: string) => {
    setAddingToGroupId(groupId);
    setPickerSearch('');
  };

  const closeGroupPicker = () => {
    setAddingToGroupId(null);
    setPickerSearch('');
    setSavingShopIds(new Set());
  };

  const handleAddShopToGroup = async (shopId: string) => {
    if (!addingToGroupId) return;
    const group = groups.find(g => g.id === addingToGroupId);
    if (!group || group.shopIds.includes(shopId)) return;
    setSavingShopIds(prev => new Set(prev).add(shopId));
    await onUpdateGroup(addingToGroupId, { shopIds: [...group.shopIds, shopId] });
    setSavingShopIds(prev => {
      const next = new Set(prev);
      next.delete(shopId);
      return next;
    });
  };

  // Find shops that belong to at least one group
  const groupedShopIds = new Set<string>();
  groups.forEach(g => g.shopIds.forEach(id => groupedShopIds.add(id)));
  const ungroupedShops = shops.filter(s => !groupedShopIds.has(s.id));

  const handleSave = (data: { name: string; address: string; city: string; district: string; notes: string; lat: number | null; lng: number | null }) => {
    if (editing) {
      onUpdate(editing.id, data);
    } else {
      onAdd(data);
    }
    setShowForm(false);
    setEditing(null);
  };

  const handleExport = async () => {
    const json = await exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `route-planner-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = await importData(text);
        onReplaceAll(data.shops);
        alert(`Imported ${data.shops.length} shops`);
      } catch {
        alert('Invalid file. Please select a valid backup file.');
      }
    };
    input.click();
  };

  const onEdit = (shop: Shop) => { setEditing(shop); setShowForm(true); };
  const onDeleteShop = (id: string) => { if (confirm('Delete this shop?')) onDelete(id); };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900">Shops</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="w-8 h-8 bg-blue-600 text-white rounded-full text-lg font-bold flex items-center justify-center hover:bg-blue-700"
          >
            +
          </button>
          <button
            onClick={() => { setEditing(null); setShowForm(true); setQuickAdd(true); }}
            className="w-8 h-8 bg-green-600 text-white rounded-full text-sm flex items-center justify-center hover:bg-green-700"
            title="Add shop at my location"
          >
            GPS
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-gray-500 text-sm px-2 py-1"
          >
            {showSettings ? 'Close' : 'Settings'}
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 space-y-2">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowHomeForm(true)}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs hover:bg-gray-50"
            >
              {home ? 'Edit Home' : 'Set Home'}
            </button>
            <button onClick={handleExport} className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs hover:bg-gray-50">
              Export Data
            </button>
            <button onClick={handleImport} className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs hover:bg-gray-50">
              Import Data
            </button>
            <button onClick={onLogout} className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs hover:bg-red-100">
              Logout
            </button>
          </div>
          {home && (
            <p className="text-xs text-gray-500">
              Home: {home.address}, {home.city}
            </p>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3 pb-4 space-y-4">
        {/* Grouped shops - catalog style */}
        {groups.map(group => {
          const groupShops = group.shopIds
            .map(id => shops.find(s => s.id === id))
            .filter((s): s is Shop => !!s);
          if (groupShops.length === 0) return null;

          const isExpanded = expandedGroups.has(group.id);
          const displayShops = isExpanded ? groupShops : groupShops.slice(0, PREVIEW_COUNT);
          const hasMore = groupShops.length > PREVIEW_COUNT;
          const canAddMore = shops.length > group.shopIds.length;

          return (
            <div key={group.id}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-bold text-gray-900">
                  {group.name}
                  <span className="text-sm font-normal text-gray-400 ml-2">({groupShops.length})</span>
                </h2>
                <div className="flex items-center gap-2">
                  {canAddMore && (
                    <button
                      onClick={() => openGroupPicker(group.id)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-full text-xs font-medium hover:bg-blue-100 transition-colors"
                      title="Add shops to this group"
                    >
                      <span className="text-sm leading-none">+</span> Add
                    </button>
                  )}
                  {hasMore && (
                    <button
                      onClick={() => toggleExpand(group.id)}
                      className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-medium hover:bg-gray-300"
                    >
                      {isExpanded ? 'Show less' : 'See all'}
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                {displayShops.map(shop => (
                  <ShopCard key={shop.id} shop={shop} onEdit={onEdit} onDelete={onDeleteShop} />
                ))}
              </div>
              <div className="border-b border-gray-200 mt-4" />
            </div>
          );
        })}

        {/* Ungrouped shops */}
        {ungroupedShops.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-gray-900">
                All other shops
                <span className="text-sm font-normal text-gray-400 ml-2">({ungroupedShops.length})</span>
              </h2>
            </div>
            <div className="space-y-1.5">
              {ungroupedShops.map(shop => (
                <ShopCard key={shop.id} shop={shop} onEdit={onEdit} onDelete={onDeleteShop} />
              ))}
            </div>
          </div>
        )}

        {/* No shops at all */}
        {shops.length === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">
            No shops yet. Tap + to add your first shop.
          </p>
        )}
      </div>

      {showForm && (
        <ShopForm
          shop={editing}
          useLocation={quickAdd}
          existingShops={shops}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); setQuickAdd(false); }}
        />
      )}

      {showHomeForm && (
        <HomeForm
          home={home}
          onSave={h => { onHomeChange(h); setShowHomeForm(false); }}
          onClose={() => setShowHomeForm(false)}
        />
      )}

      {/* Add shops to group — bottom sheet */}
      {addingToGroupId && (() => {
        const group = groups.find(g => g.id === addingToGroupId);
        if (!group) return null;

        const query = pickerSearch.trim().toLowerCase();
        const sortedShops = [...shops].sort((a, b) => {
          const aIn = group.shopIds.includes(a.id);
          const bIn = group.shopIds.includes(b.id);
          if (aIn !== bIn) return aIn ? 1 : -1; // not-in-group first
          return (a.name || a.address).localeCompare(b.name || b.address);
        });
        const filtered = query
          ? sortedShops.filter(s =>
              (s.name || '').toLowerCase().includes(query) ||
              s.address.toLowerCase().includes(query) ||
              s.district.toLowerCase().includes(query)
            )
          : sortedShops;

        const notInGroupCount = shops.filter(s => !group.shopIds.includes(s.id)).length;

        return (
          <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={closeGroupPicker}>
            <div
              className="bg-white w-full rounded-t-2xl flex flex-col"
              style={{ maxHeight: '80vh' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Add to "{group.name}"</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {notInGroupCount} shop{notInGroupCount !== 1 ? 's' : ''} can be added · tap to add instantly
                  </p>
                </div>
                <button
                  onClick={closeGroupPicker}
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 text-lg leading-none"
                >
                  ×
                </button>
              </div>

              {/* Search bar */}
              <div className="px-4 pb-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                  <input
                    type="text"
                    value={pickerSearch}
                    onChange={e => setPickerSearch(e.target.value)}
                    placeholder="Search by name, address or district..."
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                    autoFocus
                  />
                  {pickerSearch && (
                    <button
                      onClick={() => setPickerSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Shop list */}
              <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5">
                {filtered.length === 0 ? (
                  <p className="text-center text-gray-400 py-8 text-sm">No shops match your search.</p>
                ) : (
                  filtered.map(shop => {
                    const alreadyIn = group.shopIds.includes(shop.id);
                    const saving = savingShopIds.has(shop.id);
                    return (
                      <div
                        key={shop.id}
                        className={`flex items-center gap-3 px-3 py-3 rounded-xl border transition-all ${
                          alreadyIn
                            ? 'bg-gray-50 border-gray-100 opacity-60'
                            : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer active:scale-[0.98]'
                        }`}
                        onClick={() => !alreadyIn && !saving && handleAddShopToGroup(shop.id)}
                      >
                        {/* Status icon */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm ${
                          alreadyIn
                            ? 'bg-green-100 text-green-600'
                            : saving
                              ? 'bg-blue-100 text-blue-400'
                              : 'bg-blue-100 text-blue-600'
                        }`}>
                          {alreadyIn ? '✓' : saving ? '…' : '+'}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm truncate ${alreadyIn ? 'text-gray-500' : 'text-gray-900'}`}>
                            {shop.name || shop.address}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {shop.name ? shop.address : ''}
                            {shop.district ? (shop.name ? ` · ${shop.district}` : shop.district) : ''}
                          </p>
                        </div>

                        {/* Right label */}
                        <span className={`text-xs font-medium shrink-0 ${alreadyIn ? 'text-green-500' : 'text-blue-500'}`}>
                          {alreadyIn ? 'In group' : saving ? 'Adding...' : 'Tap to add'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom safe area */}
              <div className="h-4" />
            </div>
          </div>
        );
      })()}
    </div>
  );
}
