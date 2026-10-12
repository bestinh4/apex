import React, { useState } from 'react';
import { useBankroll } from '../context/BankrollContext';

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

  const [bookmaker, setBookmaker] = useState('Betano');
  const [provider, setProvider] = useState('Pragmatic Play');
  const [game, setGame] = useState('Gates of Olympus');
  const [spinsCount, setSpinsCount] = useState('10');
  const [netProfit, setNetProfit] = useState('25.00');

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
    const profit = parseNum(netProfit);
    if (profit <= 0) return;

    const now = new Date();
    const formattedDate = `Hoje, ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    addFreeSpin({
      provider,
      game,
      bookmaker,
      spinsCount: parseInt(spinsCount, 10) || 10,
      netProfit: profit,
      date: formattedDate
    });

    onSuccessToast?.(`Retorno de R$ ${profit.toFixed(2)} adicionado à banca!`);
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
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">casino</span>
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-tight">Giros Grátis</h3>
              <p className="text-xs text-slate-400">Registrar lucro líquido de rodadas promocionais</p>
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
              className="bg-[#080c14] border border-white/[0.08] text-white px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="Betano">Betano</option>
              <option value="Bet365">Bet365</option>
              <option value="Stake">Stake</option>
              <option value="Betfair">Betfair</option>
              <option value="EstrelaBet">EstrelaBet</option>
              <option value="KTO">KTO</option>
              <option value="Superbet">Superbet</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Provedor
              </label>
              <input
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="Ex: Pragmatic Play"
                className="bg-[#080c14] border border-white/[0.08] text-white px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Qtd. Giros
              </label>
              <input
                type="number"
                value={spinsCount}
                onChange={(e) => setSpinsCount(e.target.value)}
                className="bg-[#080c14] border border-white/[0.08] text-white px-3.5 py-2.5 rounded-xl text-xs font-mono focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Jogo Promocional
            </label>
            <input
              type="text"
              value={game}
              onChange={(e) => setGame(e.target.value)}
              placeholder="Ex: Gates of Olympus"
              className="bg-[#080c14] border border-white/[0.08] text-white px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
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
              className="bg-[#080c14] border border-white/[0.08] text-emerald-400 font-mono px-3.5 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.05] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              Salvar e Creditar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
