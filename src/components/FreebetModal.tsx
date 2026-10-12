import React, { useState } from 'react';
import { useBankroll } from '../context/BankrollContext';

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
  const { addFreebet, addBet, settings } = useBankroll();

  const [bookmaker, setBookmaker] = useState('Betano');
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
  const numOdd = parseNum(odd) || 1.0;
  const netReturn = numBonus * (numOdd - 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!event.trim() || numBonus <= 0) return;

    const now = new Date();
    const formattedDate = `Hoje, ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    addFreebet({
      bookmaker,
      event,
      selection: selection || 'Seleção Principal',
      bonusAmount: numBonus,
      odd: numOdd,
      netReturn,
      status,
      date: formattedDate
    });

    if (syncToLedger) {
      addBet({
        date: formattedDate,
        type: 'Freebet',
        bookmaker,
        sport: 'Futebol',
        event,
        market: selection || 'Aposta Grátis',
        odd: numOdd,
        stake: numBonus,
        units: Number((numBonus / settings.unitValue).toFixed(2)),
        status: status === 'Creditado' ? 'GREEN' : 'PENDENTE',
        gross: netReturn,
        pl: netReturn
      });
    }

    onSuccessToast?.(`Freebet de R$ ${numBonus.toFixed(2)} cadastrada com sucesso!`);
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md p-0 sm:p-4 overflow-y-auto"
    >
      <div className="w-full max-w-md bg-[#0e1422] border-t sm:border border-white/[0.09] rounded-t-3xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col gap-4 sm:gap-5 max-h-[92dvh] overflow-y-auto">
        <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto sm:hidden shrink-0" />
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">redeem</span>
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-tight">Nova Freebet</h3>
              <p className="text-xs text-slate-400">Aposta grátis (retorno líquido sem stake)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/[0.06] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Casa de Apostas
            </label>
            <select
              value={bookmaker}
              onChange={(e) => setBookmaker(e.target.value)}
              className="bg-[#080c14] border border-white/[0.08] text-white px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="Betano">Betano</option>
              <option value="Bet365">Bet365</option>
              <option value="Stake">Stake</option>
              <option value="Pinnacle">Pinnacle</option>
              <option value="Betfair">Betfair</option>
              <option value="KTO">KTO</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Evento / Partida
            </label>
            <input
              type="text"
              value={event}
              onChange={(e) => setEvent(e.target.value)}
              placeholder="Ex: Arsenal vs Bayern de Munique"
              className="bg-[#080c14] border border-white/[0.08] text-white px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Mercado & Seleção
            </label>
            <input
              type="text"
              value={selection}
              onChange={(e) => setSelection(e.target.value)}
              placeholder="Ex: Ambas Marcam: Sim"
              className="bg-[#080c14] border border-white/[0.08] text-white px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
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
                className="bg-[#080c14] border border-white/[0.08] text-white font-mono px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
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
                className="bg-[#080c14] border border-white/[0.08] text-white font-mono px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="bg-[#080c14] border border-white/[0.08] text-white px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="Ao Vivo">Ao Vivo (Em andamento)</option>
              <option value="Creditado">Creditado (Green convertido)</option>
              <option value="Pendente">Pendente (Pré-jogo)</option>
            </select>
          </div>

          <div className="p-4 rounded-xl bg-[#080c14] border border-white/[0.07] flex items-center justify-between text-xs">
            <span className="text-slate-400">Lucro Líquido Potencial:</span>
            <span className="font-mono text-emerald-400 font-bold text-sm">
              +R$ {netReturn.toFixed(2)}
            </span>
          </div>

          <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={syncToLedger}
              onChange={(e) => setSyncToLedger(e.target.checked)}
              className="rounded border-white/20 bg-[#080c14] text-blue-500 focus:ring-0"
            />
            <span>Sincronizar automaticamente no Histórico de Apostas</span>
          </label>

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.05] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-blue-600/25 active:scale-95"
            >
              Registrar Freebet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
