import React from 'react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-18 lg:bottom-5 left-3.5 right-3.5 sm:left-auto sm:right-5 z-50 flex items-center justify-between gap-3 px-4 py-3 bg-white/95 backdrop-blur-xl border border-emerald-200 text-slate-900 rounded-2xl shadow-xl shadow-slate-900/10">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-600/20">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
        </div>
        <span className="text-xs font-semibold text-slate-800 truncate">{message}</span>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
      >
        <span className="material-symbols-outlined text-[16px]">close</span>
      </button>
    </div>
  );
};
