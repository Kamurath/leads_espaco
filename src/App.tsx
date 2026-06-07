import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { INITIAL_UNITS, Unit, Lead, LoadingStatus, Session } from './types';

// Component Imports
import Header from './components/Header';
import MetricCards from './components/MetricCards';
import UnitFilter from './components/UnitFilter';
import LeadTable from './components/LeadTable';
import Login from './components/Login';

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('espaçolaser_dark_mode');
    return saved ? saved === 'true' : false;
  });

  // Authentication session state
  const [currentUser, setCurrentUser] = useState<Session | null>(() => {
    const saved = sessionStorage.getItem('espaçolaser_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  // Current selected tab for administrative unit view ('Todas' or single unitName)
  const [activeTab, setActiveTab] = useState<string>('Todas');

  // Units enabled state toggles (Only useful for Admin context)
  const [units, setUnits] = useState<Unit[]>(() => {
    const saved = localStorage.getItem('espaçolaser_units_v1');
    if (saved) {
      try {
        const parsed: Unit[] = JSON.parse(saved);
        return INITIAL_UNITS.map(initUnit => {
          const found = parsed.find(p => p.name === initUnit.name);
          return found ? { ...initUnit, enabled: found.enabled } : initUnit;
        });
      } catch {
        return INITIAL_UNITS;
      }
    }
    return INITIAL_UNITS;
  });

  // Leads list aggregated state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Ticking countdown until autosync (600 seconds = 10 minutes)
  const [autoRefreshTimeRemaining, setAutoRefreshTimeRemaining] = useState(600);

  // Connection tracking states per sheet
  const [loadingStatuses, setLoadingStatuses] = useState<LoadingStatus[]>(() => {
    return INITIAL_UNITS.map(u => ({
      unitName: u.name,
      status: 'idle',
    }));
  });

  // Sync dark class on document element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('espaçolaser_dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  // Persist units selections to cache (Admin only)
  useEffect(() => {
    localStorage.setItem('espaçolaser_units_v1', JSON.stringify(units));
  }, [units]);

  // Logout handler
  const handleLogout = useCallback(() => {
    const saved = sessionStorage.getItem('espaçolaser_session');
    if (saved) {
      try {
        const session = JSON.parse(saved);
        fetch('/api/logout', {
          method: 'POST',
          headers: {
            'Authorization': session.token,
          }
        }).catch(() => {});
      } catch {}
    }
    sessionStorage.removeItem('espaçolaser_session');
    setCurrentUser(null);
    setLeads([]);
    setLoadingStatuses(INITIAL_UNITS.map(u => ({ unitName: u.name, status: 'idle' })));
    setLastUpdated(null);
    setActiveTab('Todas');
    setAutoRefreshTimeRemaining(600);
  }, []);

  // Core lead orchestrator backend fetch definition
  const handleSyncData = useCallback(async (token: string) => {
    if (isSyncing) return;
    setIsSyncing(true);

    try {
      const response = await fetch('/api/leads', {
        headers: {
          'Authorization': token,
        },
      });

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP Error status ${response.status}`);
      }

      const data = await response.json();
      setLeads(data.leads || []);

      // Parse and map load statuses from backend
      const backendStatuses = data.statuses || [];
      const updatedStatuses = INITIAL_UNITS.map(initUnit => {
        const found = backendStatuses.find((s: any) => s.unitName === initUnit.name);
        if (found) {
          return {
            unitName: initUnit.name,
            status: found.status,
            errorMessage: found.errorMessage,
          };
        }
        return {
          unitName: initUnit.name,
          status: 'idle' as const,
        };
      });
      setLoadingStatuses(updatedStatuses);

      setLastUpdated(new Date());
      setAutoRefreshTimeRemaining(600); // reset clock on successful sync
    } catch (err: any) {
      console.error('[Monitor de Leads] Erro no sync geral:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, handleLogout]);

  // Trigger mount level /api/me check and initial load
  useEffect(() => {
    const saved = sessionStorage.getItem('espaçolaser_session');
    if (saved) {
      try {
        const session: Session = JSON.parse(saved);
        // Background validate against /api/me
        fetch('/api/me', {
          headers: {
            'Authorization': session.token
          }
        })
        .then(res => {
          if (res.status === 401) {
            handleLogout();
          } else if (res.ok) {
            return res.json();
          }
        })
        .then(data => {
          if (data && data.success) {
            setCurrentUser({
              ...session,
              role: data.user.role,
              unitName: data.user.unitName
            });
            handleSyncData(session.token);
          } else {
            handleLogout();
          }
        })
        .catch(() => {
          // If network failed but we have a session, attempt sync with token anyway
          handleSyncData(session.token);
        });
      } catch {
        handleLogout();
      }
    }
  }, []);

  // Set automatic countdown timer (updates every 10 minutes)
  useEffect(() => {
    if (!currentUser) return;

    const timer = setInterval(() => {
      setAutoRefreshTimeRemaining((prev) => {
        if (prev <= 1) {
          handleSyncData(currentUser.token);
          return 600;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentUser, handleSyncData]);

  // Login handler
  const handleLoginSuccess = (session: Session) => {
    sessionStorage.setItem('espaçolaser_session', JSON.stringify(session));
    setCurrentUser(session);
    handleSyncData(session.token);
  };

  // Toggle specific store checkbox (Admin only)
  const handleToggleUnit = (unitName: string) => {
    const updatedUnits = units.map(u => {
      if (u.name === unitName) {
        return { ...u, enabled: !u.enabled };
      }
      return u;
    });
    setUnits(updatedUnits);
  };

  // Turn all sheets on (Admin only)
  const handleSelectAll = () => {
    const updatedUnits = units.map(u => ({ ...u, enabled: true }));
    setUnits(updatedUnits);
  };

  // Turn all sheets off (Admin only)
  const handleDeselectAll = () => {
    const updatedUnits = units.map(u => ({ ...u, enabled: false }));
    setUnits(updatedUnits);
  };

  // Manual update custom trigger
  const handleManualRefresh = () => {
    if (currentUser) {
      handleSyncData(currentUser.token);
    }
  };

  // Local display-level checkmarks filtering (only affects Admin display list speed)
  const visibleLeads = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') {
      return leads.filter(lead => {
        const unitObj = units.find(u => u.name === lead.unitName);
        return unitObj ? unitObj.enabled : true;
      });
    }
    return leads;
  }, [leads, units, currentUser]);

  // Count leads resolved per unit for Admin status badges
  const leadsCountByUnit = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => {
      counts[l.unitName] = (counts[l.unitName] || 0) + 1;
    });
    return counts;
  }, [leads]);

  // Render Login view as fallback block
  if (!currentUser) {
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />
    );
  }

  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100 flex flex-col">
      
      {/* Brand Header */}
      <Header
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onManualRefresh={handleManualRefresh}
        isSyncing={isSyncing}
        lastUpdated={lastUpdated}
        autoRefreshTimeRemaining={autoRefreshTimeRemaining}
        loadingStatuses={loadingStatuses}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main operational workspace */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 space-y-6">
        
        {/* Metric widgets block */}
        <MetricCards
          leads={visibleLeads}
          isLoading={isSyncing && visibleLeads.length === 0}
          currentUser={currentUser}
          loadingStatuses={loadingStatuses}
        />

        {/* Discrete error warning alerts */}
        {loadingStatuses.some(s => s.status === 'error') && (
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 font-sans text-xs text-red-800 dark:border-red-950/30 dark:bg-red-950/15 dark:text-red-300 space-y-1.5 shadow-sm">
            {currentUser?.role === 'unit' ? (
              <div className="flex items-start gap-2">
                <svg className="h-4 w-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <p className="font-semibold leading-relaxed">
                  Não foi possível carregar os leads desta unidade. Verifique se a planilha está compartilhada corretamente.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <svg className="h-4 w-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <span>Aviso: Algumas planilhas não puderam ser sincronizadas</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 font-medium">
                  {loadingStatuses.filter(s => s.status === 'error').map((status) => (
                    <li key={status.unitName}>
                      Não foi possível carregar os leads de {status.unitName.replace('Espaçolaser | ', '')}.
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Workspace body (Desktop Sidebar + Main content split grid) */}
        <div className="flex flex-col gap-6 md:flex-row items-start">
          
          {/* Store channels checkbox sidebar - ONLY rendered for Admin role */}
          {isAdmin && (
            <UnitFilter
              units={units}
              onToggleUnit={handleToggleUnit}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              loadingStatuses={loadingStatuses}
              leadsCountByUnit={leadsCountByUnit}
            />
          )}

          {/* Core Leads table containing admin horizontal tabs, search, and details */}
          <LeadTable
            leads={visibleLeads}
            isLoading={isSyncing && visibleLeads.length === 0}
            currentUser={currentUser}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            loadingStatuses={loadingStatuses}
          />

        </div>

      </main>
      
      {/* Small design disclaimer */}
      <footer className="w-full border-t border-slate-200 text-center py-4 bg-white/50 text-[10px] text-slate-400 font-medium dark:border-slate-800 dark:bg-slate-900/10">
        Espaçolaser Monitor de Leads • Todos os direitos reservados • 2026
      </footer>

    </div>
  );
}
