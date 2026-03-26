import type { Shop, ShopGroup } from '../types';
import { CityFilter } from './CityFilter';
import { useState } from 'react';

interface Props {
  shops: Shop[];
  selectedIds: Set<string>;
  groups: ShopGroup[];
  onToggle: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onClear: () => void;
  onSaveGroup: (name: string, shopIds: string[]) => Promise<ShopGroup | null>;
  onUpdateGroup: (id: string, updates: { name?: string; shopIds?: string[] }) => Promise<boolean>;
  onDeleteGroup: (id: string) => Promise<boolean>;
}

export function RoutePlanner({ shops, selectedIds, groups, onToggle, onSelectAll, onClear, onSaveGroup, onUpdateGroup, onDeleteGroup }: Props) {
  const [cityFilter, setCityFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [showSaveGroup, setShowSaveGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = shops.filter(s => {
    if (cityFilter && s.city !== cityFilter) return false;
    if (districtFilter && s.district !== districtFilter) return false;
    return true;
  });

  const allFilteredSelected = filtered.length > 0 && filtered.every(s => selectedIds.has(s.id));

  const handleLoadGroup = (group: ShopGroup) => {
    if (activeGroupId === group.id) {
      // Already active — deselect
      onClear();
      setActiveGroupId(null);
      return;
    }
    const validIds = group.shopIds.filter(id => shops.some(s => s.id === id));
    onSelectAll(validIds);
    setActiveGroupId(group.id);
    setCityFilter('');
    setDistrictFilter('');
  };

  const handleSaveNewGroup = async () => {
    const name = newGroupName.trim();
    if (!name) { alert('Please enter a group name'); return; }
    if (selectedIds.size === 0) { alert('No shops selected'); return; }
    setSaving(true);
    try {
      const ids = Array.from(selectedIds);
      const group = await onSaveGroup(name, ids);
      if (group) {
        setActiveGroupId(group.id);
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

  const handleUpdateGroup = async (group: ShopGroup) => {
    if (selectedIds.size === 0) return;
    const ok = await onUpdateGroup(group.id, { shopIds: Array.from(selectedIds) });
    if (ok) setActiveGroupId(group.id);
  };

  // Check if active group selection has been modified
  const activeGroup = groups.find(g => g.id === activeGroupId);
  const groupModified = activeGroup
    ? activeGroup.shopIds.length !== selectedIds.size || activeGroup.shopIds.some(id => !selectedIds.has(id))
    : false;

  const handleDeleteGroup = async (id: string) => {
    await onDeleteGroup(id);
    if (activeGroupId === id) setActiveGroupId(null);
  };

  return (
    <div className="space-y-3">
      {/* Groups section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Groups</p>
          {selectedIds.size > 0 && (
            <button
              onClick={() => setShowSaveGroup(!showSaveGroup)}
              className="text-xs text-blue-600 font-medium"
            >
              {showSaveGroup ? 'Cancel' : 'Save as Group'}
            </button>
          )}
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

        {/* Group chips */}
        {groups.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {groups.map(group => (
              <div
                key={group.id}
                className={`flex items-center gap-1 rounded-lg border text-sm transition-colors ${
                  activeGroupId === group.id
                    ? 'bg-blue-100 border-blue-300 text-blue-800'
                    : 'bg-white border-gray-200 text-gray-700'
                }`}
              >
                <button
                  onClick={() => handleLoadGroup(group)}
                  className="px-3 py-1.5 font-medium"
                >
                  {group.name}
                  <span className="text-xs opacity-60 ml-1">({group.shopIds.length})</span>
                </button>
                {activeGroupId === group.id && groupModified && selectedIds.size > 0 && (
                  <button
                    onClick={() => handleUpdateGroup(group)}
                    title="Update group with current selection"
                    className="px-2 py-0.5 bg-blue-600 text-white rounded text-xs font-medium"
                  >
                    Update
                  </button>
                )}
                <button
                  onClick={() => { if (confirm(`Delete "${group.name}"?`)) handleDeleteGroup(group.id); }}
                  className="pr-2 text-gray-400 hover:text-red-500 text-xs"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">No groups yet. Select shops and save as a group.</p>
        )}
      </div>

      <div className="border-t border-gray-200" />

      <CityFilter
        shops={shops}
        cityFilter={cityFilter}
        districtFilter={districtFilter}
        onCityChange={setCityFilter}
        onDistrictChange={setDistrictFilter}
      />

      <div className="flex gap-2">
        <button
          onClick={() => {
            if (allFilteredSelected) {
              onClear();
            } else {
              onSelectAll(filtered.map(s => s.id));
            }
            setActiveGroupId(null);
          }}
          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs hover:bg-gray-200"
        >
          {allFilteredSelected ? 'Deselect All' : 'Select All'}
        </button>
        <span className="text-xs text-gray-400 self-center">
          {selectedIds.size} selected
        </span>
      </div>

      <div className="space-y-1">
        {filtered.map(shop => (
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
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-400 py-8 text-sm">
          {shops.length === 0 ? 'Add shops first' : 'No shops in this city'}
        </p>
      )}
    </div>
  );
}
