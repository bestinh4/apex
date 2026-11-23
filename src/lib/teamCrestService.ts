import { POPULAR_COMPETITION_PRESETS } from './betLinkParser';
import {
  damerauLevenshtein,
  hasBrazilianStateSuffix,
  normalizeTeamName,
  stripDiacritics,
  toCanonicalSlug
} from './teamNormalization';

export { normalizeTeamName, stripDiacritics, toCanonicalSlug } from './teamNormalization';

export interface ResolvedTeamCrest {
  queryName: string;
  matchedName: string;
  crestUrl: string | null;
  leagueHint?: string;
  canonicalId?: string;
}

export interface MatchupLeg {
  home: string;
  away: string;
  context: string;
  rawSegment: string;
}

export interface ExtractedMatchup {
  teams: string[];
  legs: MatchupLeg[];
  context: string;
  isMultiple: boolean;
}

const FLAG_REGEX = /(?:\p{Regional_Indicator}{2}|🏴[\u{E0020}-\u{E007F}]+)/gu;

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
    'K-League 1',
    'K-League 2',
    'K League 1',
    'K League 2',
    'K-League',
    'J1 League',
    'J2 League',
    'J-League 1',
    'J-League',
    'Liga 1 Peru',
    'UFC',
    'eSports'
  ])
)
  .filter((s) => s.length >= 3)
  .sort((a, b) => b.length - a.length);

const COUNTRY_PREFIX_BEFORE_LEAGUE =
  /^(?:england|inglaterra|scotland|esc[oó]cia|wales|pa[ií]s\s+de\s+gales|italy|it[aá]lia|spain|espanha|germany|alemanha|france|fran[cç]a|portugal|netherlands|holanda|belgium|b[eé]lgica|sweden|su[eé]cia|norway|noruega|denmark|dinamarca|switzerland|su[ií][cç]a|austria|[aá]ustria|russia|r[uú]ssia|turkey|turquia|greece|gr[eé]cia|poland|pol[oô]nia|romania|rom[eê]nia|czech(?:ia|\s+republic)|rep[uú]blica\s+tcheca|croatia|cro[aá]cia|serbia|s[eé]rvia|ukraine|ucr[aâ]nia|south\s+korea|republic\s+of\s+korea|coreia\s+do\s+sul|japan|jap[aã]o|brazil|brasil|argentina|uruguay|uruguai|colombia|col[oô]mbia|chile|ecuador|equador|peru|paraguay|paraguai|mexico|m[eé]xico|usa|europe|europa|world|south\s+america)\b(?=\s*[-–:|.]|\s+(?:premier|premiership|championship|serie|liga|league|division|divisi[oó]n|cup|copa|ta[cç]a|trophy|pokal|allsvenskan|eliteserien|bundesliga|ligue|eredivisie|ekstraklasa|super|primera|segunda|1\.|2\.|k[-\s]?league|j[-\s]?league))/i;

function stripLeadingLeaguePrefix(text: string): { rest: string; stripped: string } {
  let current = text.trim();
  const captured: string[] = [];

  for (let pass = 0; pass < 5; pass++) {
    let changed = false;

    const bracketTagMatch = current.match(/^\[[^\]]{2,24}\][\s\-–:|]*/);
    if (bracketTagMatch) {
      captured.push(bracketTagMatch[0].trim());
      current = current.slice(bracketTagMatch[0].length).trim();
      changed = true;
    }

    const parenPrefixMatch = current.match(/^\((?:ao\s+vivo|live|esc[oó]cia|inglaterra|it[aá]lia|espanha|alemanha|fran[cç]a|su[eé]cia|[aá]ustria|r[uú]ssia|dinamarca|su[ií][cç]a|gr[eé]cia|rom[eê]nia|tchequia|ucr[aâ]nia|cro[aá]cia|brasil|argentina|coreia|jap[aã]o)\)\s*[-–:|.]*\s*/i);
    if (parenPrefixMatch) {
      captured.push(parenPrefixMatch[0].trim());
      current = current.slice(parenPrefixMatch[0].length).trim();
      changed = true;
    }

    const dateOrTimeMatch = current.match(/^(?:\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?|\d{1,2}[:h]\d{2})[\s\-–:|]+/);
    if (dateOrTimeMatch) {
      captured.push(dateOrTimeMatch[0].trim());
      current = current.slice(dateOrTimeMatch[0].length).trim();
      changed = true;
    }

    const liveMatch = current.match(/^(?:ao\s+vivo|live)\b[\s\-–:|]*/i);
    if (liveMatch) {
      captured.push(liveMatch[0].trim());
      current = current.slice(liveMatch[0].length).trim();
      changed = true;
    }

    const flagMatch = current.match(/^(?:\p{Regional_Indicator}{2}|🏴󠁧󠁢[a-z]+󠁿)+[\s\-–:|.]*/u);
    if (flagMatch) {
      captured.push(flagMatch[0].trim());
      current = current.slice(flagMatch[0].length).trim();
      changed = true;
    }

    const countryPrefixMatch = current.match(COUNTRY_PREFIX_BEFORE_LEAGUE);
    if (countryPrefixMatch) {
      captured.push(countryPrefixMatch[0].trim());
      current = current.slice(countryPrefixMatch[0].length).replace(/^[\s\-–:|.]+/, '').trim();
      changed = true;
    }

    const currentLower = current.toLowerCase();
    for (const league of KNOWN_LEAGUE_PREFIXES) {
      const leagueLower = league.toLowerCase();
      if (
        currentLower.startsWith(leagueLower + ' ') ||
        currentLower.startsWith(leagueLower + '-') ||
        currentLower.startsWith(leagueLower + ':') ||
        currentLower.startsWith(leagueLower + '.') ||
        currentLower.startsWith(leagueLower + ',') ||
        currentLower.startsWith(leagueLower + '|')
      ) {
        captured.push(current.slice(0, league.length).trim());
        current = current.slice(league.length).replace(/^[\s\-–:|.,]+/, '').trim();
        changed = true;
        break;
      }
    }

    if (!changed) break;
  }

  return { rest: current.replace(/^[\s\-–:|]+/, '').trim(), stripped: captured.join(' ').trim() };
}

function stripHomeTeamTrailingDecorations(rawHome: string): string {
  return rawHome
    .trim()
    .replace(/\s*\((?:ing|eng|esc|sco|ita|esp|spa|ale|ger|fra|por|hol|ned|bel|sue|swe|nor|din|den|sui|swi|aus|aut|rus|tur|gre|pol|rom|cze|cro|ser|ucr|ukr|kor|jpn|bra|arg|uru|col|chi|equ|ecu|per|par|mex|usa|w|fem)\)\s*$/i, '')
    .replace(/\s+\d{1,2}\s*[-:]\s*\d{1,2}\s*$/, '')
    .replace(/[\s\-–|:·]+$/, '')
    .trim();
}

