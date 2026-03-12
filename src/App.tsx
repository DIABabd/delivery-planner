import { useState } from 'react';
import type { TabId } from './types';
import { useShops } from './hooks/useShops';
import { useRoute } from './hooks/useRoute';
import { BottomNav } from './components/BottomNav';
import { RouteMap } from './components/RouteMap';
import { ShopsPage } from './pages/ShopsPage';
import { RoutePage } from './pages/RoutePage';

function App() {
  const [tab, setTab] = useState<TabId>('shops');
  const { shops, cities, addShop, updateShop, deleteShop, replaceAll } = useShops();
  const {
    selectedIds, orderedStops, isOptimized, userLocation, locating,
    toggleShop, selectAll, clearSelection, optimize,
  } = useRoute();

  return (
    <div className="flex flex-col h-dvh bg-gray-50">
      {/* Map always visible on top */}
      <div className="h-[40vh] min-h-[200px] shrink-0 border-b border-gray-300">
        <RouteMap
          allShops={shops}
          routeStops={orderedStops}
          userLocation={userLocation}
        />
      </div>

      {/* Content below the map */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto">
          {tab === 'shops' && (
            <ShopsPage
              shops={shops}
              cities={cities}
              onAdd={addShop}
              onUpdate={updateShop}
              onDelete={deleteShop}
              onReplaceAll={replaceAll}
            />
          )}
          {tab === 'route' && (
            <RoutePage
              shops={shops}
              cities={cities}
              selectedIds={selectedIds}
              orderedStops={orderedStops}
              isOptimized={isOptimized}
              locating={locating}
              userLocation={userLocation}
              onToggle={toggleShop}
              onSelectAll={selectAll}
              onClear={clearSelection}
              onOptimize={() => optimize(shops)}
            />
          )}
        </div>
        <BottomNav active={tab} onChange={setTab} />
      </div>
    </div>
  );
}

export default App;
