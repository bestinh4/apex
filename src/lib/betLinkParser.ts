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

const FLAG_REGEX = /(?:\p{Regional_Indicator}{2}|🏴[\u{E0020}-\u{E007F}]+)/gu;

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

const INLINE_MARKET_SPLIT_REGEX =
  /\s+(?:[:|]|[-–]\s+(?=(?:over|under|btts|ambas|ambos|ml|moneyline|vencedor|empate|casa|fora|mais|menos|acima|abaixo|handicap|h\.?\s*a\.?|ha\b|escanteios?|cantos?|cart[oõ]es|gols?|dupla\s+(?:chance|hip[oó]tese)|dnb|empate\s+anula|total\b|1x2\b|ht|ft|[+-]\d)))|\s+(?=(?:over\b|under\b|btts\b|ambas\b|ambos\b|mais\s+de\b|menos\s+de\b|acima\s+de\b|abaixo\s+de\b|total\s+de\b|handicap\b|h\.?\s*a\.?(?:\s|$)|ha\b|escanteios?\b|cantos?\b|cart[oõ]es\b|1x2\b|dupla\s+(?:chance|hip[oó]tese)\b|dnb\b|empate\s+anula\b|moneyline\b|\bml\b|\bgg\b|\bng\b|\bo\d+(?:[.,]\d+)?\b|\bu\d+(?:[.,]\d+)?\b|[+-]\d+(?:[.,]\d+)?(?:\s|$)))/i;

