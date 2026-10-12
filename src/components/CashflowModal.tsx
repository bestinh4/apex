import React, { useState } from 'react';
import { TreasuryType } from '../types';
import { useBankroll } from '../context/BankrollContext';

interface CashflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast?: (msg: string) => void;
}

export const CashflowModal: React.FC<CashflowModalProps> = ({
  isOpen,
  onClose,
  onSuccessToast
}) => {
  const { addTreasury, currentEquity } = useBankroll();

  const [type, setType] = useState<TreasuryType>('DEPOSIT');
  const [amount, setAmount] = useState('250.00');
  const [desc, setDesc] = useState('');
  const [details, setDetails] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  const parseNum = (val: string | number): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const clean = String(val).trim().replace(',', '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  };

  const numAmount = parseNum(amount);
  let projectedEquity = currentEquity;
  if (type === 'DEPOSIT' || type === 'BONUS') {
    projectedEquity += numAmount;
  } else {
    projectedEquity -= numAmount;
  }

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim() || numAmount <= 0) return;

    const dateParts = date.split('-');
    const formattedDate =
      dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : 'Hoje';

    addTreasury({
      date: formattedDate,
      type,
      desc,
      details: details || 'Lançamento registrado',
      amount: numAmount,
      status: 'Compensado'
    });

    onSuccessToast?.(`Movimentação de ${formatBRL(numAmount)} registrada.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md p-0 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-[#0e1422] border-t sm:border border-white/[0.09] rounded-t-3xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col gap-4 sm:gap-5 max-h-[92dvh] overflow-y-auto">
        <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto sm:hidden shrink-0" />
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">account_balance</span>
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-tight">Nova Movimentação</h3>
              <p className="text-xs text-slate-400">Depósitos, saques e bônus da banca</p>
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
              Tipo de Movimentação
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-[#080c14] p-1 rounded-xl border border-white/[0.06]">
              <button
                type="button"
                onClick={() => setType('DEPOSIT')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  type === 'DEPOSIT'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Depósito
              </button>
              <button
                type="button"
                onClick={() => setType('WITHDRAW')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  type === 'WITHDRAW'
                    ? 'bg-rose-500 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-rose-400'
                }`}
              >
                Saque
              </button>
              <button
                type="button"
                onClick={() => setType('BONUS')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  type === 'BONUS'
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-blue-400'
                }`}
              >
                Bônus
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Valor (R$)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^[0-9]*[.,]?[0-9]*$/.test(val) || val === '') {
                    setAmount(val);
                  }
                }}
                placeholder="100,00"
                className="bg-[#080c14] border border-white/[0.08] text-white font-mono px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Data
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-[#080c14] border border-white/[0.08] text-white px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Descrição / Casa de Apostas
            </label>
            <input
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Ex: Depósito via Pix Bet365 / Saque Betano"
              required
              className="bg-[#080c14] border border-white/[0.08] text-white px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Observação (Opcional)
            </label>
            <input
              type="text"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Ex: Pix imediato"
              className="bg-[#080c14] border border-white/[0.08] text-white px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
            />
          </div>

          <div className="p-4 rounded-xl bg-[#080c14] border border-white/[0.07] flex items-center justify-between text-xs">
            <span className="text-slate-400">Banca após lançamento:</span>
            <span className="font-mono font-bold text-sm text-emerald-400">
              {formatBRL(projectedEquity)}
            </span>
          </div>

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
              Confirmar Lançamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
