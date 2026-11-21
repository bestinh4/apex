import { POPULAR_COMPETITION_PRESETS } from './betLinkParser';

export interface ResolvedTeamCrest {
  queryName: string;
  matchedName: string;
  crestUrl: string | null;
  leagueHint?: string;
}

export interface ExtractedMatchup {
  teams: string[];
  context: string;
  isMultiple: boolean;
}

const FLAG_REGEX = /(?:\p{Regional_Indicator}{2}|🏴󠁧󠁢[a-z]+󠁿)/gu;

const KNOWN_LEAGUE_PREFIXES: string[] = Array.from(
  new Set([
    ...POPULAR_COMPETITION_PRESETS.map((p) =>
      p.value.replace(FLAG_REGEX, '').trim()
    ),
    'Jupiler Pro League',
    'Liga Jupiler',
    'Liga Futve',
    'Liga BetPlay',
    'LigaPro',
    'Liga Pro',
    'Copa Libertadores',
    'Copa Sudamericana',
    'Copa Sul-Americana',
    'Brasileirao Serie A',
    'Brasileirao Serie B',
    'Brasileirão',
    'Russian Premier League',
    'Premier Liga',
    'Austrian Bundesliga',
    'Admiral Bundesliga',
    'UEFA Champions League',
    'UEFA Europa League',
    'UEFA Conference League',
    'La Liga',
    'LaLiga',
    'LaLiga 2',
    'Serie A',
    'Serie B',
    'Bundesliga',
    '2. Bundesliga',
    'Ligue 1',
    'Ligue 2',
    'Premier League',
    'Championship',
    'League One',
    'League Two',
    'FA Cup',
    'Eredivisie',
    'Eerste Divisie',
    'Liga Portugal',
    'Primeira Liga',
    'Süper Lig',
    'Super Lig',
    'Super League',
    'Superliga',
    'Premiership',
    'Ekstraklasa',
    'Allsvenskan',
    'Eliteserien',
    'Chance Liga',
    'Liga MX',
    'Liga Profesional',
    'Copa Argentina',
    'División Profesional',
    'Liga 1',
    'MLS',
    'NBA',
    'WNBA',
    'NBB',
    'EuroLeague',
    'Saudi Pro League',
    'J-League',
    'K-League',
    'UFC',
    'eSports'
  ])
)
  .filter((s) => s.length >= 3)
  .sort((a, b) => b.length - a.length);

function stripLeadingLeaguePrefix(text: string): { rest: string; stripped: string } {
  let current = text.trim();
  const captured: string[] = [];

  for (let pass = 0; pass < 3; pass++) {
    let changed = false;

    const liveMatch = current.match(/^(?:ao\s+vivo|live)\b[\s\-–:]*/i);
    if (liveMatch) {
      captured.push(liveMatch[0].trim());
      current = current.slice(liveMatch[0].length).trim();
      changed = true;
    }

    const flagMatch = current.match(/^(?:\p{Regional_Indicator}{2}|🏴󠁧󠁢[a-z]+󠁿)+[\s\-–:]*/u);
    if (flagMatch) {
      captured.push(flagMatch[0].trim());
      current = current.slice(flagMatch[0].length).trim();
      changed = true;
    }

    const currentLower = current.toLowerCase();
    for (const league of KNOWN_LEAGUE_PREFIXES) {
      const leagueLower = league.toLowerCase();
      if (currentLower.startsWith(leagueLower + ' ') || currentLower.startsWith(leagueLower + '-')) {
        captured.push(current.slice(0, league.length).trim());
        current = current.slice(league.length).replace(/^[\s\-–:]+/, '').trim();
        changed = true;
        break;
      }
    }

    if (!changed) break;
  }

  return { rest: current, stripped: captured.join(' ').trim() };
}

function stripTrailingMarketHint(rawTeam: string): { team: string; trailing: string } {
  let text = rawTeam.trim();
  let trailing = '';

  const parenMatch = text.match(/\s*\(([^)]+)\)\s*$/);
  if (parenMatch) {
    trailing = `${trailing} ${parenMatch[1]}`.trim();
    text = text.slice(0, text.length - parenMatch[0].length).trim();
  }

  const marketStopMatch = text.match(
    /\s+(?:over\b|under\b|btts\b|ambas\b|ambos\b|mais\s+de\b|menos\s+de\b|total\s+de\b|handicap\b|h\.?\s*a\.?(?:\s|$)|ha\b|escanteios?\b|cantos?\b|cart[oõ]es\b|gols?\b|ht\b|ft\b|1x2\b|dupla\s+chance\b|dnb\b|empate\s+anula\b|[+-]\d+(?:[.,]\d+)?\b|@\s*\d)/i
  );
  if (marketStopMatch && marketStopMatch.index && marketStopMatch.index > 1) {
    trailing = `${trailing} ${text.slice(marketStopMatch.index)}`.trim();
    text = text.slice(0, marketStopMatch.index).trim();
  }

  text = text.replace(/[\s\-–|:·]+$/, '').trim();
  return { team: text, trailing };
}

