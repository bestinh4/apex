import React, { useState, useRef, useEffect } from 'react';
import { BOOKMAKERS } from '../data/footballMarkets';

export interface BookmakerBrandInfo {
  name: string;
  src: string;
  isWide?: boolean;
  bgClass: string;
  imgClass: string;
}

export const BOOKMAKER_BRANDS: Record<string, BookmakerBrandInfo> = {
  '1win': {
    name: '1win',
    src: '/logos/1win.png',
    bgClass: 'bg-[#36475a]',
    imgClass: 'w-full h-full object-cover'
  },
  Bet365: {
    name: 'Bet365',
    src: '/logos/bet365.png',
    bgClass: 'bg-[#027B5B]',
    imgClass: 'w-full h-full object-cover'
  },
  Betano: {
    name: 'Betano',
    src: '/logos/betano.png',
    bgClass: 'bg-white',
    imgClass: 'w-full h-full object-contain p-0.5'
  },
  Stake: {
    name: 'Stake',
    src: '/logos/stake.svg',
    isWide: true,
    bgClass: 'bg-[#142533]',
    imgClass: 'w-full h-full object-contain px-1.5 py-0.5'
  },
  Pinnacle: {
    name: 'Pinnacle',
    src: '/logos/pinnacle.png',
    bgClass: 'bg-[#060f1e]',
    imgClass: 'w-full h-full object-cover'
  },
  Betfair: {
    name: 'Betfair',
    src: '/logos/betfair.png',
    isWide: true,
    bgClass: 'bg-[#FFB80C]',
    imgClass: 'w-full h-full object-contain px-1 py-0.5'
  },
  Superbet: {
    name: 'Superbet',
    src: '/logos/superbet.svg',
    isWide: true,
    bgClass: 'bg-white',
    imgClass: 'w-full h-full object-contain px-1 py-0.5'
  },
  Novibet: {
    name: 'Novibet',
    src: '/logos/novibet.png',
    bgClass: 'bg-[#1d222d]',
    imgClass: 'w-full h-full object-cover'
  },
  KTO: {
    name: 'KTO',
    src: '/logos/kto.png',
    bgClass: 'bg-white',
    imgClass: 'w-full h-full object-contain p-0.5'
  },
  EstrelaBet: {
    name: 'EstrelaBet',
    src: '/logos/estrelabet.png',
    isWide: true,
    bgClass: 'bg-[#0a1a3a]',
    imgClass: 'w-full h-full object-contain px-1 py-0.5'
  },
  Sportingbet: {
    name: 'Sportingbet',
    src: '/logos/sportingbet.png',
    bgClass: 'bg-[#034c81]',
    imgClass: 'w-full h-full object-cover'
  },
  '1xBet': {
    name: '1xBet',
    src: '/logos/1xbet.png',
    bgClass: 'bg-[#1d5a94]',
    imgClass: 'w-full h-full object-cover'
  }
};

export const getBookmakerBrand = (name?: string): BookmakerBrandInfo | null => {
  if (!name) return null;
  const clean = name.trim();
  if (BOOKMAKER_BRANDS[clean]) return BOOKMAKER_BRANDS[clean];
  const lower = clean.toLowerCase();
  const matchedKey = Object.keys(BOOKMAKER_BRANDS).find((k) => k.toLowerCase() === lower);
  return matchedKey ? BOOKMAKER_BRANDS[matchedKey] : null;
};

