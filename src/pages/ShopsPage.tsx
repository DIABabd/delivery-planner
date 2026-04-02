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
  const [pickerSelected, setPickerSelected] = useState<Set<string>>(new Set());
  const [pickerSaving, setPickerSaving] = useState(false);

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
    setPickerSelected(new Set());
  };

  const closeGroupPicker = () => {
    setAddingToGroupId(null);
    setPickerSelected(new Set());
  };

  const handleAddShopsToGroup = async () => {
    if (!addingToGroupId || pickerSelected.size === 0) return;
    const group = groups.find(g => g.id === addingToGroupId);
    if (!group) return;
    setPickerSaving(true);
    const newShopIds = [...group.shopIds, ...Array.from(pickerSelected).filter(id => !group.shopIds.includes(id))];
    await onUpdateGroup(addingToGroupId, { shopIds: newShopIds });
    setPickerSaving(false);
    closeGroupPicker();
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

          const shopsNotInGroup = shops.filter(s => !group.shopIds.includes(s.id));

          return (
            <div key={group.id}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-bold text-gray-900">
                  {group.name}
                  <span className="text-sm font-normal text-gray-400 ml-2">({groupShops.length})</span>
                </h2>
                <div className="flex items-center gap-2">
                  {shopsNotInGroup.length > 0 && (
                    <button
                      onClick={() => openGroupPicker(group.id)}
                      className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-sm font-bold flex items-center justify-center hover:bg-blue-200"
                      title="Add shops to this group"
                    >
                      +
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

      {addingToGroupId && (() => {
        const group = groups.find(g => g.id === addingToGroupId);
        const shopsNotInGroup = shops.filter(s => !group?.shopIds.includes(s.id));
        return (
          <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={closeGroupPicker}>
            <div className="bg-white w-full rounded-t-2xl max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <h3 className="font-bold text-gray-900">Add shops to "{group?.name}"</h3>
                <button onClick={closeGroupPicker} className="text-gray-400 text-xl leading-none">×</button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
                {shopsNotInGroup.length === 0 ? (
                  <p className="text-center text-gray-400 py-6 text-sm">All shops are already in this group.</p>
                ) : (
                  shopsNotInGroup.map(shop => (
                    <label
                      key={shop.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        pickerSelected.has(shop.id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={pickerSelected.has(shop.id)}
                        onChange={() => {
                          setPickerSelected(prev => {
                            const next = new Set(prev);
                            if (next.has(shop.id)) next.delete(shop.id);
                            else next.add(shop.id);
                            return next;
                          });
                        }}
                        className="w-5 h-5 rounded accent-blue-600 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{shop.name || shop.address}</p>
                        <p className="text-xs text-gray-500 truncate">{shop.name ? shop.address : ''}{shop.district ? ` · ${shop.district}` : ''}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
              {shopsNotInGroup.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-200">
                  <button
                    onClick={handleAddShopsToGroup}
                    disabled={pickerSelected.size === 0 || pickerSaving}
                    className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {pickerSaving ? 'Adding...' : `Add ${pickerSelected.size > 0 ? pickerSelected.size : ''} shop${pickerSelected.size !== 1 ? 's' : ''}`}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
