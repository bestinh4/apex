import React, { useState, useRef, useEffect } from 'react';
import { BOOKMAKERS } from '../data/footballMarkets';

export interface BookmakerBrandInfo {
  name: string;
  src: string;
  shape: 'square' | 'circle' | 'wide';
  bgClass: string;
  imgClass: string;
}

export const BOOKMAKER_BRANDS: Record<string, BookmakerBrandInfo> = {
  '1win': {
    name: '1win',
    src: '/logos/1win.png',
    shape: 'square',
    bgClass: 'bg-transparent',
    imgClass: 'w-full h-full object-contain'
  },
  Bet365: {
    name: 'Bet365',
    src: '/logos/bet365.svg',
    shape: 'wide',
    bgClass: 'bg-[#027B5B] border border-emerald-900/15',
    imgClass: 'w-full h-full object-contain px-1.5 py-0.5'
  },
  Betano: {
    name: 'Betano',
    src: '/logos/betano.svg',
    shape: 'wide',
    bgClass: 'bg-white border border-slate-300',
    imgClass: 'w-full h-full object-contain px-1.5 py-1'
  },
  Stake: {
    name: 'Stake',
    src: '/logos/stake.svg',
    shape: 'wide',
    bgClass: 'bg-[#142533] border border-slate-900/20',
    imgClass: 'w-full h-full object-contain px-2 py-0.5'
  },
  Pinnacle: {
    name: 'Pinnacle',
    src: '/logos/pinnacle.png',
    shape: 'circle',
    bgClass: 'bg-transparent',
    imgClass: 'w-full h-full object-contain'
  },
  Betfair: {
    name: 'Betfair',
    src: '/logos/betfair.svg',
    shape: 'wide',
    bgClass: 'bg-[#FFB80C] border border-amber-600/35',
    imgClass: 'w-full h-full object-contain px-1.5 py-0.5'
  },
  Superbet: {
    name: 'Superbet',
    src: '/logos/superbet.svg',
    shape: 'wide',
    bgClass: 'bg-white border border-slate-300',
    imgClass: 'w-full h-full object-contain px-1.5 py-1'
  },
  Novibet: {
    name: 'Novibet',
    src: '/logos/novibet.png',
    shape: 'circle',
    bgClass: 'bg-transparent',
    imgClass: 'w-full h-full object-contain'
  },
  KTO: {
    name: 'KTO',
    src: '/logos/kto.svg',
    shape: 'wide',
    bgClass: 'bg-white border border-slate-300',
    imgClass: 'w-full h-full object-contain px-1.5 py-0.5'
  },
  EstrelaBet: {
    name: 'EstrelaBet',
    src: '/logos/estrelabet.png',
    shape: 'wide',
    bgClass: 'bg-[#0a1a3a] border border-blue-950/20',
    imgClass: 'w-full h-full object-contain px-1.5 py-1'
  },
  Sportingbet: {
    name: 'Sportingbet',
    src: '/logos/sportingbet.svg',
    shape: 'wide',
    bgClass: 'bg-[#034c81] border border-blue-950/20',
    imgClass: 'w-full h-full object-contain px-1.5 py-0.5'
  },
  '1xBet': {
    name: '1xBet',
    src: '/logos/1xbet.png',
    shape: 'square',
    bgClass: 'bg-transparent',
    imgClass: 'w-full h-full object-contain'
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
  size?: 'sm' | 'md' | 'lg';
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

  const heightCls = size === 'lg' ? 'h-8' : size === 'md' ? 'h-7' : 'h-6';
  const iconWidthCls = size === 'lg' ? 'w-8' : size === 'md' ? 'w-7' : 'w-6';
  const wideWidthCls = size === 'lg' ? 'w-20' : size === 'md' ? 'w-[70px]' : 'w-16';
  const radiusCls = brand?.shape === 'circle' ? 'rounded-full' : 'rounded-lg';

  return (
    <span className={`inline-flex items-center gap-2 min-w-0 ${className}`}>
      {brand && !imgError ? (
        <span
          className={`${heightCls} ${
            brand.shape === 'wide' ? wideWidthCls : iconWidthCls
          } ${brand.bgClass} ${radiusCls} overflow-hidden inline-flex items-center justify-center shrink-0 shadow-sm`}
          title={brand.name}
        >
          <img
            src={brand.src}
            alt={brand.name}
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
            className={brand.imgClass}
          />
        </span>
      ) : (
        <span
          className={`${heightCls} ${iconWidthCls} rounded-lg bg-slate-100 border border-slate-300 text-[10px] font-bold text-slate-800 inline-flex items-center justify-center shrink-0 uppercase`}
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
  const focusBorder = accent === 'emerald' ? 'border-emerald-700 ring-2 ring-emerald-700/15' : 'border-blue-600 ring-2 ring-blue-600/15';
  const activeItemCls =
    accent === 'emerald'
      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-semibold'
      : 'bg-blue-50 border-blue-500 text-blue-900 font-semibold';
  const checkIconCls = accent === 'emerald' ? 'text-emerald-700' : 'text-blue-700';

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full bg-slate-50 border ${
          isOpen ? focusBorder : 'border-slate-300 hover:border-slate-400'
        } text-slate-900 px-3 py-1.5 rounded-xl text-xs flex items-center justify-between gap-2 transition-colors min-h-[38px]`}
      >
        <BookmakerBadge
          bookmaker={activeLabel}
          size="sm"
          className="font-semibold text-slate-900"
        />
        <span
          className={`material-symbols-outlined text-[16px] text-slate-600 transition-transform shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          expand_more
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 sm:min-w-[380px] top-full mt-1.5 z-40 bg-white border border-slate-300 rounded-2xl p-2.5 shadow-[0_12px_28px_-4px_rgba(15,23,42,0.14),0_4px_10px_-2px_rgba(15,23,42,0.06)] max-h-72 overflow-y-auto">
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
                      : 'bg-slate-50 border-slate-300/80 text-slate-800 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <BookmakerBadge bookmaker={bk} size="sm" className="min-w-0" />
                  {isSelected && (
                    <span className={`material-symbols-outlined text-[14px] ${checkIconCls} shrink-0`}>
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
                  : 'bg-slate-50 border-slate-300/80 text-slate-800 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700">
                  <span className="material-symbols-outlined text-[14px]">edit</span>
                </span>
                <span>Outra casa...</span>
              </span>
              {value === 'Outra' && (
                <span className={`material-symbols-outlined text-[14px] ${checkIconCls}`}>
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
          className="mt-2 w-full bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-900 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/15 placeholder:text-slate-500"
        />
      )}
    </div>
  );
};
