import React, { useEffect, useMemo, useState } from 'react';
import {
  extractEventMatchup,
  getCachedTeamCrest,
  normalizeTeamName,
  resolveCanonicalTeamId,
  ResolvedTeamCrest,
  resolveTeamCrest
} from '../lib/teamCrestService';

function getTeamMonogram(name: string): string {
  const words = name
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0 && !/^(fc|cf|sc|ec|ac|fk|sk|sv|kv|de|da|do)$/i.test(w));

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return (words[0] || name || 'EQ').slice(0, 2).toUpperCase();
}

interface SingleCrestProps {
  teamName: string;
  crest?: ResolvedTeamCrest;
  size: 'xs' | 'sm' | 'md';
}

const SingleCrest: React.FC<SingleCrestProps> = ({ teamName, crest, size }) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [crest?.crestUrl]);

  const boxSize =
    size === 'md' ? 'w-9 h-9' : size === 'sm' ? 'w-7 h-7' : 'w-6 h-6';
  const imgPad = size === 'md' ? 'p-[3px]' : 'p-[2px]';
  const textSize = size === 'md' ? 'text-[11px]' : size === 'sm' ? 'text-[10px]' : 'text-[9px]';
  const url = !imgFailed ? crest?.crestUrl : null;
  const titleText = crest?.matchedName
    ? `${crest.matchedName}${crest.leagueHint ? ` (${crest.leagueHint})` : ''}`
    : teamName;

  if (url) {
    return (
      <span
        className={`${boxSize} ${imgPad} rounded-full bg-white border border-slate-300 inline-flex items-center justify-center shrink-0 overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.08)]`}
        title={titleText}
      >
        <img
          key={url}
          src={url}
          alt={titleText}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-contain drop-shadow-[0_1px_1px_rgba(15,23,42,0.16)]"
        />
      </span>
    );
  }

  return (
    <span
      className={`${boxSize} rounded-full bg-slate-100 border border-slate-300 inline-flex items-center justify-center shrink-0 ${textSize} font-bold text-slate-800 tracking-tighter select-none`}
      title={teamName}
    >
      {getTeamMonogram(teamName)}
    </span>
  );
};

interface MatchCrestsProps {
  event: string;
  sport?: string;
  size?: 'xs' | 'sm' | 'md';
  showLabels?: boolean;
  debounceMs?: number;
  maxScrollHeightClass?: string;
  className?: string;
}

function makeLegCrestKey(team: string, sport: string, ctx: string): string {
  const canonicalId = resolveCanonicalTeamId(team, sport, ctx);
  return `${canonicalId || team.trim().toLowerCase()}@@${ctx}`;
}

