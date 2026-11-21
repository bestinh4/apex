import { FOOTBALL_MARKETS, FootballMarket } from '../data/footballMarkets';

export interface ParsedBetLeg {
  matchId?: number;
  event: string;
  sport: string;
  tournament?: string;
  marketGroup: string;
  selection: string;
  odd: number;
  isLive?: boolean;
  startAt?: number;
}

export interface ParsedBetLinkResult {
  success: boolean;
  bookmaker: string | null;
  sport: string;
  event: string;
  market: string;
  tournament?: string;
  odd: number | null;
  stake: number | null;
  units?: number | null;
  stakeIncludedInSource: boolean;
  status: 'PENDENTE';
  isMultiple: boolean;
  selectionsCount: number;
  legs: ParsedBetLeg[];
  shareCode?: string;
  sourceUrl?: string;
  partial?: boolean;
  warning?: string;
  error?: string;
}

const DEFAULT_1WIN_API_URL = 'https://api-gateway.top-parser.com';
const DEFAULT_1WIN_PARTNER_ID = '44ba10e5-7df2-47ab-a44d-dc93803c7a6e';

const FLAG_REGEX = /(?:\p{Regional_Indicator}{2}|🏴󠁧󠁢[a-z]+󠁿)/gu;

export const CATEGORY_COUNTRY_FLAGS: Record<string, string> = {
  albania: '🇦🇱',
  argentina: '🇦🇷',
  armenia: '🇦🇲',
  aruba: '🇦🇼',
  asia: '🌏',
  australia: '🇦🇺',
  'australian-open': '🇦🇺',
  austria: '🇦🇹',
  azerbaijan: '🇦🇿',
  belarus: '🇧🇾',
  belgium: '🇧🇪',
  bolivia: '🇧🇴',
  'bosnia-herzegovina': '🇧🇦',
  brazil: '🇧🇷',
  bulgaria: '🇧🇬',
  cambodia: '🇰🇭',
  canada: '🇨🇦',
  chile: '🇨🇱',
  china: '🇨🇳',
  'chinese-taipei': '🇹🇼',
  colombia: '🇨🇴',
  'costa-rica': '🇨🇷',
  croatia: '🇭🇷',
  cyprus: '🇨🇾',
  czechia: '🇨🇿',
  'czech-republic': '🇨🇿',
  denmark: '🇩🇰',
  'dominican-republic': '🇩🇴',
  ecuador: '🇪🇨',
  egypt: '🇪🇬',
  'el-salvador': '🇸🇻',
  england: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  epl: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  estonia: '🇪🇪',
  europe: '🇪🇺',
  finland: '🇫🇮',
  france: '🇫🇷',
  germany: '🇩🇪',
  gibraltar: '🇬🇮',
  'global-championship': '🌍',
  greece: '🇬🇷',
  guatemala: '🇬🇹',
  'hong-kong': '🇭🇰',
  'hong-kong-china': '🇭🇰',
  hungary: '🇭🇺',
  iceland: '🇮🇸',
  india: '🇮🇳',
  indonesia: '🇮🇩',
  international: '🌍',
  ipl: '🇮🇳',
  israel: '🇮🇱',
  italy: '🇮🇹',
  jamaica: '🇯🇲',
  japan: '🇯🇵',
  jordan: '🇯🇴',
  kazakhstan: '🇰🇿',
  kenya: '🇰🇪',
  kosovo: '🇽🇰',
  kuwait: '🇰🇼',
  lebanon: '🇱🇧',
  lithuania: '🇱🇹',
  malaysia: '🇲🇾',
  malta: '🇲🇹',
  mexico: '🇲🇽',
  moldova: '🇲🇩',
  morocco: '🇲🇦',
  myanmar: '🇲🇲',
  'national-teams': '🌍',
  netherlands: '🇳🇱',
  'new-zealand': '🇳🇿',
  nicaragua: '🇳🇮',
  nigeria: '🇳🇬',
  'north-macedonia': '🇲🇰',
  'northern-ireland': '🇬🇧',
  norway: '🇳🇴',
  oman: '🇴🇲',
  panama: '🇵🇦',
  paraguay: '🇵🇾',
  peru: '🇵🇪',
  philippines: '🇵🇭',
  poland: '🇵🇱',
  portugal: '🇵🇹',
  'puerto-rico': '🇵🇷',
  'republic-of-korea': '🇰🇷',
  'roland-garros': '🇫🇷',
  romania: '🇷🇴',
  russia: '🇷🇺',
  rwanda: '🇷🇼',
  'saint-kitts-and-nevis': '🇰🇳',
  'saudi-arabia': '🇸🇦',
  scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  serbia: '🇷🇸',
  singapore: '🇸🇬',
  slovakia: '🇸🇰',
  slovenia: '🇸🇮',
  'south-africa': '🇿🇦',
  'south-america': '🌎',
  'south-korea': '🇰🇷',
  spain: '🇪🇸',
  'sri-lanka': '🇱🇰',
  sweden: '🇸🇪',
  switzerland: '🇨🇭',
  thailand: '🇹🇭',
  tunisia: '🇹🇳',
  turkey: '🇹🇷',
  uganda: '🇺🇬',
  ukraine: '🇺🇦',
  'united-arab-emirates': '🇦🇪',
  uruguay: '🇺🇾',
  'us-open': '🇺🇸',
  usa: '🇺🇸',
  uzbekistan: '🇺🇿',
  venezuela: '🇻🇪',
  vietnam: '🇻🇳',
  wales: '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  wimbledon: '🇬🇧',
  world: '🌍',
  zimbabwe: '🇿🇼'
};

