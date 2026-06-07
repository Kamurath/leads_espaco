import React, { useState } from 'react';
import { Building2, Check, X, ToggleLeft, ToggleRight, Disc, ChevronDown, ChevronUp } from 'lucide-react';
import { Unit, LoadingStatus } from '../types';

interface UnitFilterProps {
  units: Unit[];
  onToggleUnit: (unitName: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  loadingStatuses: LoadingStatus[];
  leadsCountByUnit: Record<string, number>;
}

export default function UnitFilter({
  units,
  onToggleUnit,
  onSelectAll,
  onDeselectAll,
  loadingStatuses,
  leadsCountByUnit,
}: UnitFilterProps) {
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  // Return formatted status text
  const getStatusBadgeText = (unit: Unit) => {
    if (unit.pending) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-amber-100/40 dark:bg-amber-950/30 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-400">
          Pendente
        </span>
      );
    }
    
    const statusObj = loadingStatuses.find(s => s.unitName === unit.name);
    
    if (!statusObj) return null;

    switch (statusObj.status) {
      case 'loading':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-cyan-50 dark:bg-cyan-950/40 px-1.5 py-0.5 text-[9px] font-semibold text-[#00B6C6]">
            Lendo
          </span>
        );
      case 'success':
        return (
          <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 dark:text-emerald-400">
            OK
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-100/40 dark:bg-amber-950/30 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-400">
            Pendente
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-0.5 rounded bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 text-[9px] font-semibold text-red-700 dark:text-red-400">
            Erro
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
            Ocioso
          </span>
        );
    }
  };

  const activeEnabledCount = units.filter(u => u.enabled && !u.pending).length;
  const activeTotalCount = units.filter(u => !u.pending).length;

  return (
    <div className="w-full premium-card md:w-80 shrink-0">
      
      {/* Header control clickable on mobile */}
      <div 
        className="flex items-center justify-between border-b border-slate-150 px-4 py-4 dark:border-slate-800 md:pointer-events-none cursor-pointer"
        onClick={() => setIsOpenMobile(!isOpenMobile)}
      >
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-[#00B6C6]" />
          <h2 className="font-display font-bold text-slate-800 dark:text-slate-100 text-sm">
            Unidades ({activeEnabledCount}/{activeTotalCount})
          </h2>
        </div>
        <div className="md:hidden">
          {isOpenMobile ? <ChevronUp className="h-4.5 w-4.5 text-slate-500" /> : <ChevronDown className="h-4.5 w-4.5 text-slate-500" />}
        </div>
      </div>

      {/* Switch items toggle area */}
      <div className={`${isOpenMobile ? 'block' : 'hidden md:block'} px-4 py-3.5 space-y-3.5`}>
        
        {/* Toggle selectors buttons */}
        <div className="flex items-center gap-2 justify-between border-b border-slate-150 pb-3 dark:border-slate-800">
          <button
            onClick={onSelectAll}
            className="text-[11px] font-bold text-[#00B6C6] hover:underline cursor-pointer"
          >
            Selecionar Todas
          </button>
          <button
            onClick={onDeselectAll}
            className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
          >
            Desmarcar Todas
          </button>
        </div>

        {/* Scroll panel scrollbars */}
        <div className="max-h-[380px] overflow-y-auto space-y-1 pr-1 md:max-h-[500px]">
          {units.map((unit) => {
            const isClickable = !unit.pending;
            const leadsCount = leadsCountByUnit[unit.name] || 0;

            return (
              <div
                key={unit.name}
                onClick={() => isClickable && onToggleUnit(unit.name)}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-all duration-150 ${
                  unit.pending
                    ? 'opacity-40 cursor-not-allowed bg-slate-50/50 dark:bg-slate-900/30'
                    : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40'
                } ${unit.enabled && !unit.pending ? 'bg-cyan-50/20 dark:bg-cyan-950/10' : ''}`}
              >
                
                {/* Active switch slider */}
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <div className="mt-0.5 shrink-0">
                    {unit.pending ? (
                      <ToggleLeft className="h-4.5 w-4.5 text-slate-300 dark:text-slate-700" />
                    ) : unit.enabled ? (
                      <ToggleRight className="h-4.5 w-4.5 text-[#00B6C6]" />
                    ) : (
                      <ToggleLeft className="h-4.5 w-4.5 text-slate-400 dark:text-slate-600" />
                    )}
                  </div>
                  
                  <div className="min-w-0 pr-1">
                    <p className={`font-semibold text-xs leading-tight ${unit.enabled && !unit.pending ? 'text-[#0B2F3D] dark:text-slate-100' : 'text-slate-500'}`}>
                      {unit.name.replace('Espaçolaser | ', '')}
                    </p>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      {getStatusBadgeText(unit)}
                      {leadsCount > 0 && (
                        <span className="inline-flex items-center rounded bg-[#0B2F3D]/5 dark:bg-slate-750 px-1 py-0.2 text-[9px] font-mono font-semibold text-[#0B2F3D] dark:text-slate-300">
                          {leadsCount} lead{leadsCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}