interface BookmakerBadgeProps {
  bookmaker?: string;
  showName?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const BookmakerBadge: React.FC<BookmakerBadgeProps> = ({
  bookmaker,
  showName = true,
  size = 'sm',
  className = ''
}) => {
  const [imgError, setImgError] = useState(false);
  const label = bookmaker?.trim() || 'Casa';
  const brand = getBookmakerBrand(label);

  const heightCls = size === 'md' ? 'h-6' : 'h-5';
  const iconWidthCls = size === 'md' ? 'w-6' : 'w-5';
  const wideWidthCls = size === 'md' ? 'w-14' : 'w-12';

  return (
    <span className={`inline-flex items-center gap-2 min-w-0 ${className}`}>
      {brand && !imgError ? (
        <span
          className={`${heightCls} ${
            brand.isWide ? wideWidthCls : iconWidthCls
          } ${brand.bgClass} rounded-md overflow-hidden inline-flex items-center justify-center shrink-0 border border-white/10 shadow-sm`}
          title={brand.name}
        >
          <img
            src={brand.src}
            alt={brand.name}
            loading="lazy"
            onError={() => setImgError(true)}
            className={brand.imgClass}
          />
        </span>
      ) : (
        <span
          className={`${heightCls} ${iconWidthCls} rounded-md bg-slate-800 border border-white/10 text-[9px] font-bold text-slate-300 inline-flex items-center justify-center shrink-0 uppercase`}
        >
          {label.slice(0, 2)}
        </span>
      )}
      {showName && (
        <span className="truncate">{label}</span>
      )}
    </span>
  );
};

interface BookmakerSelectorProps {
  value: string;
  onChange: (value: string) => void;
  allowCustom?: boolean;
  customValue?: string;
  onCustomChange?: (value: string) => void;
  accent?: 'blue' | 'emerald';
}

export const BookmakerSelector: React.FC<BookmakerSelectorProps> = ({
  value,
  onChange,
  allowCustom = false,
  customValue = '',
  onCustomChange,
  accent = 'blue'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  const activeLabel = value === 'Outra' ? customValue.trim() || 'Outra casa...' : value;
  const focusBorder = accent === 'emerald' ? 'border-emerald-500' : 'border-blue-500';
  const activeItemCls =
    accent === 'emerald'
      ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
      : 'bg-blue-600/20 border-blue-500/50 text-white';

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full bg-[#080c14] border ${
          isOpen ? focusBorder : 'border-white/[0.08] hover:border-white/20'
        } text-white px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 transition-colors`}
      >
        <BookmakerBadge
          bookmaker={activeLabel}
          size="sm"
          className="font-medium text-white"
        />
        <span
          className={`material-symbols-outlined text-[16px] text-slate-400 transition-transform shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          expand_more
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 sm:min-w-[300px] top-full mt-1.5 z-40 bg-[#0e1422] border border-white/[0.12] rounded-2xl p-2 shadow-2xl shadow-black/80 max-h-64 overflow-y-auto">
          <div className="grid grid-cols-2 gap-1.5">
            {BOOKMAKERS.map((bk) => {
              const isSelected = value === bk;
              return (
                <button
                  key={bk}
                  type="button"
                  onClick={() => {
                    onChange(bk);
                    setIsOpen(false);
                  }}
                  className={`px-2.5 py-2 rounded-xl text-xs font-medium flex items-center justify-between gap-1.5 border transition-all text-left ${
                    isSelected
                      ? activeItemCls
                      : 'bg-[#080c14] border-white/[0.05] text-slate-300 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <BookmakerBadge bookmaker={bk} size="sm" className="min-w-0" />
                  {isSelected && (
                    <span className="material-symbols-outlined text-[14px] text-emerald-400 shrink-0">
                      check
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {allowCustom && (
            <button
              type="button"
              onClick={() => {
                onChange('Outra');
                setIsOpen(false);
              }}
              className={`mt-1.5 w-full px-2.5 py-2 rounded-xl text-xs font-medium flex items-center justify-between border transition-all ${
                value === 'Outra'
                  ? activeItemCls
                  : 'bg-[#080c14] border-white/[0.05] text-slate-300 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400">
                  <span className="material-symbols-outlined text-[13px]">edit</span>
                </span>
                <span>Outra casa...</span>
              </span>
              {value === 'Outra' && (
                <span className="material-symbols-outlined text-[14px] text-emerald-400">
                  check
                </span>
              )}
            </button>
          )}
        </div>
      )}

      {allowCustom && value === 'Outra' && onCustomChange && (
        <input
          type="text"
          value={customValue}
          onChange={(e) => onCustomChange(e.target.value)}
          placeholder="Digite o nome da casa..."
          className="mt-2 w-full bg-[#080c14] border border-white/[0.08] text-white px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
        />
      )}
    </div>
  );
};
