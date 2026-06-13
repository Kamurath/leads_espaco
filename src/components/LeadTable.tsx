import React, { useState, useMemo } from 'react';
import { Search, Copy, Check, Phone, Clock } from 'lucide-react';
import { Lead, Session, LoadingStatus } from '../types';

interface LeadTableProps {
  leads: Lead[];
  isLoading: boolean;
  currentUser: Session | null;
  activeTab: string;
  setActiveTab: (val: string) => void;
  loadingStatuses: LoadingStatus[];
  quixadaSubTab: 'diarios' | 'copa';
  onQuixadaSubTabChange: (val: 'diarios' | 'copa') => void;
}

export default function LeadTable({
  leads,
  isLoading,
  currentUser,
  activeTab,
  setActiveTab,
  loadingStatuses,
  quixadaSubTab,
  onQuixadaSubTabChange,
}: LeadTableProps) {
  // Search query state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom Filters
  const [filterCliente, setFilterCliente] = useState<string>('todos');
  const [filterInteresse, setFilterInteresse] = useState<string>('todos');
  
  // Quick Time Filter Range options: 'hoje' | '7dias' | 'todos'
  const [filterTimeRange, setFilterTimeRange] = useState<'hoje' | '7dias' | 'todos'>('todos');
  
  const [copiedLeadId, setCopiedLeadId] = useState<string | null>(null);

  // KVdb Zero-Cost Persistent Cloud Database Configuration
  const KVDB_BUCKET = "X8iSbPb56NiRsSEv7TzHQX";
  const KVDB_SECRET = "super_secret_for_trafegon_leads_system_2026";
  const KVDB_KEY = "initiated_leads";
  // GET is open public, PUT requires basic authentication
  const KVDB_AUTH = "Basic " + btoa(":" + KVDB_SECRET);

  // Persistent storage for "Atendimento Iniciado"
  const [initiatedLeads, setInitiatedLeads] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('trafegon_leads_initiated');
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  });

  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);

  // Load from Cloud database on mount to merge states across devices and sessions
  React.useEffect(() => {
    const fetchCloudInitiated = async () => {
      setIsSyncingCloud(true);
      try {
        const res = await fetch(`https://kvdb.io/${KVDB_BUCKET}/${KVDB_KEY}`);
        if (res.status === 200) {
          const cloudData = await res.json();
          if (cloudData && typeof cloudData === 'object') {
            setInitiatedLeads(prev => {
              const merged = { ...prev, ...cloudData };
              try {
                localStorage.setItem('trafegon_leads_initiated', JSON.stringify(merged));
              } catch (_) {}
              return merged;
            });
          }
          setCloudSyncError(null);
        } else if (res.status === 404) {
          // No cloud data yet, perfectly fine!
          setCloudSyncError(null);
        } else {
          const text = await res.text();
          if (text.includes("email address not verified")) {
            setCloudSyncError("needs_verification");
          } else {
            setCloudSyncError("failed");
          }
        }
      } catch (err) {
        console.error("Failed to fetch cloud leads:", err);
        setCloudSyncError("failed");
      } finally {
        setIsSyncingCloud(false);
      }
    };

    fetchCloudInitiated();
  }, []);

  const handleToggleInitiated = async (leadId: string) => {
    let nextState: Record<string, boolean> = {};
    
    // 1. Immediately update UI & LocalStorage for instant native feedback
    setInitiatedLeads(prev => {
      const updated = { ...prev, [leadId]: !prev[leadId] };
      try {
        localStorage.setItem('trafegon_leads_initiated', JSON.stringify(updated));
      } catch (err) {
        console.error('Error saving initiated status', err);
      }
      nextState = updated;
      return updated;
    });

    // 2. Transmit changes to cloud database
    try {
      const res = await fetch(`https://kvdb.io/${KVDB_BUCKET}/${KVDB_KEY}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": KVDB_AUTH
        },
        body: JSON.stringify(nextState)
      });
      if (!res.ok) {
        const text = await res.text();
        if (text.includes("email address not verified")) {
          setCloudSyncError("needs_verification");
        } else {
          setCloudSyncError("failed");
        }
      } else {
        setCloudSyncError(null);
      }
    } catch (err) {
      console.error("Failed to sync status to cloud:", err);
      setCloudSyncError("failed");
    }
  };

  // Pagination parameters
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const isAdmin = currentUser?.role === 'admin';
  const isCopaSubTabActive = ((currentUser?.role === 'unit' && currentUser?.unitName === 'Espaçolaser | Quixadá') || 
    (currentUser?.role === 'admin' && activeTab === 'Espaçolaser | Quixadá')) && quixadaSubTab === 'copa';

  const tabNames = [
    'Todas',
    'Espaçolaser | Araripina',
    'Espaçolaser | Serra Talhada',
    'Espaçolaser | Garanhuns',
    'Espaçolaser | Cajazeiras',
    'Espaçolaser | Vitória Sto Antão',
    'Espaçolaser | Livramento',
    'Espaçolaser | Muriaé',
    'Espaçolaser | Vilhena',
    'Espaçolaser | Corumbá',
    'Espaçolaser | Fortaleza',
    'Espaçolaser | Plaza Macaé',
    'Espaçolaser | Centro Macaé',
    'Espaçolaser | Quixadá'
  ];

  // Handles copying only numbers
  const handleCopyContact = (leadId: string, numbers: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering row details click toggling
    if (!numbers) return;
    
    navigator.clipboard.writeText(numbers).then(() => {
      setCopiedLeadId(leadId);
      setTimeout(() => {
        setCopiedLeadId(null);
      }, 2000);
    });
  };

  // Determine if a lead is under 2 hours old
  const isLeadRecent = (leadTimestamp: number) => {
    if (!leadTimestamp) return false;
    const twoHoursInMs = 2 * 60 * 60 * 1000;
    const diff = Math.abs(Date.now() - leadTimestamp);
    return diff <= twoHoursInMs;
  };

  // Extract unique filter fields from dynamic leads data
  const uniqueInteresses = useMemo(() => {
    const list = leads.map(l => l.interesseLabel);
    return Array.from(new Set(list)).filter(Boolean);
  }, [leads]);

  // Determine if unit has errors (for non-admin and admin display messages)
  const unitErrorStatus = useMemo(() => {
    if (currentUser?.role === 'unit') {
      return loadingStatuses.find(s => s.unitName === currentUser.unitName && s.status === 'error');
    } else if (activeTab !== 'Todas') {
      return loadingStatuses.find(s => s.unitName === activeTab && s.status === 'error');
    }
    return null;
  }, [currentUser, loadingStatuses, activeTab]);

  // Clean data filter pipeline
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // 1. Text Search query Match (Name, Phone number, or verbatim Interest string)
      const q = searchQuery.toLowerCase().trim();
      const matchText = !q || 
        lead.nome.toLowerCase().includes(q) || 
        lead.whatsappDigits.includes(q) ||
        lead.whatsappRaw.includes(q) ||
        lead.interesseLabel.toLowerCase().includes(q) ||
        lead.unitName.toLowerCase().includes(q);

      // 2. Client Status Category filter match
      const matchCliente = filterCliente === 'todos' || lead.clienteLabel === filterCliente;

      // 3. Interest selection filter match
      const matchInteresse = filterInteresse === 'todos' || lead.interesseLabel === filterInteresse;

      // 4. Quick Time range filter restriction
      let matchTime = true;
      if (filterTimeRange === 'hoje') {
        const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
        matchTime = Math.abs(Date.now() - lead.createdAtForSorting) <= twentyFourHoursInMs;
      } else if (filterTimeRange === '7dias') {
        const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
        matchTime = Math.abs(Date.now() - lead.createdAtForSorting) <= sevenDaysInMs;
      }

      // 5. Administrative Filter Tab Match
      const matchTab = !isAdmin || activeTab === 'Todas' || lead.unitName === activeTab;

      return matchText && matchCliente && matchInteresse && matchTime && matchTab;
    });
  }, [leads, searchQuery, filterCliente, filterInteresse, filterTimeRange, activeTab, isAdmin]);

  // Pagination orchestrator
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLeads.slice(start, start + itemsPerPage);
  }, [filteredLeads, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / itemsPerPage));

  // Reset pagination indexes on filters adjustments
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleClienteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterCliente(e.target.value);
    setCurrentPage(1);
  };

  const handleInteresseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterInteresse(e.target.value);
    setCurrentPage(1);
  };

  const handleTimeRangeChange = (range: 'hoje' | '7dias' | 'todos') => {
    setFilterTimeRange(range);
    setCurrentPage(1);
  };

  return (
    <div className="flex-1 w-full space-y-4 min-w-0">

      {/* Administrative unit sub-navigation tabs list */}
      {isAdmin && (
        <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-sm dark:border-slate-800 dark:bg-slate-800">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">
            Navegar por Unidade (Abas)
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x select-none">
            {tabNames.map((tabName) => {
              const isActive = activeTab === tabName;
              const displayName = tabName === 'Todas' ? 'Todas as Unidades' : tabName.replace('Espaçolaser | ', '');
              
              // Count how many leads from this unit exist in state
              const countLeads = tabName === 'Todas' 
                ? leads.length 
                : leads.filter(l => l.unitName === tabName).length;

              return (
                <button
                  key={tabName}
                  onClick={() => {
                    setActiveTab(tabName);
                    setCurrentPage(1);
                  }}
                  className={`flex items-center gap-1.5 snap-start shrink-0 rounded-lg px-4.5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#0B2F3D] text-white dark:bg-[#00B6C6] dark:text-[#0B2F3D] shadow-md shadow-cyan-500/5'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <span>{displayName}</span>
                  <span className={`inline-flex rounded px-1.5 py-0.2 text-[9px] font-semibold ${
                    isActive 
                      ? 'bg-white/20 text-white dark:bg-[#0B2F3D]/25 dark:text-[#0B2F3D]' 
                      : 'bg-slate-200/60 text-slate-505 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {countLeads}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quixadá Sub-Tabs (only when viewing the Quixadá panel or logged in as Quixadá) */}
      {((currentUser?.role === 'unit' && currentUser?.unitName === 'Espaçolaser | Quixadá') || 
        (currentUser?.role === 'admin' && activeTab === 'Espaçolaser | Quixadá')) && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800 flex flex-col gap-2.5">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Origem dos Leads de Quixadá
          </p>
          <div className="flex gap-2 max-w-sm select-none">
            <button
              onClick={() => {
                onQuixadaSubTabChange('diarios');
                setCurrentPage(1);
              }}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-all cursor-pointer ${
                quixadaSubTab === 'diarios'
                  ? 'bg-[#0B2F3D] text-white dark:bg-[#00B6C6] dark:text-[#0B2F3D] shadow-md shadow-cyan-500/5'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <span>Leads Diários</span>
            </button>
            <button
              onClick={() => {
                onQuixadaSubTabChange('copa');
                setCurrentPage(1);
              }}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-all cursor-pointer ${
                quixadaSubTab === 'copa'
                  ? 'bg-[#0B2F3D] text-white dark:bg-[#00B6C6] dark:text-[#0B2F3D] shadow-md shadow-cyan-500/5'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-300'
              }`}
            >
              🏆 <span>Leads da Copa</span>
            </button>
          </div>
        </div>
      )}
      
      {/* Search inputs, Time Filters selectors and stats */}
      <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-sm dark:border-slate-800 dark:bg-slate-800 space-y-4">
        
        {/* Top-row: Title & Counter widget with Cloud Sync notification */}
        <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Painel Operacional de Monitoração
            </p>
            
            {/* Live Cloud Synchronizer Indicator bar */}
            <div className="mt-0.5">
              {isSyncingCloud ? (
                <div className="flex items-center gap-1.5 text-[10px] text-cyan-600 dark:text-cyan-400 font-bold select-none uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                  Sincronizando marcações com a nuvem...
                </div>
              ) : cloudSyncError === 'needs_verification' ? (
                <div className="flex items-center gap-1.5 text-[10px] text-amber-500 dark:text-amber-400 font-bold select-none uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                  Sincronização pendente: verifique o e-mail fritztrafegon@gmail.com para ativar o sync permanente de graça!
                  <a href="https://kvdb.io/login" target="_blank" rel="noreferrer" className="underline hover:text-amber-400 font-extrabold normal-case ml-1">
                    Ativar no kvdb.io
                  </a>
                </div>
              ) : cloudSyncError === 'failed' ? (
                <div className="flex items-center gap-1.5 text-[10px] text-rose-500 dark:text-rose-400 font-bold select-none uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  Banco temporariamente offline. Salvando offline localmente no dispositivo.
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-[#25D366] font-bold select-none uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-[#25D366] shrink-0" />
                  Sincronismo em Nuvem gratuito Ativo
                </div>
              )}
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50/60 dark:bg-slate-900 px-3 py-1 text-xs font-bold text-[#0B2F3D] dark:text-[#00B6C6] self-start sm:self-center">
            <span>Exibindo {filteredLeads.length} de {leads.length} leads</span>
          </div>
        </div>

        {/* Search Input bar */}
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            id="search-leads-field"
            type="text"
            placeholder={isAdmin ? "Buscar por nome, WhatsApp, interesse ou unidade..." : "Buscar por nome, WhatsApp ou interesse..."}
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full rounded-lg border border-slate-200 py-2.5 pr-4 pl-9 text-xs text-slate-900 bg-slate-50/40 placeholder-slate-400 focus:border-[#00B6C6] focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder-slate-500"
          />
        </div>

        {/* Filtering segmentations row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          
          {/* Quick Date Filters buttons selector */}
          <div className="flex items-center rounded-lg bg-slate-150 p-1 dark:bg-slate-900/60 shrink-0">
            <button
              onClick={() => handleTimeRangeChange('hoje')}
              className={`rounded-md px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                filterTimeRange === 'hoje'
                  ? 'bg-white text-[#0B2F3D] shadow-xs dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => handleTimeRangeChange('7dias')}
              className={`rounded-md px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                filterTimeRange === '7dias'
                  ? 'bg-white text-[#0B2F3D] shadow-xs dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              Últimos 7 dias
            </button>
            <button
              onClick={() => handleTimeRangeChange('todos')}
              className={`rounded-md px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                filterTimeRange === 'todos'
                  ? 'bg-white text-[#0B2F3D] shadow-xs dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              Todos
            </button>
          </div>

          {/* Dynamic Select elements */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Client Select */}
            <select
              id="select-cliente-type"
              value={filterCliente}
              onChange={handleClienteChange}
              className="rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-xs font-semibold text-slate-700 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-350 cursor-pointer"
            >
              <option value="todos">Todos Clientes</option>
              <option value="Novo Cliente">Novo Cliente</option>
              <option value="Já é Cliente">Já é Cliente</option>
            </select>

            {/* Interest Select */}
            <select
              id="select-interesse-type"
              value={filterInteresse}
              onChange={handleInteresseChange}
              className="rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-xs font-semibold text-slate-700 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-350 cursor-pointer"
            >
              <option value="todos">Todos Interesses</option>
              <option value="3 Sessões">3 Sessões</option>
              <option value="Ver Ofertas">Ver Ofertas</option>
              <option value="Tem dúvidas">Tem dúvidas</option>
            </select>

          </div>

        </div>

      </div>

      {/* Main Table View container */}
      <div className="premium-card overflow-hidden">
        
        {/* Full-size grid / fallback loader */}
        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <span className="h-8 w-8 animate-spin rounded-full border-3 border-[#00B6C6] border-t-transparent"></span>
            <p className="font-display text-xs font-bold text-[#0B2F3D] dark:text-slate-300">
              Sincronizando registros de leads...
            </p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center p-6 bg-white dark:bg-slate-800">
            <div className={`rounded-full p-4 ${unitErrorStatus ? 'bg-amber-100 dark:bg-amber-950/30' : 'bg-slate-100 dark:bg-slate-900/50'}`}>
              <Search className={`h-6 w-6 ${unitErrorStatus ? 'text-amber-500' : 'text-slate-400'}`} />
            </div>
            <h4 className="mt-4 text-sm font-bold text-[#0B2F3D] dark:text-slate-100">
              {unitErrorStatus 
                ? (unitErrorStatus.errorMessage || 'Planilha da unidade ainda não configurada.')
                : 'Nenhum lead encontrado no momento.'
              }
            </h4>
            <p className="mt-1 text-xs text-slate-500 max-w-xs">
              {unitErrorStatus 
                ? 'Por favor, entre em contato com o suporte ou equipe administrativa para configurar o link desta unidade.'
                : 'Revise as caixas de seleções ou os filtros rápidos ativos acima.'
              }
            </p>
          </div>
        ) : (
          <div className="w-full">
            
            {/* Desktop and Tablet table (Hidden on smaller mobile touchpoints) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs text-slate-700 dark:text-slate-200">
                <thead className="border-b border-slate-150 bg-slate-50/50 font-sans text-[11px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900/30">
                  <tr>
                    {/* Header in EXACT requested sequence */}
                    {isAdmin && <th className="px-5 py-4 w-[110px]">Unidade</th>}
                    <th className="px-5 py-4 w-[120px]">Data e Hora</th>
                    <th className="px-5 py-4 w-[115px]">Cliente</th>
                    <th className="px-5 py-4 w-[130px]">Interesse</th>
                    {isCopaSubTabActive && <th className="px-5 py-4 w-[180px]">Palpite Copa</th>}
                    <th className="px-5 py-4 min-w-[200px]">Nome</th>
                    <th className="px-5 py-4 w-[240px]">WhatsApp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                  {paginatedLeads.map((lead) => {
                    
                    const isRecent = isLeadRecent(lead.createdAtForSorting);
                    const isInitiated = !!initiatedLeads[lead.id];
                    
                    const clientColorClass =
                      lead.clienteColor === 'green'
                        ? 'bg-emerald-100/40 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-350'
                        : lead.clienteColor === 'yellow'
                        ? 'bg-amber-100/40 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';

                    return (
                       <tr
                        key={lead.id}
                        className={`group hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors ${
                          isRecent ? 'bg-cyan-50/10 dark:bg-slate-900/10 border-l-2 border-[#00B6C6]' : ''
                        }`}
                      >
                        {/* 1. Unidade */}
                        {isAdmin && (
                          <td className="px-5 py-4 font-bold text-[#0B2F3D] dark:text-slate-100 group-hover:text-[#00B6C6] dark:group-hover:text-cyan-400">
                            {lead.unitName.replace('Espaçolaser | ', '')}
                          </td>
                        )}

                        {/* 2. Data e Hora */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                              {lead.createdTimeFormatted}
                            </span>
                            {isRecent && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-[#00B6C6] uppercase tracking-wider">
                                <Clock className="h-2 w-2" /> Lead recente
                              </span>
                            )}
                            {!isInitiated ? (
                              <span className="inline-flex w-max items-center justify-center text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/25 px-1.5 py-0.5 rounded-md leading-none">
                                Novo Lead
                              </span>
                            ) : (
                              <span className="inline-flex w-max items-center justify-center text-[10px] font-bold text-emerald-650 dark:text-[#25D366] bg-emerald-50 dark:bg-emerald-950/25 px-1.5 py-0.5 rounded-md leading-none">
                                Iniciado
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 3. Cliente */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold leading-5 tracking-wide ${clientColorClass}`}>
                            {lead.clienteLabel}
                          </span>
                        </td>

                        {/* 4. Interesse */}
                        <td className="px-5 py-4 text-slate-600 dark:text-slate-350 font-semibold truncate max-w-[140px]" title={lead.interesseLabel}>
                          {lead.interesseLabel}
                        </td>

                        {/* Palpite Copa (only when active) */}
                        {isCopaSubTabActive && (
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 w-max rounded-full bg-cyan-50 text-[#0b2f3d] border border-cyan-200 dark:bg-cyan-950/45 dark:text-cyan-300 dark:border-cyan-900/30 px-3 py-1.5 text-xs font-black shadow-xs">
                                {lead.palpitePlacar || 'Não palpitou'}
                              </span>
                              {lead.rawPalpitePlacar && lead.rawPalpitePlacar !== lead.palpitePlacar && (
                                <span className="text-[10px] text-slate-450 dark:text-slate-500 italic block font-semibold truncate max-w-[170px]" title={`Registrado: ${lead.rawPalpitePlacar}`}>
                                  Origem: {lead.rawPalpitePlacar}
                                </span>
                              )}
                            </div>
                          </td>
                        )}

                        {/* 5. Nome */}
                        <td className="px-5 py-4 font-extrabold text-slate-900 dark:text-white text-sm break-words whitespace-normal leading-snug min-w-[200px]" title={lead.nome || "Nome não informado"}>
                          {lead.nome ? lead.nome : <span className="text-slate-400 dark:text-slate-500 font-normal italic">Nome não informado</span>}
                        </td>

                        {/* 6. WhatsApp (Primary buttons styled with absolute priority) */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {lead.whatsappDigits ? (
                              <>
                                <a
                                  href={lead.whatsappLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#20ba59] transition-all cursor-pointer whitespace-nowrap shadow-xs"
                                  title="Abrir WhatsApp"
                                >
                                  <Phone className="h-3.5 w-3.5" />
                                  <span>Abrir WhatsApp</span>
                                </a>

                                <button
                                  onClick={(e) => handleCopyContact(lead.id, lead.whatsappDigits, e)}
                                  className="inline-flex h-8 px-2.5 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 cursor-pointer text-[11px] font-bold shadow-xs whitespace-nowrap"
                                  title="Copiar WhatsApp"
                                >
                                  {copiedLeadId === lead.id ? (
                                    <>
                                      <Check className="h-3 w-3 text-emerald-600" />
                                      <span className="text-emerald-600 font-bold">Copiado</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3 w-3" />
                                      <span>Copiar</span>
                                    </>
                                  )}
                                </button>

                                <label 
                                  onClick={(e) => e.stopPropagation()} 
                                  className="inline-flex items-center gap-1.5 cursor-pointer select-none py-1 px-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors"
                                  title="Sinalizar Atendimento Iniciado"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isInitiated}
                                    onChange={() => handleToggleInitiated(lead.id)}
                                    className="sr-only"
                                  />
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${
                                    isInitiated 
                                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs' 
                                      : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900 text-transparent'
                                  }`}>
                                    <Check className={`h-2.5 w-2.5 stroke-[4px] transition-transform ${isInitiated ? 'scale-100' : 'scale-0'}`} />
                                  </div>
                                  <span className={`text-[11px] font-bold leading-none ${
                                    isInitiated ? 'text-emerald-600 dark:text-emerald-450' : 'text-slate-500 dark:text-slate-400'
                                  }`}>
                                    Atendimento Iniciado
                                  </span>
                                </label>
                              </>
                            ) : (
                              <span className="text-slate-400 italic font-bold">Sem contato</span>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Vertical tablet layout (Lines stack into clean descriptive cards) */}
            <div className="block lg:hidden divide-y divide-slate-150 dark:divide-slate-850">
              {paginatedLeads.map((lead) => {
                const isRecent = isLeadRecent(lead.createdAtForSorting);
                const isInitiated = !!initiatedLeads[lead.id];
                
                return (
                  <div
                    key={lead.id}
                    className={`p-4 space-y-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors ${
                      isRecent ? 'bg-cyan-50/5 dark:bg-slate-900/10 border-l-4 border-[#00B6C6]' : ''
                    }`}
                  >
                    {/* Header line */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isAdmin && (
                            <span className="text-xs font-extrabold text-[#0B2F3D] dark:text-slate-100">
                              {lead.unitName.replace('Espaçolaser | ', '')}
                            </span>
                          )}
                          {isRecent && (
                            <span className="inline-flex rounded-full bg-cyan-500/10 dark:bg-cyan-950/45 px-2 py-0.5 text-[9px] font-bold text-[#00B6C6] uppercase tracking-wider">
                              Lead recente
                            </span>
                          )}
                          {!isInitiated ? (
                            <span className="inline-flex rounded bg-rose-500/10 dark:bg-rose-950/45 px-1.5 py-0.5 text-[9px] font-bold text-rose-500 uppercase tracking-wider">
                              Novo Lead
                            </span>
                          ) : (
                            <span className="inline-flex rounded bg-emerald-500/10 dark:bg-emerald-950/45 px-1.5 py-0.5 text-[9px] font-bold text-emerald-555 dark:text-emerald-400 uppercase tracking-wider">
                              Iniciado
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-[10px] text-slate-400 mt-0.5">
                          {lead.createdTimeFormatted}
                        </p>
                      </div>
                    </div>

                    {/* Mapped metadata details */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] leading-tight">
                      <div>
                        <span className="text-slate-400">Cliente: </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-350">{lead.clienteLabel}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Interesse: </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-350">{lead.interesseLabel}</span>
                      </div>
                      {isCopaSubTabActive && (
                        <div className="col-span-2 mt-1.5 flex flex-col gap-0.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Palpite da Copa</span>
                          <span className="inline-flex items-center gap-1 w-max rounded-md bg-cyan-50 text-[#0b2f3d] border border-cyan-150 dark:bg-cyan-950/45 dark:text-cyan-300 dark:border-cyan-900/30 px-2.5 py-1 text-xs font-black shadow-xs">
                            {lead.palpitePlacar || 'Não palpitou'}
                          </span>
                          {lead.rawPalpitePlacar && lead.rawPalpitePlacar !== lead.palpitePlacar && (
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 italic block font-semibold" title={`Original: ${lead.rawPalpitePlacar}`}>
                              Origem: {lead.rawPalpitePlacar}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Interactive elements */}
                    <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                      
                      {/* Name placeholder (high contrast, full fallback) */}
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate flex-1 pr-1">
                        {lead.nome ? lead.nome : <span className="text-slate-400 dark:text-slate-500 font-normal italic">Nome não informado</span>}
                      </span>

                      {/* WhatsApp trigger element */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {lead.whatsappDigits ? (
                          <>
                            <a
                              href={lead.whatsappLink}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#25D366] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#20ba59] cursor-pointer shadow-xs"
                            >
                              <Phone className="h-3 w-3" />
                              <span>Abrir WhatsApp</span>
                            </a>

                            <button
                              id={`mobile-btn-copy-${lead.id}`}
                              onClick={(e) => handleCopyContact(lead.id, lead.whatsappDigits, e)}
                              className="inline-flex h-8 px-2 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer text-[11px] font-bold"
                              title="Copiar WhatsApp"
                            >
                              {copiedLeadId === lead.id ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-600" />
                                  <span className="text-emerald-600 ml-1">Copiado</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  <span className="ml-1">Copiar</span>
                                </>
                              )}
                            </button>

                            <label 
                              onClick={(e) => e.stopPropagation()} 
                              className="inline-flex items-center gap-1.5 cursor-pointer select-none py-1 px-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors"
                              title="Sinalizar Atendimento Iniciado"
                            >
                              <input
                                type="checkbox"
                                checked={isInitiated}
                                onChange={() => handleToggleInitiated(lead.id)}
                                className="sr-only"
                              />
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${
                                isInitiated 
                                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs' 
                                  : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900 text-transparent'
                                }`}>
                                <Check className={`h-2.5 w-2.5 stroke-[4px] transition-transform ${isInitiated ? 'scale-100' : 'scale-0'}`} />
                              </div>
                              <span className={`text-[11px] font-bold leading-none ${
                                isInitiated ? 'text-emerald-600 dark:text-emerald-450' : 'text-slate-500 dark:text-slate-400'
                              }`}>
                                Atendimento Iniciado
                              </span>
                            </label>
                          </>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic font-bold">Sem contato</span>
                        )}
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* Dynamic Pagination Controls Footer */}
        {!isLoading && filteredLeads.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-150 bg-slate-50/50 px-5 py-4.5 dark:border-slate-800 dark:bg-slate-900/10">
            <span className="text-xs text-slate-550 dark:text-slate-400">
              Exibindo <strong className="font-bold text-slate-800 dark:text-slate-200">{paginatedLeads.length}</strong> de{' '}
              <strong className="font-bold text-slate-800 dark:text-slate-200">{filteredLeads.length}</strong> leads filtrados
            </span>
            <div className="flex items-center gap-1.5">
              <button
                id="btn-prev-page"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="inline-flex h-8 px-3 items-center rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 select-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-350 dark:hover:bg-slate-700 cursor-pointer"
              >
                Anterior
              </button>
              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                      currentPage === pageNum
                        ? 'bg-[#0B2F3D] text-white shadow-xs dark:bg-[#00B6C6]'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>
              <span className="sm:hidden text-xs font-mono font-bold text-slate-600 dark:text-slate-400 pm-2 px-3">
                {currentPage} / {totalPages}
              </span>
              <button
                id="btn-next-page"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex h-8 px-3 items-center rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 select-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-350 dark:hover:bg-slate-700 cursor-pointer"
              >
                Próxima
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Floating Copied Contact Toast Alert */}
      {copiedLeadId && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-[#0B2F3D] px-4 py-3.5 text-xs font-bold text-white shadow-2xl dark:bg-slate-900 border border-slate-750">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#00B6C6] text-[#0B2F3D]">
            <Check className="h-3.5 w-3.5" />
          </span>
          <span>Copiado</span>
        </div>
      )}

    </div>
  );
}
