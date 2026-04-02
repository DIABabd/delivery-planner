import { useState, useEffect } from 'react';
import type { RouteHistoryEntry } from '../types';
import { loadHistory, deleteHistoryEntry } from '../utils/storage';

interface Props {
  onClose: () => void;
}

export function RouteHistory({ onClose }: Props) {
  const [entries, setEntries] = useState<RouteHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory().then(data => { setEntries(data); setLoading(false); });
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this history entry?')) return;
    const ok = await deleteHistoryEntry(id);
    if (ok) setEntries(prev => prev.filter(e => e.id !== id));
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-[1100]" onClick={onClose}>
      <div
        className="bg-white w-full rounded-t-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Route History</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 px-4 pb-4">
          {loading && (
            <p className="text-center text-gray-400 py-8 text-sm">Loading...</p>
          )}

          {!loading && entries.length === 0 && (
            <p className="text-center text-gray-400 py-8 text-sm">
              No routes completed yet. Finish a route to see it here.
            </p>
          )}

          <div className="space-y-3 mt-2">
            {entries.map(entry => (
              <div key={entry.id} className="bg-white rounded-lg border border-gray-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 text-sm">
                        {formatDate(entry.completedAt)}
                      </p>
                      <span className="text-xs text-gray-400">{formatTime(entry.completedAt)}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500">
                        {entry.doneShops}/{entry.totalShops} shops done
                      </span>
                      {entry.distanceKm != null && (
                        <span className="text-xs text-gray-400">
                          {entry.distanceKm.toFixed(1)} km
                        </span>
                      )}
                      {entry.durationMin != null && (
                        <span className="text-xs text-gray-400">
                          {Math.round(entry.durationMin)} min
                        </span>
                      )}
                    </div>
                    {entry.shopNames.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1.5 truncate">
                        {entry.shopNames.join(', ')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-gray-300 hover:text-red-500 text-lg shrink-0"
                  >
                    &times;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-gray-200 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}