const COMPETITION_FLAG_MAP: Array<[RegExp, string]> = [
  [/\b(jupiler|pro\s*league|belg(?:ium|ica)|belga)\b/i, '🇧🇪'],
  [/\b(brasileir[aã]o|s[eé]rie\s*[abcd]\b|copa\s*do\s*brasil|paulist[aã]o|carioca|ga[uú]cho|mineiro|nordeste|brazil|brasil|nbb)\b/i, '🇧🇷'],
  [/\b(futve|venezuela)\b/i, '🇻🇪'],
  [/\b(betplay|col[oô]mbia)\b/i, '🇨🇴'],
  [/\b(ligapro|equador|ecuador)\b/i, '🇪🇨'],
  [/\b(liga\s*profesional|superliga\s*argentina|copa\s*argentina|primera\s*nacional|argentina)\b/i, '🇦🇷'],
  [/\b(uruguay|uruguai|apertura\s*uruguai)\b/i, '🇺🇾'],
  [/\b(chile|campeonato\s*chileno)\b/i, '🇨🇱'],
  [/\b(peru|liga\s*1\s*peru)\b/i, '🇵🇪'],
  [/\b(paraguai|paraguay|divisi[oó]n\s*profesional)\b/i, '🇵🇾'],
  [/\b(bol[ií]via)\b/i, '🇧🇴'],
  [/\b(premier\s*league|championship|efl|fa\s*cup|league\s*(?:one|two)|england|inglaterra)\b/i, '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  [/\b(laliga|la\s*liga|segunda\s*divisi[oó]n|copa\s*del\s*rey|spain|espanha)\b/i, '🇪🇸'],
  [/\b(serie\s*a|serie\s*b|coppa\s*italia|italy|it[aá]lia)\b/i, '🇮🇹'],
  [/\b(2\.\s*bundesliga|bundesliga|dfb[-\s]*pokal|germany|alemanha)\b/i, '🇩🇪'],
  [/\b(austria|[aá]ustria|admiral\s*bundesliga)\b/i, '🇦🇹'],
  [/\b(ligue\s*1|ligue\s*2|coupe\s*de\s*france|france|fran[cç]a|roland\s*garros)\b/i, '🇫🇷'],
  [/\b(liga\s*portugal|primeira\s*liga|ta[cç]a\s*de\s*portugal|portugal)\b/i, '🇵🇹'],
  [/\b(eredivisie|eerste\s*divisie|knvb|netherlands|holanda|pa[ií]ses\s*baixos)\b/i, '🇳🇱'],
  [/\b(r[uú]ssia|russia|russian\s*premier)\b/i, '🇷🇺'],
  [/\b(s[uü]per\s*lig|turkey|turquia)\b/i, '🇹🇷'],
  [/\b(mls|nba|wnba|nfl|nhl|mlb|ncaa|usa|estados\s*unidos|us\s*open)\b/i, '🇺🇸'],
  [/\b(liga\s*mx|mexico|m[eé]xico)\b/i, '🇲🇽'],
  [/\b(premiership|scotland|esc[oó]cia)\b/i, '🏴󠁧󠁢󠁳󠁣󠁴󠁿'],
  [/\b(super\s*league\s*switzerland|switzerland|su[ií][cç]a)\b/i, '🇨🇭'],
  [/\b(super\s*league\s*greece|greece|gr[eé]cia)\b/i, '🇬🇷'],
  [/\b(ekstraklasa|poland|pol[oô]nia)\b/i, '🇵🇱'],
  [/\b(superligaen|denmark|dinamarca)\b/i, '🇩🇰'],
  [/\b(allsvenskan|sweden|su[eé]cia)\b/i, '🇸🇪'],
  [/\b(eliteserien|norway|noruega)\b/i, '🇳🇴'],
  [/\b(ukraine|ucr[aâ]nia)\b/i, '🇺🇦'],
  [/\b(romania|rom[eê]nia|superliga\s*rom[eê]nia)\b/i, '🇷🇴'],
  [/\b(croatia|cro[aá]cia|hnl)\b/i, '🇭🇷'],
  [/\b(serbia|s[eé]rvia|super\s*liga\s*s[eé]rvia)\b/i, '🇷🇸'],
  [/\b(czechia|rep[uú]blica\s*tcheca|fortuna\s*liga)\b/i, '🇨🇿'],
  [/\b(champions\s*league|europa\s*league|conference\s*league|nations\s*league|uefa|euro(?:copa)?|euroleague)\b/i, '🇪🇺'],
  [/\b(libertadores|sul[-\s]*americana|sudamericana|conmebol|copa\s*am[eé]rica)\b/i, '🌎'],
  [/\b(j[-\s]*league|japan|jap[aã]o)\b/i, '🇯🇵'],
  [/\b(k[-\s]*league|south\s*korea|coreia)\b/i, '🇰🇷'],
  [/\b(saudi|roshn|ar[aá]bia\s*saudita)\b/i, '🇸🇦'],
  [/\b(world\s*cup|copa\s*do\s*mundo|fifa|eliminat[oó]rias)\b/i, '🌍']
];

export interface CompetitionPresetGroup {
  group: string;
  items: Array<{ label: string; value: string }>;
}

export const COMPETITION_PRESET_GROUPS: CompetitionPresetGroup[] = [
  {
    group: 'Brasil',
    items: [
      { label: '🇧🇷 Brasileirão Série A', value: 'Brasileirão Série A 🇧🇷' },
      { label: '🇧🇷 Brasileirão Série B', value: 'Brasileirão Série B 🇧🇷' },
      { label: '🇧🇷 Copa do Brasil', value: 'Copa do Brasil 🇧🇷' },
      { label: '🇧🇷 Paulistão', value: 'Paulistão 🇧🇷' },
      { label: '🇧🇷 Carioca', value: 'Carioca 🇧🇷' },
      { label: '🇧🇷 Copa do Nordeste', value: 'Copa do Nordeste 🇧🇷' }
    ]
  },
  {
    group: 'América do Sul & Concacaf',
    items: [
      { label: '🌎 Libertadores', value: 'Libertadores 🌎' },
      { label: '🌎 Sul-Americana', value: 'Sul-Americana 🌎' },
      { label: '🇦🇷 Liga Profesional', value: 'Liga Profesional 🇦🇷' },
      { label: '🇻🇪 Liga Futve', value: 'Liga Futve 🇻🇪' },
      { label: '🇨🇴 Liga BetPlay', value: 'Liga BetPlay 🇨🇴' },
      { label: '🇪🇨 LigaPro', value: 'LigaPro 🇪🇨' },
      { label: '🇨🇱 Campeonato Chileno', value: 'Campeonato Chileno 🇨🇱' },
      { label: '🇵🇪 Liga 1 Peru', value: 'Liga 1 Peru 🇵🇪' },
      { label: '🇺🇾 Campeonato Uruguaio', value: 'Campeonato Uruguaio 🇺🇾' },
      { label: '🇵🇾 División Profesional', value: 'División Profesional 🇵🇾' },
      { label: '🇲🇽 Liga MX', value: 'Liga MX 🇲🇽' },
      { label: '🇺🇸 MLS', value: 'MLS 🇺🇸' }
    ]
  },
  {
    group: 'Principais da Europa',
    items: [
      { label: '🇪🇺 Champions League', value: 'Champions League 🇪🇺' },
      { label: '🇪🇺 Europa League', value: 'Europa League 🇪🇺' },
      { label: '🇪🇺 Conference League', value: 'Conference League 🇪🇺' },
      { label: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League', value: 'Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
      { label: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Championship', value: 'Championship 🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
      { label: '🇪🇸 LaLiga', value: 'LaLiga 🇪🇸' },
      { label: '🇪🇸 LaLiga 2', value: 'LaLiga 2 🇪🇸' },
      { label: '🇮🇹 Serie A', value: 'Serie A 🇮🇹' },
      { label: '🇮🇹 Serie B', value: 'Serie B 🇮🇹' },
      { label: '🇩🇪 Bundesliga', value: 'Bundesliga 🇩🇪' },
      { label: '🇩🇪 2. Bundesliga', value: '2. Bundesliga 🇩🇪' },
      { label: '🇫🇷 Ligue 1', value: 'Ligue 1 🇫🇷' },
      { label: '🇵🇹 Liga Portugal', value: 'Liga Portugal 🇵🇹' },
      { label: '🇳🇱 Eredivisie', value: 'Eredivisie 🇳🇱' },
      { label: '🇧🇪 Liga Jupiler', value: 'Liga Jupiler 🇧🇪' }
    ]
  },
  {
    group: 'Outras Ligas Europeias',
    items: [
      { label: '🇷🇺 Premier League (Rússia)', value: 'Premier League 🇷🇺' },
      { label: '🇦🇹 Bundesliga (Áustria)', value: 'Bundesliga 🇦🇹' },
      { label: '🇹🇷 Süper Lig', value: 'Süper Lig 🇹🇷' },
      { label: '🏴󠁧󠁢󠁳󠁣󠁴󠁿 Premiership (Escócia)', value: 'Premiership 🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
      { label: '🇨🇭 Super League (Suíça)', value: 'Super League 🇨🇭' },
      { label: '🇬🇷 Super League (Grécia)', value: 'Super League 🇬🇷' },
      { label: '🇵🇱 Ekstraklasa', value: 'Ekstraklasa 🇵🇱' },
      { label: '🇷🇴 Liga 1 (Romênia)', value: 'Liga 1 🇷🇴' },
      { label: '🇩🇰 Superliga (Dinamarca)', value: 'Superliga 🇩🇰' },
      { label: '🇸🇪 Allsvenskan', value: 'Allsvenskan 🇸🇪' },
      { label: '🇳🇴 Eliteserien', value: 'Eliteserien 🇳🇴' },
      { label: '🇺🇦 Premier League (Ucrânia)', value: 'Premier League 🇺🇦' },
      { label: '🇨🇿 Chance Liga (Tchéquia)', value: 'Chance Liga 🇨🇿' },
      { label: '🇭🇷 HNL (Croácia)', value: 'HNL 🇭🇷' }
    ]
  },
  {
    group: 'Ásia, África & Seleções',
    items: [
      { label: '🇸🇦 Saudi Pro League', value: 'Saudi Pro League 🇸🇦' },
      { label: '🇯🇵 J-League', value: 'J-League 🇯🇵' },
      { label: '🇰🇷 K-League', value: 'K-League 🇰🇷' },
      { label: '🌍 Eliminatórias / Copa do Mundo', value: 'Eliminatórias 🌍' },
      { label: '🇪🇺 Eurocopa / Nations League', value: 'Nations League 🇪🇺' },
      { label: '🌎 Copa América', value: 'Copa América 🌎' }
    ]
  },
  {
    group: 'Basquete, Tênis & eSports',
    items: [
      { label: '🇺🇸 NBA', value: 'NBA 🇺🇸' },
      { label: '🇧🇷 NBB', value: 'NBB 🇧🇷' },
      { label: '🇪🇺 EuroLeague', value: 'EuroLeague 🇪🇺' },
      { label: '🎾 ATP / WTA Tour', value: 'ATP Tour 🎾' },
      { label: '🇺🇸 UFC / MMA', value: 'UFC 🇺🇸' },
      { label: '🎮 CS2 / Valorant / LoL', value: 'eSports 🎮' }
    ]
  }
];

export const POPULAR_COMPETITION_PRESETS = COMPETITION_PRESET_GROUPS.flatMap((g) => g.items);

export function inferCompetitionFlag(competitionText: string): string | null {
  for (const [pattern, flag] of COMPETITION_FLAG_MAP) {
    if (pattern.test(competitionText)) {
      return flag;
    }
  }
  return null;
}

function hasFlagEmoji(text: string): boolean {
  FLAG_REGEX.lastIndex = 0;
  return FLAG_REGEX.test(text);
}

function ensureCompetitionHasFlag(competitionText: string): string {
  const clean = competitionText.trim();
  if (!clean || hasFlagEmoji(clean)) return clean;
  const inferred = inferCompetitionFlag(clean);
  if (!inferred) return clean;
  const timeSuffix = clean.match(/\s*(?:[-–]\s*)?(\d{1,2}[:h]\d{2})$/i);
  if (timeSuffix) {
    const base = clean.slice(0, clean.length - timeSuffix[0].length).replace(/[-–\s]+$/, '').trim();
    return `${base} ${inferred} - ${timeSuffix[1]}`;
  }
  return `${clean} ${inferred}`;
}

export function looksLikeBetLinkInput(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/https?:\/\//i.test(trimmed)) return true;
  if (/sharebet[=:][a-zA-Z0-9_-]{4,}/i.test(trimmed)) return true;
  if (trimmed.includes('\n') && trimmed.length >= 10) return true;
  if (/\b\S+\s+(?:x|vs\.?)\s+\S+/i.test(trimmed)) return true;
  return false;
}

function stripLeadingDecorations(line: string): string {
  return line
    .replace(/^[•▪▸►➤✅🔥🎯📌⚽🏀🎾🏐🏓🥊🏒💰📊🏆⏰📅]+\s*/gu, '')
    .replace(
      /^(?:jogo|partida|evento|duelo|match|confronto|mercado|aposta|entrada|tip|pick|linha|sele[cç][aã]o|liga|campeonato|torneio)\s*[:\-–]\s*/i,
      ''
    )
    .trim();
}

function stripDecorativeEmojisKeepFlags(text: string): string {
  return text
    .replace(/[•▪▸►➤✅🔥🎯📌⚽🏀🎾🏐🏓🥊🏒💰📊🏆⏰📅🎖️🏅⚡💎🚀⭐🌟💥🎉💸💵💳📲🔗⏱️🕒]+/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function detectBookmakerInText(raw: string): string | null {
  const lower = raw.toLowerCase();
  if (
    lower.includes('1win') ||
    lower.includes('mob1link') ||
    /one-[a-z0-9-]+\.(com|pro|xyz|top|win|bet|live)/i.test(lower) ||
    /1w[a-z0-9-]+\.(com|pro|xyz|top|win|bet|live|run)/i.test(lower) ||
    lower.includes('sharebet=')
  ) {
    return '1win';
  }
  if (lower.includes('bet365')) return 'Bet365';
  if (lower.includes('betano')) return 'Betano';
  if (lower.includes('stake.com') || lower.includes('stake.bet')) return 'Stake';
  if (lower.includes('pinnacle')) return 'Pinnacle';
  if (lower.includes('betfair')) return 'Betfair';
  if (lower.includes('superbet')) return 'Superbet';
  if (lower.includes('novibet')) return 'Novibet';
  if (/\bkto\b/i.test(lower)) return 'KTO';
  if (lower.includes('estrelabet')) return 'EstrelaBet';
  if (lower.includes('sportingbet')) return 'Sportingbet';
  if (lower.includes('1xbet')) return '1xBet';
  return null;
}

function detectSportFromText(raw: string): string {
  const lower = raw.toLowerCase();
  if (
    /\b(nba|nbb|wnba|euroleague|basquete|basketball|pontos?\s+do\s+jogador|rebotes|triplos|assist[eê]ncias)\b/i.test(
      lower
    )
  ) {
    return 'Basquete';
  }
  if (/\b(t[eê]nis\s+de\s+mesa|tt\s*cup|setka|ping\s*pong)\b/i.test(lower)) {
    return 'Tênis de Mesa';
  }
  if (/\b(atp|wta|challenger|itf|grand\s*slam|tie[-\s]?break|t[eê]nis|games?\b)\b/i.test(lower)) {
    return 'Tênis';
  }
  if (/\b(v[oô]lei|volleyball|superliga|liga\s+das\s+na[cç][oõ]es)\b/i.test(lower)) {
    return 'Vôlei';
  }
  if (
    /\b(ufc|mma|bellator|pfl|boxe|boxing|cs2|cs:go|valorant|dota|league\s+of\s+legends|lol|esports?)\b/i.test(
      lower
    )
  ) {
    return 'MMA / eSports';
  }
  if (/\b(nhl|khl|h[oó]quei|hockey)\b/i.test(lower)) {
    return 'Hóquei no Gelo';
  }
  return 'Futebol';
}

function extractOddFromText(raw: string): { odd: number | null; cleaned: string } {
  let odd: number | null = null;
  let cleaned = raw;

  const atMatch = cleaned.match(/@\s*(\d+(?:[.,]\d{1,3})?)/);
  if (atMatch) {
    const val = Number(atMatch[1].replace(',', '.'));
    if (Number.isFinite(val) && val > 1 && val < 10000) {
      odd = Number(val.toFixed(2));
      cleaned = cleaned.replace(atMatch[0], ' ');
    }
  }

  if (odd === null) {
    const labeledMatch = cleaned.match(
      /\b(?:odd|odds|cota[cç][aã]o|cot)\s*[:=]?\s*(\d+(?:[.,]\d{1,3})?)/i
    );
    if (labeledMatch) {
      const val = Number(labeledMatch[1].replace(',', '.'));
      if (Number.isFinite(val) && val > 1 && val < 10000) {
        odd = Number(val.toFixed(2));
        cleaned = cleaned.replace(labeledMatch[0], ' ');
      }
    }
  }

  return { odd, cleaned: cleaned.replace(/\s{2,}/g, ' ').trim() };
}

function extractStakeOrUnitsFromText(raw: string): {
  stake: number | null;
  units: number | null;
  cleaned: string;
} {
  let stake: number | null = null;
  let units: number | null = null;
  let cleaned = raw;

  const moneyMatch =
    cleaned.match(/R\$\s*(\d+(?:[.,]\d{1,2})?)/i) ||
    cleaned.match(
      /\b(?:stake|valor)\s*[:=]?\s*(?:R\$\s*)?(\d+(?:[.,]\d{1,2})?)(?!\s*(?:unidades?|unid|un|u)\b)/i
    );
  if (moneyMatch) {
    const n = Number(moneyMatch[1].replace(',', '.'));
    if (Number.isFinite(n) && n > 0 && n < 1_000_000) {
      stake = Number(n.toFixed(2));
      cleaned = cleaned.replace(moneyMatch[0], ' ');
    }
  }

  const unitMatch = cleaned.match(
    /\(?\s*(\d+(?:[.,]\d{1,2})?)\s*(?:unidades?|unid|un|u)\.?\s*\)?/i
  );
  if (unitMatch) {
    const u = Number(unitMatch[1].replace(',', '.'));
    if (Number.isFinite(u) && u > 0 && u <= 100) {
      units = Number(u.toFixed(2));
      cleaned = cleaned.replace(unitMatch[0], ' ');
    }
  }

  cleaned = cleaned
    .replace(/\(\s*\)/g, ' ')
    .replace(/[|•\-–]+\s*$/g, '')
    .replace(/^\s*[|•\-–]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return { stake, units, cleaned };
}

function isMatchupLine(line: string): boolean {
  const clean = stripDecorativeEmojisKeepFlags(stripLeadingDecorations(line));
  if (!clean) return false;
  if (/^.+?\s+(?:x|vs\.?|v)\s+.+$/i.test(clean)) return true;
  const dashMatch = clean.match(/^(.+?)\s+[-–]\s+(.+)$/);
  if (dashMatch) {
    const right = dashMatch[2].trim();
    if (/^\d{1,2}[:h]\d{2}$/i.test(right)) return false;
    if (/^\d+$/.test(right)) return false;
    if (dashMatch[1].trim().length >= 2 && right.length >= 2) return true;
  }
  return false;
}

function isLeagueOrHeaderLine(line: string): boolean {
  const clean = stripDecorativeEmojisKeepFlags(stripLeadingDecorations(line)).trim();
  if (!clean || isMatchupLine(clean)) return false;
  if (hasFlagEmoji(clean)) return true;
  if (/\s+[-–]\s+\d{1,2}[:h]\d{2}\b/i.test(clean)) return true;
  if (/^live\b/i.test(clean)) return true;
  if (inferCompetitionFlag(clean) !== null) return true;
  if (/^(?:liga|campeonato|torneio|copa|ta[cç]a)\b/i.test(clean)) return true;
  return false;
}

export function parseBetTipText(rawInput: string): ParsedBetLinkResult | null {
  const withoutUrls = rawInput.replace(/https?:\/\/[^\s<>"'`]+/gi, '').trim();
  if (!withoutUrls) return null;

  const rawLines = withoutUrls
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const lines =
    rawLines.length === 1 && rawLines[0].includes('|')
      ? rawLines[0]
          .split('|')
          .map((l) => l.trim())
          .filter(Boolean)
      : rawLines;

  if (lines.length === 0) return null;

  const { odd, cleaned: textWithoutOdd } = extractOddFromText(lines.join('\n'));
  const { stake, units } = extractStakeOrUnitsFromText(textWithoutOdd);
  const bookmaker = detectBookmakerInText(rawInput);
  const sport = detectSportFromText(rawInput);

  let tournament = '';
  let matchup = '';
  const marketCandidates: string[] = [];

  for (const originalLine of lines) {
    const step1 = extractOddFromText(originalLine).cleaned;
    const step2 = extractStakeOrUnitsFromText(step1).cleaned;
    const cleanLine = stripDecorativeEmojisKeepFlags(stripLeadingDecorations(step2));

    if (!cleanLine) continue;
    if (/^\d{1,2}[:h]\d{2}$/i.test(cleanLine)) continue;

    if (!matchup && isMatchupLine(cleanLine)) {
      matchup = cleanLine.replace(/\s+/g, ' ').trim();
      continue;
    }

    if (!tournament && isLeagueOrHeaderLine(originalLine)) {
      const normalizedHeader = stripDecorativeEmojisKeepFlags(stripLeadingDecorations(originalLine))
        .replace(/\s*(?:[-–]\s*)?(\d{1,2}[:h]\d{2})$/i, ' - $1')
        .replace(/\s{2,}/g, ' ')
        .trim();
      tournament = ensureCompetitionHasFlag(normalizedHeader);
      continue;
    }

    marketCandidates.push(cleanLine);
  }

  if (!matchup && marketCandidates.length >= 2 && !tournament) {
    tournament = ensureCompetitionHasFlag(marketCandidates.shift() || '');
  }

  const market = marketCandidates.join(' · ').trim();
  const formattedEvent =
    tournament && matchup
      ? `${tournament} ${matchup}`
      : ensureCompetitionHasFlag(matchup || tournament);

  if (!formattedEvent && !market && odd === null && stake === null && units === null) {
    return null;
  }

  const missing: string[] = [];
  if (odd === null) missing.push('Odd');
  if (stake === null && units === null) missing.push('Stake');

  let warning: string | undefined;
  if (missing.length > 0) {
    warning = `Informações identificadas! Informe ${missing.join(' e ')} manualmente abaixo antes de confirmar.`;
  } else if (units !== null && stake === null) {
    warning = `Unidade identificada (${units}u). Confira o valor da Stake calculado e a Odd abaixo.`;
  }

  return {
    success: true,
    bookmaker,
    sport,
    event: formattedEvent,
    market,
    tournament: tournament || undefined,
    odd,
    stake,
    units,
    stakeIncludedInSource: stake !== null || units !== null,
    status: 'PENDENTE',
    isMultiple: false,
    selectionsCount: 1,
    legs:
      formattedEvent || market
        ? [
            {
              event: matchup || formattedEvent || 'Entrada',
              sport,
              tournament: tournament || undefined,
              marketGroup: market || 'Mercado',
              selection: market || '',
              odd: odd || 0
            }
          ]
        : [],
    partial: !formattedEvent || !market || odd === null,
    warning
  };
}

function extractShareBetCodeFromInput(raw: string): string | null {
  const qpMatch = raw.match(/(?:sharebet|shareBet|coupon|betCode)[=:]([a-zA-Z0-9_-]{4,32})/);
  if (qpMatch) return qpMatch[1];
  const pathMatch = raw.match(/\/shared-bets?\/([a-zA-Z0-9_-]{4,32})/i);
  if (pathMatch) return pathMatch[1];
  const trimmed = raw.trim();
  if (/^[a-zA-Z0-9]{6,16}$/.test(trimmed)) return trimmed;
  return null;
}

function humanizeSlug(slug?: string): string | undefined {
  if (!slug) return undefined;
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function map1winSport(sportObj?: { slug?: string; tag?: string; isEsport?: boolean }): string {
  if (!sportObj) return 'Futebol';
  if (sportObj.isEsport) return 'MMA / eSports';
  const key = `${sportObj.slug || ''} ${sportObj.tag || ''}`.toLowerCase();
  if (key.includes('football') || key.includes('soccer') || key.includes('futsal')) return 'Futebol';
  if (key.includes('basketball')) return 'Basquete';
  if (key.includes('table-tennis') || key.includes('table_tennis')) return 'Tênis de Mesa';
  if (key.includes('tennis')) return 'Tênis';
  if (key.includes('volleyball') || key.includes('beach-volley')) return 'Vôlei';
  if (key.includes('ice-hockey') || key.includes('hockey')) return 'Hóquei no Gelo';
  if (key.includes('mma') || key.includes('ufc') || key.includes('boxing') || key.includes('esport')) {
    return 'MMA / eSports';
  }
  return 'Futebol';
}

function format1winTournamentHeaderClient(match?: {
  category?: { slug?: string };
  tournament?: { slug?: string };
  serviceV2?: string;
  startAt?: number;
}): { tournamentLabel?: string; prefix: string } {
  if (!match) return { prefix: '' };
  const catSlug = (match.category?.slug || '').toLowerCase().trim();
  const tourSlug = (match.tournament?.slug || '').toLowerCase();
  const name = humanizeSlug(match.tournament?.slug);
  const flag =
    (catSlug && CATEGORY_COUNTRY_FLAGS[catSlug]) ||
    (name ? inferCompetitionFlag(name) || '' : '') ||
    (tourSlug ? inferCompetitionFlag(tourSlug.replace(/-/g, ' ')) || '' : '');

  const isLive = match.serviceV2 === 'live';
  let timeStr = '';
  if (!isLive && match.startAt) {
    try {
      const ms = match.startAt > 1e12 ? match.startAt : match.startAt * 1000;
      const d = new Date(ms);
      if (!Number.isNaN(d.getTime())) {
        timeStr = new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).format(d);
      }
    } catch {
      // ignore timezone errors
    }
  }

  const base = isLive
    ? [name || 'Live', flag].filter(Boolean).join(' ')
    : [name, flag].filter(Boolean).join(' ');

  if (!base && !isLive) return { prefix: '' };

  const prefix = isLive
    ? name
      ? `Live ${flag ? `${flag} ` : ''}${name}`.trim()
      : `Live${flag ? ` ${flag}` : ''}`
    : `${base}${timeStr ? ` - ${timeStr}` : ''}`.trim();

  return { tournamentLabel: base || undefined, prefix };
}

interface OneWinWsGroup {
  id: string | number;
  name?: string;
  oddsList?: Array<{ id: string; cf?: number; name?: string; outcome?: string }>;
}

async function fetch1winMatchOddsDirectBrowser(
  matchIds: number[]
): Promise<Map<number, OneWinWsGroup[]>> {
  const result = new Map<number, OneWinWsGroup[]>();
  if (matchIds.length === 0 || typeof WebSocket === 'undefined') return result;

  const uniqueIds = [...new Set(matchIds)];
  const wsUrl = `wss://api-gateway.top-parser.com/push-server-v2/?Language=pt&externalPartnerId=${encodeURIComponent(
    DEFAULT_1WIN_PARTNER_ID
  )}&EIO=4&transport=websocket`;

  return await new Promise<Map<number, OneWinWsGroup[]>>((resolve) => {
    let settled = false;
    let ws: WebSocket | null = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      try {
        ws?.close();
      } catch {
        // ignore close error
      }
      resolve(result);
    };

    const timer = window.setTimeout(finish, 5500);

    try {
      ws = new WebSocket(wsUrl);
    } catch {
      finish();
      return;
    }

    ws.addEventListener('error', finish);
    ws.addEventListener('close', finish);
    ws.addEventListener('message', (ev) => {
      const msg = String(ev.data || '');
      if (msg === '2') {
        ws?.send('3');
        return;
      }
      if (msg.startsWith('0')) {
        ws?.send('40');
        return;
      }
      if (msg.startsWith('40')) {
        ws?.send(
          `42${JSON.stringify([
            'subscribe',
            {
              messageType: 'subscribe-match-odds',
              data: { matchIds: uniqueIds, isBaseOddsGroups: false }
            }
          ])}`
        );
        return;
      }
      if (msg.startsWith('42')) {
        try {
          const parsed = JSON.parse(msg.slice(2)) as [
            string,
            {
              messageType?: string;
              data?: { matchId?: number; oddsGroups?: OneWinWsGroup[] };
              error?: { matchId?: number };
            }
          ];
          const [evName, evBody] = parsed;
          if (evName === 'u' && evBody?.messageType === 'match-odds-snapshot') {
            if (evBody.data?.matchId && Array.isArray(evBody.data.oddsGroups)) {
              result.set(evBody.data.matchId, evBody.data.oddsGroups);
            } else if (evBody.error?.matchId) {
              result.set(evBody.error.matchId, []);
            }
            if (result.size >= uniqueIds.length) finish();
          }
        } catch {
          // ignore malformed frames
        }
      }
    });
  });
}

/**
 * Direct browser fallback for 1win shared links (runs if /api/parse-bet-link
 * is unavailable, e.g. on static shared previews or cached PWA offline shells).
 */
async function resolve1winDirectInBrowser(
  code: string,
  rawInput: string
): Promise<ParsedBetLinkResult> {
  const headers = {
    accept: 'application/json',
    'content-type': 'application/json',
    'x-lang': 'pt',
    'x-external-partner-id': DEFAULT_1WIN_PARTNER_ID
  };

  const sharedRes = await fetch(`${DEFAULT_1WIN_API_URL}/shared-bets/get`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ code })
  });

  const sharedJson = (await sharedRes.json().catch(() => null)) as {
    result?: { coupons?: Array<{ oddId: string; matchId: number }> };
    errors?: Array<{ code?: string }>;
  } | null;

  if (!sharedRes.ok || !sharedJson?.result?.coupons?.length) {
    const errCode = sharedJson?.errors?.[0]?.code;
    if (errCode === 'not_found_error') {
      throw new Error(`Código de aposta "${code}" não encontrado ou expirado na 1win.`);
    }
    throw new Error('Não foi possível consultar esse bilhete na 1win.');
  }

  const coupons = sharedJson.result.coupons;
  const uniqueMatchIds = [...new Set(coupons.map((c) => c.matchId))];

  const [matchResults, oddsSnapshotMap] = await Promise.all([
    Promise.allSettled(
      uniqueMatchIds.map(async (matchId) => {
        const r = await fetch(
          `${DEFAULT_1WIN_API_URL}/matches/get?matchId=${matchId}&l=pt&p=${encodeURIComponent(
            DEFAULT_1WIN_PARTNER_ID
          )}`,
          { headers }
        );
        if (!r.ok) return null;
        const j = (await r.json()) as {
          result?: {
            id: number;
            name?: string;
            homeTeam?: { name?: string };
            awayTeam?: { name?: string };
            competitors?: Array<{ name?: string }>;
            sport?: { slug?: string; tag?: string; isEsport?: boolean };
            category?: { slug?: string };
            tournament?: { slug?: string };
            serviceV2?: string;
            startAt?: number;
          };
        };
        return j.result || null;
      })
    ),
    fetch1winMatchOddsDirectBrowser(uniqueMatchIds)
  ]);

  const matchMap = new Map<number, NonNullable<Awaited<ReturnType<typeof fetch1winMatchStub>>>>();
  async function fetch1winMatchStub() {
    return null as {
      id: number;
      name?: string;
      homeTeam?: { name?: string };
      awayTeam?: { name?: string };
      competitors?: Array<{ name?: string }>;
      sport?: { slug?: string; tag?: string; isEsport?: boolean };
      category?: { slug?: string };
      tournament?: { slug?: string };
      serviceV2?: string;
      startAt?: number;
    } | null;
  }

  for (const res of matchResults) {
    if (res.status === 'fulfilled' && res.value) {
      matchMap.set(res.value.id, res.value);
    }
  }

  const legs: ParsedBetLeg[] = [];
  let missingOdds = 0;

  for (const c of coupons) {
    const m = matchMap.get(c.matchId);
    const groups = oddsSnapshotMap.get(c.matchId) || [];
    let groupName = '';
    let selection = '';
    let oddVal = 0;

    for (const g of groups) {
      const hit = g.oddsList?.find((o) => o.id === c.oddId);
      if (hit) {
        groupName = g.name || 'Mercado';
        selection = hit.name || hit.outcome || '';
        oddVal = Number(hit.cf || 0);
        break;
      }
    }
    if (!oddVal) missingOdds += 1;

    const home = m?.homeTeam?.name || m?.competitors?.[0]?.name;
    const away = m?.awayTeam?.name || m?.competitors?.[1]?.name;
    const matchup =
      home && away
        ? `${home} vs ${away}`
        : (m?.name || `Partida #${c.matchId}`).replace(/\s+-\s+/, ' vs ');
    const { tournamentLabel, prefix } = format1winTournamentHeaderClient(m);
    const fullEvent = prefix ? `${prefix} ${matchup}` : matchup;

    legs.push({
      matchId: c.matchId,
      event: fullEvent,
      sport: map1winSport(m?.sport),
      tournament: tournamentLabel,
      marketGroup: groupName || 'Mercado 1win',
      selection: selection || 'Seleção encerrada/indisponível',
      odd: oddVal,
      isLive: m?.serviceV2 === 'live',
      startAt: m?.startAt
    });
  }

  const isMultiple = legs.length > 1;
  const validOdds = legs.map((l) => l.odd).filter((o) => o > 1);
  const combinedOdd =
    validOdds.length === legs.length && validOdds.length > 0
      ? Number(validOdds.reduce((a, b) => a * b, 1).toFixed(2))
      : null;

  const eventSummary = isMultiple
    ? `Múltipla (${legs.length}x): ${legs.map((l) => l.event).join(' + ')}`
    : legs[0].event;

  const marketSummary = isMultiple
    ? legs
        .map((l, idx) => `${idx + 1}) ${l.event}: ${l.marketGroup} — ${l.selection}${l.odd > 1 ? ` @ ${l.odd.toFixed(2)}` : ''}`)
        .join(' | ')
    : legs[0].odd > 1
    ? `${legs[0].marketGroup}: ${legs[0].selection}`
    : '';

  const stakeCheck = extractStakeOrUnitsFromText(rawInput);

  return {
    success: true,
    bookmaker: '1win',
    sport: legs[0]?.sport || 'Futebol',
    event: eventSummary,
    market: marketSummary,
    tournament: legs[0]?.tournament,
    odd: combinedOdd,
    stake: stakeCheck.stake,
    units: stakeCheck.units,
    stakeIncludedInSource: stakeCheck.stake !== null || stakeCheck.units !== null,
    status: 'PENDENTE',
    isMultiple,
    selectionsCount: legs.length,
    legs,
    shareCode: code,
    partial: missingOdds > 0,
    warning:
      missingOdds > 0
        ? 'O evento foi identificado, mas a cotação/linha já foi encerrada na casa. Confira o mercado e a odd manualmente.'
        : stakeCheck.stake === null
        ? 'Link compartilhado identificado! Como o código da 1win não envia o valor da sua aposta, confira sua Stake abaixo.'
        : undefined
  };
}

export async function parseBetLink(rawInput: string): Promise<ParsedBetLinkResult> {
  const trimmed = rawInput.trim();
  const hasUrl = /https?:\/\//i.test(trimmed);
  const shareCode = extractShareBetCodeFromInput(trimmed);
  const hasShareCodeParam = /sharebet[=:][a-zA-Z0-9_-]{4,}/i.test(trimmed);
  const isBareShareCode = /^[a-zA-Z0-9]{6,16}$/.test(trimmed);

  const localTip = parseBetTipText(trimmed);

  if (!hasUrl && !hasShareCodeParam && !isBareShareCode) {
    if (localTip) return localTip;
    throw new Error(
      'Não foi possível identificar os dados do texto. Tente informar o jogo (ex: Time A x Time B) e o mercado.'
    );
  }

  let serverErrorMessage: string | null = null;
  let serverEndpointMissing = false;

  try {
    const response = await fetch('/api/parse-bet-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: trimmed })
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      serverEndpointMissing = true;
    } else {
      const data = (await response.json().catch(() => null)) as
        | (ParsedBetLinkResult & { error?: string })
        | null;

      if (response.ok && data?.success) {
        if (localTip) {
          return {
            ...data,
            event: data.event || localTip.event,
            market: data.market || localTip.market,
            tournament: data.tournament || localTip.tournament,
            odd: data.odd ?? localTip.odd,
            stake: data.stake ?? localTip.stake,
            units: data.units ?? localTip.units,
            stakeIncludedInSource: data.stakeIncludedInSource || localTip.stakeIncludedInSource
          };
        }
        return data;
      }

      serverErrorMessage = data?.error || null;
      if (response.status === 404 || response.status === 405) {
        serverEndpointMissing = true;
      }
    }
  } catch {
    serverEndpointMissing = true;
  }

  // Direct browser fallback for 1win sharebet codes (works even on static Shared App / PWA!)
  if (shareCode && (serverEndpointMissing || !serverErrorMessage)) {
    try {
      return await resolve1winDirectInBrowser(shareCode, trimmed);
    } catch (directErr) {
      if (localTip && (localTip.event || localTip.market)) {
        return {
          ...localTip,
          bookmaker: detectBookmakerInText(trimmed) || localTip.bookmaker
        };
      }
      throw directErr instanceof Error
        ? directErr
        : new Error('Não foi possível consultar esse link da 1win.');
    }
  }

  if (localTip && (localTip.event || localTip.market)) {
    return {
      ...localTip,
      bookmaker: detectBookmakerInText(trimmed) || localTip.bookmaker,
      warning: serverErrorMessage
        ? `${serverErrorMessage} Dados do texto colado foram preenchidos abaixo.`
        : localTip.warning
    };
  }

  throw new Error(
    serverErrorMessage ||
      'Não foi possível identificar os dados desse link de aposta. Você também pode colar o texto da aposta (Liga, Jogo e Mercado).'
  );
}

function normalizeStr(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function matchFootballCatalogMarket(
  marketText: string
): { market: FootballMarket; selection?: string } | null {
  const n = normalizeStr(marketText);
  if (!n) return null;

  const findById = (id: string) => FOOTBALL_MARKETS.find((m) => m.id === id);

  if (
    (n.includes('ambas') || n.includes('ambos') || n.includes('btts')) &&
    (n.includes('total') ||
      n.includes('acima') ||
      n.includes('abaixo') ||
      n.includes('over') ||
      n.includes('under') ||
      n.includes('vence') ||
      n.includes('empate'))
  ) {
    const m = findById('btts-resultado') || findById('btts');
    if (m) return { market: m };
  }
  if (n.includes('ambos os times marcam') || n.includes('ambas marcam') || n.includes('btts')) {
    const m = findById('btts');
    if (m) {
      const sel = n.includes('nao') ? m.selections[1] : m.selections[0];
      return { market: m, selection: sel };
    }
  }
  if (n.includes('escanteio') || n.includes('canto') || n.includes('corner')) {
    const m = findById('escanteios-over-under');
    if (m) return { market: m };
  }
  if (n.includes('cartao') || n.includes('cartoes') || n.includes('card')) {
    const m = findById('cartoes-over-under');
    if (m) return { market: m };
  }
  if (n.includes('handicap asiatico') || n.includes('asian handicap') || /\bha\b/.test(n)) {
    const m = findById('ha-meias-linhas') || findById('ha-linhas-inteiras');
    if (m) return { market: m };
  }
  if (n.includes('dupla chance') || n.includes('hipotese dupla') || n.includes('double chance')) {
    const m = findById('dupla-chance');
    if (m) return { market: m };
  }
  if (n.includes('empate anula') || n.includes('draw no bet') || n.includes('dnb')) {
    const m = findById('dnb');
    if (m) return { market: m };
  }
  if (n.includes('1x2') || n.includes('vencedor') || n.includes('resultado final') || n.includes('ml')) {
    const m = findById('1x2');
    if (m) return { market: m };
  }
  if (
    n.includes('total') ||
    n.includes('totais') ||
    n.includes('acima') ||
    n.includes('abaixo') ||
    n.includes('over') ||
    n.includes('under') ||
    n.includes('mais de') ||
    n.includes('menos de')
  ) {
    const m = findById('gols-over-under');
    if (m) {
      const lineMatch = n.match(/(0\.5|1\.5|2\.5|3\.5|4\.5)/);
      if (lineMatch) {
        const isUnder = n.includes('abaixo') || n.includes('menos') || n.includes('under');
        const sel = m.selections.find(
          (s) => s.includes(lineMatch[1]) && (isUnder ? s.includes('Menos') : s.includes('Mais'))
        );
        return { market: m, selection: sel };
      }
      return { market: m };
    }
  }

  return null;
}
