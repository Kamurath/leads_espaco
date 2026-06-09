import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { INITIAL_UNITS, Unit, Lead, LoadingStatus, Session } from './types';
import { 
  buildCsvUrl, 
  parseCSV, 
  normalizeHeader, 
  isTestLead, 
  isPhone, 
  formatVerbatimDate, 
  normalizeCliente, 
  normalizeInteresse, 
  normalizeStatus, 
  processWhatsApp,
  SPREADSHEET_MAP
} from './sharedStatic';

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
    sessionStorage.removeItem('espaçolaser_session');
    setCurrentUser(null);
    setLeads([]);
    setLoadingStatuses(INITIAL_UNITS.map(u => ({
      unitName: u.name,
      status: 'idle',
    })));
    setLastUpdated(null);
    setActiveTab('Todas');
    setAutoRefreshTimeRemaining(600);
  }, []);

  // Core lead orchestrator client-side sheet fetch definition
  const handleSyncData = useCallback(async (userSession: Session | null) => {
    if (!userSession || isSyncing) return;
    setIsSyncing(true);

    const isUserAdmin = userSession.role === 'admin';
    const unitsToFetch = isUserAdmin 
      ? INITIAL_UNITS 
      : INITIAL_UNITS.filter(u => u.name === userSession.unitName);

    const allFetchedLeads: Lead[] = [];
    const statuses: LoadingStatus[] = [];
    const seenUniqueKeys = new Set<string>();

    const fetchPromises = unitsToFetch.map(async (unit) => {
      const spreadsheetId = SPREADSHEET_MAP[unit.name];

      if (!spreadsheetId) {
        statuses.push({
          unitName: unit.name,
          status: 'pending',
          errorMessage: 'Planilha da unidade ainda não configurada.',
        });
        return;
      }

      statuses.push({
        unitName: unit.name,
        status: 'loading',
      });

      try {
        const url = buildCsvUrl(spreadsheetId);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP status ${response.status}`);
        }

        const text = await response.text();
        const rows = parseCSV(text);

        if (rows.length < 2) {
          const existIdx = statuses.findIndex(s => s.unitName === unit.name);
          const successObj: LoadingStatus = { unitName: unit.name, status: 'success' };
          if (existIdx !== -1) statuses[existIdx] = successObj;
          else statuses.push(successObj);
          return;
        }

        const headers = (rows[0] || []).map(h => normalizeHeader(h));

        let indexCreated = headers.findIndex(h => h.includes('created_time') || h === 'created_time');
        if (indexCreated === -1) indexCreated = 1;

        let indexCliente = headers.findIndex(h => h.includes('voce_ja_e_cliente_espacolaser'));
        if (indexCliente === -1) indexCliente = 12;

        let indexInteresse = headers.findIndex(h => h.includes('como_posso_te_ajudar_hoje'));
        if (indexInteresse === -1) indexInteresse = 13;

        let indexNome = headers.findIndex(h => {
          const val = h.toLowerCase().trim();
          return val === 'nome_completo' ||
                 val === 'nome' ||
                 val === 'full_name' ||
                 val === 'fullname' ||
                 val === 'customer_name' ||
                 val === 'lead_name';
        });
        if (indexNome === -1) {
          indexNome = headers.findIndex(h => {
            const val = h.toLowerCase().trim();
            return val.includes('nome_completo') ||
                   val.includes('nome') ||
                   val.includes('full_name') ||
                   val.includes('fullname') ||
                   val.includes('customer_name') ||
                   val.includes('lead_name');
          });
        }
        if (indexNome === -1) indexNome = 14;

        let indexWhatsApp = headers.findIndex(h => h.includes('numero_do_whatsapp') || h === 'whatsapp' || h === 'telefone' || h === 'phone');
        if (indexWhatsApp === -1) indexWhatsApp = 15;

        let indexStatus = headers.findIndex(h => h === 'lead_status' || h === 'status');
        if (indexStatus === -1) indexStatus = 16;

        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length === 0) continue;

          if (isTestLead(row)) continue;

          let createdRaw = (row[indexCreated] !== undefined) ? row[indexCreated].trim() : '';
          let clienteRaw = (row[indexCliente] !== undefined) ? row[indexCliente].trim() : '';
          let interesseRaw = (row[indexInteresse] !== undefined) ? row[indexInteresse].trim() : '';
          let nomeRaw = (row[indexNome] !== undefined) ? row[indexNome].trim() : '';
          let whatsappRaw = (row[indexWhatsApp] !== undefined) ? row[indexWhatsApp].trim() : '';
          let statusRaw = (row[indexStatus] !== undefined) ? row[indexStatus].trim() : '';

          if (isPhone(statusRaw)) {
            const digitsWhatsApp = whatsappRaw.replace(/\D/g, '');
            if (digitsWhatsApp.length < 8) {
              whatsappRaw = statusRaw;
            }
            statusRaw = '';
          }

          if (!nomeRaw && !whatsappRaw && !createdRaw) continue;

          const { digits: whatsappDigits, link: whatsappLink } = processWhatsApp(whatsappRaw);
          const leadUniqueKey = unit.name + createdRaw + whatsappDigits + nomeRaw;
          
          if (seenUniqueKeys.has(leadUniqueKey)) continue;
          seenUniqueKeys.add(leadUniqueKey);

          const { formatted: createdTimeFormatted, timestamp: createdAtForSorting } = formatVerbatimDate(createdRaw);
          const { label: clienteLabel, color: clienteColor } = normalizeCliente(clienteRaw);
          const interesseLabel = normalizeInteresse(interesseRaw);
          const { label: statusLabel, color: statusColor } = normalizeStatus(statusRaw);

          allFetchedLeads.push({
            id: leadUniqueKey,
            unitName: unit.name,
            createdTimeRaw: createdRaw,
            createdTimeFormatted,
            clienteRaw,
            clienteLabel,
            clienteColor,
            interesseRaw,
            interesseLabel,
            nome: nomeRaw || 'Nome não informado',
            whatsappRaw: whatsappRaw || 'Sem contato',
            whatsappDigits,
            whatsappLink,
            statusRaw: statusRaw || '',
            statusLabel: statusRaw ? statusLabel : 'Sem status',
            statusColor,
            createdAtForSorting,
          });
        }

        const existIdx = statuses.findIndex(s => s.unitName === unit.name);
        if (existIdx !== -1) {
          statuses[existIdx] = { unitName: unit.name, status: 'success' };
        } else {
          statuses.push({ unitName: unit.name, status: 'success' });
        }

      } catch (err: any) {
        console.error(`[App CSV Sync] Erro em ${unit.name}:`, err);
        const existIdx = statuses.findIndex(s => s.unitName === unit.name);
        const errorItemObj: LoadingStatus = {
          unitName: unit.name,
          status: 'error',
          errorMessage: `Não foi possível carregar os leads de ${unit.name.replace('Espaçolaser | ', '')}.`,
        };
        if (existIdx !== -1) {
          statuses[existIdx] = errorItemObj;
        } else {
          statuses.push(errorItemObj);
        }
      }
    });

    await Promise.all(fetchPromises);

    const finalStatuses: LoadingStatus[] = INITIAL_UNITS.map(initUnit => {
      const found = statuses.find(s => s.unitName === initUnit.name);
      return found || {
        unitName: initUnit.name,
        status: 'idle',
      };
    });

    // Sort leads from most recent to oldest
    allFetchedLeads.sort((a, b) => b.createdAtForSorting - a.createdAtForSorting);

    setLeads(allFetchedLeads);
    setLoadingStatuses(finalStatuses);
    setLastUpdated(new Date());
    setAutoRefreshTimeRemaining(600);
    setIsSyncing(false);
  }, [isSyncing]);

  // Trigger check on load
  useEffect(() => {
    const saved = sessionStorage.getItem('espaçolaser_session');
    if (saved) {
      try {
        const session: Session = JSON.parse(saved);
        setCurrentUser(session);
        handleSyncData(session);
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
          handleSyncData(currentUser);
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
    handleSyncData(session);
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
      handleSyncData(currentUser);
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
