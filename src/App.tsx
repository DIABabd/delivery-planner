import { useState } from 'react';
import type { TabId } from './types';
import { useShops } from './hooks/useShops';
import { useRoute } from './hooks/useRoute';
import { isLoggedIn, logout } from './utils/auth';
import { loadHome, saveHome, type HomeAddress } from './utils/storage';
import { LoginScreen } from './components/LoginScreen';
import { BottomNav } from './components/BottomNav';
import { RouteMap } from './components/RouteMap';
import { ShopsPage } from './pages/ShopsPage';
import { RoutePage } from './pages/RoutePage';

function App() {
  const [authed, setAuthed] = useState(isLoggedIn);
  const [tab, setTab] = useState<TabId>('shops');
  const [home, setHome] = useState<HomeAddress | null>(() => loadHome());
  const { shops, addShop, updateShop, deleteShop, replaceAll } = useShops();
  const {
    selectedIds, orderedStops, isOptimized, userLocation, locating, routeInfo, routeGeometry,
    toggleShop, selectAll, clearSelection, optimize, reorderStops,
  } = useRoute();

  if (!authed) {
    return <LoginScreen onLogin={() => setAuthed(true)} />;
  }

  const handleLogout = () => {
    logout();
    setAuthed(false);
  };

  const handleHomeChange = (h: HomeAddress | null) => {
    setHome(h);
    saveHome(h);
  };

  return (
    <div className="flex flex-col h-dvh bg-gray-50">
      <div className="h-[40vh] min-h-[200px] shrink-0 border-b border-gray-300">
        <RouteMap
          allShops={shops}
          routeStops={orderedStops}
          userLocation={userLocation}
          home={home}
          routeGeometry={routeGeometry}
        />
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto">
          {tab === 'shops' && (
            <ShopsPage
              shops={shops}
              home={home}
              onAdd={addShop}
              onUpdate={updateShop}
              onDelete={deleteShop}
              onReplaceAll={replaceAll}
              onHomeChange={handleHomeChange}
              onLogout={handleLogout}
            />
          )}
          {tab === 'route' && (
            <RoutePage
              shops={shops}
              selectedIds={selectedIds}
              orderedStops={orderedStops}
              isOptimized={isOptimized}
              locating={locating}
              userLocation={userLocation}
              home={home}
              routeInfo={routeInfo}
              onToggle={toggleShop}
              onSelectAll={selectAll}
              onClear={clearSelection}
              onOptimize={() => optimize(shops, home?.lat, home?.lng)}
              onReorder={reorderStops}
            />
          )}
        </div>
        <BottomNav active={tab} onChange={setTab} />
      </div>
    </div>
  );
}

export default App;
