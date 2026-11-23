import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: ''
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Erro inesperado ao sincronizar dados.'
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Apex Bankroll ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let friendlyMessage = 'Ocorreu um erro inesperado na aplicação.';
      try {
        const parsed = JSON.parse(this.state.errorMessage);
        if (parsed?.error) {
          friendlyMessage = `Erro de sincronização (${parsed.operationType || 'leitura'}): ${parsed.error}`;
        }
      } catch {
        if (this.state.errorMessage) {
          friendlyMessage = this.state.errorMessage;
        }
      }

      return (
        <div className="min-h-screen bg-[#f4f7fb] text-slate-900 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-rose-200 rounded-2xl p-6 shadow-xl flex flex-col gap-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-xl bg-rose-600 text-white shadow-md shadow-rose-600/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[26px]">warning</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Algo deu errado na sincronização</h2>
              <p className="text-xs text-slate-600 mt-1.5 break-words">{friendlyMessage}</p>
            </div>
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm shadow-blue-600/20"
            >
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
