import React, { useEffect, useMemo, useState } from 'react';
import {
  extractEventMatchup,
  getCachedTeamCrest,
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
    size === 'md' ? 'w-7 h-7' : size === 'sm' ? 'w-6 h-6' : 'w-5 h-5';
  const imgPad = size === 'md' ? 'p-1' : 'p-0.5';
  const textSize = size === 'md' ? 'text-[10px]' : 'text-[8px]';
  const url = !imgFailed ? crest?.crestUrl : null;
  const titleText = crest?.matchedName
    ? `${crest.matchedName}${crest.leagueHint ? ` (${crest.leagueHint})` : ''}`
    : teamName;

  if (url) {
    return (
      <span
        className={`${boxSize} ${imgPad} rounded-full bg-white/[0.08] border border-white/[0.14] inline-flex items-center justify-center shrink-0 overflow-hidden shadow-xs`}
        title={titleText}
      >
        <img
          src={url}
          alt={titleText}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-contain"
        />
      </span>
    );
  }

  return (
    <span
      className={`${boxSize} rounded-full bg-slate-800/90 border border-white/[0.12] inline-flex items-center justify-center shrink-0 ${textSize} font-bold text-slate-300 tracking-tighter select-none`}
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
  className?: string;
}

export const MatchCrests: React.FC<MatchCrestsProps> = ({
  event,
  sport = 'Futebol',
  size = 'sm',
  showLabels = false,
  debounceMs = 0,
  className = ''
}) => {
  const matchup = useMemo(() => extractEventMatchup(event), [event]);
  const teamsKey = matchup.teams.join('|');

  const [crests, setCrests] = useState<Record<string, ResolvedTeamCrest>>(() => {
    const initial: Record<string, ResolvedTeamCrest> = {};
    for (const t of matchup.teams) {
      const cached = getCachedTeamCrest(t, sport, matchup.context);
      if (cached) initial[t] = cached;
    }
    return initial;
  });

  useEffect(() => {
    if (matchup.teams.length === 0) {
      setCrests({});
      return;
    }

    let cancelled = false;
    const syncInitial: Record<string, ResolvedTeamCrest> = {};
    const toFetch: string[] = [];

    for (const t of matchup.teams) {
      const cached = getCachedTeamCrest(t, sport, matchup.context);
      if (cached) {
        syncInitial[t] = cached;
      } else {
        toFetch.push(t);
      }
    }

    if (Object.keys(syncInitial).length > 0) {
      setCrests((prev) => ({ ...prev, ...syncInitial }));
    }

    if (toFetch.length === 0) return;

    const timer = window.setTimeout(() => {
      Promise.all(
        toFetch.map((t) => resolveTeamCrest(t, sport, matchup.context))
      ).then((resolvedList) => {
        if (cancelled) return;
        setCrests((prev) => {
          const next = { ...prev };
          for (const r of resolvedList) {
            next[r.queryName] = r;
          }
          return next;
        });
      });
    }, debounceMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [teamsKey, sport, matchup.context, matchup.teams, debounceMs]);

  if (matchup.teams.length === 0) return null;

  if (showLabels) {
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < matchup.teams.length; i += 2) {
      if (matchup.teams[i] && matchup.teams[i + 1]) {
        pairs.push([matchup.teams[i], matchup.teams[i + 1]]);
      }
    }
    return (
      <div className={`flex flex-wrap items-center gap-2.5 ${className}`}>
        {pairs.map(([home, away], idx) => (
          <div key={`${home}-${away}-${idx}`} className="inline-flex items-center gap-1.5 min-w-0">
            <SingleCrest teamName={home} crest={crests[home]} size={size} />
            <span className="text-[11px] font-medium text-slate-200 truncate max-w-[115px]">
              {home}
            </span>
            <span className="text-[10px] text-slate-500 font-semibold">×</span>
            <span className="text-[11px] font-medium text-slate-200 truncate max-w-[115px]">
              {away}
            </span>
            <SingleCrest teamName={away} crest={crests[away]} size={size} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center shrink-0 gap-1 ${className}`}>
      {matchup.teams.slice(0, 2).map((team, idx) => (
        <React.Fragment key={`${team}-${idx}`}>
          {idx === 1 && (
            <span className="text-[9px] font-bold text-slate-500 select-none" aria-hidden="true">
              ×
            </span>
          )}
          <SingleCrest teamName={team} crest={crests[team]} size={size} />
        </React.Fragment>
      ))}
    </span>
  );
};
