import React, { useState } from 'react';
import { useBankroll } from '../context/BankrollContext';
import { PWAInstallButton } from './PWAInstallButton';

interface AuthViewProps {
  onSuccessToast?: (msg: string) => void;
}

type AuthMode = 'LOGIN' | 'REGISTER' | 'RESET';

export const AuthView: React.FC<AuthViewProps> = ({ onSuccessToast }) => {
  const { signIn, signUp, resetPassword } = useBankroll();
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const translateAuthError = (msg: string): string => {
    const lower = msg.toLowerCase();
    if (lower.includes('invalid login credentials') || lower.includes('senha incorreta')) {
      return 'E-mail ou senha incorretos. Confira seus dados ou recupere sua senha.';
    }
    if (lower.includes('already registered') || lower.includes('already exists') || lower.includes('já possui cadastro')) {
      return 'Este e-mail já possui cadastro. Acesse usando a aba "Entrar na Conta".';
    }
    if (lower.includes('at least 6 characters') || lower.includes('mínimo 6 caracteres')) {
      return 'A senha deve conter no mínimo 6 caracteres.';
    }
    return msg;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Por favor, informe um endereço de e-mail válido.');
      setLoading(false);
      return;
    }

    if (mode !== 'RESET' && cleanPassword.length < 6) {
      setErrorMsg('A senha deve conter no mínimo 6 caracteres.');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'LOGIN') {
        const res = await signIn(cleanEmail, cleanPassword);
        if (!res.success) {
          setErrorMsg(translateAuthError(res.error || 'Credenciais inválidas.'));
        } else {
          onSuccessToast?.('Login realizado com sucesso! Bem-vindo de volta.');
        }
      } else if (mode === 'REGISTER') {
        const res = await signUp(cleanEmail, cleanPassword, name);
        if (!res.success) {
          setErrorMsg(translateAuthError(res.error || 'Erro ao criar conta.'));
        } else {
          onSuccessToast?.('Conta criada com sucesso! Bem-vindo ao Apex Bankroll.');
        }
      } else if (mode === 'RESET') {
        const res = await resetPassword(cleanEmail);
        if (!res.success) {
          setErrorMsg(translateAuthError(res.error || 'Nenhuma conta encontrada com este e-mail.'));
        } else {
          setInfoMsg(
            res.message || 'Senha temporária definida como: 123456. Você já pode acessar sua conta.'
          );
          setMode('LOGIN');
        }
      }
    } catch (err: any) {
      setErrorMsg(translateAuthError(err?.message || 'Erro ao autenticar. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-[#e2e8f0] flex flex-col justify-center items-center px-4 py-8 bg-ambient-glow selection:bg-blue-500 selection:text-white">
      <div className="w-full max-w-md bg-[#0e1422]/95 border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/25">
            <span className="material-symbols-outlined text-[26px]">account_balance_wallet</span>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Apex Bankroll
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Gestão individual de banca esportiva com dados 100% isolados por conta
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        {mode !== 'RESET' && (
          <div className="grid grid-cols-2 p-1 bg-[#080c14] rounded-xl border border-white/[0.07]">
            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`py-2.5 text-xs font-semibold rounded-lg transition-all ${
                mode === 'LOGIN'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Entrar na Conta
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('REGISTER');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`py-2.5 text-xs font-semibold rounded-lg transition-all ${
                mode === 'REGISTER'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Criar Nova Conta
            </button>
          </div>
        )}

        {/* Feedback Banners */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[18px] text-rose-400 shrink-0 mt-0.5">
              error
            </span>
            <span>{errorMsg}</span>
          </div>
        )}

        {infoMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[18px] text-emerald-400 shrink-0 mt-0.5">
              check_circle
            </span>
            <span>{infoMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'REGISTER' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Seu Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Diogo"
                required
                className="bg-[#080c14] border border-white/[0.08] text-white px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              autoComplete="email"
              className="bg-[#080c14] border border-white/[0.08] text-white px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
            />
          </div>

          {mode !== 'RESET' && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">Senha</label>
                {mode === 'LOGIN' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('RESET');
                      setErrorMsg(null);
                      setInfoMsg(null);
                    }}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Esqueci a senha
                  </button>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
                minLength={6}
                required
                autoComplete={mode === 'LOGIN' ? 'current-password' : 'new-password'}
                className="bg-[#080c14] border border-white/[0.08] text-white px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs sm:text-sm transition-all active:scale-98 shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Autenticando...</span>
            ) : mode === 'LOGIN' ? (
              <>
                <span className="material-symbols-outlined text-[18px]">login</span>
                <span>Entrar na Minha Banca</span>
              </>
            ) : mode === 'REGISTER' ? (
              <>
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                <span>Criar Conta Individual</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">mail</span>
                <span>Recuperar Senha</span>
              </>
            )}
          </button>

          {mode === 'RESET' && (
            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className="text-xs text-slate-400 hover:text-white text-center pt-1"
            >
              Voltar para o login
            </button>
          )}
        </form>

        {/* Install App Button & Privacy note */}
        <div className="pt-4 border-t border-white/[0.06] flex flex-col gap-3">
          <PWAInstallButton variant="auth" />
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 text-center">
            <span className="material-symbols-outlined text-[15px] text-emerald-400">lock</span>
            <span>Apostas, caixa e configurações 100% isoladas por usuário</span>
          </div>
        </div>
      </div>
    </div>
  );
};
