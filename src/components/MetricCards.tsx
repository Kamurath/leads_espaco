import React from 'react';
import { Users, UserCheck, Sparkles, AlertTriangle, CheckCircle } from 'lucide-react';
import { Lead, Session, LoadingStatus } from '../types';

interface MetricCardsProps {
  leads: Lead[];
  isLoading: boolean;
  currentUser: Session | null;
  loadingStatuses: LoadingStatus[];
}

export default function MetricCards({ leads, isLoading, currentUser, loadingStatuses }: MetricCardsProps) {
  const totalLeads = leads.length;

  const newClients = leads.filter(l => l.clienteLabel === 'Novo Cliente').length;
  const existingClients = leads.filter(l => l.clienteLabel === 'Já é Cliente').length;

  const cardStyle = "premium-card p-5 transition-all duration-200 flex flex-col justify-between h-32 hover:scale-[1.01] hover:shadow-md";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      
      {/* 1. Total de leads */}
      <div className={cardStyle}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Total de Leads
          </span>
          <div className="rounded-lg bg-cyan-50 dark:bg-slate-800 p-2 text-[#00B6C6]">
            <Users className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <h3 className="font-display text-3xl font-extrabold text-[#0B2F3D] dark:text-slate-150">
            {isLoading ? '...' : totalLeads}
          </h3>
          <span className="text-[10px] font-semibold text-slate-400">Total geral</span>
        </div>
      </div>

      {/* 2. Novos Clientes */}
      <div className={cardStyle}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Novos Clientes
          </span>
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-2 text-emerald-600 dark:text-emerald-400">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <h3 className="font-display text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {isLoading ? '...' : newClients}
          </h3>
          <span className="text-[10px] font-semibold text-emerald-600/80 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded">
            Fila verde
          </span>
        </div>
      </div>

      {/* 3. Já é Cliente */}
      <div className={cardStyle}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Já é Cliente
          </span>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-2 text-amber-600 dark:text-amber-400">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <h3 className="font-display text-3xl font-extrabold text-amber-600 dark:text-amber-400">
            {isLoading ? '...' : existingClients}
          </h3>
          <span className="text-[10px] font-semibold text-amber-600/80 bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded">
            Fidelizado
          </span>
        </div>
      </div>

    </div>
  );
}
