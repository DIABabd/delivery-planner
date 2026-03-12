import { useState } from 'react';
import type { Shop } from '../types';
import { CityFilter } from '../components/CityFilter';
import { ShopList } from '../components/ShopList';
import { ShopForm } from '../components/ShopForm';
import { exportData, importData } from '../utils/storage';

interface Props {
  shops: Shop[];
  cities: string[];
  onAdd: (data: Omit<Shop, 'id' | 'createdAt'>) => void;
  onUpdate: (id: string, data: Partial<Shop>) => void;
  onDelete: (id: string) => void;
  onReplaceAll: (shops: Shop[]) => void;
  onLogout: () => void;
}

export function ShopsPage({ shops, cities, onAdd, onUpdate, onDelete, onReplaceAll, onLogout }: Props) {
  const [cityFilter, setCityFilter] = useState('');
  const [editing, setEditing] = useState<Shop | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const filtered = cityFilter ? shops.filter(s => s.city === cityFilter) : shops;

  const handleSave = (data: { name: string; address: string; city: string; notes: string; lat: number | null; lng: number | null }) => {
    if (editing) {
      onUpdate(editing.id, data);
    } else {
      onAdd(data);
    }
    setShowForm(false);
    setEditing(null);
  };

  const handleExport = () => {
    const json = exportData();
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
        const data = importData(text);
        onReplaceAll(data.shops);
        alert(`Imported ${data.shops.length} shops`);
      } catch {
        alert('Invalid file. Please select a valid backup file.');
      }
    };
    input.click();
  };

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
            onClick={() => setShowSettings(!showSettings)}
            className="text-gray-500 text-sm px-2 py-1"
          >
            {showSettings ? 'Close' : 'Settings'}
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex gap-2 flex-wrap">
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
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3 pb-4 space-y-3">
        <CityFilter cities={cities} selected={cityFilter} onChange={setCityFilter} />
        <ShopList
          shops={filtered}
          onEdit={shop => { setEditing(shop); setShowForm(true); }}
          onDelete={id => { if (confirm('Delete this shop?')) onDelete(id); }}
        />
      </div>

      {showForm && (
        <ShopForm
          shop={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}