export function extractEventMatchup(rawEvent: string): ExtractedMatchup {
  const input = (rawEvent || '').trim();
  if (!input) return { teams: [], context: '', isMultiple: false };

  const isMultiple = /^m[uú]ltipla\s*\(/i.test(input);
  const body = isMultiple
    ? input.replace(/^m[uú]ltipla\s*\(\d+x\)\s*:\s*/i, '').trim()
    : input;

  const segments = isMultiple ? body.split(/\s+\+\s+/) : [body];
  const teams: string[] = [];
  const contexts: string[] = [];

  for (const seg of segments) {
    const matchSep = seg.match(/^(.+?)\s+(?:x|vs\.?|v)\s+(.+)$/i);
    if (!matchSep) continue;

    let leftRaw = matchSep[1].trim();
    const rightRaw = matchSep[2].trim();

    // If there is a time delimiter like "- 13:45" or "13:45", everything before & including it is header context
    const timeHeaderMatch = leftRaw.match(/^(.+?)\s*(?:[-–]\s*)?\b\d{1,2}[:h]\d{2}\b\s+(.+)$/i);
    if (timeHeaderMatch) {
      contexts.push(timeHeaderMatch[1].trim());
      leftRaw = timeHeaderMatch[2].trim();
    }

    const { rest: cleanHome, stripped: extraCtx } = stripLeadingLeaguePrefix(leftRaw);
    if (extraCtx) contexts.push(extraCtx);

    const { team: cleanAway } = stripTrailingMarketHint(rightRaw);

    if (cleanHome.length >= 2 && cleanAway.length >= 2) {
      teams.push(cleanHome, cleanAway);
    }

    if (teams.length >= 4) break;
  }

  return {
    teams,
    context: contexts.join(' ').trim(),
    isMultiple
  };
}

const TEAM_QUERY_ALIASES: Array<[RegExp, string]> = [
  [/\bmoskow\b/gi, 'Moscow'],
  [/\bmoscou\b/gi, 'Moscow'],
  [/\bmunique\b/gi, 'Munich'],
  [/\bmil[aã]o\b/gi, 'Milan'],
  [/\bcol[oô]nia\b/gi, 'Koln'],
  [/\bmonchengladbach\b/gi, 'Borussia Monchengladbach'],
  [/\bpsg\b/gi, 'Paris Saint-Germain'],
  [/\bman\s*city\b/gi, 'Manchester City'],
  [/\bman\s*utd\b|\bman\s*united\b/gi, 'Manchester United'],
  [/\batl[eé]tico[-\s]*mg\b/gi, 'Atletico Mineiro'],
  [/\bathletico[-\s]*pr\b/gi, 'Athletico Paranaense'],
  [/\binter\s*milan\b/gi, 'Internazionale']
];

function buildSearchCandidates(teamName: string, context: string): string[] {
  const candidates: string[] = [];
  let normalized = teamName.trim();

  for (const [regex, replacement] of TEAM_QUERY_ALIASES) {
    normalized = normalized.replace(regex, replacement);
  }

  const ctxLower = context.toLowerCase();
  if (/^sporting$/i.test(normalized) && (ctxLower.includes('portugal') || context.includes('🇵🇹'))) {
    candidates.push('Sporting CP');
  }
  if (/^roma$/i.test(normalized)) {
    candidates.push('AS Roma');
  }
  if (/^inter$/i.test(normalized)) {
    candidates.push(context.includes('🇮🇹') || ctxLower.includes('serie a') ? 'Internazionale' : 'Internacional');
  }

  candidates.push(normalized);
  if (normalized !== teamName.trim()) {
    candidates.push(teamName.trim());
  }

  // Strip common suffixes like FC, CF, SC, EC, AC, FK, SK if needed
  const strippedSuffix = normalized
    .replace(/\b(?:fc|cf|ec|sc|ac|fk|sk|sv|kv|tsv|rb)\b\.?/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (strippedSuffix.length >= 3 && !candidates.includes(strippedSuffix)) {
    candidates.push(strippedSuffix);
  }

  return Array.from(new Set(candidates.filter((c) => c.length >= 2)));
}

function mapAppSportToEspn(sport?: string): string {
  const s = (sport || '').toLowerCase();
  if (s.includes('basquete')) return 'basketball';
  if (s.includes('hóquei') || s.includes('hoquei')) return 'hockey';
  if (s.includes('tênis') || s.includes('tenis')) return 'tennis';
  if (s.includes('mma')) return 'mma';
  return 'soccer';
}

const CONTEXT_LEAGUE_KEYWORDS: Array<{ test: RegExp; keywords: string[] }> = [
  { test: /🇧🇷|brasileir|paulist|carioca|copa\s*do\s*brasil|nbb/i, keywords: ['brazil', 'paulista', 'carioca', 'gaucho', 'mineiro', 'nordeste'] },
  { test: /🇻🇪|futve|venezuela/i, keywords: ['futve', 'venezuela'] },
  { test: /🇮🇹|serie\s*a|serie\s*b|italia|itália/i, keywords: ['serie a', 'serie b', 'italian', 'italy', 'coppa italia'] },
  { test: /🏴󠁧󠁢󠁥󠁮󠁧󠁿|premier\s*league|championship|inglaterra|england/i, keywords: ['premier league', 'english', 'efl', 'england'] },
  { test: /🇪🇸|laliga|la\s*liga|espanha|spain/i, keywords: ['laliga', 'spanish', 'spain', 'segunda'] },
  { test: /🇩🇪|bundesliga|alemanha|germany/i, keywords: ['german', 'bundesliga'] },
  { test: /🇦🇹|austria|áustria/i, keywords: ['austrian', 'austria'] },
  { test: /🇷🇺|russia|rússia/i, keywords: ['russian', 'russia'] },
  { test: /🇧🇪|jupiler|belg/i, keywords: ['belgian', 'belgium', 'jupiler'] },
  { test: /🇫🇷|ligue\s*1|ligue\s*2|fran[cç]a/i, keywords: ['ligue 1', 'ligue 2', 'french', 'france'] },
  { test: /🇵🇹|portugal|primeira\s*liga/i, keywords: ['portuguese', 'portugal'] },
  { test: /🇳🇱|eredivisie|holanda/i, keywords: ['eredivisie', 'dutch', 'netherlands'] },
  { test: /🇦🇷|argentina/i, keywords: ['argentin', 'lpf', 'primera'] },
  { test: /🇨🇴|betplay|col[oô]mbia/i, keywords: ['colombian', 'colombia'] },
  { test: /🇪🇨|ligapro|equador|ecuador/i, keywords: ['ecuador'] },
  { test: /🇲🇽|liga\s*mx|m[eé]xico/i, keywords: ['liga mx', 'mexican'] },
  { test: /🇺🇸|mls|nba|nfl|nhl/i, keywords: ['mls', 'nba', 'american', 'usa'] }
];

interface EspnTeamSearchItem {
  displayName?: string;
  subtitle?: string;
  description?: string;
  sport?: string;
  image?: { default?: string };
}

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function scoreEspnCandidate(
  item: EspnTeamSearchItem,
  queryName: string,
  expectedSport: string,
  context: string
): number {
  if (!item.image?.default) return -999;

  const display = normalizeText(item.displayName || '');
  const sub = normalizeText(item.subtitle || item.description || '');
  const target = normalizeText(queryName);
  const itemSport = (item.sport || '').toLowerCase();

  let score = 0;

  // Sport match
  if (itemSport === expectedSport) score += 60;
  else if (expectedSport === 'soccer' && itemSport !== 'soccer') score -= 40;

  // Penalize women/youth/reserves unless explicitly requested
  const targetAsksYouthOrWomen = /\b(women|feminin[oa]|u20|u21|u19|u18|u17|sub-?20|youth)\b/i.test(
    queryName
  );
  if (!targetAsksYouthOrWomen) {
    if (
      /\b(women|woman|feminino|feminina|wnt|wsl|nwsl|premi[eè]re\s*ligue)\b/i.test(
        `${display} ${sub}`
      )
    ) {
      score -= 85;
    }
    if (/\b(u20|u21|u19|u18|u17|youth|academy|reserves?)\b/i.test(`${display} ${sub}`)) {
      score -= 85;
    }
  }

  // Name match strength
  if (display === target) score += 45;
  else if (display.includes(target) || target.includes(display)) score += 25;

  // Context / country / league disambiguation
  for (const rule of CONTEXT_LEAGUE_KEYWORDS) {
    if (rule.test.test(context)) {
      if (rule.keywords.some((kw) => sub.includes(kw))) {
        score += 55;
      }
    }
  }

  // Prefer club teams over national teams unless context asks for international/world cup
  const isInternationalCtx = /🌍|copa\s*do\s*mundo|eliminat|eurocopa|nations\s*league|copa\s*am[eé]rica/i.test(
    context
  );
  if (!isInternationalCtx && (sub.includes('national') || sub.includes("men's soccer team"))) {
    score -= 20;
  }

  return score;
}

const CACHE_STORAGE_KEY = 'apex_team_crests_v1';
const HIT_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const MISS_TTL_MS = 6 * 60 * 60 * 1000;

interface CachedCrestEntry {
  matchedName: string;
  crestUrl: string | null;
  leagueHint?: string;
  ts: number;
}

const memoryCache = new Map<string, CachedCrestEntry>();
const inFlightRequests = new Map<string, Promise<ResolvedTeamCrest>>();
let storageLoaded = false;

function loadStorageCacheOnce(): void {
  if (storageLoaded || typeof window === 'undefined') return;
  storageLoaded = true;
  try {
    const raw = window.localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, CachedCrestEntry>;
    const now = Date.now();
    for (const [k, entry] of Object.entries(parsed)) {
      const ttl = entry.crestUrl ? HIT_TTL_MS : MISS_TTL_MS;
      if (entry && now - entry.ts < ttl) {
        memoryCache.set(k, entry);
      }
    }
  } catch {
    // ignore corrupted localStorage entries
  }
}

function persistStorageCache(): void {
  if (typeof window === 'undefined') return;
  try {
    const obj: Record<string, CachedCrestEntry> = {};
    let count = 0;
    for (const [k, v] of memoryCache.entries()) {
      obj[k] = v;
      count += 1;
      if (count >= 400) break;
    }
    window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // ignore storage quota exceeded
  }
}

function makeCacheKey(teamName: string, sport: string, context: string): string {
  const flagsOnly = (context.match(FLAG_REGEX) || []).join('');
  return `${normalizeText(teamName)}|${normalizeText(sport)}|${flagsOnly}`;
}

export function getCachedTeamCrest(
  teamName: string,
  sport = 'Futebol',
  context = ''
): ResolvedTeamCrest | null {
  loadStorageCacheOnce();
  const key = makeCacheKey(teamName, sport, context);
  const hit = memoryCache.get(key);
  if (!hit) return null;
  const ttl = hit.crestUrl ? HIT_TTL_MS : MISS_TTL_MS;
  if (Date.now() - hit.ts >= ttl) {
    memoryCache.delete(key);
    return null;
  }
  return {
    queryName: teamName,
    matchedName: hit.matchedName,
    crestUrl: hit.crestUrl,
    leagueHint: hit.leagueHint
  };
}

export async function resolveTeamCrest(
  teamName: string,
  sport = 'Futebol',
  context = ''
): Promise<ResolvedTeamCrest> {
  const cleanName = teamName.trim();
  if (!cleanName || cleanName.length < 2) {
    return { queryName: cleanName, matchedName: cleanName, crestUrl: null };
  }

  const cached = getCachedTeamCrest(cleanName, sport, context);
  if (cached) return cached;

  const key = makeCacheKey(cleanName, sport, context);
  const existingReq = inFlightRequests.get(key);
  if (existingReq) return existingReq;

  const promise = (async (): Promise<ResolvedTeamCrest> => {
    const expectedSport = mapAppSportToEspn(sport);
    const searchQueries = buildSearchCandidates(cleanName, context);

    let bestItem: EspnTeamSearchItem | null = null;
    let bestScore = -999;

    for (const q of searchQueries) {
      try {
        const url = `https://site.web.api.espn.com/apis/search/v2?query=${encodeURIComponent(
          q
        )}&limit=8&type=team`;
        const res = await fetch(url);
        if (!res.ok) continue;
        const json = (await res.json()) as {
          results?: Array<{ type?: string; contents?: EspnTeamSearchItem[] }>;
        };
        const contents =
          json.results?.find((r) => r.type === 'team')?.contents ||
          json.results?.[0]?.contents ||
          [];

        for (const item of contents) {
          const s = scoreEspnCandidate(item, q, expectedSport, context);
          if (s > bestScore) {
            bestScore = s;
            bestItem = item;
          }
        }

        if (bestItem?.image?.default && bestScore >= 40) {
          break;
        }
      } catch {
        // try next query variant
      }
    }

    const resolved: ResolvedTeamCrest =
      bestItem?.image?.default && bestScore > -10
        ? {
            queryName: cleanName,
            matchedName: bestItem.displayName || cleanName,
            crestUrl: bestItem.image.default,
            leagueHint: bestItem.subtitle || bestItem.description
          }
        : {
            queryName: cleanName,
            matchedName: cleanName,
            crestUrl: null
          };

    memoryCache.set(key, {
      matchedName: resolved.matchedName,
      crestUrl: resolved.crestUrl,
      leagueHint: resolved.leagueHint,
      ts: Date.now()
    });
    persistStorageCache();
    return resolved;
  })();

  inFlightRequests.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlightRequests.delete(key);
  }
}
