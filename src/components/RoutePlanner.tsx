import type { Shop, ShopGroup } from '../types';
import { useState } from 'react';

interface Props {
  shops: Shop[];
  selectedIds: Set<string>;
  groups: ShopGroup[];
  onToggle: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onAddToSelection: (ids: string[]) => void;
  onRemoveFromSelection: (ids: string[]) => void;
  onClear: () => void;
  onSaveGroup: (name: string, shopIds: string[]) => Promise<ShopGroup | null>;
  onUpdateGroup: (id: string, updates: { name?: string; shopIds?: string[] }) => Promise<boolean>;
  onDeleteGroup: (id: string) => Promise<boolean>;
}

const PREVIEW_COUNT = 3;

export function RoutePlanner({ shops, selectedIds, groups, onToggle, onSelectAll, onAddToSelection, onRemoveFromSelection, onClear, onSaveGroup, onUpdateGroup, onDeleteGroup }: Props) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showSaveGroup, setShowSaveGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleExpand = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  // Find ungrouped shops
  const groupedShopIds = new Set<string>();
  groups.forEach(g => g.shopIds.forEach(id => groupedShopIds.add(id)));
  const ungroupedShops = shops.filter(s => !groupedShopIds.has(s.id));

  const handleSaveNewGroup = async () => {
    const name = newGroupName.trim();
    if (!name) { alert('Please enter a group name'); return; }
    if (selectedIds.size === 0) { alert('No shops selected'); return; }
    setSaving(true);
    try {
      const ids = Array.from(selectedIds);
      const group = await onSaveGroup(name, ids);
      if (group) {
        setNewGroupName('');
        setShowSaveGroup(false);
      } else {
        alert('Failed to save group. Check browser console for details.');
      }
    } catch (err) {
      alert('Error saving group: ' + (err instanceof Error ? err.message : String(err)));
    }
    setSaving(false);
  };

  const handleDeleteGroup = async (id: string) => {
    await onDeleteGroup(id);
  };

  // Check if all shops in a group are selected
  const isGroupFullySelected = (group: ShopGroup) => {
    const validIds = group.shopIds.filter(id => shops.some(s => s.id === id));
    return validIds.length > 0 && validIds.every(id => selectedIds.has(id));
  };

  const toggleGroupSelection = (group: ShopGroup) => {
    const validIds = group.shopIds.filter(id => shops.some(s => s.id === id));
    if (isGroupFullySelected(group)) {
      onRemoveFromSelection(validIds);
    } else {
      onAddToSelection(validIds);
    }
  };

  const renderShopCheckbox = (shop: Shop) => (
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
        <p className="font-medium text-sm text-gray-900 truncate">
          {shop.name || shop.address}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {shop.name ? shop.address : ''}{shop.district ? ` - ${shop.district}` : ''}
        </p>
        {!shop.lat && <p className="text-xs text-amber-600">No location</p>}
      </div>
    </label>
  );

  return (
    <div className="space-y-3">
      {/* Top bar: selected count + save as group */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {selectedIds.size} selected
        </span>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <button
                onClick={onClear}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
              <button
                onClick={() => setShowSaveGroup(!showSaveGroup)}
                className="text-xs text-blue-600 font-medium"
              >
                {showSaveGroup ? 'Cancel' : 'Save as Group'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Save new group form */}
      {showSaveGroup && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            placeholder="Group name..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={e => e.key === 'Enter' && handleSaveNewGroup()}
            autoFocus
          />
          <button
            onClick={handleSaveNewGroup}
            disabled={!newGroupName.trim() || saving}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      )}

      {/* Catalog: Groups as sections */}
      {groups.map(group => {
        const groupShops = group.shopIds
          .map(id => shops.find(s => s.id === id))
          .filter((s): s is Shop => !!s);
        if (groupShops.length === 0) return null;

        const isExpanded = expandedGroups.has(group.id);
        const displayShops = isExpanded ? groupShops : groupShops.slice(0, PREVIEW_COUNT);
        const hasMore = groupShops.length > PREVIEW_COUNT;
        const allSelected = isGroupFullySelected(group);
        const someSelected = groupShops.some(s => selectedIds.has(s.id));

        return (
          <div key={group.id}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleGroupSelection(group)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    allSelected
                      ? 'bg-blue-600 text-white'
                      : someSelected
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {allSelected ? 'Deselect' : 'Select'}
                </button>
                <h2 className="text-base font-bold text-gray-900">
                  {group.name}
                  <span className="text-sm font-normal text-gray-400 ml-1">({groupShops.length})</span>
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {hasMore && (
                  <button
                    onClick={() => toggleExpand(group.id)}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-medium hover:bg-gray-300"
                  >
                    {isExpanded ? 'Show less' : 'See all'}
                  </button>
                )}
                <button
                  onClick={() => { if (confirm(`Delete group "${group.name}"?`)) handleDeleteGroup(group.id); }}
                  className="text-gray-400 hover:text-red-500 text-sm"
                >
                  x
                </button>
              </div>
            </div>
            <div className="space-y-1">
              {displayShops.map(shop => renderShopCheckbox(shop))}
            </div>
            <div className="border-b border-gray-200 mt-3" />
          </div>
        );
      })}

      {/* Ungrouped shops */}
      {ungroupedShops.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-gray-900">
              All other shops
              <span className="text-sm font-normal text-gray-400 ml-1">({ungroupedShops.length})</span>
            </h2>
          </div>
          <div className="space-y-1">
            {ungroupedShops.map(shop => renderShopCheckbox(shop))}
          </div>
        </div>
      )}

      {shops.length === 0 && (
        <p className="text-center text-gray-400 py-8 text-sm">
          Add shops first
        </p>
      )}
    </div>
  );
}
