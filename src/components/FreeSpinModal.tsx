import React, { useState, useEffect, useRef } from 'react';
import { useBankroll } from '../context/BankrollContext';
import { BookmakerSelector } from './BookmakerLogo';

interface FreeSpinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast?: (msg: string) => void;
}

export const FreeSpinModal: React.FC<FreeSpinModalProps> = ({
  isOpen,
  onClose,
  onSuccessToast
}) => {
  const { addFreeSpin } = useBankroll();

  const [bookmaker, setBookmaker] = useState('1win');
  const [provider, setProvider] = useState('Pragmatic Play');
  const [game, setGame] = useState('Gates of Olympus');
  const [spinsCount, setSpinsCount] = useState('10');
  const [netProfit, setNetProfit] = useState('25.00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionKeyRef = useRef<string>('');

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      submissionKeyRef.current = `spin_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const parseNum = (val: string | number): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const clean = String(val).trim().replace(',', '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const profit = parseNum(netProfit);
    if (profit <= 0) return;

    setIsSubmitting(true);
    const now = new Date();
    const formattedDate = `Hoje, ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const created = addFreeSpin({
      provider,
      game,
      bookmaker,
      spinsCount: parseInt(spinsCount, 10) || 10,
      netProfit: profit,
      date: formattedDate,
      idempotencyKey: submissionKeyRef.current
    });

    if (created) {
      onSuccessToast?.(`Retorno de R$ ${profit.toFixed(2)} creditado diretamente na banca real!`);
    }
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto"
    >
      <div className="w-full max-w-md bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col gap-4 sm:gap-5 max-h-[92dvh] overflow-y-auto">
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto sm:hidden shrink-0" />
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">casino</span>
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 tracking-tight">Giros Grátis</h3>
              <p className="text-xs text-slate-500">Registrar lucro líquido de rodadas promocionais</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Casa de Apostas
            </label>
            <BookmakerSelector value={bookmaker} onChange={setBookmaker} accent="emerald" />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Provedor
              </label>
              <input
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="Ex: Pragmatic Play"
                className="bg-slate-50 border border-slate-200 text-slate-900 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-600 focus:bg-white placeholder:text-slate-400"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Qtd. Giros
              </label>
              <input
                type="number"
                value={spinsCount}
                onChange={(e) => setSpinsCount(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-900 px-3.5 py-2.5 rounded-xl text-xs font-mono focus:outline-none focus:border-emerald-600 focus:bg-white"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Jogo Promocional
            </label>
            <input
              type="text"
              value={game}
              onChange={(e) => setGame(e.target.value)}
              placeholder="Ex: Gates of Olympus"
              className="bg-slate-50 border border-slate-200 text-slate-900 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-600 focus:bg-white placeholder:text-slate-400"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Lucro Líquido Obtido (R$)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={netProfit}
              onChange={(e) => {
                const val = e.target.value;
                if (/^[0-9]*[.,]?[0-9]*$/.test(val) || val === '') {
                  setNetProfit(val);
                }
              }}
              placeholder="25,00"
              className="bg-slate-50 border border-slate-200 text-emerald-700 font-mono px-3.5 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:border-emerald-600 focus:bg-white placeholder:text-slate-400"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-sm shadow-emerald-600/20 active:scale-95"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar e Creditar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
