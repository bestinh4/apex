import React from 'react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-18 lg:bottom-5 left-3.5 right-3.5 sm:left-auto sm:right-5 z-50 flex items-center justify-between gap-3 px-4 py-3 bg-white/95 backdrop-blur-xl border border-emerald-300 text-slate-900 rounded-2xl shadow-[0_12px_28px_-4px_rgba(15,23,42,0.16),0_4px_10px_-2px_rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-700/25">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
        </div>
        <span className="text-xs font-semibold text-slate-900 truncate">{message}</span>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar notificação"
        className="text-slate-600 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
      >
        <span className="material-symbols-outlined text-[16px]">close</span>
      </button>
    </div>
  );
};
