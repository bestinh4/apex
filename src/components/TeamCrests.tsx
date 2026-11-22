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
        className={`${boxSize} ${imgPad} rounded-full bg-white/[0.13] border border-white/20 inline-flex items-center justify-center shrink-0 overflow-hidden shadow-sm`}
        title={titleText}
      >
        <img
          src={url}
          alt={titleText}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
        />
      </span>
    );
  }

  return (
    <span
      className={`${boxSize} rounded-full bg-slate-800/95 border border-white/[0.16] inline-flex items-center justify-center shrink-0 ${textSize} font-bold text-slate-200 tracking-tighter select-none`}
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

  const getDisplayCrest = (team: string): ResolvedTeamCrest | undefined => {
    const syncCached = getCachedTeamCrest(team, sport, matchup.context);
    if (syncCached?.crestUrl) return syncCached;
    if (crests[team] !== undefined) return crests[team];
    const lower = team.trim().toLowerCase();
    const firstWord = lower.split(/\s+/)[0] || '';
    for (const [k, v] of Object.entries(crests)) {
      if (!v?.crestUrl) continue;
      const kLower = k.trim().toLowerCase();
      if (kLower.length < 4 || lower.length < 4) continue;
      const kFirstWord = kLower.split(/\s+/)[0] || '';
      if (
        (lower.startsWith(kLower) || kLower.startsWith(lower)) &&
        (firstWord.startsWith(kFirstWord) || kFirstWord.startsWith(firstWord))
      ) {
        return v;
      }
    }
    return undefined;
  };

  if (showLabels) {
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < matchup.teams.length; i += 2) {
      if (matchup.teams[i] && matchup.teams[i + 1]) {
        pairs.push([matchup.teams[i], matchup.teams[i + 1]]);
      }
    }
    return (
      <div className={`flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 w-full ${className}`}>
        {pairs.map(([home, away], idx) => (
          <div
            key={`${home}-${away}-${idx}`}
            className="flex items-center justify-between sm:justify-start gap-2 min-w-0 w-full sm:w-auto"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial">
              <SingleCrest teamName={home} crest={getDisplayCrest(home)} size={size} />
              <span className="text-xs font-semibold text-slate-100 truncate sm:max-w-[140px]">
                {home}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-bold shrink-0 px-0.5">×</span>
            <div className="flex items-center justify-end sm:justify-start gap-2 min-w-0 flex-1 sm:flex-initial">
              <span className="text-xs font-semibold text-slate-100 truncate text-right sm:text-left sm:max-w-[140px]">
                {away}
              </span>
              <SingleCrest teamName={away} crest={getDisplayCrest(away)} size={size} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center shrink-0 gap-1.5 ${className}`}>
      {matchup.teams.slice(0, 2).map((team, idx) => (
        <React.Fragment key={`${team}-${idx}`}>
          {idx === 1 && (
            <span className="text-[10px] font-bold text-slate-400 select-none" aria-hidden="true">
              ×
            </span>
          )}
          <SingleCrest teamName={team} crest={getDisplayCrest(team)} size={size} />
        </React.Fragment>
      ))}
    </span>
  );
};
