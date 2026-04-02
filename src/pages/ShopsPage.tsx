import { useState } from 'react';
import type { Shop, ShopGroup } from '../types';
import type { HomeAddress } from '../utils/storage';
import { ShopCard } from '../components/ShopCard';
import { ShopForm } from '../components/ShopForm';
import { HomeForm } from '../components/HomeForm';
import { GroupShopPicker } from '../components/GroupShopPicker';
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
  onUpdateGroup: (id: string, updates: { name?: string; shopIds?: string[] }) => Promise<boolean>;
  onDeleteGroup: (id: string) => Promise<boolean>;
}

const PREVIEW_COUNT = 3;

export function ShopsPage({ shops, groups, home, onAdd, onUpdate, onDelete, onReplaceAll, onHomeChange, onLogout, onUpdateGroup, onDeleteGroup }: Props) {
  const [editing, setEditing] = useState<Shop | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHomeForm, setShowHomeForm] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [pickerGroupId, setPickerGroupId] = useState<string | null>(null);
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const toggleExpand = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const handleAddShopToGroup = async (groupId: string, shopId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group || group.shopIds.includes(shopId)) return;
    await onUpdateGroup(groupId, { shopIds: [...group.shopIds, shopId] });
  };

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

  const pickerGroup = pickerGroupId ? groups.find(g => g.id === pickerGroupId) ?? null : null;

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
            <p className="text-xs text-gray-500">Home: {home.address}, {home.city}</p>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3 pb-4 space-y-4">
        {groups.map(group => {
          const groupShops = group.shopIds
            .map(id => shops.find(s => s.id === id))
            .filter((s): s is Shop => !!s);
          if (groupShops.length === 0) return null;

          const isExpanded = expandedGroups.has(group.id);
          const displayShops = isExpanded ? groupShops : groupShops.slice(0, PREVIEW_COUNT);
          const hasMore = groupShops.length > PREVIEW_COUNT;
          const canAddMore = shops.length > group.shopIds.length;

          const isRenaming = renamingGroupId === group.id;

          return (
            <div key={group.id}>
              <div className="flex items-center justify-between mb-2">
                {isRenaming ? (
                  <form
                    className="flex items-center gap-2 flex-1 mr-2"
                    onSubmit={async e => {
                      e.preventDefault();
                      const trimmed = renameValue.trim();
                      if (trimmed && trimmed !== group.name) {
                        await onUpdateGroup(group.id, { name: trimmed });
                      }
                      setRenamingGroupId(null);
                    }}
                  >
                    <input
                      type="text"
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <button type="submit" className="text-xs text-blue-600 font-medium">Save</button>
                    <button type="button" onClick={() => setRenamingGroupId(null)} className="text-xs text-gray-400">Cancel</button>
                  </form>
                ) : (
                  <h2
                    className="text-base font-bold text-gray-900 cursor-pointer"
                    onClick={() => { setRenamingGroupId(group.id); setRenameValue(group.name); }}
                    title="Tap to rename"
                  >
                    {group.name}
                    <span className="text-sm font-normal text-gray-400 ml-2">({groupShops.length})</span>
                  </h2>
                )}
                <div className="flex items-center gap-2">
                  {canAddMore && (
                    <button
                      onClick={() => setPickerGroupId(group.id)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-full text-xs font-medium hover:bg-blue-100 transition-colors"
                    >
                      + Add
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
                  <button
                    onClick={() => { if (confirm(`Delete group "${group.name}"? (Shops won't be deleted)`)) onDeleteGroup(group.id); }}
                    className="text-gray-400 hover:text-red-500 text-lg leading-none"
                    title="Delete group"
                  >
                    &times;
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                {displayShops.map(shop => (
                  <div key={shop.id} className="flex items-center gap-1">
                    <div className="flex-1 min-w-0">
                      <ShopCard shop={shop} onEdit={onEdit} onDelete={onDeleteShop} />
                    </div>
                    <button
                      onClick={() => {
                        const newIds = group.shopIds.filter(id => id !== shop.id);
                        onUpdateGroup(group.id, { shopIds: newIds });
                      }}
                      className="text-gray-300 hover:text-red-400 text-xs shrink-0 px-1"
                      title="Remove from group"
                    >
                      remove
                    </button>
                  </div>
                ))}
              </div>
              <div className="border-b border-gray-200 mt-4" />
            </div>
          );
        })}

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

      {pickerGroup && (
        <GroupShopPicker
          group={pickerGroup}
          shops={shops}
          onAdd={shopId => handleAddShopToGroup(pickerGroup.id, shopId)}
          onClose={() => setPickerGroupId(null)}
        />
      )}
    </div>
  );
}