export function splitEventAndInlineMarket(rawLine: string): {
  eventPart: string;
  marketPart: string;
} {
  const clean = (rawLine || '').trim();
  if (!clean) return { eventPart: '', marketPart: '' };
  // Never split pre-formatted Múltipla summaries that already aggregate legs
  if (/^m[uú]ltipla\s*\(/i.test(clean) || clean.includes(' + ')) {
    return { eventPart: clean, marketPart: '' };
  }

  const hasSeparator = /\s+(?:×|x|vs\.?|v\.?|-)\s+/i.test(clean);
  if (!hasSeparator) return { eventPart: clean, marketPart: '' };

  const sepMatch = clean.match(/\s+(?:×|x|vs\.?|v\.?)\s+/i) || clean.match(/\s+[-–]\s+/);
  const sepEndIdx = sepMatch && sepMatch.index !== undefined ? sepMatch.index + sepMatch[0].length : 0;

  const afterMatchup = clean.slice(sepEndIdx);
  const marketHit = afterMatchup.match(INLINE_MARKET_SPLIT_REGEX);
  if (marketHit && marketHit.index && marketHit.index > 1) {
    const leftSide = clean.slice(0, sepEndIdx + marketHit.index).replace(/[\s\-–|:·]+$/, '').trim();
    const rightMarket = afterMatchup
      .slice(marketHit.index)
      .replace(/^[\s\-–|:·]+/, '')
      .trim();
    if (leftSide.length >= 4 && rightMarket.length >= 2) {
      return { eventPart: leftSide, marketPart: rightMarket };
    }
  }

  return { eventPart: clean, marketPart: '' };
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

  interface ParsedTipBlock {
    tournament: string;
    matchup: string;
    markets: string[];
    legOdd: number | null;
  }

  const blocks: ParsedTipBlock[] = [];
  let pendingTournament = '';
  let currentBlock: ParsedTipBlock | null = null;

  for (const originalLine of lines) {
    const lineOddInfo = extractOddFromText(originalLine);
    const step2 = extractStakeOrUnitsFromText(lineOddInfo.cleaned).cleaned;
    const cleanLine = stripDecorativeEmojisKeepFlags(stripLeadingDecorations(step2));

    if (!cleanLine) continue;
    if (/^\d{1,2}[:h]\d{2}$/i.test(cleanLine)) continue;

    if (isMatchupLine(cleanLine)) {
      const { eventPart, marketPart } = splitEventAndInlineMarket(cleanLine);
      if (currentBlock && currentBlock.matchup) {
        blocks.push(currentBlock);
      }
      currentBlock = {
        tournament: pendingTournament,
        matchup: eventPart.replace(/\s+/g, ' ').trim(),
        markets: marketPart ? [marketPart] : [],
        legOdd: lineOddInfo.odd
      };
      pendingTournament = '';
      continue;
    }

    if (isLeagueOrHeaderLine(originalLine)) {
      const normalizedHeader = stripDecorativeEmojisKeepFlags(stripLeadingDecorations(originalLine))
        .replace(/\s*(?:[-–]\s*)?(\d{1,2}[:h]\d{2})$/i, ' - $1')
        .replace(/\s{2,}/g, ' ')
        .trim();
      const formattedComp = ensureCompetitionHasFlag(normalizedHeader);
      if (currentBlock && !currentBlock.tournament && currentBlock.markets.length === 0) {
        currentBlock.tournament = formattedComp;
      } else {
        if (currentBlock && currentBlock.matchup) {
          blocks.push(currentBlock);
          currentBlock = null;
        }
        pendingTournament = formattedComp;
      }
      continue;
    }

    if (currentBlock) {
      currentBlock.markets.push(cleanLine);
      if (!currentBlock.legOdd && lineOddInfo.odd) currentBlock.legOdd = lineOddInfo.odd;
    } else {
      blocks.push({
        tournament: pendingTournament,
        matchup: '',
        markets: [cleanLine],
        legOdd: lineOddInfo.odd
      });
      pendingTournament = '';
    }
  }

  if (currentBlock) {
    blocks.push(currentBlock);
  } else if (pendingTournament) {
    blocks.push({ tournament: pendingTournament, matchup: '', markets: [], legOdd: null });
  }

  const matchupBlocks = blocks.filter((b) => b.matchup);
  const isMultiple = matchupBlocks.length > 1;

  if (isMultiple) {
    const legs: ParsedBetLeg[] = matchupBlocks.map((b) => {
      const fullEv = b.tournament ? `${b.tournament} ${b.matchup}` : ensureCompetitionHasFlag(b.matchup);
      const legMarket = b.markets.join(' · ').trim();
      return {
        event: fullEv,
        sport,
        tournament: b.tournament || undefined,
        marketGroup: legMarket || 'Mercado',
        selection: legMarket,
        odd: b.legOdd || 0
      };
    });

    const formattedEvent = `Múltipla (${legs.length}x): ${legs.map((l) => l.event).join(' + ')}`;
    const marketSummary = legs
      .map(
        (l, idx) =>
          `${idx + 1}) ${l.event}: ${l.marketGroup}${l.odd > 1 ? ` @ ${l.odd.toFixed(2)}` : ''}`
      )
      .join(' | ');

    return {
      success: true,
      bookmaker,
      sport,
      event: formattedEvent,
      market: marketSummary,
      tournament: legs[0]?.tournament,
      odd,
      stake,
      units,
      stakeIncludedInSource: stake !== null || units !== null,
      status: 'PENDENTE',
      isMultiple: true,
      selectionsCount: legs.length,
      legs,
      partial: odd === null,
      warning:
        odd === null
          ? 'Múltipla identificada! Confira a Odd total e a Stake abaixo antes de confirmar.'
          : undefined
    };
  }

  const single = blocks[0] || { tournament: '', matchup: '', markets: [], legOdd: null };
  let tournament = single.tournament;
  const matchup = single.matchup;
  const marketCandidates = [...single.markets];

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
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/[ºª°]/g, 'o')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export interface CatalogMarketMatch {
  market: FootballMarket;
  selection?: string;
}

function extractSimpleTeamsFromEvent(eventText?: string): { homeNorm: string; awayNorm: string } {
  if (!eventText) return { homeNorm: '', awayNorm: '' };
  const clean = eventText
    .replace(/^m[uú]ltipla\s*\(\d+x\)\s*:\s*/i, '')
    .split(/\s+\+\s+/)[0]
    .trim();
  const sep = clean.match(/^(.+?)\s+(?:×|x|vs\.?|v\.?)\s+(.+)$/i) || clean.match(/^(.+?)\s+-\s+(.+)$/);
  if (!sep) return { homeNorm: '', awayNorm: '' };
  const left = normalizeStr(sep[1])
    .replace(/^.*?\b\d{1,2}[:h]\d{2}\b[\s\-:]*/, '')
    .replace(/^(?:ao vivo|live|premier league|laliga|serie [ab]|bundesliga|ligue 1|brasileirao[^a-z]*|premiership|allsvenskan|liga jupiler)[\s\-:]*/g, '')
    .trim();
  const right = normalizeStr(sep[2]).split(/\s+(?:over|under|btts|ambas|mais de|menos de)\b/)[0].trim();
  return { homeNorm: left, awayNorm: right };
}

function detectSideInMarket(
  n: string,
  homeNorm: string,
  awayNorm: string
): 'home' | 'away' | 'draw' | null {
  const checkTeamTokens = (teamNorm: string): boolean => {
    if (!teamNorm || teamNorm.length < 3) return false;
    const tokens = teamNorm
      .split(/\s+/)
      .filter((t) => t.length >= 4 && !/^(?:club|fc|sc|ac|united|city|real|sporting|atletico)$/i.test(t));
    if (teamNorm.length >= 4 && n.includes(teamNorm)) return true;
    return tokens.some((tok) => new RegExp(`\\b${tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(n));
  };

  if (
    /\b(?:casa|home|mandante|local|w1|time\s*1|equipe\s*1|competitor\s*1)\b/.test(n) ||
    /(?:^|:\s*|—\s*|-\s+)1(?:\s*$|\s+\([+-]?\d)/.test(n)
  ) {
    return 'home';
  }
  if (
    /\b(?:fora|away|visitante|w2|time\s*2|equipe\s*2|competitor\s*2)\b/.test(n) ||
    /(?:^|:\s*|—\s*|-\s+)2(?:\s*$|\s+\([+-]?\d)/.test(n)
  ) {
    return 'away';
  }
  if (checkTeamTokens(homeNorm) && !checkTeamTokens(awayNorm)) return 'home';
  if (checkTeamTokens(awayNorm) && !checkTeamTokens(homeNorm)) return 'away';

  const nWithoutDnbOrCombo = n
    .replace(/\b(?:empate\s*anula|draw\s*no\s*bet|empate\s*devolve|ou\s*empate)\b/g, ' ');
  if (/\b(?:empate|draw)\b/.test(nWithoutDnbOrCombo)) return 'draw';
  return null;
}

function detectDirectionInMarket(n: string): 'under' | 'over' | null {
  if (/\b(?:abaixo|menos|under|sub)\b|\bu\s*\d+(?:\.\d+)?\b/i.test(n)) return 'under';
  if (/\b(?:acima|mais|over)\b|\bo\s*\d+(?:\.\d+)?\b/i.test(n)) return 'over';
  if (/(?:^|\s)-\s*\d+(?:\.\d+)?\s*(?:gol|gols|canto|cantos|escanteio|escanteios|cart|ht|ft)\b/i.test(n)) {
    return 'under';
  }
  if (/(?:^|\s)\+\s*\d+(?:\.\d+)?\s*(?:gol|gols|canto|cantos|escanteio|escanteios|cart|ht|ft)\b/i.test(n)) {
    return 'over';
  }
  return null;
}

function pickLineSelection(
  market: FootballMarket,
  lineNumberStr: string,
  dir: 'under' | 'over' | null
): string | undefined {
  const escaped = lineNumberStr.replace('.', '\\.');
  const numRegex = new RegExp(`(^|\\D)${escaped}(\\D|$)`);
  const candidates = market.selections.filter((sel) => numRegex.test(sel));
  if (candidates.length === 0) return undefined;
  if (dir === 'under') {
    return candidates.find((s) => /menos|under/i.test(s)) || candidates[0];
  }
  if (dir === 'over') {
    return candidates.find((s) => /mais|over/i.test(s)) || candidates[0];
  }
  return candidates[0];
}

export function matchFootballCatalogMarket(
  marketText: string,
  eventText?: string
): CatalogMarketMatch | null {
  const n = normalizeStr(marketText || '');
  if (!n) return null;

  const findById = (id: string) => FOOTBALL_MARKETS.find((m) => m.id === id);
  const { homeNorm, awayNorm } = extractSimpleTeamsFromEvent(eventText);
  const side = detectSideInMarket(n, homeNorm, awayNorm);
  const dir = detectDirectionInMarket(n);

  const isHT = /\b(?:1t|1o\s*tempo|1\s*tempo|primeiro\s*tempo|1st\s*half|half\s*time|ht)\b/i.test(n) &&
    !/\bht\s*\/\s*ft\b/i.test(n);
  const is2T = /\b(?:2t|2o\s*tempo|2\s*tempo|segundo\s*tempo|2nd\s*half)\b/i.test(n);
  const hasBTTS = /\b(?:btts|ambas|ambos|gg|ng)\b/i.test(n) ||
    /amb(?:as|os)\s+(?:as\s+)?(?:equipes|times)\s+marc/i.test(n);
  const hasTotalKeyword =
    /\b(?:total|totais|acima|abaixo|over|under|mais|menos)\b|\b[ou]\s*\d+(?:\.\d+)?\b|[+-]\s*\d+\.\d+\s*gols?/i.test(n);

  // 1. Combos: BTTS + Over/Under Goals
  if (hasBTTS && hasTotalKeyword && !/\b(?:vence|vitoria|ganha|empate|resultado)\b/i.test(n)) {
    const m = findById('btts-over-under');
    if (m) {
      const bttsNo = /\b(?:nao|no|ng)\b/i.test(n);
      const lineMatch = n.match(/\b(1\.5|2\.5|3\.5)\b/);
      let sel: string | undefined;
      if (bttsNo) {
        sel = m.selections.find((s) => s.includes('Não'));
      } else if (lineMatch) {
        sel = m.selections.find(
          (s) =>
            s.includes('Sim') &&
            s.includes(lineMatch[1]) &&
            (dir === 'under' ? s.includes('Menos') : s.includes('Mais'))
        );
      }
      return { market: m, selection: sel || m.selections[0] };
    }
  }

  // 2. Combo: BTTS + Result
  if (
    hasBTTS &&
    (/\b(?:vence|vitoria|ganha|resultado|1x2|combo|w1|w2)\b/i.test(n) || side !== null)
  ) {
    const m = findById('btts-resultado');
    if (m) {
      const bttsNo = /\bnao\b/i.test(n);
      let sel: string | undefined;
      if (side === 'draw') {
        sel = m.selections.find((s) => s.includes('Empate'));
      } else if (side === 'away') {
        sel = m.selections.find((s) => s.includes('Fora') && (bttsNo ? s.includes('Não') : s.includes('Sim')));
      } else if (side === 'home') {
        sel = m.selections.find((s) => s.includes('Casa') && (bttsNo ? s.includes('Não') : s.includes('Sim')));
      }
      return { market: m, selection: sel };
    }
  }

  // 3. BTTS 1st Half & BTTS FT
  if (hasBTTS && isHT) {
    const m = findById('ambas-marcam-1t');
    if (m) {
      const sel = /\b(?:nao|no|ng)\b/i.test(n) ? m.selections[1] : m.selections[0];
      return { market: m, selection: sel };
    }
  }
  if (hasBTTS) {
    const m = findById('btts');
    if (m) {
      const sel = /\b(?:nao|no|ng)\b/i.test(n) ? m.selections[1] : m.selections[0];
      return { market: m, selection: sel };
    }
  }

  // 4. Escanteios (Corners)
  if (/\b(?:escanteio|escanteios|canto|cantos|corner|corners)\b/i.test(n)) {
    if (/\b(?:corrida|primeiro\s*a|race\s*to)\b/i.test(n)) {
      const m = findById('corrida-escanteios');
      if (m) {
        const num = n.match(/\b(5|7|9)\b/)?.[1];
        const sideWord = side === 'away' ? 'Fora' : 'Casa';
        const sel = num ? m.selections.find((s) => s.includes(sideWord) && s.includes(num)) : undefined;
        return { market: m, selection: sel };
      }
    }
    if (/\b(?:handicap|h\.?\s*a\.?|ha)\b/i.test(n) || /[+-]\s*(?:1\.5|2\.5)\s*(?:escanteio|canto)/i.test(n)) {
      const m = findById('handicap-escanteios');
      if (m) {
        const line = n.match(/([+-]?\s*(?:1\.5|2\.5))/)?.[1]?.replace(/\s+/g, '');
        const sideWord = side === 'away' ? 'Fora' : 'Casa';
        const sel = m.selections.find((s) => s.includes(sideWord) && (!line || s.includes(line.replace(/^[+-]/, ''))));
        return { market: m, selection: sel };
      }
    }
    if (isHT) {
      const m = findById('escanteios-1t');
      if (m) {
        const line = n.match(/\b(4\.5|5\.5)\b/)?.[1];
        const sel = line ? pickLineSelection(m, line, dir) : undefined;
        return { market: m, selection: sel };
      }
    }
    if (side === 'home' || side === 'away') {
      const m = findById('escanteios-equipe');
      if (m) {
        const line = n.match(/\b(3\.5|4\.5|5\.5)\b/)?.[1];
        const sideWord = side === 'away' ? 'Fora' : 'Casa';
        const sel = m.selections.find((s) => s.includes(sideWord) && (!line || s.includes(line)));
        return { market: m, selection: sel };
      }
    }
    const asianCornerMatch = n.match(/(?:^|[^\d.])(9\.0|10\.0|11\.0|9|10|11)(?=$|[^\d.])/);
    const asianCornerLine = asianCornerMatch?.[1];
    if (/\basiatic/i.test(n) || asianCornerLine) {
      const m = findById('escanteios-asiaticos');
      if (m) {
        const normalizedLine = asianCornerLine
          ? asianCornerLine.includes('.')
            ? asianCornerLine
            : `${asianCornerLine}.0`
          : '';
        const sel = normalizedLine ? pickLineSelection(m, normalizedLine, dir) : undefined;
        return { market: m, selection: sel };
      }
    }
    const m = findById('escanteios-over-under');
    if (m) {
      const line = n.match(/\b(6\.5|7\.5|8\.5|9\.5|10\.5|11\.5|12\.5)\b/)?.[1];
      const sel = line ? pickLineSelection(m, line, dir) : undefined;
      return { market: m, selection: sel };
    }
  }

  // 5. Cartões (Cards)
  if (/\b(?:cartao|cartoes|amarelo|amarelos|vermelho|expulsao|card|cards|bookings?)\b/i.test(n)) {
    if (/\b(?:vermelho|expulsao|red\s*card)\b/i.test(n)) {
      const m = findById('cartao-vermelho');
      if (m) {
        return { market: m, selection: /\bnao\b/i.test(n) ? m.selections[1] : m.selections[0] };
      }
    }
    if (/\b(?:jogador|player|receber\s*cartao|para\s*levar\s*cartao)\b/i.test(n)) {
      const m = findById('jogador-receber-cartao');
      if (m) return { market: m, selection: m.selections[0] };
    }
    if (isHT) {
      const m = findById('cartoes-1t');
      if (m) {
        const line = n.match(/\b(1\.5|2\.5)\b/)?.[1];
        const sel = line ? pickLineSelection(m, line, dir) : undefined;
        return { market: m, selection: sel };
      }
    }
    if (side === 'home' || side === 'away') {
      const m = findById('cartoes-equipe');
      if (m) {
        const line = n.match(/\b(1\.5|2\.5)\b/)?.[1];
        const sideWord = side === 'away' ? 'Fora' : 'Casa';
        const sel = m.selections.find((s) => s.includes(sideWord) && (!line || s.includes(line)));
        return { market: m, selection: sel };
      }
    }
    const asianCardLine = n.match(/\b(4\.0|5\.0)\b/)?.[1];
    if (/\basiatic/i.test(n) || asianCardLine) {
      const m = findById('cartoes-asiaticos');
      if (m) {
        const sel = asianCardLine ? pickLineSelection(m, asianCardLine, dir) : undefined;
        return { market: m, selection: sel };
      }
    }
    const m = findById('cartoes-over-under');
    if (m) {
      const line = n.match(/\b(2\.5|3\.5|4\.5|5\.5|6\.5)\b/)?.[1];
      const sel = line ? pickLineSelection(m, line, dir) : undefined;
      return { market: m, selection: sel };
    }
  }

  // 6. Player Props
  if (/\b(?:chutes?\s*(?:no|ao)\s*(?:gol|alvo)|shots?\s*on\s*target|sot)\b/i.test(n)) {
    const m = findById('chutes-no-gol');
    if (m) {
      const line = n.match(/\b(0\.5|1\.5|2\.5)\b/)?.[1];
      return { market: m, selection: line ? pickLineSelection(m, line, 'over') : m.selections[0] };
    }
  }
  if (/\b(?:finalizac(?:ao|oes)|chutes?\s*totais|total\s*shots)\b/i.test(n)) {
    const m = findById('finalizacoes-totais');
    if (m) {
      const line = n.match(/\b(1\.5|2\.5|3\.5)\b/)?.[1];
      return { market: m, selection: line ? pickLineSelection(m, line, 'over') : undefined };
    }
  }
  if (/\b(?:desarmes?|tackles?)\b/i.test(n)) {
    const m = findById('desarmes-jogador');
    if (m) {
      const line = n.match(/\b(1\.5|2\.5|3\.5)\b/)?.[1];
      return { market: m, selection: line ? pickLineSelection(m, line, 'over') : undefined };
    }
  }
  if (/\bfaltas?\b/i.test(n)) {
    const m = findById('faltas-jogador');
    if (m) {
      const sel = /\bsofrer\b/i.test(n)
        ? m.selections[2]
        : /\b2\b/.test(n)
        ? m.selections[1]
        : m.selections[0];
      return { market: m, selection: sel };
    }
  }
  if (/\b(?:assistencia|assistencias|assist)\b/i.test(n)) {
    const m = findById('assistencia-jogador');
    if (m) return { market: m, selection: m.selections[0] };
  }
  if (/\b(?:marcador|anytime\s*goalscorer|marcar\s*(?:a\s*qualquer|gol)|primeiro\s*a\s*marcar|doblete|hat[-\s]*trick)\b/i.test(n)) {
    const m = findById('marcador-gol');
    if (m) {
      const sel = /\bprimeiro\b/i.test(n)
        ? m.selections[1]
        : /\bultimo\b/i.test(n)
        ? m.selections[2]
        : /\b(?:2|doblete)\b/i.test(n)
        ? m.selections[3]
        : /\b(?:3|hat)\b/i.test(n)
        ? m.selections[4]
        : m.selections[0];
      return { market: m, selection: sel };
    }
  }

  // 7. Specials & Correct Score & Live
  if (/\b(?:placar\s*exato|resultado\s*(?:exato|correto)|correct\s*score)\b/i.test(n)) {
    const m = findById('placar-exato');
    if (m) {
      const scoreMatch = n.match(/\b(\d)\s*[x:\-]\s*(\d)\b/);
      const formatted = scoreMatch ? `${scoreMatch[1]} x ${scoreMatch[2]}` : '';
      const sel = formatted ? m.selections.find((s) => s === formatted) || 'Qualquer Outro Resultado' : undefined;
      return { market: m, selection: sel };
    }
  }
  if (/\bpenalt(?:i|y)\b/i.test(n)) {
    const m = findById('penalti-partida');
    if (m) {
      const sel = /\bconvertid/i.test(n) ? m.selections[2] : /\bnao\b/i.test(n) ? m.selections[1] : m.selections[0];
      return { market: m, selection: sel };
    }
  }
  if (/\b(?:impar|par|odd\s*\/\s*even)\b/i.test(n)) {
    const m = findById('impar-par');
    if (m) {
      return { market: m, selection: /\bimpar\b/i.test(n) ? m.selections[0] : m.selections[1] };
    }
  }
  if (/\bproximo\s*gol\b/i.test(n)) {
    const m = findById('proximo-gol-live');
    if (m) {
      const sel = /\bsem\s*mais\b/i.test(n)
        ? m.selections[2]
        : side === 'away'
        ? m.selections[1]
        : side === 'home'
        ? m.selections[0]
        : undefined;
      return { market: m, selection: sel };
    }
  }
  if (/\bresto\s*da\s*partida\b/i.test(n)) {
    const m = findById('resto-partida-live');
    if (m) {
      const sel = side === 'draw' ? m.selections[1] : side === 'away' ? m.selections[2] : side === 'home' ? m.selections[0] : undefined;
      return { market: m, selection: sel };
    }
  }

  // 8. HT/FT, Win to Nil, Clean Sheet
  if (/\b(?:intervalo\s*\/\s*final|ht\s*\/\s*ft)\b/i.test(n)) {
    const m = findById('ht-ft');
    if (m) {
      const codeMatch = n.match(/\b([12x])\s*\/\s*([12x])\b/i);
      const sel = codeMatch
        ? m.selections.find((s) => s.toLowerCase().includes(`(${codeMatch[1].toLowerCase()}/${codeMatch[2].toLowerCase()})`))
        : undefined;
      return { market: m, selection: sel };
    }
  }
  if (/\b(?:win\s*to\s*nil|vencer\s*sem\s*sofrer|sem\s*sofrer\s*gols?\s*e\s*venc|vitoria\s*sem\s*levar)\b/i.test(n)) {
    const m = findById('win-to-nil');
    if (m) {
      return { market: m, selection: side === 'away' ? m.selections[1] : side === 'home' ? m.selections[0] : undefined };
    }
  }
  if (/\b(?:clean\s*sheet|sem\s*sofrer\s*gols?|nao\s*sofre\s*gols?)\b/i.test(n)) {
    const m = findById('clean-sheet');
    if (m) {
      return { market: m, selection: side === 'away' ? m.selections[1] : side === 'home' ? m.selections[0] : undefined };
    }
  }

  // 9. Handicaps (Asian & European)
  if (/\b(?:handicap|h\.?\s*a\.?|ha|asian\s*handicap|spread)\b/i.test(n)) {
    const cleanedForLine = n
      .replace(/\b(?:time|equipe|competitor)\s*[12]\b/g, ' ')
      .replace(/\b(?:1o|1|2o|2)\s*(?:tempo|t)\b/g, ' ')
      .replace(/\b1st\s*half\b|\b3\s*opcoes\b/g, ' ');
    const lineMatch =
      cleanedForLine.match(/([+-]\s*\d+(?:\.(?:0|25|5|75))?)(?=$|[^\d.])/) ||
      cleanedForLine.match(/(?:^|[^\d.])(\d+\.(?:0|25|5|75))(?=$|[^\d.])/) ||
      cleanedForLine.match(/(?:^|[^\d.])(0|[12])(?=$|[^\d.])/);
    const rawLine = lineMatch ? lineMatch[1].replace(/\s+/g, '') : '';

    if (/\beuropeu\b|\b3\s*opcoes\b/i.test(n)) {
      const m = findById('handicap-europeu');
      if (m) {
        const sideLabel = side === 'draw' ? 'Empate' : side === 'away' ? 'Fora' : side === 'home' ? 'Casa' : '';
        const sel = m.selections.find(
          (s) => (!sideLabel || s.includes(sideLabel)) && (!rawLine || s.includes(rawLine.replace(/[+-]/, '')))
        );
        return { market: m, selection: sel };
      }
    }

    if (isHT) {
      const m = findById('ha-1t');
      if (m) {
        const sideWord = side === 'away' ? 'Fora' : side === 'home' ? 'Casa' : '';
        const absLine = rawLine.replace(/^[+-]/, '');
        const sel =
          m.selections.find((s) => (!sideWord || s.includes(sideWord)) && (!rawLine || s.includes(rawLine))) ||
          m.selections.find((s) => (!sideWord || s.includes(sideWord)) && (!absLine || s.includes(absLine)));
        return { market: m, selection: sel };
      }
    }

    if (/\.(?:25|75)$/.test(rawLine)) {
      const m = findById('ha-quartos-linha');
      if (m) {
        const sideWord = side === 'away' ? 'Fora' : side === 'home' ? 'Casa' : '';
        const absLine = rawLine.replace(/^[+-]/, '');
        const sel =
          m.selections.find((s) => (!sideWord || s.includes(sideWord)) && s.includes(rawLine)) ||
          m.selections.find((s) => (!sideWord || s.includes(sideWord)) && s.includes(absLine));
        return { market: m, selection: sel };
      }
    }

    if (/\.5$/.test(rawLine)) {
      const m = findById('ha-meias-linhas');
      if (m) {
        const sideWord = side === 'away' ? 'Fora' : side === 'home' ? 'Casa' : '';
        const absLine = rawLine.replace(/^[+-]/, '');
        const sel =
          m.selections.find((s) => (!sideWord || s.includes(sideWord)) && s.includes(rawLine)) ||
          m.selections.find((s) => (!sideWord || s.includes(sideWord)) && s.includes(absLine));
        return { market: m, selection: sel };
      }
    }

    if (/^[+-]?(?:0|1|2)(?:\.0)?$/.test(rawLine)) {
      const m = findById('ha-linhas-inteiras');
      if (m) {
        const unsigned = rawLine.replace(/^[+-]/, '');
        const cleanInt = unsigned.includes('.') ? unsigned : `${unsigned}.0`;
        const signed = rawLine.startsWith('+') || rawLine.startsWith('-') ? `${rawLine[0]}${cleanInt}` : cleanInt;
        const sideWord = side === 'away' ? 'Fora' : side === 'home' ? 'Casa' : '';
        const sel =
          m.selections.find((s) => (!sideWord || s.includes(sideWord)) && s.includes(signed)) ||
          m.selections.find((s) => (!sideWord || s.includes(sideWord)) && s.includes(cleanInt));
        return { market: m, selection: sel };
      }
    }

    const m = findById('ha-meias-linhas') || findById('ha-linhas-inteiras');
    if (m) return { market: m };
  }

  // 10. Dupla Chance (Double Chance)
  if (/\b(?:dupla\s*(?:chance|hipotese)|hipotese\s*dupla|chance\s*dupla|double\s*chance|1x|x2|12)\b/i.test(n) ||
      /\bou\s*empate\b/i.test(n)) {
    const m = findById('dupla-chance');
    if (m) {
      const sel =
        /\b1x\b|\bcasa\s*ou\s*empate\b|\b(?:time|equipe)\s*1\s*(?:ou\s*empate|nao\s*perde)/i.test(n)
          ? m.selections[0]
          : /\bx2\b|\bempate\s*ou\s*fora\b|\b(?:time|equipe)\s*2\s*(?:ou\s*empate|nao\s*perde)/i.test(n)
          ? m.selections[1]
          : /\b12\b|\bcasa\s*ou\s*fora\b/i.test(n)
          ? m.selections[2]
          : undefined;
      return { market: m, selection: sel };
    }
  }

  // 11. Draw No Bet (DNB)
  if (/\b(?:empate\s*anula|draw\s*no\s*bet|dnb|empate\s*devolve)\b/i.test(n)) {
    const m = findById('dnb');
    if (m) {
      const sel = side === 'away' ? m.selections[1] : side === 'home' ? m.selections[0] : undefined;
      return { market: m, selection: sel };
    }
  }

  // 12. 1st / 2nd Half Winner (1X2 HT / 2T)
  if (isHT && /\b(?:1x2|resultado|vencedor|vitoria|ml|casa|fora|empate|draw|w1|w2)\b/i.test(n) && !hasTotalKeyword) {
    const m = findById('resultado-1t');
    if (m) {
      const sel = side === 'draw' ? m.selections[1] : side === 'away' ? m.selections[2] : side === 'home' ? m.selections[0] : undefined;
      return { market: m, selection: sel };
    }
  }
  if (is2T && /\b(?:1x2|resultado|vencedor|vitoria|ml|casa|fora|empate|draw|w1|w2)\b/i.test(n) && !hasTotalKeyword) {
    const m = findById('resultado-2t');
    if (m) {
      const sel = side === 'draw' ? m.selections[1] : side === 'away' ? m.selections[2] : side === 'home' ? m.selections[0] : undefined;
      return { market: m, selection: sel };
    }
  }

  // 13. Multigols
  if (/\bmultigol/i.test(n) || /\b(?:1\s*(?:a|-)\s*2|2\s*(?:a|-)\s*3|2\s*(?:a|-)\s*4|3\s*(?:a|-)\s*5)\s*gols?\b/i.test(n)) {
    const m = findById('multigols');
    if (m) {
      const rangeMatch = n.match(/\b(\d)\s*(?:a|-)\s*(\d)\b/);
      const sel = rangeMatch
        ? m.selections.find((s) => s.includes(`${rangeMatch[1]} a ${rangeMatch[2]}`))
        : undefined;
      return { market: m, selection: sel };
    }
  }

  // 14. Team Totals (Home / Away goals)
  if (
    hasTotalKeyword &&
    (side === 'home' || side === 'away') &&
    !/\b(?:escanteio|canto|cartao|cartoes)\b/i.test(n)
  ) {
    const m = findById(side === 'away' ? 'gols-equipe-fora' : 'gols-equipe-casa');
    if (m) {
      const line = n.match(/\b(0\.5|1\.5|2\.5)\b/)?.[1];
      const sel = line ? pickLineSelection(m, line, dir) : undefined;
      return { market: m, selection: sel };
    }
  }

  // 15. 1st Half Goals (HT Over/Under)
  if (isHT && hasTotalKeyword) {
    const m = findById('gols-1t');
    if (m) {
      const line = n.match(/\b(0\.5|1\.0|1\.5)\b/)?.[1];
      const sel = line ? pickLineSelection(m, line, dir) : undefined;
      return { market: m, selection: sel };
    }
  }

  // 16. 2nd Half Goals (2T Over/Under)
  if (is2T && hasTotalKeyword) {
    const m = findById('gols-2t');
    if (m) {
      const line = n.match(/\b(0\.5|1\.5)\b/)?.[1];
      const sel = line ? pickLineSelection(m, line, dir) : undefined;
      return { market: m, selection: sel };
    }
  }

  // 17. Asian Goals (2.0 / 2.25 / 2.75 / 3.0)
  const asianGoalLine = n.match(/\b(2\.0|2\.25|2\.75|3\.0)\b/)?.[1];
  if (hasTotalKeyword && (/\basiatic/i.test(n) || asianGoalLine)) {
    const m = findById('gols-asiaticos');
    if (m) {
      const sel = asianGoalLine ? pickLineSelection(m, asianGoalLine, dir) : undefined;
      return { market: m, selection: sel };
    }
  }

  // 18. Full Time Total Goals (Over / Under FT)
  if (hasTotalKeyword) {
    const m = findById('gols-over-under');
    if (m) {
      const line = n.match(/\b(0\.5|1\.5|2\.5|3\.5|4\.5|5\.5)\b/)?.[1];
      const sel = line ? pickLineSelection(m, line, dir) : undefined;
      return { market: m, selection: sel };
    }
  }

  // 19. 1X2 / Moneyline (Result FT)
  if (
    /\b(?:1x2|vencedor|resultado\s*final|moneyline|ml|w1|w2|vitoria)\b/i.test(n) ||
    side !== null
  ) {
    const m = findById('1x2');
    if (m) {
      const sel =
        side === 'draw'
          ? m.selections[1]
          : side === 'away'
          ? m.selections[2]
          : side === 'home'
          ? m.selections[0]
          : undefined;
      return { market: m, selection: sel };
    }
  }

  return null;
}