export const MatchCrests: React.FC<MatchCrestsProps> = ({
  event,
  sport = 'Futebol',
  size = 'sm',
  showLabels = false,
  debounceMs = 0,
  maxScrollHeightClass = 'max-h-[144px]',
  className = ''
}) => {
  const matchup = useMemo(() => extractEventMatchup(event), [event]);
  const legsSignature = useMemo(
    () => matchup.legs.map((l) => `${l.home}__${l.away}__${l.context}`).join('|'),
    [matchup.legs]
  );

  const [crests, setCrests] = useState<Record<string, ResolvedTeamCrest>>(() => {
    const initial: Record<string, ResolvedTeamCrest> = {};
    for (const leg of matchup.legs) {
      const ctx = leg.context || matchup.context;
      for (const t of [leg.home, leg.away]) {
        const cached = getCachedTeamCrest(t, sport, ctx);
        if (cached) initial[makeLegCrestKey(t, sport, ctx)] = cached;
      }
    }
    return initial;
  });

  useEffect(() => {
    if (matchup.legs.length === 0) {
      setCrests({});
      return;
    }

    let cancelled = false;
    const syncInitial: Record<string, ResolvedTeamCrest> = {};
    const toFetch: Array<{ team: string; ctx: string; stateKey: string }> = [];
    const seenKeys = new Set<string>();

    for (const leg of matchup.legs) {
      const ctx = leg.context || matchup.context;
      for (const t of [leg.home, leg.away]) {
        const stateKey = makeLegCrestKey(t, sport, ctx);
        if (seenKeys.has(stateKey)) continue;
        seenKeys.add(stateKey);

        const cached = getCachedTeamCrest(t, sport, ctx);
        if (cached) {
          syncInitial[stateKey] = cached;
        } else {
          toFetch.push({ team: t, ctx, stateKey });
        }
      }
    }

    if (Object.keys(syncInitial).length > 0) {
      setCrests((prev) => ({ ...prev, ...syncInitial }));
    }

    if (toFetch.length === 0) return;

    const timer = window.setTimeout(() => {
      Promise.all(
        toFetch.map(async (item) => ({
          stateKey: item.stateKey,
          resolved: await resolveTeamCrest(item.team, sport, item.ctx)
        }))
      ).then((results) => {
        if (cancelled) return;
        setCrests((prev) => {
          const next = { ...prev };
          for (const { stateKey, resolved } of results) {
            next[stateKey] = resolved;
          }
          return next;
        });
      });
    }, debounceMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [legsSignature, sport, matchup.context, matchup.legs, debounceMs]);

  if (matchup.legs.length === 0) return null;

  const getDisplayCrest = (team: string, ctx: string): ResolvedTeamCrest | undefined => {
    const syncCached = getCachedTeamCrest(team, sport, ctx);
    if (syncCached?.crestUrl) return syncCached;

    const exactKey = makeLegCrestKey(team, sport, ctx);
    if (crests[exactKey] !== undefined) return crests[exactKey];

    const norm = normalizeTeamName(team);
    const firstWord = norm.split(/\s+/)[0] || '';
    for (const [k, v] of Object.entries(crests)) {
      if (!v?.crestUrl) continue;
      const kId = (k.split('@@')[0] || '').replace(/-/g, ' ');
      if (kId.length < 4 || norm.length < 4) continue;
      const kFirstWord = kId.split(/\s+/)[0] || '';
      if (
        (norm.startsWith(kId) || kId.startsWith(norm)) &&
        (firstWord.startsWith(kFirstWord) || kFirstWord.startsWith(firstWord))
      ) {
        return v;
      }
    }
    return undefined;
  };

  const isMultiLegs = matchup.legs.length > 1;

  if (showLabels || isMultiLegs) {
    return (
      <div className={`flex flex-col gap-1.5 w-full ${className}`}>
        {isMultiLegs && (
          <div className="flex items-center justify-between text-[11px] px-0.5">
            <span className="font-bold text-blue-700 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] shrink-0">layers</span>
              <span>Múltipla · {matchup.legs.length} jogos</span>
            </span>
            {matchup.legs.length > 2 && (
              <span className="text-[10px] font-medium text-slate-600">Role para ver todos</span>
            )}
          </div>
        )}
        <div
          className={`flex flex-col gap-1.5 w-full ${
            isMultiLegs ? `${maxScrollHeightClass} overflow-y-auto overscroll-contain pr-1` : ''
          }`}
        >
          {matchup.legs.map((leg, idx) => {
            const ctx = leg.context || matchup.context;
            return (
              <div
                key={`${leg.home}-${leg.away}-${idx}`}
                className="rounded-xl bg-white border border-slate-300/80 px-2.5 py-2 flex flex-col gap-1 min-w-0 w-full shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
              >
                {isMultiLegs && leg.context && (
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-600 truncate">
                    <span className="font-mono font-semibold text-slate-600 shrink-0">#{idx + 1}</span>
                    <span className="truncate">{leg.context}</span>
                  </div>
                )}
                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 min-w-0 w-full">
                  <div className="flex items-center gap-2 min-w-0">
                    {isMultiLegs && !leg.context && (
                      <span className="text-[10px] font-mono font-semibold text-slate-600 shrink-0">
                        {idx + 1}.
                      </span>
                    )}
                    <SingleCrest
                      teamName={leg.home}
                      crest={getDisplayCrest(leg.home, ctx)}
                      size={size}
                    />
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      {leg.home}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-600 font-bold select-none px-0.5">
                    ×
                  </span>
                  <div className="flex items-center justify-end gap-2 min-w-0">
                    <span className="text-xs font-semibold text-slate-900 truncate text-right">
                      {leg.away}
                    </span>
                    <SingleCrest
                      teamName={leg.away}
                      crest={getDisplayCrest(leg.away, ctx)}
                      size={size}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const singleLeg = matchup.legs[0];
  const singleCtx = singleLeg.context || matchup.context;

  return (
    <span className={`inline-flex items-center shrink-0 gap-1.5 ${className}`}>
      <SingleCrest
        teamName={singleLeg.home}
        crest={getDisplayCrest(singleLeg.home, singleCtx)}
        size={size}
      />
      <span className="text-[10px] font-bold text-slate-600 select-none" aria-hidden="true">
        ×
      </span>
      <SingleCrest
        teamName={singleLeg.away}
        crest={getDisplayCrest(singleLeg.away, singleCtx)}
        size={size}
      />
    </span>
  );
};
