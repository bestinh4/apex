import React, { useState } from 'react';
import { TreasuryEntry, TreasuryType } from '../types';
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
  const { addTreasury, realEquity, promoBalance } = useBankroll();

  const [type, setType] = useState<TreasuryType>('DEPOSIT');
  const [status, setStatus] = useState<TreasuryEntry['status']>('Compensado');
  const [amount, setAmount] = useState('250.00');
  const [desc, setDesc] = useState('');
  const [details, setDetails] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const parseNum = (val: string | number): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const clean = String(val).trim().replace(',', '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  };

  const numAmount = parseNum(amount);
  const affectsNow = status === 'Compensado';
  const isBonus = type === 'BONUS';
  let projectedRealEquity = realEquity;
  let projectedPromoBalance = promoBalance;

  if (affectsNow) {
    if (type === 'DEPOSIT') {
      projectedRealEquity += numAmount;
    } else if (type === 'WITHDRAW') {
      projectedRealEquity -= numAmount;
    } else if (type === 'BONUS') {
      projectedPromoBalance += numAmount;
    }
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
      details: details || status,
      amount: numAmount,
      status
    });

    onSuccessToast?.(
      status === 'Compensado'
        ? `Movimentação de ${formatBRL(numAmount)} compensada.`
        : `Movimentação de ${formatBRL(numAmount)} registrada (${status} — não altera o saldo até compensar).`
    );
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto"
    >
      <div className="w-full max-w-lg bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col gap-4 sm:gap-5 max-h-[92dvh] overflow-y-auto">
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto sm:hidden shrink-0" />
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">account_balance</span>
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 tracking-tight">Nova Movimentação</h3>
              <p className="text-xs text-slate-500">Depósitos, saques e bônus da banca</p>
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
              Tipo de Movimentação
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setType('DEPOSIT')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  type === 'DEPOSIT'
                    ? 'bg-emerald-600 text-white font-bold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Depósito
              </button>
              <button
                type="button"
                onClick={() => setType('WITHDRAW')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  type === 'WITHDRAW'
                    ? 'bg-rose-600 text-white font-bold shadow-sm'
                    : 'text-slate-600 hover:text-rose-600'
                }`}
              >
                Saque
              </button>
              <button
                type="button"
                onClick={() => setType('BONUS')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  type === 'BONUS'
                    ? 'bg-indigo-600 text-white font-bold shadow-sm'
                    : 'text-slate-600 hover:text-indigo-600'
                }`}
              >
                Bônus Rollover
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Status da Movimentação
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TreasuryEntry['status'])}
              className="bg-slate-50 border border-slate-200 text-slate-900 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-600 focus:bg-white"
            >
              <option value="Compensado" className="bg-white text-slate-900">
                Compensado (Afeta saldo imediatamente)
              </option>
              <option value="Pendente" className="bg-white text-slate-900">
                Pendente (Não altera o saldo)
              </option>
              <option value="Processando" className="bg-white text-slate-900">
                Em Processamento (Não altera o saldo)
              </option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
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
                className="bg-slate-50 border border-slate-200 text-slate-900 font-mono px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-600 focus:bg-white placeholder:text-slate-400"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Data
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-900 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-600 focus:bg-white"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Descrição / Casa de Apostas
            </label>
            <input
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Ex: Depósito via Pix 1win / Saque 1win"
              required
              className="bg-slate-50 border border-slate-200 text-slate-900 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-600 focus:bg-white placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Observação (Opcional)
            </label>
            <input
              type="text"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Ex: Pix imediato"
              className="bg-slate-50 border border-slate-200 text-slate-900 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-600 focus:bg-white placeholder:text-slate-400"
            />
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">
                {isBonus ? 'Saldo Promocional após lançamento:' : 'Patrimônio Real após lançamento:'}
              </span>
              <span
                className={`font-mono font-bold text-sm ${
                  isBonus ? 'text-indigo-600' : 'text-emerald-600'
                }`}
              >
                {formatBRL(isBonus ? projectedPromoBalance : projectedRealEquity)}
              </span>
            </div>
            {status !== 'Compensado' && (
              <span className="text-[11px] text-amber-700 font-medium">
                Lançamentos com status {status} permanecem separados e não alteram o saldo efetivo até serem compensados.
              </span>
            )}
            {isBonus && status === 'Compensado' && (
              <span className="text-[11px] text-indigo-700 font-medium">
                Bônus Rollover é isolado no Saldo Promocional e não entra como depósito real.
              </span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs rounded-xl transition-all shadow-sm shadow-blue-600/20 active:scale-95"
            >
              Confirmar Lançamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