function stripTrailingMarketHint(rawTeam: string): { team: string; trailing: string } {
  let text = rawTeam.trim();
  let trailing = '';

  const parenMatch = text.match(/\s*\(([^)]+)\)\s*$/);
  if (parenMatch) {
    trailing = `${trailing} ${parenMatch[1]}`.trim();
    text = text.slice(0, text.length - parenMatch[0].length).trim();
  }

  const colonOrPipeMatch = text.match(/\s+(?:[:|]|[-–]\s+(?:over|under|btts|ambas|ambos|ml|moneyline|vencedor|empate|casa|fora|mais|menos|handicap|h\.?\s*a\.?|ha|escanteios?|cantos?|cart[oõ]es|gols?|dupla\s+chance|dnb|empate\s+anula|total\b|1x2\b))/i);
  if (colonOrPipeMatch && colonOrPipeMatch.index && colonOrPipeMatch.index > 1) {
    trailing = `${trailing} ${text.slice(colonOrPipeMatch.index)}`.trim();
    text = text.slice(0, colonOrPipeMatch.index).trim();
  }

  const marketStopMatch = text.match(
    /\s+(?:over\b|under\b|btts\b|ambas\b|ambos\b|mais\s+de\b|menos\s+de\b|acima\s+de\b|abaixo\s+de\b|total\s+de\b|handicap\b|h\.?\s*a\.?(?:\s|$)|ha\b|escanteios?\b|cantos?\b|cart[oõ]es\b|gols?\b|ht\b|ft\b|1x2\b|dupla\s+(?:chance|hip[oó]tese)\b|dnb\b|empate\s+anula\b|moneyline\b|\bml\b|\bgg\b|\bng\b|[+-]\d+(?:[.,]\d+)?\b|@\s*\d)/i
  );
  if (marketStopMatch && marketStopMatch.index && marketStopMatch.index > 1) {
    trailing = `${trailing} ${text.slice(marketStopMatch.index)}`.trim();
    text = text.slice(0, marketStopMatch.index).trim();
  }

  text = text
    .replace(/\s+\d{1,2}\s*[-:]\s*\d{1,2}\s*$/, '')
    .replace(/[\s\-–|:·]+$/, '')
    .trim();
  return { team: text, trailing };
}

export function extractEventMatchup(rawEvent: string): ExtractedMatchup {
  const input = (rawEvent || '').trim();
  if (!input) return { teams: [], legs: [], context: '', isMultiple: false };

  const hasMultiplePrefix = /^m[uú]ltipla\s*\(/i.test(input);
  const body = hasMultiplePrefix
    ? input.replace(/^m[uú]ltipla\s*\(\d+x\)\s*:\s*/i, '').trim()
    : input;

  const rawSegments = body.includes(' + ')
    ? body.split(/\s+\+\s+/)
    : body.includes('\n')
    ? body.split(/\r?\n/)
    : body.includes(';')
    ? body.split(/\s*;\s*/)
    : [body];
  const legs: MatchupLeg[] = [];
  const teams: string[] = [];
  const contexts: string[] = [];

  for (const seg of rawSegments) {
    const cleanSeg = seg.replace(/^(?:\d+[).]\s*|[•·\-–]\s*)/, '').trim();
    const matchSep =
      cleanSeg.match(/^(.+?)\s+(?:×|x|vs\.?|v\.?)\s+(.+)$/i) ||
      cleanSeg.match(/^(.+?)\s+-\s+(.+)$/);
    if (!matchSep) continue;

    let leftRaw = matchSep[1].trim();
    const rightRaw = matchSep[2].trim();
    const legContexts: string[] = [];

    // If there is a time delimiter like "- 13:45" or "13:45 -", everything before & including it is header context
    const timeHeaderMatch = leftRaw.match(/^(.+?)\s*(?:[-–:|]\s*)?\b\d{1,2}[:h]\d{2}\b(?:\s*[-–:|]\s*)?(.+)$/i);
    if (timeHeaderMatch) {
      legContexts.push(timeHeaderMatch[1].trim());
      leftRaw = timeHeaderMatch[2].trim();
    }

    const { rest: strippedLeft, stripped: extraCtx } = stripLeadingLeaguePrefix(leftRaw);
    if (extraCtx) legContexts.push(extraCtx);

    const cleanHome = stripHomeTeamTrailingDecorations(strippedLeft);
    const { team: cleanAway } = stripTrailingMarketHint(rightRaw);

    if (cleanHome.length >= 2 && cleanAway.length >= 2) {
      const legCtx = legContexts.join(' ').trim();
      if (legCtx) contexts.push(legCtx);
      teams.push(cleanHome, cleanAway);
      legs.push({
        home: cleanHome,
        away: cleanAway,
        context: legCtx,
        rawSegment: cleanSeg
      });
    }
  }

  return {
    teams,
    legs,
    context: contexts.join(' ').trim(),
    isMultiple: hasMultiplePrefix || legs.length > 1
  };
}

const AGGRESSIVE_CLUB_ACRONYM_REGEX =
  /\b(?:fc|cf|ec|sc|ac|cr|se|ca|ce|aa|ad|sd|cd|ud|rc|rcd|as|us|ss|ssc|sl|ogc|krc|kaa|rsc|pfc|bfc|afc|fsv|tsg|vfb|vfl|rb|nk|gnk|hnk|sk|fk|sv|kv|jk|bk|ik|if|fbpa|fr|bc|sfc|gfc|cfc|lfc|mufc|thfc|whufc|bha|om|ol|hsc|sco|aj|losc|alsace)\b\.?/gi;

const AGGRESSIVE_CLUB_BOILERPLATE_REGEX =
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

