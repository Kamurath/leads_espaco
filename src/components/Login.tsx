import React, { useState } from 'react';
import { Flame, Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Session } from '../types';
import { USERS, normalizeLoginText } from '../sharedStatic';

interface LoginProps {
  onLoginSuccess: (session: Session) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function Login({ onLoginSuccess, isDarkMode, onToggleDarkMode }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Unidade e Senha são campos obrigatórios.');
      return;
    }

    setIsLoading(true);
    setError(null);

    setTimeout(() => {
      const normInput = normalizeLoginText(username);
      const user = USERS.find(u => u.normalized === normInput);

      if (!user || user.password !== password.trim()) {
        setError('Unidade ou senha incorreta.');
        setIsLoading(false);
        return;
      }

      onLoginSuccess({
        username: user.username,
        role: user.role,
        unitName: user.unitName,
        token: `local_token_${user.username}_${Date.now()}`
      });
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#061720] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Decorative ambient blurred shapes */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-cyan-600/10 blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-[#00B6C6]/15 blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md z-10 transition-all duration-300">
        
        {/* Brand Header Logo block */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#00B6C6] to-[#0A4D5C] text-white shadow-xl shadow-cyan-500/10 mb-4 animate-pulse">
            <Flame className="h-9 w-9 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">
            Monitor de Leads Espaçolaser
          </h1>
          <p className="text-xs text-slate-400 mt-2">
            Acesse os leads da sua unidade
          </p>
        </div>

        {/* Centralized credentials card */}
        <div className="bg-[#0B2F3D]/90 border border-[#00B6C6]/20 rounded-2xl shadow-2xl p-6 md:p-8 backdrop-blur-md">
          
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Username/Unit field */}
            <div className="space-y-1.5">
              <label htmlFor="login-username" className="text-xs font-bold text-slate-350 tracking-wide uppercase">
                Unidade
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4.5 w-4.5 text-slate-400" />
                </div>
                <input
                  id="login-username"
                  name="Unidade"
                  type="text"
                  required
                  placeholder="Nome da sua unidade..."
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError(null);
                  }}
                  className="w-full rounded-lg border border-[#00B6C6]/20 bg-[#061e26]/90 py-2.5 pl-10 pr-4 text-xs font-semibold text-white placeholder-slate-400 focus:border-[#00B6C6] focus:outline-hidden transition-all text-left"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-xs font-bold text-slate-350 tracking-wide uppercase">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4.5 w-4.5 text-slate-400" />
                </div>
                <input
                  id="login-password"
                  name="Senha"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Digite sua senha..."
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  className="w-full rounded-lg border border-[#00B6C6]/20 bg-[#061e26]/90 py-2.5 pl-10 pr-10 text-xs font-semibold text-white placeholder-slate-400 focus:border-[#00B6C6] focus:outline-hidden transition-all text-left"
                />
                
                {/* Visibility switcher toggle */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            {/* Error alerts indicator */}
            {error && (
              <div className="flex items-center gap-2 p-3.5 rounded-lg bg-red-950/40 border border-red-500/30 text-xs font-bold text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Form submission Trigger */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 flex items-center justify-center bg-gradient-to-r from-[#00B6C6] to-[#0093A0] hover:brightness-105 rounded-lg text-xs font-extrabold text-white shadow-lg cursor-pointer disabled:opacity-50 transition-all select-none uppercase tracking-wide"
            >
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : 'Entrar'}
            </button>

          </form>

        </div>

        {/* Small Espaçolaser copyright disclaimer */}
        <p className="text-center text-[10px] text-slate-500 mt-8 tracking-wide font-medium">
          Espaçolaser Monitor de Leads • Todos os direitos reservados • 2026
        </p>

      </div>

    </div>
  );
}
