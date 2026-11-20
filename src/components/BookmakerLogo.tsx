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
    bgClass: 'bg-[#027B5B] border border-white/10',
    imgClass: 'w-full h-full object-contain px-1.5 py-0.5'
  },
  Betano: {
    name: 'Betano',
    src: '/logos/betano.svg',
    shape: 'wide',
    bgClass: 'bg-white border border-white/10',
    imgClass: 'w-full h-full object-contain px-1.5 py-1'
  },
  Stake: {
    name: 'Stake',
    src: '/logos/stake.svg',
    shape: 'wide',
    bgClass: 'bg-[#142533] border border-white/10',
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
    bgClass: 'bg-[#FFB80C] border border-white/10',
    imgClass: 'w-full h-full object-contain px-1.5 py-0.5'
  },
  Superbet: {
    name: 'Superbet',
    src: '/logos/superbet.svg',
    shape: 'wide',
    bgClass: 'bg-white border border-white/10',
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
    bgClass: 'bg-white border border-white/10',
    imgClass: 'w-full h-full object-contain px-1.5 py-0.5'
  },
  EstrelaBet: {
    name: 'EstrelaBet',
    src: '/logos/estrelabet.png',
    shape: 'wide',
    bgClass: 'bg-[#0a1a3a] border border-white/10',
    imgClass: 'w-full h-full object-contain px-1.5 py-1'
  },
  Sportingbet: {
    name: 'Sportingbet',
    src: '/logos/sportingbet.svg',
    shape: 'wide',
    bgClass: 'bg-[#034c81] border border-white/10',
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
          className={`${heightCls} ${iconWidthCls} rounded-lg bg-slate-800 border border-white/10 text-[10px] font-bold text-slate-300 inline-flex items-center justify-center shrink-0 uppercase`}
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
        } text-white px-3 py-1.5 rounded-xl text-xs flex items-center justify-between gap-2 transition-colors min-h-[38px]`}
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
        <div className="absolute left-0 right-0 sm:min-w-[380px] top-full mt-1.5 z-40 bg-[#0e1422] border border-white/[0.12] rounded-2xl p-2.5 shadow-2xl shadow-black/80 max-h-72 overflow-y-auto">
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
                <span className="w-6 h-6 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400">
                  <span className="material-symbols-outlined text-[14px]">edit</span>
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
