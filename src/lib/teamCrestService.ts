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
  [/\butd\b\.?/gi, 'United'],
  [/\bwolves\b/gi, 'Wolverhampton Wanderers'],
  [/\bnott['’]?m\b/gi, 'Nottingham'],
  [/\blp\b/gi, 'La Plata'],
  [/\bst\.?\s*pauli\b/gi, 'St. Pauli'],
  [/\bjunior\s+barranquilla\b/gi, 'Atletico Junior'],
  [/\bnacional\s+montevideo\b/gi, 'Nacional'],
  [/\bnewells\s+old\s+boys\b/gi, "Newell's Old Boys"],
  [/\bmoskow\b/gi, 'Moscow'],
  [/\bmoscou\b/gi, 'Moscow'],
  [/\bmunique\b/gi, 'Munich'],
  [/\bbayern\s+(?:de\s+)?munique\b/gi, 'Bayern Munich'],
  [/\bmil[aã]o\b/gi, 'Milan'],
  [/\binter\s+(?:de\s+)?mil[aã]o\b/gi, 'Internazionale'],
  [/\binter\s*milan\b/gi, 'Internazionale'],
  [/\binternacional\s+de\s+porto\s+alegre\b/gi, 'Internacional'],
  [/\bsporting\s+(?:de\s+portugal|lisboa|lisbon)\b/gi, 'Sporting CP'],
  [/\bsporting\s+braga\b|\bsc\s+braga\b/gi, 'Braga'],
  [/\bolympique\s+(?:de\s+)?marseille\b|\bolympique\s+marselha\b/gi, 'Marseille'],
  [/\bolympique\s+lyonnais\b|\bolympique\s+lyon\b/gi, 'Lyon'],
  [/\bred\s*bull\s+salzburg\b|\brb\s+salzburg\b/gi, 'Salzburg'],
  [/\broyal\s+antwerp\b/gi, 'Antwerp'],
  [/\bestrela\s+(?:da\s+)?amadora\b/gi, 'Estrela'],
  [/\bestrela\s+vermelha\b/gi, 'Red Star Belgrade'],
  [/\bd[ií]namo\s+(?:de\s+)?kiev\b/gi, 'Dynamo Kyiv'],
  [/\bzenit\s+(?:saint\s+petersburg|s[aã]o\s+petersburgo)\b/gi, 'Zenit'],
  [/\bcol[oô]nia\b|\bk[oö]ln\b/gi, 'Cologne'],
  [/\bmonchengladbach\b|\bm['’]?gladbach\b/gi, 'Borussia Monchengladbach'],
  [/\bpsg\b|\bparis\s+sg\b/gi, 'Paris Saint-Germain'],
  [/\bman\s*city\b/gi, 'Manchester City'],
  [/\bman\s*united\b/gi, 'Manchester United'],
  [/\batl[eé]tico[-\s]*mg\b|\bca\s+mineiro\b/gi, 'Atletico Mineiro'],
  [/\bathletico[-\s]*pr\b|\batl[eé]tico[-\s]*pr\b/gi, 'Athletico Paranaense'],
  [/\batl[eé]tico[-\s]*go\b|\batl[eé]tico\s+clube\s+goianiense\b/gi, 'Atletico Goianiense'],
  [/\bam[eé]rica[-\s]*mg\b/gi, 'America Mineiro'],
  [/\brb\s+bragantino\b/gi, 'Red Bull Bragantino'],
  [/\bloko\s+moscow\b/gi, 'Lokomotiv Moscow']
];

const CLUB_ACRONYM_REGEX =
  /\b(?:fc|cf|ec|sc|ac|cr|se|ca|ce|aa|ad|sd|cd|ud|rc|rcd|as|us|ss|ssc|sl|ogc|krc|kaa|rsc|pfc|bfc|afc|fsv|tsg|vfb|vfl|rb|nk|gnk|hnk|sk|fk|sv|kv|jk|bk|ik|if|fbpa|fr|bc|sfc|gfc|cfc|lfc|mufc|thfc|whufc|bha|om|ol|hsc|sco|aj|losc|alsace)\b\.?/gi;

const CLUB_BOILERPLATE_REGEX =
  /\b(?:clube|club|esporte|sociedade|esportiva|regatas|athletic|balompi[eé]|f[uú]tbol|football|calcio|association|royale|royal|deportivo|stade)\b/gi;

const CLUB_NUMBER_REGEX = /(?:^|\s)(?:1\.|0[4579]|9[68]|1[89]\d{2}|20[0-2]\d)(?=\s|$)/g;

const CONNECTOR_WORDS = new Set([
  'de',
  'da',
  'do',
  'dos',
  'das',
  'del',
  'la',
  'el',
  'le',
  'les',
  'y',
  'e',
  'van',
  'der'
]);

function stripClubDecorations(raw: string, stripBoilerplate = false): string {
  let out = raw
    .replace(CLUB_NUMBER_REGEX, ' ')
    .replace(CLUB_ACRONYM_REGEX, ' ');
  if (stripBoilerplate) {
    out = out.replace(CLUB_BOILERPLATE_REGEX, ' ');
  }
  return out
    .replace(/\s*-\s*(?:mg|sp|rj|rs|pr|ba|pe|ce|go|df|sc)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function stripAccentChars(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function buildSearchCandidates(teamName: string, context: string): string[] {
  const candidates: string[] = [];
  const push = (val?: string) => {
    const clean = (val || '').replace(/\s{2,}/g, ' ').trim();
    if (clean.length >= 2 && !candidates.includes(clean)) {
      candidates.push(clean);
    }
  };

  const original = teamName.trim();
  let aliased = original;
  for (const [regex, replacement] of TEAM_QUERY_ALIASES) {
    aliased = aliased.replace(regex, replacement);
  }

  const ctxLower = context.toLowerCase();
  if (/^sporting$/i.test(aliased) && (ctxLower.includes('portugal') || context.includes('🇵🇹'))) {
    push('Sporting CP');
  }
  if (/^roma$/i.test(aliased)) {
    push('AS Roma');
  }
  if (/^inter$/i.test(aliased)) {
    push(context.includes('🇮🇹') || ctxLower.includes('serie a') ? 'Internazionale' : 'Internacional');
  }

  // 1. Aliased & original full query
  push(aliased);
  push(original);

  // 2. Strip acronyms & foundation numbers (e.g., "1. FSV Mainz 05" -> "Mainz", "CR Flamengo" -> "Flamengo")
  const noAcronymsAliased = stripClubDecorations(aliased, false);
  const noAcronymsOrig = stripClubDecorations(original, false);
  push(noAcronymsAliased);
  push(noAcronymsOrig);

  // 3. Strip club boilerplate words too ("Sport Club do Recife" -> "Sport do Recife" -> "Sport Recife")
  const noBoilerplate = stripClubDecorations(aliased, true);
  push(noBoilerplate);
  const noConnectors = noBoilerplate
    .split(/\s+/)
    .filter((w) => !CONNECTOR_WORDS.has(w.toLowerCase()))
    .join(' ');
  push(noConnectors);

  // 4. Strip trailing geographic qualifier like "de Avellaneda", "de Fútbol", "Paulista", "de Porto Alegre"
  const withoutTrailingDe = noAcronymsAliased
    .replace(/\s+(?:de|da|do|del)\s+.+$/i, '')
    .trim();
  push(withoutTrailingDe);
  const withoutTrailingQualifier = noConnectors
    .replace(/\s+(?:paulista|mineiro|carioca|gaucho|ga[uú]cho|rotterdam|avellaneda)\b$/i, '')
    .trim();
  push(withoutTrailingQualifier);

  // 5. Accent-free versions for queries that fail on ESPN's strict diacritic search
  for (const base of [aliased, noAcronymsAliased, noConnectors]) {
    const plain = stripAccentChars(base);
    if (plain !== base) push(plain);
  }

  // 6. Progressive prefix reduction on multi-word names (3+ words -> first 2 words, then first 1 word >= 4 chars)
  const coreWords = noConnectors.split(/\s+/).filter((w) => w.length >= 2);
  if (coreWords.length >= 3) {
    push(coreWords.slice(0, 2).join(' '));
    push(stripAccentChars(coreWords.slice(0, 2).join(' ')));
  }
  if (coreWords.length >= 2) {
    const first = coreWords[0];
    const second = coreWords[1];
    // Try dropping generic leading word ("Real Sociedad" already above; e.g. "Club Athletico Paranaense" -> "Athletico Paranaense")
    if (coreWords.length >= 2 && /^(?:real|atl[eé]tico|sporting|olympique|deportivo|uni[oó]n)$/i.test(first) && second.length >= 4) {
      push(coreWords.slice(1).join(' '));
    }
    if (first.length >= 4 && !/^(?:real|club|sport|inter|atl[eé]tico|olympique|city|united)$/i.test(first)) {
      push(first);
    }
  }

  return candidates.slice(0, 10);
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
  queryUsed: string,
  originalTeamName: string,
  expectedSport: string,
  context: string
): number {
  if (!item.image?.default) return -999;

  const display = normalizeText(item.displayName || '');
  const sub = normalizeText(item.subtitle || item.description || '');
  const target = normalizeText(queryUsed);
  const origTarget = normalizeText(stripClubDecorations(originalTeamName, true) || originalTeamName);
  const itemSport = (item.sport || '').toLowerCase();

  let score = 0;

  // Sport match
  if (itemSport === expectedSport) {
    score += 55;
  } else {
    const hasExplicitFootballCtx =
      /🇧🇷|🇻🇪|🇮🇹|🏴󠁧󠁢󠁥󠁮󠁧󠁿|🇪🇸|🇩🇪|🇦🇹|🇷🇺|🇧🇪|🇫🇷|🇵🇹|🇳🇱|brasileir|premier\s*league|laliga|bundesliga|ligue\s*1|champions/i.test(
        context
      );
    if (expectedSport !== 'soccer') {
      score -= 75;
    } else if (hasExplicitFootballCtx) {
      score -= 25;
    }
  }

  // Penalize women/youth/reserves unless explicitly requested
  const targetAsksYouthOrWomen = /\b(women|feminin[oa]|u20|u21|u19|u18|u17|sub-?20|youth)\b/i.test(
    originalTeamName
  );
  if (!targetAsksYouthOrWomen) {
    if (
      /\b(women|woman|feminino|feminina|femenil|femenino|femminile|frauen|vrouwen|damen|kvinne|kvinner|ladies|wnt|wsl|nwsl|liga\s*f|copa\s*de\s*la\s*reina|premi[eè]re\s*ligue|f[eé]minine|dames|damallsvenskan)\b/i.test(
        `${display} ${sub}`
      )
    ) {
      score -= 95;
    }
    if (/\b(u20|u21|u19|u18|u17|s20|youth|academy|reserves?|jong)\b/i.test(`${display} ${sub}`)) {
      score -= 90;
    }
    if (/\b(?:ii|iii|b)\b/.test(display) && !/\b(?:ii|iii|b)\b/i.test(originalTeamName)) {
      score -= 60;
    }
  }

  // Name match strength against both the active query and the cleaned original name
  if (display === origTarget || display === target) {
    score += 70;
  } else if (
    display.includes(origTarget) ||
    origTarget.includes(display) ||
    display.includes(target) ||
    target.includes(display)
  ) {
    score += 30;
  } else {
    const origTokens = origTarget.split(/\s+/).filter((t) => t.length >= 3);
    const matchedTokens = origTokens.filter((t) => display.includes(t));
    if (matchedTokens.length > 0) {
      score += Math.min(40, matchedTokens.length * 20);
    } else {
      score -= 20;
    }
  }

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
    score -= 25;
  }

  return score;
}

const VERIFIED_CLUB_ENTRIES: Array<[string[], string, number, string]> = [
  // Premier League / Championship
  [['newcastle', 'newcastle united', 'newcastle utd', 'newcastl'], 'Newcastle United', 361, 'Premier League'],
  [['arsenal'], 'Arsenal', 359, 'Premier League'],
  [['liverpool'], 'Liverpool', 364, 'Premier League'],
  [['manchester city', 'man city'], 'Manchester City', 382, 'Premier League'],
  [['manchester united', 'man united', 'man utd'], 'Manchester United', 360, 'Premier League'],
  [['chelsea'], 'Chelsea', 363, 'Premier League'],
  [['tottenham', 'tottenham hotspur', 'spurs'], 'Tottenham Hotspur', 367, 'Premier League'],
  [['aston villa'], 'Aston Villa', 362, 'Premier League'],
  [['west ham', 'west ham united', 'west ham utd'], 'West Ham United', 371, 'EFL Championship'],
  [['brighton', 'brighton & hove albion', 'brighton and hove albion'], 'Brighton & Hove Albion', 331, 'Premier League'],
  [['crystal palace'], 'Crystal Palace', 384, 'Premier League'],
  [['bournemouth', 'afc bournemouth'], 'AFC Bournemouth', 349, 'Premier League'],
  [['fulham'], 'Fulham', 370, 'Premier League'],
  [['brentford'], 'Brentford', 337, 'Premier League'],
  [['everton'], 'Everton', 368, 'Premier League'],
  [['nottingham', 'nottingham forest', 'nottm forest'], 'Nottingham Forest', 393, 'Premier League'],
  [['wolverhampton', 'wolverhampton wanderers', 'wolves'], 'Wolverhampton Wanderers', 380, 'EFL Championship'],
  [['leicester', 'leicester city'], 'Leicester City', 375, 'English FA Cup'],
  [['ipswich', 'ipswich town'], 'Ipswich Town', 373, 'Premier League'],
  [['southampton'], 'Southampton', 376, 'EFL Championship'],
  [['leeds', 'leeds united', 'leeds utd'], 'Leeds United', 357, 'Premier League'],
  [['sheffield united', 'sheffield utd'], 'Sheffield United', 398, 'EFL Championship'],
  [['burnley'], 'Burnley', 379, 'EFL Championship'],
  [['sunderland'], 'Sunderland', 366, 'Premier League'],

  // Brasileirão
  [['flamengo', 'cr flamengo'], 'Flamengo', 819, 'Brazil Serie A'],
  [['palmeiras', 'se palmeiras'], 'Palmeiras', 2029, 'Brazil Serie A'],
  [['botafogo', 'botafogo fr'], 'Botafogo', 6086, 'Brazil Serie A'],
  [['atletico mineiro', 'atletico-mg', 'atletico mg', 'ca mineiro'], 'Atlético-MG', 7632, 'Brazil Serie A'],
  [['internacional', 'sc internacional', 'internacional de porto alegre'], 'Internacional', 1936, 'Brazil Serie A'],
  [['sao paulo', 'sao paulo fc'], 'São Paulo', 2026, 'Brazil Serie A'],
  [['cruzeiro'], 'Cruzeiro', 2022, 'Brazil Serie A'],
  [['bahia', 'ec bahia'], 'Bahia', 9967, 'Brazil Serie A'],
  [['fortaleza', 'fortaleza ec'], 'Fortaleza', 6272, 'Brazil Serie B'],
  [['corinthians', 'sc corinthians', 'sc corinthians paulista', 'corinthians paulista'], 'Corinthians', 874, 'Brazil Serie A'],
  [['gremio', 'gremio fbpa'], 'Grêmio', 6273, 'Brazil Serie A'],
  [['fluminense'], 'Fluminense', 3445, 'Brazil Serie A'],
  [['vasco', 'vasco da gama'], 'Vasco da Gama', 3454, 'Brazil Serie A'],
  [['athletico paranaense', 'athletico-pr', 'atletico-pr', 'atletico paranaense', 'club athletico paranaense'], 'Athletico Paranaense', 3458, 'Brazil Serie A'],
  [['bragantino', 'red bull bragantino', 'rb bragantino'], 'Red Bull Bragantino', 6079, 'Brazil Serie A'],
  [['vitoria', 'ec vitoria'], 'Vitória', 3457, 'Brazil Serie A'],
  [['juventude'], 'Juventude', 6270, 'Brazil Serie B'],
  [['criciuma'], 'Criciúma', 9971, 'Brazil Serie B'],
  [['cuiaba'], 'Cuiabá', 17313, 'Brazil Serie B'],
  [['atletico goianiense', 'atletico-go', 'atletico go', 'atletico clube goianiense'], 'Atlético Goianiense', 10357, 'Brazil Serie B'],
  [['sport recife', 'sport club do recife'], 'Sport', 7635, 'Brazil Serie B'],
  [['ceara', 'ceara sc'], 'Ceará', 9969, 'Brazil Serie B'],
  [['santos', 'santos fc'], 'Santos', 2674, 'Brazil Serie A'],
  [['mirassol'], 'Mirassol', 9169, 'Brazil Serie A'],

  // LaLiga
  [['real madrid', 'real madrid cf'], 'Real Madrid', 86, 'LALIGA'],
  [['barcelona', 'fc barcelona'], 'Barcelona', 83, 'LALIGA'],
  [['atletico madrid', 'atletico de madrid'], 'Atlético de Madrid', 1068, 'LALIGA'],
  [['athletic bilbao', 'athletic club'], 'Athletic Club', 93, 'LALIGA'],
  [['real sociedad', 'real sociedad de futbol'], 'Real Sociedad', 89, 'LALIGA'],
  [['villarreal', 'villarreal cf'], 'Villarreal', 102, 'LALIGA'],
  [['real betis', 'betis', 'real betis balompie'], 'Real Betis', 244, 'LALIGA'],
  [['sevilla', 'sevilla fc'], 'Sevilla', 243, 'LALIGA'],
  [['valencia', 'valencia cf'], 'Valencia', 94, 'LALIGA'],
  [['girona', 'girona fc'], 'Girona', 9812, 'LALIGA 2'],
  [['celta vigo', 'celta de vigo', 'rc celta de vigo'], 'Celta Vigo', 85, 'LALIGA'],
  [['osasuna', 'ca osasuna'], 'Osasuna', 97, 'LALIGA'],
  [['mallorca', 'rcd mallorca'], 'Mallorca', 84, 'LALIGA'],
  [['espanyol', 'rcd espanyol'], 'Espanyol', 88, 'LALIGA'],
  [['rayo vallecano'], 'Rayo Vallecano', 101, 'LALIGA'],
  [['getafe', 'getafe cf'], 'Getafe', 2922, 'LALIGA'],
  [['alaves', 'deportivo alaves'], 'Alavés', 96, 'LALIGA'],
  [['las palmas', 'ud las palmas'], 'Las Palmas', 98, 'LALIGA 2'],

  // Serie A
  [['inter milan', 'inter de milao', 'internazionale', 'internazionale milano'], 'Internazionale', 110, 'Serie A'],
  [['ac milan', 'milan'], 'AC Milan', 103, 'Serie A'],
  [['juventus'], 'Juventus', 111, 'Serie A'],
  [['napoli', 'ssc napoli'], 'Napoli', 114, 'Serie A'],
  [['roma', 'as roma'], 'AS Roma', 104, 'Serie A'],
  [['atalanta', 'atalanta bc'], 'Atalanta', 105, 'Serie A'],
  [['lazio', 'ss lazio'], 'Lazio', 112, 'Serie A'],
  [['fiorentina', 'acf fiorentina'], 'Fiorentina', 109, 'Serie A'],
  [['bologna', 'bologna fc 1909'], 'Bologna', 107, 'Serie A'],
  [['torino', 'torino fc'], 'Torino', 239, 'Serie A'],
  [['parma', 'parma calcio 1913'], 'Parma', 115, 'Serie A'],
  [['como', 'como 1907'], 'Como', 2572, 'Serie A'],
  [['udinese'], 'Udinese', 118, 'Serie A'],

  // Bundesliga
  [['bayern munich', 'bayern munchen', 'bayern de munique', 'fc bayern munich', 'bayern'], 'Bayern München', 132, 'Bundesliga'],
  [['borussia dortmund', 'dortmund', 'bvb'], 'Borussia Dortmund', 124, 'Bundesliga'],
  [['bayer leverkusen', 'bayer 04 leverkusen', 'leverkusen'], 'Bayer Leverkusen', 131, 'Bundesliga'],
  [['rb leipzig'], 'RB Leipzig', 11420, 'Bundesliga'],
  [['eintracht frankfurt', 'frankfurt'], 'Eintracht Frankfurt', 125, 'Bundesliga'],
  [['stuttgart', 'vfb stuttgart'], 'VfB Stuttgart', 134, 'Bundesliga'],
  [['freiburg', 'sc freiburg'], 'SC Freiburg', 126, 'Bundesliga'],
  [['monchengladbach', 'borussia monchengladbach'], 'Borussia Mönchengladbach', 268, 'Bundesliga'],
  [['wolfsburg', 'vfl wolfsburg'], 'VfL Wolfsburg', 138, 'Bundesliga'],
  [['mainz', 'mainz 05', '1 fsv mainz 05'], 'Mainz', 2950, 'Bundesliga'],
  [['hoffenheim', 'tsg hoffenheim', 'tsg 1899 hoffenheim'], 'TSG Hoffenheim', 7911, 'Bundesliga'],
  [['werder bremen', 'sv werder bremen'], 'Werder Bremen', 137, 'Bundesliga'],
  [['union berlin', '1 fc union berlin'], '1. FC Union Berlin', 598, 'Bundesliga'],
  [['st pauli', 'fc st pauli'], 'St. Pauli', 270, '2. Bundesliga'],
  [['augsburg', 'fc augsburg'], 'FC Augsburg', 3841, 'Bundesliga'],
  [['heidenheim', '1 fc heidenheim', '1 fc heidenheim 1846'], '1. FC Heidenheim 1846', 6418, '2. Bundesliga'],
  [['bochum', 'vfl bochum'], 'VfL Bochum', 121, '2. Bundesliga'],
  [['koln', 'fc koln', '1 fc koln', 'cologne', 'fc cologne', 'colonia'], 'FC Cologne', 122, 'Bundesliga'],
  [['holstein kiel'], 'Holstein Kiel', 7884, '2. Bundesliga'],

  // Ligue 1, Portugal, Netherlands, Argentina
  [['psg', 'paris saint-germain', 'paris saint germain'], 'Paris Saint-Germain', 160, 'Ligue 1'],
  [['marseille', 'olympique de marseille', 'olympique marseille'], 'Marseille', 176, 'Ligue 1'],
  [['lyon', 'olympique lyonnais', 'olympique lyon'], 'Lyon', 167, 'Ligue 1'],
  [['monaco', 'as monaco'], 'AS Monaco', 174, 'Ligue 1'],
  [['lille', 'losc lille'], 'Lille', 166, 'Ligue 1'],
  [['nice', 'ogc nice'], 'Nice', 2502, 'Ligue 1'],
  [['lens', 'rc lens'], 'Lens', 175, 'Ligue 1'],
  [['strasbourg', 'rc strasbourg', 'rc strasbourg alsace'], 'Strasbourg', 180, 'Ligue 1'],
  [['rennes', 'stade rennais'], 'Stade Rennais', 169, 'Ligue 1'],
  [['brest', 'stade brestois', 'stade brestois 29'], 'Brest', 6997, 'Ligue 1'],
  [['nantes', 'fc nantes'], 'Nantes', 165, 'Ligue 1'],
  [['toulouse', 'toulouse fc'], 'Toulouse', 179, 'Ligue 1'],
  [['auxerre', 'aj auxerre'], 'AJ Auxerre', 172, 'Ligue 1'],
  [['saint-etienne', 'saint etienne', 'st etienne', 'st-etienne', 'as saint-etienne'], 'Saint-Étienne', 178, 'Ligue 1'],
  [['reims', 'stade de reims'], 'Stade de Reims', 3243, 'Ligue 1'],
  [['le havre', 'le havre ac'], 'Le Havre AC', 3236, 'Ligue 1'],
  [['benfica', 'sl benfica'], 'Benfica', 1929, 'Portuguese Liga'],
  [['porto', 'fc porto'], 'FC Porto', 437, 'Portuguese Liga'],
  [['sporting cp', 'sporting de portugal', 'sporting lisbon'], 'Sporting CP', 2250, 'Portuguese Liga'],
  [['braga', 'sporting braga', 'sc braga'], 'Braga', 2994, 'Portuguese Liga'],
  [['vitoria de guimaraes', 'vitoria guimaraes', 'vitoria sc'], 'Vitória de Guimaraes', 5309, 'Portuguese Liga'],
  [['ajax', 'afc ajax', 'ajax amsterdam'], 'Ajax Amsterdam', 139, 'Eredivisie'],
  [['psv', 'psv eindhoven'], 'PSV Eindhoven', 148, 'Eredivisie'],
  [['feyenoord', 'feyenoord rotterdam'], 'Feyenoord Rotterdam', 142, 'Eredivisie'],
  [['az alkmaar', 'az'], 'AZ Alkmaar', 140, 'Eredivisie'],
  [['river plate'], 'River Plate', 16, 'Argentine LPF'],
  [['boca juniors'], 'Boca Juniors', 5, 'Argentine LPF'],
  [['racing club', 'racing club de avellaneda'], 'Racing Club', 15, 'Argentine LPF'],
  [['independiente', 'ca independiente'], 'Independiente', 11, 'Argentine LPF'],
  [['estudiantes', 'estudiantes lp', 'estudiantes de la plata'], 'Estudiantes de La Plata', 8, 'Argentine LPF'],
  [['gimnasia', 'gimnasia lp', 'gimnasia la plata'], 'Gimnasia La Plata', 9, 'Argentine LPF'],
  [['nacional montevideo'], 'Nacional', 2684, 'Liga AUF Uruguaya'],
  [['penarol'], 'Peñarol', 2683, 'Liga AUF Uruguaya']
];

const VERIFIED_CLUB_MAP = new Map<string, { matchedName: string; crestUrl: string; leagueHint: string }>();
for (const [aliases, matchedName, espnId, leagueHint] of VERIFIED_CLUB_ENTRIES) {
  const crestUrl = `https://a.espncdn.com/i/teamlogos/soccer/500/${espnId}.png`;
  for (const alias of aliases) {
    VERIFIED_CLUB_MAP.set(alias, { matchedName, crestUrl, leagueHint });
  }
}

function disambiguateVerifiedByContext(
  key: string,
  teamName: string,
  context: string
): { handled: boolean; result: ResolvedTeamCrest | null } {
  if (key === 'inter') {
    const isItaly = context.includes('🇮🇹') || /serie\s*a|mil[aã]o|italia/i.test(context);
    const hit = VERIFIED_CLUB_MAP.get(isItaly ? 'inter milan' : 'internacional');
    return { handled: true, result: hit ? { queryName: teamName, ...hit } : null };
  }
  if (key === 'vitoria' && (context.includes('🇵🇹') || /portugal|guimaraes/i.test(context))) {
    const hit = VERIFIED_CLUB_MAP.get('vitoria de guimaraes');
    return { handled: true, result: hit ? { queryName: teamName, ...hit } : null };
  }
  if (key === 'everton' && (context.includes('🇨🇱') || /chile/i.test(context))) {
    return { handled: true, result: null };
  }
  if (key === 'nacional') {
    if (context.includes('🇺🇾') || /uruguay|uruguai/i.test(context)) {
      const hit = VERIFIED_CLUB_MAP.get('nacional montevideo');
      return { handled: true, result: hit ? { queryName: teamName, ...hit } : null };
    }
    return { handled: true, result: null };
  }
  return { handled: false, result: null };
}

function lookupVerifiedClubCrest(
  teamName: string,
  sport: string,
  context: string
): ResolvedTeamCrest | null {
  if (sport && !normalizeText(sport).includes('futebol')) return null;

  const norm = normalizeText(teamName).replace(/\./g, ' ').replace(/\s{2,}/g, ' ').trim();
  if (!norm) return null;

  const normDisambig = disambiguateVerifiedByContext(norm, teamName, context);
  if (normDisambig.handled) return normDisambig.result;

  const directHit = VERIFIED_CLUB_MAP.get(norm);
  if (directHit) {
    return { queryName: teamName, ...directHit };
  }

  const strippedNorm = normalizeText(stripClubDecorations(teamName, false))
    .replace(/\./g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (strippedNorm && strippedNorm !== norm) {
    const strippedDisambig = disambiguateVerifiedByContext(strippedNorm, teamName, context);
    if (strippedDisambig.handled) return strippedDisambig.result;

    const strippedHit = VERIFIED_CLUB_MAP.get(strippedNorm);
    if (strippedHit) {
      return { queryName: teamName, ...strippedHit };
    }
  }

  return null;
}

const CACHE_STORAGE_KEY = 'apex_team_crests_v3';
const HIT_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const MISS_TTL_MS = 15 * 1000;

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
      if (entry && entry.crestUrl && now - entry.ts < HIT_TTL_MS) {
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
      if (!v.crestUrl) continue;
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
  const verified = lookupVerifiedClubCrest(teamName, sport, context);
  if (verified) return verified;

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

  const verified = lookupVerifiedClubCrest(cleanName, sport, context);
  if (verified) return verified;

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
    let hadHttpOrNetworkError = false;

    for (const q of searchQueries) {
      try {
        const url = `https://site.web.api.espn.com/apis/search/v2?query=${encodeURIComponent(
          q
        )}&limit=8&type=team`;
        const res = await fetch(url);
        if (!res.ok) {
          hadHttpOrNetworkError = true;
          continue;
        }
        const json = (await res.json()) as {
          results?: Array<{ type?: string; contents?: EspnTeamSearchItem[] }>;
        };
        const contents =
          json.results?.find((r) => r.type === 'team')?.contents ||
          json.results?.[0]?.contents ||
          [];

        for (const item of contents) {
          const s = scoreEspnCandidate(item, q, cleanName, expectedSport, context);
          if (s > bestScore) {
            bestScore = s;
            bestItem = item;
          }
        }

        if (bestItem?.image?.default && bestScore >= 115) {
          break;
        }
      } catch {
        hadHttpOrNetworkError = true;
      }
    }

    const resolved: ResolvedTeamCrest =
      bestItem?.image?.default && bestScore >= 15
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

    if (resolved.crestUrl || !hadHttpOrNetworkError) {
      memoryCache.set(key, {
        matchedName: resolved.matchedName,
        crestUrl: resolved.crestUrl,
        leagueHint: resolved.leagueHint,
        ts: Date.now()
      });
    }
    if (resolved.crestUrl) {
      persistStorageCache();
    }
    return resolved;
  })();

  inFlightRequests.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlightRequests.delete(key);
  }
}
