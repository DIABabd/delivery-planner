import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import type { TabId } from './types';
import { useShops } from './hooks/useShops';
import { useRoute } from './hooks/useRoute';
import { useGroups } from './hooks/useGroups';
import { logout, onAuthChange } from './utils/auth';
import { fetchHome, saveHome, type HomeAddress } from './utils/storage';
import { CACHE_KEYS, readCache, writeCache, clearCache } from './utils/localCache';
import { logUsage } from './utils/usageLog';
import { LoginScreen } from './components/LoginScreen';
import { BottomNav } from './components/BottomNav';
import { ShopsPage } from './pages/ShopsPage';
import { RoutePage } from './pages/RoutePage';

// The map is the heaviest part of the app, so it is loaded as its own piece
// after the lists are already on screen.
const RouteMap = lazy(() => import('./components/RouteMap').then(m => ({ default: m.RouteMap })));

const RESUME_DATA_REFRESH_MS = 60 * 1000;
const LOGGED_IN_KEY = 'was-logged-in';
const MAP_HIDDEN_KEY = 'map-hidden';

function readFlag(key: string) {
  try { return localStorage.getItem(key) === '1'; } catch { return false; }
}

function writeFlag(key: string, on: boolean) {
  try {
    if (on) localStorage.setItem(key, '1');
    else localStorage.removeItem(key);
  } catch { /* ignore */ }
}

function App() {
  // If the driver was logged in last time, show the app straight away instead
  // of waiting for the login check (which can be slow with weak signal).
  // null = still checking.
  const [authed, setAuthed] = useState<boolean | null>(() => (readFlag(LOGGED_IN_KEY) ? true : null));
  const [tab, setTabState] = useState<TabId>(() => {
    try {
      const savedTab = localStorage.getItem('active-tab');
      return savedTab === 'route' ? 'route' : 'shops';
    } catch {
      return 'shops';
    }
  });
  const [mapHidden, setMapHidden] = useState(() => readFlag(MAP_HIDDEN_KEY));
  const [home, setHome] = useState<HomeAddress | null>(() => readCache<HomeAddress | null>(CACHE_KEYS.home, null));
  const { shops, addShop, updateShop, deleteShop, replaceAll, reload: reloadShops, clear: clearShops } = useShops();
  const {
    selectedIds, orderedStops, isOptimized, userLocation, locating, routeInfo, routeGeometry, doneIds,
    toggleShop, addToSelection, removeFromSelection, clearSelection, optimize, reorderStops, toggleDone, markBatchDone,
    restoreStops,
    persistRoute,
  } = useRoute();
  const { groups, reload: reloadGroups, clear: clearGroups, addGroup, updateGroup, deleteGroup } = useGroups();

  const setTab = (nextTab: TabId) => {
    setTabState(nextTab);
    try { localStorage.setItem('active-tab', nextTab); } catch { /* ignore */ }
  };

  const toggleMap = () => {
    setMapHidden(prev => {
      writeFlag(MAP_HIDDEN_KEY, !prev);
      return !prev;
    });
  };

  // Get fresh data from the server. If a request fails (no signal), whatever
  // is already on screen simply stays.
  const refreshData = useCallback(() => {
    void reloadShops();
    void reloadGroups();
    void fetchHome().then(result => {
      if (!result.ok) return;
      setHome(result.home);
      writeCache(CACHE_KEYS.home, result.home);
    });
  }, [reloadShops, reloadGroups]);

  // Login state. Data is loaded only on real session changes — not on
  // TOKEN_REFRESHED (fires about every hour) or USER_UPDATED.
  useEffect(() => {
    const { data } = onAuthChange((loggedIn, event) => {
      setAuthed(loggedIn);
      writeFlag(LOGGED_IN_KEY, loggedIn);
      if (loggedIn && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
        refreshData();
      }
      // One "open" entry per start of the app, for a logged-in user.
      if (loggedIn && event === 'INITIAL_SESSION') {
        setTimeout(() => logUsage('open'), 0);
      }
      if (event === 'SIGNED_OUT') {
        // Don't leave one user's shops on the phone for the next one.
        clearCache();
        clearShops();
        clearGroups();
        setHome(null);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [refreshData, clearShops, clearGroups]);

  // Coming back from Google Maps (or any other app): refresh the data quietly
  // in the background. No page reload — the screen stays as the driver left it.
  useEffect(() => {
    let hiddenAt: number | null = null;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }
      const wasAwayLong = hiddenAt !== null && Date.now() - hiddenAt > RESUME_DATA_REFRESH_MS;
      hiddenAt = null;
      if (wasAwayLong && readFlag(LOGGED_IN_KEY)) {
        refreshData();
        logUsage('resume');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshData]);

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
    return <LoginScreen onLogin={() => logUsage('login')} />;
  }

  const handleLogout = async () => {
    await logout();
    // onAuthChange will set authed to false
  };

  const handleHomeChange = async (h: HomeAddress | null) => {
    setHome(h);
    writeCache(CACHE_KEYS.home, h);
    await saveHome(h);
  };

  return (
    <div className="flex flex-col h-dvh bg-gray-50">
      {mapHidden ? (
        <button
          onClick={toggleMap}
          className="shrink-0 w-full py-2 bg-white border-b border-gray-300 text-sm font-medium text-blue-600"
        >
          Show map
        </button>
      ) : (
        <div className="relative h-[40vh] min-h-[200px] shrink-0 border-b border-gray-300">
          <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">Loading map...</div>}>
            <RouteMap
              allShops={shops}
              routeStops={orderedStops}
              userLocation={userLocation}
              home={home}
              routeGeometry={routeGeometry}
            />
          </Suspense>
          <button
            onClick={toggleMap}
            className="absolute top-2 right-2 z-[1000] px-3 py-1.5 bg-white rounded-lg shadow text-xs font-medium text-gray-700"
          >
            Hide map
          </button>
        </div>
      )}

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
