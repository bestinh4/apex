import React, { useState } from 'react';
import { useBankroll } from '../context/BankrollContext';
import { BookmakerSelector } from './BookmakerLogo';
import { calculateFreebetPotentialReturn } from '../lib/financialEngine';

interface FreebetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast?: (msg: string) => void;
}

export const FreebetModal: React.FC<FreebetModalProps> = ({
  isOpen,
  onClose,
  onSuccessToast
}) => {
  const { addFreebet } = useBankroll();

  const [bookmaker, setBookmaker] = useState('1win');
  const [event, setEvent] = useState('');
  const [selection, setSelection] = useState('');
  const [bonusAmount, setBonusAmount] = useState('50.00');
  const [odd, setOdd] = useState('2.10');
  const [status, setStatus] = useState<'Ao Vivo' | 'Creditado' | 'Pendente'>('Ao Vivo');
  const [syncToLedger, setSyncToLedger] = useState(true);

  if (!isOpen) return null;

  const parseNum = (val: string | number): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const clean = String(val).trim().replace(',', '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  };

  const numBonus = parseNum(bonusAmount);
  const numOdd = Math.max(1, parseNum(odd) || 1.0);
  const potentialReturn = calculateFreebetPotentialReturn(numBonus, numOdd);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!event.trim() || numBonus <= 0) return;

    const now = new Date();
    const formattedDate = `Hoje, ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    addFreebet(
      {
        bookmaker,
        event: event.trim(),
        selection: selection.trim() || 'Seleção Principal',
        bonusAmount: numBonus,
        odd: numOdd,
        status,
        date: formattedDate
      },
      { syncToLedger, sport: 'Futebol' }
    );

    onSuccessToast?.(`Freebet de R$ ${numBonus.toFixed(2)} cadastrada com sucesso!`);
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto"
    >
      <div className="w-full max-w-md bg-white border-t sm:border border-slate-300 rounded-t-3xl sm:rounded-2xl p-4 sm:p-6 shadow-[0_24px_56px_-12px_rgba(15,23,42,0.28),0_8px_24px_-4px_rgba(15,23,42,0.12)] flex flex-col gap-4 sm:gap-5 max-h-[92dvh] overflow-y-auto">
        <div className="w-10 h-1 bg-slate-400 rounded-full mx-auto sm:hidden shrink-0" />
        <div className="flex items-center justify-between pb-4 border-b border-slate-300/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">redeem</span>
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 tracking-tight">Nova Freebet</h3>
              <p className="text-xs text-slate-600">Aposta grátis (retorno líquido sem stake)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="text-slate-600 hover:text-slate-900 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              Casa de Apostas
            </label>
            <BookmakerSelector value={bookmaker} onChange={setBookmaker} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              Evento / Partida
            </label>
            <input
              type="text"
              value={event}
              onChange={(e) => setEvent(e.target.value)}
              placeholder="Ex: Arsenal vs Bayern de Munique"
              className="bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-900 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/15 placeholder:text-slate-500"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              Mercado & Seleção
            </label>
            <input
              type="text"
              value={selection}
              onChange={(e) => setSelection(e.target.value)}
              placeholder="Ex: Ambas Marcam: Sim"
              className="bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-900 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/15 placeholder:text-slate-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                Valor Bônus (R$)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={bonusAmount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^[0-9]*[.,]?[0-9]*$/.test(val) || val === '') {
                    setBonusAmount(val);
                  }
                }}
                placeholder="50,00"
                className="bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-900 font-mono px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/15 placeholder:text-slate-500"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                Odd Decimal
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={odd}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^[0-9]*[.,]?[0-9]*$/.test(val) || val === '') {
                    setOdd(val);
                  }
                }}
                placeholder="2,10"
                className="bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-900 font-mono px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/15 placeholder:text-slate-500"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-900 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/15"
            >
              <option value="Ao Vivo" className="bg-white text-slate-900">Ao Vivo (Em andamento)</option>
              <option value="Creditado" className="bg-white text-slate-900">Creditado (Green convertido)</option>
              <option value="Pendente" className="bg-white text-slate-900">Pendente (Pré-jogo)</option>
            </select>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-300/80 flex items-center justify-between text-xs">
            <span className="text-slate-700 font-medium">
              {status === 'Creditado' ? 'Lucro Líquido Creditado:' : 'Lucro Líquido Potencial (se Green):'}
            </span>
            <span className="font-mono text-emerald-700 font-bold text-sm">
              +R$ {potentialReturn.toFixed(2)}
            </span>
          </div>

          <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={syncToLedger}
              onChange={(e) => setSyncToLedger(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 bg-white accent-blue-600 focus:ring-0"
            />
            <span>Sincronizar automaticamente no Histórico de Apostas</span>
          </label>

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs rounded-xl transition-all shadow-sm shadow-blue-600/20 active:scale-95"
            >
              Registrar Freebet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
