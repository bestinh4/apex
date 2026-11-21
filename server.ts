import express from 'express';
import type { Request, Response } from 'express';
import dns from 'node:dns/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Fallback gateway config for 1win & mirrors (also dynamically resolved from mirror SDUI when reachable)
const DEFAULT_1WIN_API_URL = 'https://api-gateway.top-parser.com';
const DEFAULT_1WIN_PARTNER_ID = '44ba10e5-7df2-47ab-a44d-dc93803c7a6e';
const DEFAULT_1WIN_ORIGIN = 'https://1win.com';

interface OneWinGatewayConfig {
  apiUrl: string;
  partnerId: string;
  origin: string;
  cachedAt: number;
}

const gatewayCache = new Map<string, OneWinGatewayConfig>();

interface ParsedBetLeg {
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

interface ParsedBetResponse {
  success: boolean;
  bookmaker: string;
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
  message?: string;
  warning?: string;
}

function isPrivateOrLocalIp(ip: string): boolean {
  const cleaned = ip.replace(/^::ffff:/i, '');
  if (net.isIPv4(cleaned)) {
    const parts = cleaned.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    return false;
  }
  if (net.isIPv6(cleaned)) {
    const lower = cleaned.toLowerCase();
    if (lower === '::' || lower === '::1') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80')) return true;
    return false;
  }
  return true;
}

async function validateExternalHttpUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('URL inválida.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Apenas links http:// ou https:// são permitidos.');
  }
  const hostname = parsed.hostname.toLowerCase();
  if (
    !hostname ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new Error('Endereço de destino não permitido.');
  }
  if (net.isIP(hostname) && isPrivateOrLocalIp(hostname)) {
    throw new Error('Endereço IP interno não permitido.');
  }
  const records = await dns.lookup(hostname, { all: true });
  if (!records || records.length === 0) {
    throw new Error('Domínio não encontrado.');
  }
  for (const rec of records) {
    if (isPrivateOrLocalIp(rec.address)) {
      throw new Error('Endereço de rede privada não permitido.');
    }
  }
  return parsed;
}

async function readTextWithLimit(response: globalThis.Response, maxBytes = 512 * 1024): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    const txt = await response.text();
    return txt.slice(0, maxBytes);
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        chunks.push(value.subarray(0, value.byteLength - (total - maxBytes)));
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
  }
  const combined = new Uint8Array(Math.min(total, maxBytes));
  let offset = 0;
  for (const c of chunks) {
    combined.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(combined);
}

function map1winSportToAppSport(sportObj?: {
  slug?: string;
  tag?: string;
  isEsport?: boolean;
}): string {
  if (!sportObj) return 'Futebol';
  if (sportObj.isEsport) return 'MMA / eSports';
  const key = `${sportObj.slug || ''} ${sportObj.tag || ''}`.toLowerCase();
  if (key.includes('football') || key.includes('soccer') || key.includes('futsal')) return 'Futebol';
  if (key.includes('basketball')) return 'Basquete';
  if (key.includes('table-tennis') || key.includes('table_tennis') || key.includes('ping')) {
    return 'Tênis de Mesa';
  }
  if (key.includes('tennis')) return 'Tênis';
  if (key.includes('volleyball') || key.includes('beach-volley')) return 'Vôlei';
  if (key.includes('ice-hockey') || key.includes('hockey')) return 'Hóquei no Gelo';
  if (
    key.includes('mma') ||
    key.includes('ufc') ||
    key.includes('boxing') ||
    key.includes('esport') ||
    key.includes('counter-strike') ||
    key.includes('dota') ||
    key.includes('league-of-legends') ||
    key.includes('valorant')
  ) {
    return 'MMA / eSports';
  }
  return 'Futebol';
}