function stripAggressiveClubDecorations(raw: string, stripBoilerplate = false): string {
  let out = raw
    .replace(CLUB_NUMBER_REGEX, ' ')
    .replace(AGGRESSIVE_CLUB_ACRONYM_REGEX, ' ');
  if (stripBoilerplate) {
    out = out.replace(AGGRESSIVE_CLUB_BOILERPLATE_REGEX, ' ');
  }
  return out
    .replace(/\s*-\s*(?:mg|sp|rj|rs|pr|ba|pe|ce|go|df|sc)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function stripAccentChars(s: string): string {
  return stripDiacritics(s);
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
  const expandedExact = normalizeTeamName(original, {
    expandAbbreviations: true,
    stripDecorations: false
  });
  const expandedCore = normalizeTeamName(original, {
    expandAbbreviations: true,
    stripDecorations: true
  });

  const ctxLower = context.toLowerCase();
  if (/^sporting$/i.test(expandedExact) && (ctxLower.includes('portugal') || context.includes('🇵🇹'))) {
    push('Sporting CP');
  }
  if (/^roma$/i.test(expandedExact)) {
    push('AS Roma');
  }
  if (/^inter$/i.test(expandedExact)) {
    push(context.includes('🇮🇹') || ctxLower.includes('serie a') ? 'Internazionale' : 'Internacional');
  }

  // 1. Forma normalizada/expandida primeiro (ex.: 'Man. City' -> 'manchester city'), depois original
  push(expandedCore);
  push(expandedExact);
  push(original);
  if (original.includes('-')) push(original.replace(/-/g, ' '));

  // 2. Remove siglas e números de fundação do texto original e normalizado
  const noAcronymsOrig = stripAggressiveClubDecorations(original, false);
  push(noAcronymsOrig);

  // 3. Remove termos genéricos adicionais (útil para fallback em APIs externas)
  const noBoilerplate = stripAggressiveClubDecorations(expandedExact || original, true);
  push(noBoilerplate);
  const noConnectors = noBoilerplate
    .split(/\s+/)
    .filter((w) => !CONNECTOR_WORDS.has(w.toLowerCase()))
    .join(' ');
  push(noConnectors);

  // 4. Remove qualificadores geográficos finais ("de Avellaneda", "Paulista", etc.)
  const withoutTrailingDe = (expandedExact || noAcronymsOrig)
    .replace(/\s+(?:de|da|do|del)\s+.+$/i, '')
    .trim();
  push(withoutTrailingDe);
  const withoutTrailingQualifier = noConnectors
    .replace(/\s+(?:paulista|mineiro|carioca|gaucho|ga[uú]cho|rotterdam|avellaneda)\b$/i, '')
    .trim();
  push(withoutTrailingQualifier);

  // 5. Versões sem acento do nome original
  const plainOrig = stripAccentChars(noAcronymsOrig);
  if (plainOrig !== noAcronymsOrig) push(plainOrig);

  // 6. Redução progressiva de prefixo em nomes longos
  const coreWords = (expandedCore || noConnectors).split(/\s+/).filter((w) => w.length >= 2);
  if (coreWords.length >= 3) {
    push(coreWords.slice(0, 2).join(' '));
  }
  if (coreWords.length >= 2) {
    const first = coreWords[0];
    const second = coreWords[1];
    if (
      /^(?:real|atl[eé]tico|atletico|sporting|olympique|deportivo|uni[oó]n|union)$/i.test(first) &&
      second.length >= 4
    ) {
      push(coreWords.slice(1).join(' '));
    }
    if (first.length >= 4 && !/^(?:real|club|sport|inter|atletico|olympique|city|united)$/i.test(first)) {
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

const CONTEXT_LEAGUE_KEYWORDS: Array<{ id: string; test: RegExp; keywords: string[]; countries: string[] }> = [
  { id: 'br', test: /🇧🇷|brasileir|paulist|carioca|copa\s*do\s*brasil|nbb/i, keywords: ['brazil', 'paulista', 'carioca', 'gaucho', 'mineiro', 'nordeste'], countries: ['brazil'] },
  { id: 've', test: /🇻🇪|futve|venezuela/i, keywords: ['futve', 'venezuela'], countries: ['venezuela'] },
  { id: 'it', test: /🇮🇹|serie\s*a|serie\s*b|italia|itália/i, keywords: ['serie a', 'serie b', 'italian', 'italy', 'coppa italia'], countries: ['italy'] },
  { id: 'en', test: /🏴󠁧󠁢󠁥󠁮󠁧󠁿|premier\s*league|championship|inglaterra|england/i, keywords: ['premier league', 'english', 'efl', 'england'], countries: ['england', 'wales'] },
  { id: 'es', test: /🇪🇸|laliga|la\s*liga|espanha|spain/i, keywords: ['laliga', 'spanish', 'spain', 'segunda'], countries: ['spain'] },
  { id: 'de', test: /🇩🇪|bundesliga|alemanha|germany/i, keywords: ['german', 'bundesliga'], countries: ['germany'] },
  { id: 'at', test: /🇦🇹|austria|áustria/i, keywords: ['austrian', 'austria'], countries: ['austria'] },
  { id: 'ru', test: /🇷🇺|russia|rússia/i, keywords: ['russian', 'russia'], countries: ['russia'] },
  { id: 'be', test: /🇧🇪|jupiler|belg/i, keywords: ['belgian', 'belgium', 'jupiler'], countries: ['belgium'] },
  { id: 'fr', test: /🇫🇷|ligue\s*1|ligue\s*2|fran[cç]a/i, keywords: ['ligue 1', 'ligue 2', 'french', 'france'], countries: ['france', 'monaco'] },
  { id: 'pt', test: /🇵🇹|portugal|primeira\s*liga/i, keywords: ['portuguese', 'portugal'], countries: ['portugal'] },
  { id: 'nl', test: /🇳🇱|eredivisie|holanda/i, keywords: ['eredivisie', 'dutch', 'netherlands'], countries: ['netherlands'] },
  { id: 'ar', test: /🇦🇷|argentina/i, keywords: ['argentin', 'lpf', 'primera'], countries: ['argentina'] },
  { id: 'co', test: /🇨🇴|betplay|col[oô]mbia/i, keywords: ['colombian', 'colombia'], countries: ['colombia'] },
  { id: 'ec', test: /🇪🇨|ligapro|equador|ecuador/i, keywords: ['ecuador'], countries: ['ecuador'] },
  { id: 'uy', test: /🇺🇾|uruguai|uruguay/i, keywords: ['uruguay'], countries: ['uruguay'] },
  { id: 'cl', test: /🇨🇱|chile/i, keywords: ['chile', 'chilean'], countries: ['chile'] },
  { id: 'pe', test: /🇵🇪|peru/i, keywords: ['peru', 'peruvian'], countries: ['peru'] },
  { id: 'py', test: /🇵🇾|paraguai|paraguay/i, keywords: ['paraguay'], countries: ['paraguay'] },
  { id: 'mx', test: /🇲🇽|liga\s*mx|m[eé]xico/i, keywords: ['liga mx', 'mexican', 'mexico'], countries: ['mexico'] },
  { id: 'us', test: /🇺🇸|mls|nba|nfl|nhl/i, keywords: ['mls', 'nba', 'american', 'usa'], countries: ['usa', 'united states', 'canada'] },
  { id: 'kr', test: /🇰🇷|k[-\s]*league|coreia|korea/i, keywords: ['korea', 'korean', 'k league', 'kleague'], countries: ['south korea', 'korea republic'] },
  { id: 'jp', test: /🇯🇵|j[-\s]*league|jap[aã]o|japan/i, keywords: ['japan', 'japanese', 'j league', 'j1'], countries: ['japan'] },
  { id: 'cn', test: /🇨🇳|china|super\s*league\s*china/i, keywords: ['chinese', 'china'], countries: ['china'] },
  { id: 'sa', test: /🇸🇦|saudi|roshn|ar[aá]bia/i, keywords: ['saudi'], countries: ['saudi arabia'] },
  { id: 'tr', test: /🇹🇷|s[uü]per\s*lig|turquia|turkey/i, keywords: ['turkish', 'turkey'], countries: ['turkey', 'turkiye'] },
  { id: 'gr', test: /🇬🇷|gr[eé]cia|greece/i, keywords: ['greek', 'greece'], countries: ['greece'] },
  { id: 'pl', test: /🇵🇱|ekstraklasa|pol[oô]nia|poland/i, keywords: ['polish', 'poland'], countries: ['poland'] },
  { id: 'dk', test: /🇩🇰|superligaen|dinamarca|denmark/i, keywords: ['danish', 'denmark'], countries: ['denmark'] },
  { id: 'se', test: /🇸🇪|allsvenskan|su[eé]cia|sweden/i, keywords: ['swedish', 'sweden'], countries: ['sweden'] },
  { id: 'no', test: /🇳🇴|eliteserien|noruega|norway/i, keywords: ['norwegian', 'norway'], countries: ['norway'] },
  { id: 'ch', test: /🇨🇭|su[ií][cç]a|switzerland/i, keywords: ['swiss', 'switzerland'], countries: ['switzerland'] },
  { id: 'sc', test: /🏴󠁧󠁢󠁳󠁣󠁴󠁿|premiership|esc[oó]cia|scotland/i, keywords: ['scottish', 'scotland', 'spfl'], countries: ['scotland'] }
];

const GENERIC_CLUB_TOKENS = new Set([
  'united', 'utd', 'city', 'club', 'clube', 'fc', 'sc', 'ac', 'cf', 'ec', 'ca', 'cd', 'sd', 'ud',
  'rc', 'as', 'us', 'ss', 'sv', 'fk', 'sk', 'nk', 'bk', 'ik', 'if', 'afc', 'bfc', 'cfc', 'lfc',
  'sport', 'sporting', 'atletico', 'athletico', 'athletic', 'real', 'inter', 'nacional', 'racing',
  'dinamo', 'dynamo', 'lokomotiv', 'union', 'rovers', 'wanderers', 'albion', 'town', 'county',
  'motors', 'hyundai', 'samsung', 'hana', 'citizen', 'young', 'boys', 'stars', 'kings', 'royal',
  'america', 'vitoria', 'independiente', 'central', 'olympique', 'stade', 'la', 'plata'
]);

interface EspnTeamSearchItem {
  displayName?: string;
  subtitle?: string;
  description?: string;
  sport?: string;
  image?: { default?: string };
}

function normalizeText(s: string): string {
  return stripAccentChars(s.toLowerCase())
    .replace(/['’`]/g, '')
    .replace(/\//g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function evaluateNameMatch(display: string, target: string, origTarget: string): { matched: boolean; score: number } {
  const dispWords = display.split(/\s+/).filter(Boolean);
  const origWords = origTarget.split(/\s+/).filter((t) => t.length >= 2);
  const targetWords = target.split(/\s+/).filter((t) => t.length >= 2);

  if (display === origTarget || display === target) {
    return { matched: true, score: 80 };
  }

  const distinctiveOrig = origWords.filter((t) => t.length >= 3 && !GENERIC_CLUB_TOKENS.has(t));
  const distinctiveTarget = targetWords.filter((t) => t.length >= 3 && !GENERIC_CLUB_TOKENS.has(t));
  const distinctivePool = distinctiveOrig.length > 0 ? distinctiveOrig : distinctiveTarget;

  // Check whole-word / strong token presence for distinctive words
  const matchedDistinctive = distinctivePool.filter((t) =>
    dispWords.some((dw) => dw === t || (t.length >= 4 && dw.startsWith(t)) || (dw.length >= 4 && t.startsWith(dw)))
  );

  if (distinctivePool.length > 0 && matchedDistinctive.length === 0) {
    return { matched: false, score: -999 };
  }

  if (
    display.includes(origTarget) ||
    origTarget.includes(display) ||
    display.includes(target) ||
    target.includes(display)
  ) {
    return { matched: true, score: 45 };
  }

  if (matchedDistinctive.length > 0) {
    const ratio = matchedDistinctive.length / distinctivePool.length;
    return { matched: true, score: Math.round(25 + ratio * 35) };
  }

  // Fallback for names made entirely of generic words (e.g. "Real Madrid", "Internacional")
  const allOrigMatch = origWords.length > 0 && origWords.every((w) => dispWords.includes(w));
  if (allOrigMatch) {
    return { matched: true, score: 40 };
  }

  return { matched: false, score: -999 };
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
  const origTarget = normalizeText(stripAggressiveClubDecorations(originalTeamName, true) || originalTeamName);
  const itemSport = (item.sport || '').toLowerCase();

  const nameEval = evaluateNameMatch(display, target, origTarget);
  if (!nameEval.matched) return -999;

  let score = nameEval.score;

  // Sport match
  if (itemSport === expectedSport) {
    score += 45;
  } else if (itemSport) {
    score -= 85;
  } else {
    const hasExplicitFootballCtx =
      /🇧🇷|🇻🇪|🇮🇹|🏴󠁧󠁢󠁥󠁮󠁧󠁿|🏴󠁧󠁢󠁳󠁣󠁴󠁿|🇪🇸|🇩🇪|🇦🇹|🇷🇺|🇧🇪|🇫🇷|🇵🇹|🇳🇱|🇰🇷|🇯🇵|🇸🇦|🇸🇪|brasileir|premier\s*league|laliga|bundesliga|ligue\s*1|k[-\s]*league|champions/i.test(
        context
      );
    score -= expectedSport !== 'soccer' ? 80 : hasExplicitFootballCtx ? 35 : 20;
  }

  // Penalize women/youth/reserves unless explicitly requested
  const targetAsksYouthOrWomen = /\b(women|feminin[oa]|u20|u21|u19|u18|u17|sub-?20|youth)\b/i.test(
    originalTeamName
  );
  if (!targetAsksYouthOrWomen) {
    if (
      /\(am\)|\(res\)|\(w\)|\b(women|woman|feminino|feminina|femenil|femenino|femminile|frauen|vrouwen|damen|kvinne|kvinner|ladies|wnt|wsl|nwsl|liga\s*f|copa\s*de\s*la\s*reina|premi[eè]re\s*ligue|f[eé]minine|dames|damallsvenskan)\b/i.test(
        `${display} ${sub}`
      )
    ) {
      score -= 105;
    }
    if (/\b(u20|u21|u19|u18|u17|u23|s20|youth|academy|reserves?|jong|castilla)\b/i.test(`${display} ${sub}`)) {
      score -= 100;
    }
    if (/\b(?:ii|iii|b)\b/.test(display) && !/\b(?:ii|iii|b)\b/i.test(originalTeamName)) {
      score -= 70;
    }
  }

  // Context / country / league disambiguation + conflict guard
  const isContinentalOrFriendly = /champions|europa|conference|libertadores|sudamericana|world\s*cup|friendly|amistoso/i.test(sub);
  for (const rule of CONTEXT_LEAGUE_KEYWORDS) {
    if (rule.test.test(context)) {
      if (rule.keywords.some((kw) => sub.includes(kw))) {
        score += 55;
      } else if (!isContinentalOrFriendly && sub.length > 0) {
        const belongsToOtherDomesticLeague = CONTEXT_LEAGUE_KEYWORDS.some(
          (other) => other.id !== rule.id && other.keywords.some((kw) => sub.includes(kw))
        );
        if (belongsToOtherDomesticLeague) {
          score -= 85;
        }
      }
    }
  }

  // Prefer club teams over national teams unless context asks for international/world cup
  const isInternationalCtx = /🌍|copa\s*do\s*mundo|eliminat|eurocopa|nations\s*league|copa\s*am[eé]rica/i.test(
    context
  );
  if (!isInternationalCtx && (sub.includes('national') || sub.includes("men's soccer team"))) {
    score -= 35;
  }

  return score;
}

const VERIFIED_CLUB_ENTRIES: Array<[string[], string, number, string]> = [
  // Premier League / Championship
  [['newcastle', 'newcastle united', 'newcastle utd'], 'Newcastle United', 361, 'Premier League'],
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

  // Serie A & B (Italy)
  [['inter milan', 'inter de milao', 'internazionale', 'internazionale milano'], 'Internazionale', 110, 'Serie A'],
  [['ac milan', 'milan'], 'AC Milan', 103, 'Serie A'],
  [['juventus'], 'Juventus', 111, 'Serie A'],
  [['napoli', 'ssc napoli', 'napoles'], 'Napoli', 114, 'Serie A'],
  [['roma', 'as roma'], 'AS Roma', 104, 'Serie A'],
  [['atalanta', 'atalanta bc'], 'Atalanta', 105, 'Serie A'],
  [['lazio', 'ss lazio'], 'Lazio', 112, 'Serie A'],
  [['fiorentina', 'acf fiorentina', 'florenca'], 'Fiorentina', 109, 'Serie A'],
  [['bologna', 'bologna fc 1909', 'bolonha'], 'Bologna', 107, 'Serie A'],
  [['torino', 'torino fc', 'turim'], 'Torino', 239, 'Serie A'],
  [['parma', 'parma calcio 1913'], 'Parma', 115, 'Serie A'],
  [['como', 'como 1907'], 'Como', 2572, 'Serie A'],
  [['udinese'], 'Udinese', 118, 'Serie A'],
  [['venezia', 'venezia fc', 'veneza'], 'Venezia', 17530, 'Serie A'],
  [['genoa', 'genoa cfc', 'genova'], 'Genoa', 3263, 'Serie A'],
  [['cagliari', 'cagliari calcio'], 'Cagliari', 2925, 'Serie A'],
  [['empoli', 'empoli fc'], 'Empoli', 2574, 'Serie B'],
  [['hellas verona', 'verona'], 'Hellas Verona', 119, 'Serie A'],
  [['lecce', 'us lecce'], 'Lecce', 113, 'Serie A'],
  [['monza', 'ac monza'], 'Monza', 4007, 'Serie A'],
  [['sassuolo', 'us sassuolo'], 'Sassuolo', 3997, 'Serie A'],

  // Scottish Premiership
  [['motherwell', 'motherwell fc'], 'Motherwell', 266, 'SPFL Premiership'],
  [['celtic', 'celtic fc', 'celtic glasgow'], 'Celtic', 256, 'SPFL Premiership'],
  [['hearts', 'heart of midlothian'], 'Heart of Midlothian', 262, 'SPFL Premiership'],
  [['aberdeen', 'aberdeen fc'], 'Aberdeen', 263, 'SPFL Premiership'],
  [['hibernian', 'hibs'], 'Hibernian', 258, 'SPFL Premiership'],

  // Swedish Allsvenskan
  [['ifk goteborg', 'ifk gotemburgo', 'goteborg', 'gotemburgo', 'gothenburg'], 'IFK Göteborg', 2556, 'Allsvenskan'],
  [['malmo', 'malmo ff'], 'Malmö FF', 2720, 'Allsvenskan'],
  [['aik', 'aik solna', 'aik stockholm'], 'AIK', 994, 'Allsvenskan'],
  [['djurgarden', 'djurgardens if'], 'Djurgården', 2339, 'Allsvenskan'],
  [['elfsborg', 'if elfsborg'], 'IF Elfsborg', 529, 'Allsvenskan'],

  // Bundesliga
  [['bayern munich', 'bayern munchen', 'bayern de munique', 'fc bayern munich', 'bayern'], 'Bayern München', 132, 'Bundesliga'],
  [['borussia dortmund', 'dortmund', 'bvb'], 'Borussia Dortmund', 124, 'Bundesliga'],
  [['bayer leverkusen', 'bayer 04 leverkusen', 'leverkusen'], 'Bayer Leverkusen', 131, 'Bundesliga'],
  [['rb leipzig', 'red bull leipzig'], 'RB Leipzig', 11420, 'Bundesliga'],
  [['eintracht frankfurt', 'frankfurt'], 'Eintracht Frankfurt', 125, 'Bundesliga'],
  [['stuttgart', 'vfb stuttgart', 'estugarda'], 'VfB Stuttgart', 134, 'Bundesliga'],
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

  // Austria, Belgium, Turkey, Greece, Scandinavia, Eastern Europe, Saudi
  [['lask', 'lask linz'], 'LASK Linz', 4411, 'Austrian Bundesliga'],
  [['hartberg', 'tsv hartberg'], 'TSV Hartberg', 6907, 'Austrian Bundesliga'],
  [['sturm graz', 'sk sturm graz'], 'SK Sturm Graz', 3746, 'Austrian Bundesliga'],
  [['rapid vienna', 'rapid wien', 'rapid viena'], 'Rapid Vienna', 519, 'Austrian Bundesliga'],
  [['club brugge', 'club bruge', 'brugge'], 'Club Brugge', 570, 'Belgian Pro League'],
  [['mechelen', 'kv mechelen'], 'KV Mechelen', 7879, 'Belgian Pro League'],
  [['anderlecht', 'rsc anderlecht'], 'Anderlecht', 441, 'Belgian Pro League'],
  [['genk', 'krc genk', 'racing genk'], 'Racing Genk', 938, 'Belgian Pro League'],
  [['gent', 'kaa gent', 'gante'], 'KAA Gent', 3611, 'Belgian Pro League'],
  [['antwerp', 'royal antwerp', 'antuerpia'], 'Antwerp', 17544, 'Belgian Pro League'],
  [['union sg', 'union saint-gilloise', 'union st gilloise', 'royale union saint-gilloise'], 'Union St.-Gilloise', 5807, 'Belgian Pro League'],
  [['galatasaray'], 'Galatasaray', 432, 'Turkish Süper Lig'],
  [['fenerbahce'], 'Fenerbahçe', 436, 'Turkish Süper Lig'],
  [['besiktas'], 'Beşiktaş', 1895, 'Turkish Süper Lig'],
  [['trabzonspor'], 'Trabzonspor', 997, 'Turkish Süper Lig'],
  [['olympiacos', 'olympiakos'], 'Olympiacos', 435, 'Greek Super League'],
  [['panathinaikos'], 'Panathinaikos', 443, 'Greek Super League'],
  [['paok', 'paok salonic'], 'PAOK', 605, 'Greek Super League'],
  [['aek athens', 'aek atenas', 'aek'], 'AEK Athens', 887, 'Greek Super League'],
  [['midtjylland', 'fc midtjylland'], 'FC Midtjylland', 572, 'Danish Superliga'],
  [['brondby', 'brondby if'], 'Brøndby IF', 575, 'Danish Superliga'],
  [['molde', 'molde fk'], 'Molde', 2715, 'Norwegian Eliteserien'],
  [['rosenborg', 'rosenborg bk'], 'Rosenborg', 438, 'Norwegian Eliteserien'],
  [['basel', 'fc basel', 'basileia'], 'FC Basel', 989, 'Swiss Super League'],
  [['young boys', 'bsc young boys'], 'Young Boys', 2722, 'Swiss Super League'],
  [['shakhtar', 'shakhtar donetsk'], 'Shakhtar Donetsk', 493, 'Ukrainian Premier League'],
  [['dynamo kyiv', 'dinamo kiev', 'dinamo de kiev'], 'Dynamo Kyiv', 440, 'Ukrainian Premier League'],
  [['sparta prague', 'sparta praga'], 'Sparta Prague', 433, 'Chance Liga'],
  [['slavia prague', 'slavia praga'], 'Slavia Prague', 494, 'Chance Liga'],
  [['legia warsaw', 'legia varsovia', 'legia'], 'Legia Warsaw', 555, 'Ekstraklasa'],
  [['lech poznan'], 'Lech Poznań', 2990, 'Ekstraklasa'],
  [['al-hilal', 'al hilal'], 'Al Hilal', 929, 'Saudi Pro League'],
  [['al-nassr', 'al nassr'], 'Al Nassr', 817, 'Saudi Pro League'],
  [['al-ittihad', 'al ittihad'], 'Al Ittihad', 2276, 'Saudi Pro League'],

  // Ligue 1, Portugal, Netherlands, Argentina
  [['psg', 'paris saint-germain', 'paris saint germain'], 'Paris Saint-Germain', 160, 'Ligue 1'],
  [['marseille', 'olympique de marseille', 'olympique marseille', 'marselha'], 'Marseille', 176, 'Ligue 1'],
  [['lyon', 'olympique lyonnais', 'olympique lyon'], 'Lyon', 167, 'Ligue 1'],
  [['monaco', 'as monaco'], 'AS Monaco', 174, 'Ligue 1'],
  [['lille', 'losc lille'], 'Lille', 166, 'Ligue 1'],
  [['nice', 'ogc nice'], 'Nice', 2502, 'Ligue 1'],
  [['lens', 'rc lens'], 'Lens', 175, 'Ligue 1'],
  [['strasbourg', 'rc strasbourg', 'rc strasbourg alsace', 'estrasburgo'], 'Strasbourg', 180, 'Ligue 1'],
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

// Additional verified clubs hosted on 365Scores CDN (K-League 1 & 2, Brazilian clubs, etc.)
const VERIFIED_365_ENTRIES: Array<[string[], string, number, number, string]> = [
  // South Korea - K League 1 & K League 2
  [['ulsan', 'ulsan hd', 'ulsan hyundai'], 'Ulsan HD', 8967, 4, 'K League 1'],
  [['jeonbuk', 'jeonbuk hyundai', 'jeonbuk hyundai motors', 'jeonbuk motors'], 'Jeonbuk Hyundai Motors', 8592, 2, 'K League 1'],
  [['fc seoul', 'seoul'], 'FC Seoul', 9820, 1, 'K League 1'],
  [['pohang', 'pohang steelers'], 'Pohang Steelers', 9822, 1, 'K League 1'],
  [['suwon fc', 'suwon football club'], 'Suwon FC', 12765, 1, 'K League 1'],
  [['suwon bluewings', 'suwon samsung', 'suwon samsung bluewings', 'bluewings'], 'Suwon Bluewings', 8595, 1, 'K League 2'],
  [['incheon', 'incheon united', 'incheon utd'], 'Incheon United', 9819, 1, 'K League 1'],
  [['gangwon', 'gangwon fc'], 'Gangwon FC', 9825, 1, 'K League 1'],
  [['jeju', 'jeju sk', 'jeju united', 'jeju utd'], 'Jeju SK', 9817, 4, 'K League 1'],
  [['daegu', 'daegu fc'], 'Daegu FC', 9815, 1, 'K League 1'],
  [['gwangju', 'gwangju fc'], 'Gwangju FC', 9826, 1, 'K League 1'],
  [['gimcheon', 'gimcheon sangmu', 'gimcheon sangmu fc', 'sangmu'], 'Gimcheon Sangmu FC', 9823, 2, 'K League 1'],
  [['daejeon', 'daejeon hana', 'daejeon hana citizen', 'daejeon citizen'], 'Daejeon Hana Citizen', 9816, 4, 'K League 1'],
  [['fc anyang', 'anyang'], 'FC Anyang', 11471, 1, 'K League 1'],
  [['busan', 'busan ipark', "busan i'park", 'busan i park'], "Busan I'Park", 9821, 1, 'K League 2'],
  [['seongnam', 'seongnam fc', 'seongnam ilhwa'], 'Seongnam Ilhwa', 8171, 1, 'K League 2'],
  [['seoul e-land', 'seoul e land', 'seoul e-land fc'], 'Seoul E-Land FC', 24498, 1, 'K League 2'],
  [['bucheon', 'bucheon fc', 'bucheon fc 1995', 'bucheon 1995'], 'Bucheon FC 1995', 11361, 1, 'K League 2'],
  [['jeonnam', 'jeonnam dragons'], 'Jeonnam Dragons', 9818, 4, 'K League 2'],
  [['chungnam asan', 'asan'], 'Chungnam Asan', 11469, 1, 'K League 2'],
  [['gyeongnam', 'gyeongnam fc'], 'Gyeongnam', 9824, 1, 'K League 2'],
  [['gimpo', 'gimpo fc'], 'GimPo FC', 13809, 2, 'K League 2'],
  [['ansan', 'ansan greeners'], 'Ansan Greeners', 47520, 2, 'K League 2'],
  [['cheonan', 'cheonan city', 'cheonan city fc'], 'Cheonan City FC', 12921, 2, 'K League 2'],
  [['chungbuk cheongju', 'cheongju'], 'Chungbuk Cheongju', 10622, 2, 'K League 2'],
  // Additional verified clubs on 365Scores CDN
  [['rangers', 'rangers fc', 'glasgow rangers'], 'Rangers', 753, 6, 'SPFL Premiership'],
  [['hammarby', 'hammarby if'], 'Hammarby', 1895, 1, 'Allsvenskan'],
  [['hacken', 'bk hacken'], 'BK Häcken', 1903, 3, 'Allsvenskan'],
  [['bodo glimt', 'bodo/glimt'], 'Bodo Glimt', 1978, 3, 'Norwegian Eliteserien'],
  [['salzburg', 'rb salzburg', 'red bull salzburg', 'salzburgo', 'fc salzburg'], 'Red Bull Salzburg', 1739, 3, 'Austrian Bundesliga'],
  [['austria vienna', 'fk austria wien', 'austria wien', 'austria viena'], 'Austria Vienna', 1740, 1, 'Austrian Bundesliga'],
  [['copenhagen', 'fc copenhagen', 'fc kobenhavn', 'copenhague'], 'FC Copenhagen', 1824, 3, 'Danish Superliga'],
  [['servette', 'servette fc', 'servette geneva'], 'Servette FC', 1154, 1, 'Swiss Super League'],
  [['fc zurich', 'zurich', 'zurique'], 'FC Zürich', 1140, 4, 'Swiss Super League'],
  [['al-ahli', 'al ahli', 'al ahli jeddah'], 'Al Ahli Jeddah', 8946, 8, 'Saudi Pro League'],
  // Brasileirão Série A/B extras
  [['vila nova', 'vila nova fc'], 'Vila Nova', 1782, 2, 'Brazil Serie B'],
  [['novorizontino', 'gremio novorizontino'], 'Novorizontino', 1785, 1, 'Brazil Serie B']
];

interface VerifiedClubRecord {
  canonicalId: string;
  matchedName: string;
  crestUrl: string;
  leagueHint: string;
}

const AMBIGUOUS_BARE_KEYS = new Set([
  'suwon',
  'racing',
  'sporting',
  'real',
  'inter',
  'united',
  'city',
  'atletico',
  'athletic',
  'america',
  'vitoria',
  'nacional',
  'independiente',
  'dinamo',
  'dynamo'
]);

const VERIFIED_CLUB_MAP = new Map<string, VerifiedClubRecord>();
const registerVerifiedClubAliases = (aliases: string[], record: VerifiedClubRecord) => {
  for (const alias of aliases) {
    const rawClean = normalizeText(alias);
    if (rawClean) VERIFIED_CLUB_MAP.set(rawClean, record);

    const exactNorm = normalizeTeamName(alias, {
      expandAbbreviations: true,
      stripDecorations: false
    });
    if (exactNorm) VERIFIED_CLUB_MAP.set(exactNorm, record);

    const coreNorm = normalizeTeamName(alias, {
      expandAbbreviations: true,
      stripDecorations: true
    });
    if (coreNorm && !AMBIGUOUS_BARE_KEYS.has(coreNorm)) {
      VERIFIED_CLUB_MAP.set(coreNorm, record);
    }
  }
};

for (const [aliases, matchedName, espnId, leagueHint] of VERIFIED_CLUB_ENTRIES) {
  const crestUrl = `https://a.espncdn.com/i/teamlogos/soccer/500/${espnId}.png`;
  const canonicalId = toCanonicalSlug(matchedName);
  registerVerifiedClubAliases(aliases, { canonicalId, matchedName, crestUrl, leagueHint });
}
for (const [aliases, matchedName, compId, imgVer, leagueHint] of VERIFIED_365_ENTRIES) {
  const crestUrl = `https://imagecache.365scores.com/image/upload/f_png,w_160,h_160,c_limit/v${imgVer}/Competitors/${compId}`;
  const canonicalId = toCanonicalSlug(matchedName);
  registerVerifiedClubAliases(aliases, { canonicalId, matchedName, crestUrl, leagueHint });
}

function disambiguateVerifiedByContext(
  key: string,
  teamName: string,
  context: string
): { handled: boolean; result: ResolvedTeamCrest | null; canonicalOverride?: string } {
  if (key === 'inter') {
    const isItaly = context.includes('🇮🇹') || /serie\s*a|mil[aã]o|italia|it[aá]lia/i.test(context);
    const hit = VERIFIED_CLUB_MAP.get(isItaly ? 'internazionale' : 'internacional');
    return {
      handled: true,
      result: hit ? { queryName: teamName, ...hit } : null,
      canonicalOverride: hit?.canonicalId
    };
  }
  if (key === 'vitoria' && (context.includes('🇵🇹') || /portugal|guimar[aã]es|guimaraes/i.test(context))) {
    const hit = VERIFIED_CLUB_MAP.get('vitoria de guimaraes');
    return {
      handled: true,
      result: hit ? { queryName: teamName, ...hit } : null,
      canonicalOverride: hit?.canonicalId
    };
  }
  if (key === 'everton' && (context.includes('🇨🇱') || /chile/i.test(context))) {
    return { handled: true, result: null, canonicalOverride: 'everton-cl' };
  }
  if (key === 'nacional') {
    if (context.includes('🇺🇾') || /uruguay|uruguai/i.test(context)) {
      const hit = VERIFIED_CLUB_MAP.get('nacional montevideo');
      return {
        handled: true,
        result: hit ? { queryName: teamName, ...hit } : null,
        canonicalOverride: hit?.canonicalId
      };
    }
    return { handled: true, result: null, canonicalOverride: 'nacional-other' };
  }
  if (key === 'barcelona' && (context.includes('🇪🇨') || /ligapro|equador|ecuador|guayaquil/i.test(context))) {
    return { handled: true, result: null, canonicalOverride: 'barcelona-ec' };
  }
  if (
    (key === 'athletic club' || key === 'athletic') &&
    (context.includes('🇧🇷') || /brasileir|mineiro|serie\s*b/i.test(context))
  ) {
    return { handled: true, result: null, canonicalOverride: 'athletic-club-br' };
  }
  if (key === 'sporting') {
    if (context.includes('🇵🇹') || /portugal|primeira\s*liga|liga\s*portugal/i.test(context)) {
      const hit = VERIFIED_CLUB_MAP.get('sporting cp');
      return {
        handled: true,
        result: hit ? { queryName: teamName, ...hit } : null,
        canonicalOverride: hit?.canonicalId
      };
    }
  }
  return { handled: false, result: null };
}

function findFuzzyVerifiedMatch(
  probes: string[],
  teamName: string,
  context: string,
  hasUnresolvedBrazilState: boolean
): VerifiedClubRecord | null {
  if (hasUnresolvedBrazilState) return null;

  for (const probe of probes) {
    if (probe.length < 6) continue;
    const probeWords = probe.split(/\s+/).filter(Boolean);
    if (probeWords.length === 0) continue;

    let bestRecord: VerifiedClubRecord | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    let ambiguousTie = false;

    for (const [candidateKey, record] of VERIFIED_CLUB_MAP.entries()) {
      if (candidateKey.length < 6) continue;
      if (AMBIGUOUS_BARE_KEYS.has(candidateKey)) continue;

      const candWords = candidateKey.split(/\s+/).filter(Boolean);
      if (candWords.length !== probeWords.length) continue;
      if (probeWords[0][0] !== candWords[0][0]) continue;

      // Impede que palavras diferentes como "Newcastle Jets" x "Newcastle United" colidam
      let perWordSafe = true;
      for (let i = 0; i < probeWords.length; i++) {
        const pw = probeWords[i];
        const cw = candWords[i];
        if (pw === cw) continue;
        if (pw.length < 4 || cw.length < 4 || damerauLevenshtein(pw, cw) > 2) {
          perWordSafe = false;
          break;
        }
      }
      if (!perWordSafe) continue;

      const dist = damerauLevenshtein(probe, candidateKey);
      const maxDist = probe.length >= 10 && candidateKey.length >= 10 ? 2 : 1;
      const isTruncatedPrefix =
        probeWords.length === 1 &&
        candidateKey.startsWith(probe) &&
        candidateKey.length - probe.length <= 2;

      if (dist > maxDist && !isTruncatedPrefix) continue;

      // Garante que o candidato não conflite com regras de contexto (ex.: Inter / Barcelona / Athletic)
      const ctxCheck = disambiguateVerifiedByContext(candidateKey, teamName, context);
      if (ctxCheck.handled && !ctxCheck.result) continue;

      // Score menor é melhor; prioriza menor distância e menor diferença de tamanho
      const score = dist * 10 + Math.abs(candidateKey.length - probe.length);
      if (score < bestScore) {
        bestScore = score;
        bestRecord = record;
        ambiguousTie = false;
      } else if (score === bestScore && bestRecord && bestRecord.canonicalId !== record.canonicalId) {
        ambiguousTie = true;
      }
    }

    if (bestRecord && !ambiguousTie) {
      return bestRecord;
    }
  }

  return null;
}

function buildProbeKeys(teamName: string): {
  probes: string[];
  hasUnresolvedBrazilState: boolean;
} {
  const exactNorm = normalizeTeamName(teamName, {
    expandAbbreviations: true,
    stripDecorations: false
  });
  const coreNorm = normalizeTeamName(teamName, {
    expandAbbreviations: true,
    stripDecorations: true
  });
  const plainRaw = normalizeTeamName(teamName, {
    expandAbbreviations: false,
    stripDecorations: false
  });

  const probes: string[] = [];
  const pushProbe = (val: string) => {
    const clean = val.trim();
    if (clean && !probes.includes(clean)) probes.push(clean);
  };

  pushProbe(exactNorm);
  pushProbe(coreNorm);
  pushProbe(plainRaw);

  const hasUnresolvedBrazilState =
    hasBrazilianStateSuffix(teamName) &&
    /\s(?:mg|sp|rj|rs|pr|ba|pe|ce|go|df|sc|pb|pa|rn|al|se|ma|pi|mt|ms|to|es|am|ro|ac|ap|rr)$/.test(
      coreNorm
    );

  return { probes, hasUnresolvedBrazilState };
}

function lookupVerifiedClubCrest(
  teamName: string,
  sport: string,
  context: string
): ResolvedTeamCrest | null {
  const normSport = normalizeText(sport || '');
  if (normSport && !/(?:futebol|soccer|football|futsal)/i.test(normSport)) return null;

  const { probes, hasUnresolvedBrazilState } = buildProbeKeys(teamName);

  for (const k of probes) {
    const disambig = disambiguateVerifiedByContext(k, teamName, context);
    if (disambig.handled) return disambig.result;

    const hit = VERIFIED_CLUB_MAP.get(k);
    if (hit) return { queryName: teamName, ...hit };
  }

  const fuzzyHit = findFuzzyVerifiedMatch(probes, teamName, context, hasUnresolvedBrazilState);
  if (fuzzyHit) {
    return { queryName: teamName, ...fuzzyHit };
  }

  return null;
}

/**
 * Resolve o identificador canônico de um time após executar o pipeline completo de normalização
 * (remoção de acentos, minúsculas, pontuação, expansão de abreviações e tolerância a variações
 * como 'Newcastle' e 'Newcastl'). Usado como chave antes da busca pelos escudos.
 */
export function resolveCanonicalTeamId(
  teamName: string,
  sport = 'Futebol',
  context = ''
): string {
  const cleanName = (teamName || '').trim();
  if (!cleanName) return '';

  const normSport = normalizeText(sport || '');
  const isSoccer = !normSport || /(?:futebol|soccer|football|futsal)/i.test(normSport);

  if (isSoccer) {
    const { probes, hasUnresolvedBrazilState } = buildProbeKeys(cleanName);

    for (const k of probes) {
      const disambig = disambiguateVerifiedByContext(k, cleanName, context);
      if (disambig.handled) {
        if (disambig.canonicalOverride) return disambig.canonicalOverride;
        if (disambig.result?.canonicalId) return disambig.result.canonicalId;
      }

      const hit = VERIFIED_CLUB_MAP.get(k);
      if (hit) return hit.canonicalId;
    }

    const fuzzyHit = findFuzzyVerifiedMatch(probes, cleanName, context, hasUnresolvedBrazilState);
    if (fuzzyHit) return fuzzyHit.canonicalId;

    const preferredCore = probes[1] || probes[0] || cleanName;
    return toCanonicalSlug(preferredCore) || toCanonicalSlug(cleanName);
  }

  const sportSlug = toCanonicalSlug(mapAppSportToEspn(sport)) || 'sport';
  const normOther = normalizeTeamName(cleanName, {
    expandAbbreviations: true,
    stripDecorations: true
  });
  return `${sportSlug}:${toCanonicalSlug(normOther) || toCanonicalSlug(cleanName)}`;
}

export const getCanonicalTeamIdentifier = resolveCanonicalTeamId;

const CACHE_STORAGE_KEY = 'apex_team_crests_v7';
const HIT_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const MISS_TTL_MS = 15 * 1000;

interface CachedCrestEntry {
  matchedName: string;
  crestUrl: string | null;
  leagueHint?: string;
  ts: number;
}

interface Score365Competitor {
  id: number;
  countryId?: number;
  sportId?: number;
  name?: string;
  shortName?: string;
  type?: number;
  gender?: number;
  imageVersion?: number;
  popularityRank?: number;
}

interface Score365Response {
  countries?: Array<{ id: number; name?: string }>;
  competitors?: Score365Competitor[];
}

function mapAppSportTo365Id(sport?: string): number {
  const s = (sport || '').toLowerCase();
  if (s.includes('basquete')) return 2;
  if (s.includes('tênis') || s.includes('tenis')) return 3;
  if (s.includes('hóquei') || s.includes('hoquei')) return 4;
  return 1;
}

function score365Candidate(
  comp: Score365Competitor,
  countryName: string,
  queryUsed: string,
  originalTeamName: string,
  expectedSportId: number,
  context: string
): number {
  if (!comp.id || !comp.name) return -999;
  if (comp.type && comp.type !== 1) return -999; // competitors type 1 = teams/athletes

  const display = normalizeText(comp.name);
  const shortDisplay = normalizeText(comp.shortName || '');
  const target = normalizeText(queryUsed);
  const origTarget = normalizeText(
    stripAggressiveClubDecorations(originalTeamName, true) || originalTeamName
  );

  const mainEval = evaluateNameMatch(display, target, origTarget);
  const shortEval = shortDisplay ? evaluateNameMatch(shortDisplay, target, origTarget) : { matched: false, score: -999 };
  const nameScore = Math.max(mainEval.score, shortEval.score);
  if (nameScore <= -500) return -999;

  let score = nameScore;

  // Sport match
  if (comp.sportId === expectedSportId) {
    score += 45;
  } else {
    score -= 95;
  }

  // Penalize women / youth / reserves unless explicitly requested
  const targetAsksYouthOrWomen = /\b(women|feminin[oa]|u20|u21|u19|u18|u17|sub-?20|youth)\b/i.test(
    originalTeamName
  );
  if (!targetAsksYouthOrWomen) {
    if (
      comp.gender === 2 ||
      /\(\s*w\s*\)|\b(women|feminino|feminina|femenil|frauen|vrouwen|dames|ladies)\b/i.test(comp.name)
    ) {
      score -= 105;
    }
    if (/\b(u18|u19|u20|u21|u23|youth|academy|reserves?|jong|castilla)\b/i.test(comp.name)) {
      score -= 100;
    }
    if (/\b(?:ii|iii|b)\b/.test(display) && !/\b(?:ii|iii|b)\b/i.test(originalTeamName)) {
      score -= 70;
    }
  }

  // Country disambiguation & strict conflict check
  const cNorm = normalizeText(countryName);
  for (const rule of CONTEXT_LEAGUE_KEYWORDS) {
    if (rule.test.test(context)) {
      if (cNorm && rule.countries.some((c) => cNorm.includes(c))) {
        score += 65;
      } else if (cNorm) {
        score -= 100;
      }
    }
  }

  // Small tiebreaker for popular senior clubs when no country specified
  if (comp.popularityRank && comp.popularityRank > 0) {
    score += Math.min(12, Math.round(comp.popularityRank / 100));
  }

  return score;
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
  const canonicalId = resolveCanonicalTeamId(teamName, sport, context);
  const flagsOnly = (context.match(FLAG_REGEX) || []).join('');
  return `${canonicalId}|${normalizeText(sport)}|${flagsOnly}`;
}

export function getCachedTeamCrest(
  teamName: string,
  sport = 'Futebol',
  context = ''
): ResolvedTeamCrest | null {
  const verified = lookupVerifiedClubCrest(teamName, sport, context);
  if (verified) return verified;

  const canonicalId = resolveCanonicalTeamId(teamName, sport, context);
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
    leagueHint: hit.leagueHint,
    canonicalId
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

  const canonicalId = resolveCanonicalTeamId(cleanName, sport, context);
  const cached = getCachedTeamCrest(cleanName, sport, context);
  if (cached) return cached;

  const key = makeCacheKey(cleanName, sport, context);
  const existingReq = inFlightRequests.get(key);
  if (existingReq) return existingReq;

  const promise = (async (): Promise<ResolvedTeamCrest> => {
    const expectedSport = mapAppSportToEspn(sport);
    const expected365SportId = mapAppSportTo365Id(sport);
    const searchQueries = buildSearchCandidates(cleanName, context);

    let bestCandidate: { matchedName: string; crestUrl: string; leagueHint?: string } | null = null;
    let bestScore = -999;
    let hadHttpOrNetworkError = false;

    // 1. ESPN search across prioritized candidates
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
          if (s > bestScore && item.image?.default) {
            bestScore = s;
            bestCandidate = {
              matchedName: item.displayName || cleanName,
              crestUrl: item.image.default,
              leagueHint: item.subtitle || item.description
            };
          }
        }

        if (bestCandidate && bestScore >= 120) {
          break;
        }
      } catch {
        hadHttpOrNetworkError = true;
      }
    }

    // 2. 365Scores global fallback whenever ESPN didn't produce a strong confirmed hit
    if (!bestCandidate || bestScore < 95) {
      for (const q of searchQueries.slice(0, 3)) {
        try {
          const url = `https://webws.365scores.com/web/search/?query=${encodeURIComponent(q)}&langId=1`;
          const res = await fetch(url);
          if (!res.ok) {
            hadHttpOrNetworkError = true;
            continue;
          }
          const json = (await res.json()) as Score365Response;
          const countryMap = new Map<number, string>();
          for (const c of json.countries || []) {
            if (c.id && c.name) countryMap.set(c.id, c.name);
          }

          for (const comp of json.competitors || []) {
            const countryName = comp.countryId ? countryMap.get(comp.countryId) || '' : '';
            const s = score365Candidate(comp, countryName, q, cleanName, expected365SportId, context);
            if (s > bestScore) {
              const ver = comp.imageVersion || 1;
              bestScore = s;
              bestCandidate = {
                matchedName: comp.name || cleanName,
                crestUrl: `https://imagecache.365scores.com/image/upload/f_png,w_160,h_160,c_limit/v${ver}/Competitors/${comp.id}`,
                leagueHint: countryName || undefined
              };
            }
          }

          if (bestCandidate && bestScore >= 120) {
            break;
          }
        } catch {
          hadHttpOrNetworkError = true;
        }
      }
    }

    const resolved: ResolvedTeamCrest =
      bestCandidate && bestScore >= 50
        ? {
            queryName: cleanName,
            matchedName: bestCandidate.matchedName,
            crestUrl: bestCandidate.crestUrl,
            leagueHint: bestCandidate.leagueHint,
            canonicalId
          }
        : {
            queryName: cleanName,
            matchedName: cleanName,
            crestUrl: null,
            canonicalId
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
