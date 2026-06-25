import { useState, useEffect, useRef } from 'react';
import type { TabId } from './types';
import { useShops } from './hooks/useShops';
import { useRoute } from './hooks/useRoute';
import { useGroups } from './hooks/useGroups';
import { isLoggedIn, logout, onAuthChange } from './utils/auth';
import { loadHome, saveHome, type HomeAddress } from './utils/storage';
import { LoginScreen } from './components/LoginScreen';
import { BottomNav } from './components/BottomNav';
import { RouteMap } from './components/RouteMap';
import { ShopsPage } from './pages/ShopsPage';
import { RoutePage } from './pages/RoutePage';

const RESUME_DATA_REFRESH_MS = 60 * 1000;

function App() {
  const [authed, setAuthed] = useState<boolean | null>(null); // null = checking
  const hiddenAtRef = useRef<number | null>(null);
  const [tab, setTabState] = useState<TabId>(() => {
    try {
      const savedTab = localStorage.getItem('active-tab');
      return savedTab === 'route' ? 'route' : 'shops';
    } catch {
      return 'shops';
    }
  });
  const [home, setHome] = useState<HomeAddress | null>(null);
  const { shops, addShop, updateShop, deleteShop, replaceAll, reload } = useShops();
  const {
    selectedIds, orderedStops, isOptimized, userLocation, locating, routeInfo, routeGeometry, doneIds,
    toggleShop, addToSelection, removeFromSelection, clearSelection, optimize, reorderStops, toggleDone, markBatchDone,
    restoreStops,
    persistRoute,
  } = useRoute();
  const { groups, reload: reloadGroups, addGroup, updateGroup, deleteGroup } = useGroups();

  const setTab = (nextTab: TabId) => {
    setTabState(nextTab);
    try { localStorage.setItem('active-tab', nextTab); } catch { /* ignore */ }
  };

  // Listen for auth changes. Only reload data on real session transitions —
  // not on TOKEN_REFRESHED (fires every ~hour) or USER_UPDATED, which would
  // trigger redundant network calls and full re-renders of the map.
  useEffect(() => {
    let active = true;
    const { data } = onAuthChange((loggedIn, event) => {
      setAuthed(loggedIn);
      if (loggedIn && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
        reload();
        reloadGroups();
        loadHome().then(setHome);
      }
    });
    isLoggedIn().then(loggedIn => {
      if (!active) return;
      setAuthed(prev => prev ?? loggedIn);
      if (loggedIn) {
        reload();
        reloadGroups();
        loadHome().then(h => {
          if (active) setHome(h);
        });
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [reload, reloadGroups]);

  useEffect(() => {
    let active = true;

    const refreshAfterResume = async () => {
      const loggedIn = await isLoggedIn();
      if (!active) return;

      setAuthed(loggedIn);
      if (!loggedIn) return;

      reload();
      reloadGroups();
      loadHome().then(h => {
        if (active) setHome(h);
      });
    };

    const handleVisible = () => {
      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;
      if (hiddenAt && Date.now() - hiddenAt > RESUME_DATA_REFRESH_MS) {
        void refreshAfterResume();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
        return;
      }
      handleVisible();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handleVisible);

    return () => {
      active = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handleVisible);
    };
  }, [reload, reloadGroups]);

  // Restore ordered stops once shops are loaded from DB
  useEffect(() => {
    if (shops.length > 0) restoreStops(shops);
  }, [shops, restoreStops]);

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
              onPersistRoute={persistRoute}
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
