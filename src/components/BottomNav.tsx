import type { TabId } from '../types';

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: 'shops', label: 'Shops', icon: '🏪' },
  { id: 'route', label: 'Route', icon: '📋' },
];

interface Props {
  active: TabId;
  onChange: (tab: TabId) => void;
}

export function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="bg-white border-t border-gray-200 flex z-[1000]">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
            active === tab.id
              ? 'text-blue-600 font-semibold'
              : 'text-gray-500'
          }`}
        >
          <span className="text-xl mb-0.5">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
