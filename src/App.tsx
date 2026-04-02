import { useState, useEffect } from 'react';
import type { TabId } from './types';
import { useShops } from './hooks/useShops';
import { useRoute } from './hooks/useRoute';
import { useGroups } from './hooks/useGroups';
import { logout, onAuthChange } from './utils/auth';
import { loadHome, saveHome, type HomeAddress } from './utils/storage';
import { LoginScreen } from './components/LoginScreen';
import { BottomNav } from './components/BottomNav';
import { RouteMap } from './components/RouteMap';
import { ShopsPage } from './pages/ShopsPage';
import { RoutePage } from './pages/RoutePage';

function App() {
  const [authed, setAuthed] = useState<boolean | null>(null); // null = checking
  const [tab, setTab] = useState<TabId>('shops');
  const [home, setHome] = useState<HomeAddress | null>(null);
  const { shops, addShop, updateShop, deleteShop, replaceAll, reload } = useShops();
  const {
    selectedIds, orderedStops, isOptimized, userLocation, locating, routeInfo, routeGeometry, doneIds,
    toggleShop, addToSelection, removeFromSelection, clearSelection, optimize, reorderStops, toggleDone, markBatchDone,
  } = useRoute();
  const { groups, reload: reloadGroups, addGroup, updateGroup, deleteGroup } = useGroups();

  // Listen for auth changes — this handles both initial session check and login/logout
  useEffect(() => {
    const { data } = onAuthChange((loggedIn) => {
      setAuthed(loggedIn);
      if (loggedIn) {
        reload();
        reloadGroups();
        loadHome().then(setHome);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [reload, reloadGroups]);

  // Show nothing while checking auth
  if (authed === null) {
    return (
      <div className="h-dvh flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!authed) {
    return <LoginScreen onLogin={() => { /* onAuthChange will handle it */ }} />;
  }

  const handleLogout = async () => {
    await logout();
    // onAuthChange will set authed to false
  };

  const handleHomeChange = async (h: HomeAddress | null) => {
    setHome(h);
    await saveHome(h);
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
              groups={groups}
              home={home}
              onAdd={addShop}
              onUpdate={updateShop}
              onDelete={deleteShop}
              onReplaceAll={replaceAll}
              onHomeChange={handleHomeChange}
              onLogout={handleLogout}
              onUpdateGroup={updateGroup}
              onDeleteGroup={deleteGroup}
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
              groups={groups}
              onToggle={toggleShop}

              onAddToSelection={addToSelection}
              onRemoveFromSelection={removeFromSelection}
              onClear={clearSelection}
              onOptimize={() => optimize(shops, home?.lat, home?.lng)}
              onReorder={reorderStops}
              doneIds={doneIds}
              onToggleDone={toggleDone}
              onMarkBatchDone={markBatchDone}
              onSaveGroup={addGroup}
              onUpdateGroup={updateGroup}
              onDeleteGroup={deleteGroup}
            />
          )}
        </div>
        <BottomNav active={tab} onChange={setTab} />
      </div>
    </div>
  );
}

export default App;