import React, { useEffect, useState } from 'react';
import { Sun, Moon, RefreshCw, AlertTriangle, CheckCircle, Flame, LogOut } from 'lucide-react';
import { LoadingStatus, Session } from '../types';

interface HeaderProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onManualRefresh: () => void;
  isSyncing: boolean;
  lastUpdated: Date | null;
  autoRefreshTimeRemaining: number; // in seconds
  loadingStatuses: LoadingStatus[];
  currentUser: Session | null;
  onLogout: () => void;
}

export default function Header({
  isDarkMode,
  onToggleDarkMode,
  onManualRefresh,
  isSyncing,
  lastUpdated,
  autoRefreshTimeRemaining,
  loadingStatuses,
  currentUser,
  onLogout,
}: HeaderProps) {
  const [showNetworkAlerts, setShowNetworkAlerts] = useState(false);

  const errorUnits = loadingStatuses.filter(s => s.status === 'error');
  const isAdmin = currentUser?.role === 'admin';

  const formatCountdownText = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins} min e ${secs} s`;
    }
    return `${secs} s`;
  };

  const formatLastUpdatedVerbatim = (date: Date | null) => {
    if (!date) return '---';
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yy = String(date.getFullYear()).slice(-2);
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yy} | ${hh}:${min}`;
  };

  // Exact requested static title and subtitle
  const displayTitle = "Monitor de Leads Espaçolaser";
  const displaySubtitle = "Leads captados via formulários instantâneos do Meta Ads";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 py-4.5 shadow-sm backdrop-blur-md transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 lg:flex-row lg:items-center lg:justify-between lg:gap-2">
        
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#00B6C6] text-white shadow-md shadow-cyan-500/10 shrink-0">
            <Flame className="h-6.5 w-6.5 text-[#0B2F3D]" />
          </div>
          <div>
            <h1 className="font-display text-xl font-extrabold tracking-tight text-[#0B2F3D] dark:text-slate-100">
              {displayTitle}
            </h1>
            <p className="font-sans text-xs text-slate-500 dark:text-slate-400">
              {displaySubtitle}
            </p>
            <div className="mt-1 flex items-center">
              <span className="inline-flex items-center rounded-full bg-cyan-100/50 dark:bg-slate-800 dark:border dark:border-slate-700/50 px-2.5 py-0.5 text-[10px] font-extrabold text-[#0B2F3D] dark:text-slate-300 uppercase tracking-wider">
                {isAdmin ? 'Acesso ADM' : `Unidade: ${currentUser?.unitName.replace('Espaçolaser | ', '')}`}
              </span>
            </div>
          </div>
        </div>

        {/* Sync Controls, Countdown & Theme Toggles */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 lg:self-center">
          
          {/* Status Alerts Notification Count - Hidden for store users to honor the security boundary */}
          {isAdmin && errorUnits.length > 0 && (
            <div className="relative">
              <button
                id="btn-alerts-toggle"
                onClick={() => setShowNetworkAlerts(!showNetworkAlerts)}
                className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 transition-all"
              >
                <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
                <span>{errorUnits.length} Unidade{errorUnits.length > 1 ? 's' : ''} com erro</span>
              </button>

              {/* Discrete Alerts dropdown overlay */}
              {showNetworkAlerts && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-xl ring-1 ring-black/5 dark:border-slate-800 dark:bg-slate-800 z-50">
                  <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Unidades não carregadas</span>
                    <button 
                      onClick={() => setShowNetworkAlerts(false)}
                      className="text-[10px] text-[#00B6C6] hover:underline"
                    >
                      Fechar
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {errorUnits.map((status, index) => (
                      <div key={index} className="text-left leading-relaxed text-xs p-2 rounded bg-slate-50 dark:bg-slate-900/50">
                        <p className="font-bold text-[#0B2F3D] dark:text-slate-200">{status.unitName.replace('Espaçolaser | ', '')}</p>
                        <p className="text-[10px] text-red-500 dark:text-red-400 mt-1">
                          {status.errorMessage || "Não foi possível carregar os leads desta unidade."}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sync Stats & Timer */}
          <div className="flex flex-col gap-1 text-[11px] text-slate-600 dark:text-slate-400 bg-slate-100/60 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
            <div>
              <span className="font-semibold text-[#0B2F3D] dark:text-slate-300">Última atualização: </span>
              <span className="font-mono text-slate-700 dark:text-slate-250 font-bold">
                {formatLastUpdatedVerbatim(lastUpdated)}
              </span>
            </div>
            <div>
              <span className="font-semibold text-[#0B2F3D] dark:text-slate-300 flex items-center gap-0.5">Sincronização automática em: </span>
              <span className="font-mono text-[#00B6C6] dark:text-[#00B6C6] font-bold">
                {formatCountdownText(autoRefreshTimeRemaining)}
              </span>
            </div>
          </div>

          {/* Manual Refresh Button */}
          <button
            id="btn-manual-refresh"
            onClick={onManualRefresh}
            disabled={isSyncing}
            className={`flex h-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#0B2F3D] to-[#00B6C6] px-4 text-xs font-bold text-white shadow-sm hover:opacity-90 active:scale-97 disabled:opacity-50 transition-all cursor-pointer`}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Carregando...' : 'Atualizar agora'}</span>
          </button>

          {/* Divider */}
          <div className="hidden sm:block h-6 w-[1px] bg-slate-200 dark:bg-slate-800"></div>

          {/* Dark Mode Switcher */}
          <button
            id="btn-theme-toggle"
            onClick={onToggleDarkMode}
            className="rounded-lg p-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-755 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors duration-200 cursor-pointer"
            aria-label="Alternar tema"
          >
            {isDarkMode ? <Sun className="h-5 w-5 text-[#00B6C6]" /> : <Moon className="h-5 w-5 text-[#0B2F3D]" />}
          </button>

          {/* Sair (Logout) Button */}
          <button
            id="btn-logout"
            onClick={onLogout}
            className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-red-200/50 bg-red-50/50 hover:bg-red-50 px-3.5 text-xs font-bold text-red-650 dark:border-red-950/20 dark:bg-red-950/10 dark:hover:bg-red-950/20 dark:text-red-400 cursor-pointer transition-all"
            title="Sair da conta"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>

        </div>
      </div>
    </header>
  );
}
