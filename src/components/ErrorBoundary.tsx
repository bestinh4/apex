import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou erro:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('apex_current_session_v1');
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#080c14] text-[#e2e8f0] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[32px]">warning</span>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Apex Bankroll - Recuperação Automática</h1>
          <p className="text-sm text-slate-400 max-w-md mb-6">
            Ocorreu um imprevisto na renderização. Clique abaixo para reiniciar a interface limpa instantaneamente.
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/25 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Reiniciar Aplicativo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