function humanizeSlug(slug?: string): string | undefined {
  if (!slug) return undefined;
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

const SERVER_CATEGORY_FLAGS: Record<string, string> = {
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

const SERVER_COMPETITION_FLAG_PATTERNS: Array<[RegExp, string]> = [
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
  [/\b(czechia|rep[uú]blica\s*tcheca|fortuna\s*liga|chance\s*liga)\b/i, '🇨🇿'],
  [/\b(champions\s*league|europa\s*league|conference\s*league|nations\s*league|uefa|euro(?:copa)?|euroleague)\b/i, '🇪🇺'],
  [/\b(libertadores|sul[-\s]*americana|sudamericana|conmebol|copa\s*am[eé]rica)\b/i, '🌎'],
  [/\b(j[-\s]*league|japan|jap[aã]o)\b/i, '🇯🇵'],
  [/\b(k[-\s]*league|south\s*korea|coreia)\b/i, '🇰🇷'],
  [/\b(saudi|roshn|ar[aá]bia\s*saudita)\b/i, '🇸🇦'],
  [/\b(world\s*cup|copa\s*do\s*mundo|fifa|eliminat[oó]rias)\b/i, '🌍']
];

function inferServerCompetitionFlag(competitionText: string): string {
  for (const [pattern, flag] of SERVER_COMPETITION_FLAG_PATTERNS) {
    if (pattern.test(competitionText)) return flag;
  }
  return '';
}

function ensureServerCompetitionHasFlag(competitionText: string): string {
  const clean = competitionText.trim();
  if (!clean || /(?:\p{Regional_Indicator}{2}|🏴󠁧󠁢[a-z]+󠁿)/u.test(clean)) return clean;
  const inferred = inferServerCompetitionFlag(clean);
  if (!inferred) return clean;
  const timeSuffix = clean.match(/\s*(?:[-–]\s*)?(\d{1,2}[:h]\d{2})$/i);
  if (timeSuffix) {
    const base = clean.slice(0, clean.length - timeSuffix[0].length).replace(/[-–\s]+$/, '').trim();
    return `${base} ${inferred} - ${timeSuffix[1]}`;
  }
  return `${clean} ${inferred}`;
}

function get1winCountryFlag(categorySlug?: string, tournamentSlug?: string): string {
  const cat = (categorySlug || '').toLowerCase().trim();
  if (cat && SERVER_CATEGORY_FLAGS[cat]) return SERVER_CATEGORY_FLAGS[cat];
  const tour = (tournamentSlug || '').toLowerCase().replace(/[-_]+/g, ' ');
  return inferServerCompetitionFlag(tour);
}

function format1winTournamentHeader(match?: {
  category?: { slug?: string };
  tournament?: { slug?: string };
  serviceV2?: string;
  startAt?: number;
}): { tournamentLabel?: string; prefix: string } {
  if (!match) return { prefix: '' };
  const flag = get1winCountryFlag(match.category?.slug, match.tournament?.slug);
  const name = humanizeSlug(match.tournament?.slug);
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
      // ignore timezone formatting issues
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

  return {
    tournamentLabel: base || undefined,
    prefix
  };
}

function extractUrlFromText(raw: string): string | null {
  const match = raw.match(/https?:\/\/[^\s<>"'`]+/i);
  return match ? match[0].replace(/[),.;!?]+$/, '') : null;
}

function extractShareBetCode(raw: string, parsedUrl: URL | null): string | null {
  if (parsedUrl) {
    const qp =
      parsedUrl.searchParams.get('sharebet') ||
      parsedUrl.searchParams.get('shareBet') ||
      parsedUrl.searchParams.get('coupon') ||
      parsedUrl.searchParams.get('betCode');
    if (qp && /^[a-zA-Z0-9_-]{4,32}$/.test(qp.trim())) {
      return qp.trim();
    }
    if (parsedUrl.hash) {
      const hashMatch = parsedUrl.hash.match(/sharebet=([a-zA-Z0-9_-]{4,32})/i);
      if (hashMatch) return hashMatch[1];
    }
    const pathMatch = parsedUrl.pathname.match(/\/shared-bets?\/([a-zA-Z0-9_-]{4,32})/i);
    if (pathMatch) return pathMatch[1];
  }
  const inlineMatch = raw.match(/sharebet[=:]([a-zA-Z0-9_-]{4,32})/i);
  if (inlineMatch) return inlineMatch[1];

  const trimmed = raw.trim();
  if (/^[a-zA-Z0-9]{6,16}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

function extractStakeFromRawInput(raw: string, parsedUrl: URL | null): number | null {
  if (parsedUrl) {
    for (const key of ['stake', 'amount', 'valor', 'betAmount', 'sum']) {
      const v = parsedUrl.searchParams.get(key);
      if (v) {
        const n = Number(v.replace(',', '.'));
        if (Number.isFinite(n) && n > 0 && n < 1_000_000) return n;
      }
    }
  }
  const textStake =
    raw.match(/(?:stake|valor|aposta|entrada|r\$)\s*[:=]?\s*(\d+(?:[.,]\d{1,2})?)/i) ||
    raw.match(/R\$\s*(\d+(?:[.,]\d{1,2})?)/i);
  if (textStake) {
    const n = Number(textStake[1].replace(',', '.'));
    if (Number.isFinite(n) && n > 0 && n < 1_000_000) return n;
  }
  return null;
}

function detectBookmakerFromUrl(parsedUrl: URL | null, rawText: string): string {
  const hay = `${parsedUrl?.hostname || ''} ${rawText}`.toLowerCase();
  if (
    hay.includes('1win') ||
    hay.includes('mob1link') ||
    /one-[a-z0-9-]+\.(com|pro|xyz|top|win|bet|live)/i.test(hay) ||
    /1w[a-z0-9-]+\.(com|pro|xyz|top|win|bet|run|life|live)/i.test(hay) ||
    hay.includes('sharebet=')
  ) {
    return '1win';
  }
  if (hay.includes('bet365')) return 'Bet365';
  if (hay.includes('betano')) return 'Betano';
  if (hay.includes('stake.com') || hay.includes('stake.bet')) return 'Stake';
  if (hay.includes('pinnacle')) return 'Pinnacle';
  if (hay.includes('betfair')) return 'Betfair';
  if (hay.includes('superbet')) return 'Superbet';
  if (hay.includes('novibet')) return 'Novibet';
  if (hay.includes('kto.')) return 'KTO';
  if (hay.includes('estrelabet')) return 'EstrelaBet';
  if (hay.includes('sportingbet')) return 'Sportingbet';
  if (hay.includes('1xbet')) return '1xBet';
  return '1win';
}

async function resolve1winGatewayConfig(parsedUrl: URL | null): Promise<OneWinGatewayConfig> {
  const defaultCfg: OneWinGatewayConfig = {
    apiUrl: DEFAULT_1WIN_API_URL,
    partnerId: DEFAULT_1WIN_PARTNER_ID,
    origin: DEFAULT_1WIN_ORIGIN,
    cachedAt: Date.now()
  };
  if (!parsedUrl) return defaultCfg;

  const cacheKey = parsedUrl.origin;
  const cached = gatewayCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < 30 * 60 * 1000) {
    return cached;
  }

  try {
    const safeUrl = await validateExternalHttpUrl(parsedUrl.toString());
    const htmlRes = await fetch(safeUrl.toString(), {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'accept-language': 'pt-BR,pt;q=0.9'
      },
      redirect: 'error',
      signal: AbortSignal.timeout(5000)
    });
    if (!htmlRes.ok) return defaultCfg;
    const html = await readTextWithLimit(htmlRes, 300 * 1024);
    const sduiMatch = html.match(/"templatesUrl"\s*:\s*"([^"]+)"/);
    if (!sduiMatch) return defaultCfg;

    const templatesPath = sduiMatch[1].replace(/([?&])locale=[^&]*/, '$1locale=pt-BR');
    const sduiUrl = new URL(`/api${templatesPath}`, safeUrl.origin);
    await validateExternalHttpUrl(sduiUrl.toString());

    const sduiRes = await fetch(sduiUrl.toString(), {
      headers: {
        accept: 'application/json',
        'accept-language': 'pt-BR,pt;q=0.9',
        'x-origin': safeUrl.hostname
      },
      redirect: 'error',
      signal: AbortSignal.timeout(5000)
    });
    if (!sduiRes.ok) return defaultCfg;

    const sduiJson = (await sduiRes.json()) as {
      options?: {
        moduleBetting?: Array<{
          params?: { apiUrl?: string; partnerId?: string };
        }>;
      };
    };
    const bettingParams = sduiJson.options?.moduleBetting?.[0]?.params;
    if (bettingParams?.apiUrl && bettingParams?.partnerId) {
      const validatedApi = await validateExternalHttpUrl(bettingParams.apiUrl);
      const resolved: OneWinGatewayConfig = {
        apiUrl: validatedApi.origin,
        partnerId: bettingParams.partnerId,
        origin: safeUrl.origin,
        cachedAt: Date.now()
      };
      gatewayCache.set(cacheKey, resolved);
      return resolved;
    }
  } catch {
    // Fall back safely to verified 1win gateway defaults
  }

  return defaultCfg;
}

interface OneWinMatchOddsGroup {
  id: string | number;
  name?: string;
  oddsList?: Array<{
    id: string;
    cf?: number;
    name?: string;
    outcome?: string;
    status?: number;
  }>;
}

async function fetch1winMatchOddsSnapshots(
  apiUrl: string,
  partnerId: string,
  origin: string,
  matchIds: number[]
): Promise<Map<number, OneWinMatchOddsGroup[]>> {
  const result = new Map<number, OneWinMatchOddsGroup[]>();
  if (matchIds.length === 0) return result;

  const uniqueIds = [...new Set(matchIds)];
  const wsBase = apiUrl.replace(/^http/i, 'ws');
  const wsUrl = `${wsBase}/push-server-v2/?Language=pt&externalPartnerId=${encodeURIComponent(
    partnerId
  )}&EIO=4&transport=websocket`;

  return await new Promise<Map<number, OneWinMatchOddsGroup[]>>((resolve) => {
    let settled = false;
    let ws: WebSocket | null = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      try {
        ws?.close();
      } catch {
        // ignore close errors
      }
      resolve(result);
    };

    const timeoutId = setTimeout(finish, 5500);

    try {
      const NodeWebSocket = WebSocket as unknown as new (
        url: string,
        init: { headers: Record<string, string> }
      ) => WebSocket;
      ws = new NodeWebSocket(wsUrl, {
        headers: {
          'x-external-partner-id': partnerId,
          origin,
          'user-agent': 'Mozilla/5.0'
        }
      });
    } catch {
      finish();
      return;
    }

    ws.addEventListener('error', () => {
      finish();
    });

    ws.addEventListener('close', () => {
      finish();
    });

    ws.addEventListener('message', (event) => {
      const msg = String(event.data || '');
      if (msg === '2') {
        ws?.send('3');
        return;
      }
      if (msg.startsWith('0')) {
        ws?.send('40');
        return;
      }
      if (msg.startsWith('40')) {
        const subPayload = JSON.stringify([
          'subscribe',
          {
            messageType: 'subscribe-match-odds',
            data: { matchIds: uniqueIds, isBaseOddsGroups: false }
          }
        ]);
        ws?.send(`42${subPayload}`);
        return;
      }
      if (msg.startsWith('42')) {
        try {
          const parsed = JSON.parse(msg.slice(2)) as [
            string,
            {
              messageType?: string;
              data?: { matchId?: number; oddsGroups?: OneWinMatchOddsGroup[] };
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
            if (result.size >= uniqueIds.length) {
              finish();
            }
          }
        } catch {
          // ignore malformed frames
        }
      }
    });
  });
}

async function resolve1winSharedBet(
  code: string,
  parsedUrl: URL | null,
  rawInput: string
): Promise<ParsedBetResponse> {
  const gw = await resolve1winGatewayConfig(parsedUrl);
  const stakeFromInput = extractStakeFromRawInput(rawInput, parsedUrl);

  const apiHeaders = {
    accept: 'application/json',
    'content-type': 'application/json',
    'x-lang': 'pt',
    'x-external-partner-id': gw.partnerId,
    origin: gw.origin,
    referer: `${gw.origin}/`
  };

  const sharedRes = await fetch(`${gw.apiUrl}/shared-bets/get`, {
    method: 'POST',
    headers: apiHeaders,
    body: JSON.stringify({ code }),
    signal: AbortSignal.timeout(7000)
  });

  const sharedJson = (await sharedRes.json().catch(() => null)) as {
    result?: { coupons?: Array<{ oddId: string; matchId: number }> };
    errors?: Array<{ code?: string; message?: string }>;
  } | null;

  if (!sharedRes.ok || !sharedJson?.result?.coupons) {
    const errCode = sharedJson?.errors?.[0]?.code;
    if (errCode === 'not_found_error') {
      throw new Error(
        `Código de aposta "${code}" não encontrado ou expirado na 1win.`
      );
    }
    throw new Error('Não foi possível consultar esse bilhete na 1win no momento.');
  }

  const coupons = sharedJson.result.coupons;
  if (coupons.length === 0) {
    throw new Error('O bilhete compartilhado não possui seleções ativas.');
  }

  const uniqueMatchIds = [...new Set(coupons.map((c) => c.matchId))];

  // Fetch match metadata and live odds snapshots in parallel
  const [matchesResults, oddsSnapshotMap] = await Promise.all([
    Promise.allSettled(
      uniqueMatchIds.map(async (matchId) => {
        const r = await fetch(
          `${gw.apiUrl}/matches/get?matchId=${matchId}&l=pt&p=${encodeURIComponent(gw.partnerId)}`,
          {
            headers: apiHeaders,
            signal: AbortSignal.timeout(6000)
          }
        );
        if (!r.ok) return null;
        const j = (await r.json()) as {
          result?: {
            id: number;
            name?: string;
            homeTeam?: { name?: string };
            awayTeam?: { name?: string };
            competitors?: Array<{ name?: string; position?: number }>;
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
    fetch1winMatchOddsSnapshots(gw.apiUrl, gw.partnerId, gw.origin, uniqueMatchIds)
  ]);

  const matchMap = new Map<
    number,
    NonNullable<
      Awaited<ReturnType<typeof Promise.resolve<{
        id: number;
        name?: string;
        homeTeam?: { name?: string };
        awayTeam?: { name?: string };
        competitors?: Array<{ name?: string; position?: number }>;
        sport?: { slug?: string; tag?: string; isEsport?: boolean };
        category?: { slug?: string };
        tournament?: { slug?: string };
        serviceV2?: string;
        startAt?: number;
      } | null>>>
    >
  >();

  for (const res of matchesResults) {
    if (res.status === 'fulfilled' && res.value) {
      matchMap.set(res.value.id, res.value);
    }
  }

  const legs: ParsedBetLeg[] = [];
  let missingOddsCount = 0;

  for (const coupon of coupons) {
    const match = matchMap.get(coupon.matchId);
    const groups = oddsSnapshotMap.get(coupon.matchId) || [];

    let matchedGroupName = '';
    let matchedSelection = '';
    let matchedOdd = 0;

    for (const g of groups) {
      const foundOdd = g.oddsList?.find((o) => o.id === coupon.oddId);
      if (foundOdd) {
        matchedGroupName = g.name || 'Mercado';
        matchedSelection = foundOdd.name || foundOdd.outcome || '';
        matchedOdd = Number(foundOdd.cf || 0);
        break;
      }
    }

    if (!matchedOdd) {
      missingOddsCount += 1;
    }

    const home = match?.homeTeam?.name || match?.competitors?.[0]?.name;
    const away = match?.awayTeam?.name || match?.competitors?.[1]?.name;
    const matchupLabel =
      home && away
        ? `${home} vs ${away}`
        : (match?.name || `Partida #${coupon.matchId}`).replace(/\s+-\s+/, ' vs ');

    const { tournamentLabel, prefix } = format1winTournamentHeader(match);
    const fullEventLabel = prefix ? `${prefix} ${matchupLabel}` : matchupLabel;

    legs.push({
      matchId: coupon.matchId,
      event: fullEventLabel,
      sport: map1winSportToAppSport(match?.sport),
      tournament: tournamentLabel,
      marketGroup: matchedGroupName || 'Mercado 1win',
      selection: matchedSelection || 'Seleção encerrada/indisponível',
      odd: matchedOdd,
      isLive: match?.serviceV2 === 'live',
      startAt: match?.startAt
    });
  }

  if (legs.every((l) => !l.event || l.event.startsWith('Partida #')) && missingOddsCount === legs.length) {
    throw new Error(
      'Os eventos deste link compartilhado já encerraram ou não estão mais disponíveis na 1win.'
    );
  }

  const isMultiple = legs.length > 1;
  const primarySport = legs[0]?.sport || 'Futebol';
  const validOdds = legs.map((l) => l.odd).filter((o) => o > 1);

  const combinedOdd =
    validOdds.length === legs.length && validOdds.length > 0
      ? Number(validOdds.reduce((acc, cur) => acc * cur, 1).toFixed(2))
      : null;

  const eventSummary = isMultiple
    ? `Múltipla (${legs.length}x): ${legs.map((l) => l.event).join(' + ')}`
    : legs[0].event;

  const marketSummary = isMultiple
    ? legs
        .map((l, idx) => {
          const oddSuffix = l.odd > 1 ? ` @ ${l.odd.toFixed(2)}` : '';
          return `${idx + 1}) ${l.event}: ${l.marketGroup} — ${l.selection}${oddSuffix}`;
        })
        .join(' | ')
    : legs[0].odd > 1
    ? `${legs[0].marketGroup}: ${legs[0].selection}`
    : '';

  const partial = missingOddsCount > 0;
  let warning: string | undefined;
  if (partial) {
    warning =
      'O evento foi identificado, mas a cotação/linha já foi encerrada na casa. Confira o mercado e a odd manualmente.';
  } else if (stakeFromInput === null) {
    warning =
      'Link compartilhado identificado! Como o código de compartilhamento da 1win não envia o valor da sua aposta, confira sua Stake abaixo.';
  }

  return {
    success: true,
    bookmaker: '1win',
    sport: primarySport,
    event: eventSummary,
    market: marketSummary,
    odd: combinedOdd,
    stake: stakeFromInput,
    stakeIncludedInSource: stakeFromInput !== null,
    status: 'PENDENTE',
    isMultiple,
    selectionsCount: legs.length,
    legs,
    shareCode: code,
    sourceUrl: parsedUrl?.toString(),
    partial,
    warning
  };
}

function cleanServerTipLine(line: string): string {
  return line
    .replace(/[•▪▸►➤✅🔥🎯📌⚽🏀🎾🏐🏓🥊🏒💰📊🏆⏰📅🎖️🏅⚡💎🚀⭐🌟💥🎉💸💵💳📲🔗⏱️🕒]+/gu, '')
    .replace(/^(?:jogo|partida|evento|duelo|match|confronto|mercado|aposta|entrada|tip|pick|linha|sele[cç][aã]o|liga|campeonato|torneio)\s*[:\-–]\s*/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function parseGenericBetLinkOrText(
  rawInput: string,
  parsedUrl: URL | null
): Promise<ParsedBetResponse> {
  const bookmaker = detectBookmakerFromUrl(parsedUrl, rawInput);
  const stake = extractStakeFromRawInput(rawInput, parsedUrl);

  let odd: number | null = null;
  let units: number | null = null;
  let matchup = '';
  let market = '';
  let tournament = '';

  if (parsedUrl) {
    for (const key of ['odd', 'odds', 'cf', 'price']) {
      const v = parsedUrl.searchParams.get(key);
      if (v) {
        const n = Number(v.replace(',', '.'));
        if (Number.isFinite(n) && n > 1 && n < 10000) {
          odd = Number(n.toFixed(2));
          break;
        }
      }
    }
    matchup =
      parsedUrl.searchParams.get('event') ||
      parsedUrl.searchParams.get('match') ||
      '';
    market =
      parsedUrl.searchParams.get('market') ||
      parsedUrl.searchParams.get('selection') ||
      '';
  }

  // Extract odd & units from text lines
  const withoutUrls = rawInput.replace(/https?:\/\/[^\s<>"'`]+/gi, '').trim();
  const atMatch = withoutUrls.match(/@\s*(\d+(?:[.,]\d{1,3})?)/);
  const labeledOddMatch = withoutUrls.match(
    /\b(?:odd|odds|cota[cç][aã]o|cot)\s*[:=]?\s*(\d+(?:[.,]\d{1,3})?)/i
  );
  const oddToken = atMatch || labeledOddMatch;
  if (!odd && oddToken) {
    const n = Number(oddToken[1].replace(',', '.'));
    if (Number.isFinite(n) && n > 1 && n < 10000) odd = Number(n.toFixed(2));
  }

  const unitMatch = withoutUrls.match(
    /\(?\s*(\d+(?:[.,]\d{1,2})?)\s*(?:unidades?|unid|un|u)\.?\s*\)?/i
  );
  if (unitMatch) {
    const u = Number(unitMatch[1].replace(',', '.'));
    if (Number.isFinite(u) && u > 0 && u <= 100) units = Number(u.toFixed(2));
  }

  const rawLines = withoutUrls
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const lines =
    rawLines.length === 1 && rawLines[0].includes('|')
      ? rawLines[0].split('|').map((l) => l.trim()).filter(Boolean)
      : rawLines;

  const marketParts: string[] = [];
  for (const line of lines) {
    let stripped = line
      .replace(/@\s*\d+(?:[.,]\d{1,3})?/g, ' ')
      .replace(/\b(?:odd|odds|cota[cç][aã]o|cot)\s*[:=]?\s*\d+(?:[.,]\d{1,3})?/gi, ' ')
      .replace(/R\$\s*\d+(?:[.,]\d{1,2})?/gi, ' ')
      .replace(/\(?\s*\d+(?:[.,]\d{1,2})?\s*(?:unidades?|unid|un|u)\.?\s*\)?/gi, ' ');
    stripped = cleanServerTipLine(stripped).replace(/[()|]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    if (!stripped || /^\d{1,2}[:h]\d{2}$/i.test(stripped)) continue;

    const isTimeHeader = /\s+[-–]\s+\d{1,2}[:h]\d{2}\b/i.test(line);
    const hasFlag = /(?:\p{Regional_Indicator}{2}|🏴󠁧󠁢[a-z]+󠁿)/u.test(stripped);
    if (!matchup && !isTimeHeader && /^.+?\s+(?:x|vs\.?|v)\s+.+$/i.test(stripped)) {
      matchup = stripped;
      continue;
    }
    if (!tournament && (isTimeHeader || hasFlag || /^live\b/i.test(stripped) || Boolean(inferServerCompetitionFlag(stripped)))) {
      tournament = ensureServerCompetitionHasFlag(
        stripped.replace(/\s*(?:[-–]\s*)?(\d{1,2}[:h]\d{2})$/i, ' - $1').trim()
      );
      continue;
    }
    marketParts.push(stripped);
  }
  if (!market && marketParts.length > 0) {
    market = marketParts.join(' · ');
  }

  const event =
    tournament && matchup
      ? `${tournament} ${matchup}`
      : ensureServerCompetitionHasFlag(matchup || tournament);

  // Fetch public page OpenGraph metadata as fallback when a generic URL is provided
  let finalEvent = event;
  if (parsedUrl && (!finalEvent || !market)) {
    try {
      const safeUrl = await validateExternalHttpUrl(parsedUrl.toString());
      const res = await fetch(safeUrl.toString(), {
        headers: {
          'user-agent': 'Mozilla/5.0',
          'accept-language': 'pt-BR,pt;q=0.9'
        },
        redirect: 'error',
        signal: AbortSignal.timeout(4500)
      });
      if (res.ok && (res.headers.get('content-type') || '').includes('text/html')) {
        const html = await readTextWithLimit(res, 256 * 1024);
        const titleMatch =
          html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
          html.match(/<title>([^<]+)<\/title>/i);
        const descMatch = html.match(
          /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i
        );
        if (!finalEvent && titleMatch?.[1]) {
          const cleanTitle = titleMatch[1].replace(/\s*[-|].*$/, '').trim();
          if (cleanTitle && !cleanTitle.toLowerCase().includes('1win')) {
            finalEvent = cleanTitle;
          }
        }
        if (!market && descMatch?.[1]) {
          market = descMatch[1].slice(0, 140).trim();
        }
      }
    } catch {
      // Ignore metadata fetch errors; still return what we detected
    }
  }

  if (!finalEvent && !market && !odd && !stake && !units) {
    throw new Error(
      `Casa identificada (${bookmaker}), mas esse link não expõe os dados públicos da aposta sem login. Cole também o texto do bilhete (ex: Time A x Time B / Mercado) ou use links com código (?sharebet=...).`
    );
  }

  return {
    success: true,
    bookmaker,
    sport: 'Futebol',
    event: finalEvent || '',
    market: market || '',
    tournament: tournament || undefined,
    odd,
    stake,
    units,
    stakeIncludedInSource: stake !== null || units !== null,
    status: 'PENDENTE',
    isMultiple: false,
    selectionsCount: 1,
    legs: finalEvent || market
      ? [
          {
            event: matchup || finalEvent || 'Entrada',
            sport: 'Futebol',
            tournament: tournament || undefined,
            marketGroup: market || 'Mercado',
            selection: market || '',
            odd: odd || 0
          }
        ]
      : [],
    sourceUrl: parsedUrl?.toString(),
    partial: !finalEvent || !market || !odd,
    warning:
      'Campos identificados! Confira a Odd e a Stake abaixo antes de confirmar.'
  };
}

async function createApp() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  app.post('/api/parse-bet-link', async (req: Request, res: Response) => {
    try {
      const body = req.body as { input?: unknown } | undefined;
      const rawInput = typeof body?.input === 'string' ? body.input.trim() : '';

      if (!rawInput || rawInput.length > 2000) {
        res.status(400).json({
          success: false,
          error: 'Cole um link ou código de aposta válido (até 2000 caracteres).'
        });
        return;
      }

      const extractedUrlStr = extractUrlFromText(rawInput);
      let parsedUrl: URL | null = null;
      if (extractedUrlStr) {
        parsedUrl = await validateExternalHttpUrl(extractedUrlStr);
      }

      const shareCode = extractShareBetCode(rawInput, parsedUrl);
      const bookmaker = detectBookmakerFromUrl(parsedUrl, rawInput);

      if (shareCode && bookmaker === '1win') {
        const result = await resolve1winSharedBet(shareCode, parsedUrl, rawInput);
        res.json(result);
        return;
      }

      const fallback = await parseGenericBetLinkOrText(rawInput, parsedUrl);
      res.json(fallback);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Não foi possível identificar a aposta a partir desse link.';
      res.status(422).json({
        success: false,
        error: message
      });
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Apex Bankroll server running on http://0.0.0.0:${PORT}`);
  });
}

createApp().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
