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

const FLAG_REGEX = /(?:\p{Regional_Indicator}{2}|🏴󠁧󠁢[a-z]+󠁿)/gu;

const COMPETITION_FLAG_MAP: Array<[RegExp, string]> = [
  [/\b(jupiler|pro\s*league|belg(?:ium|ica)|belga)\b/i, '🇧🇪'],
  [/\b(brasileir[aã]o|s[eé]rie\s*[abcd]\b|copa\s*do\s*brasil|paulist[aã]o|carioca|ga[uú]cho|mineiro|nordeste|brazil|brasil)\b/i, '🇧🇷'],
  [/\b(premier\s*league|championship|efl|fa\s*cup|league\s*(?:one|two)|england|inglaterra)\b/i, '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  [/\b(laliga|la\s*liga|segunda\s*divisi[oó]n|copa\s*del\s*rey|spain|espanha)\b/i, '🇪🇸'],
  [/\b(serie\s*a|serie\s*b|coppa\s*italia|italy|it[aá]lia)\b/i, '🇮🇹'],
  [/\b(bundesliga|dfb[-\s]*pokal|germany|alemanha)\b/i, '🇩🇪'],
  [/\b(austria|[aá]ustria|admiral\s*bundesliga)\b/i, '🇦🇹'],
  [/\b(ligue\s*1|ligue\s*2|coupe\s*de\s*france|france|fran[cç]a)\b/i, '🇫🇷'],
  [/\b(liga\s*portugal|primeira\s*liga|ta[cç]a\s*de\s*portugal|portugal)\b/i, '🇵🇹'],
  [/\b(eredivisie|knvb|netherlands|holanda|pa[ií]ses\s*baixos)\b/i, '🇳🇱'],
  [/\b(r[uú]ssia|russia|russian\s*premier)\b/i, '🇷🇺'],
  [/\b(s[uü]per\s*lig|turkey|turquia)\b/i, '🇹🇷'],
  [/\b(liga\s*profesional|superliga\s*argentina|copa\s*argentina|argentina)\b/i, '🇦🇷'],
  [/\b(mls|nba|wnba|nfl|nhl|mlb|ncaa|usa|estados\s*unidos)\b/i, '🇺🇸'],
  [/\b(liga\s*mx|mexico|m[eé]xico)\b/i, '🇲🇽'],
  [/\b(premiership|scotland|esc[oó]cia)\b/i, '🏴󠁧󠁢󠁳󠁣󠁴󠁿'],
  [/\b(super\s*league|switzerland|su[ií][cç]a)\b/i, '🇨🇭'],
  [/\b(super\s*league\s*greece|greece|gr[eé]cia)\b/i, '🇬🇷'],
  [/\b(ekstraklasa|poland|pol[oô]nia)\b/i, '🇵🇱'],
  [/\b(superligaen|denmark|dinamarca)\b/i, '🇩🇰'],
  [/\b(allsvenskan|sweden|su[eé]cia)\b/i, '🇸🇪'],
  [/\b(eliteserien|norway|noruega)\b/i, '🇳🇴'],
  [/\b(ukraine|ucr[aâ]nia)\b/i, '🇺🇦'],
  [/\b(champions\s*league|europa\s*league|conference\s*league|nations\s*league|uefa|euro(?:copa)?)\b/i, '🇪🇺'],
  [/\b(libertadores|sul[-\s]*americana|sudamericana|conmebol|copa\s*am[eé]rica)\b/i, '🌎'],
  [/\b(j[-\s]*league|japan|jap[aã]o)\b/i, '🇯🇵'],
  [/\b(k[-\s]*league|south\s*korea|coreia)\b/i, '🇰🇷'],
  [/\b(saudi|roshn|ar[aá]bia\s*saudita)\b/i, '🇸🇦'],
  [/\b(world\s*cup|copa\s*do\s*mundo|fifa|eliminat[oó]rias)\b/i, '🌍']
];

export const POPULAR_COMPETITION_PRESETS = [
  { label: '🇧🇷 Brasileirão', value: 'Brasileirão 🇧🇷' },
  { label: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League', value: 'Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { label: '🇪🇸 LaLiga', value: 'LaLiga 🇪🇸' },
  { label: '🇮🇹 Serie A', value: 'Serie A 🇮🇹' },
  { label: '🇩🇪 Bundesliga', value: 'Bundesliga 🇩🇪' },
  { label: '🇫🇷 Ligue 1', value: 'Ligue 1 🇫🇷' },
  { label: '🇵🇹 Liga Portugal', value: 'Liga Portugal 🇵🇹' },
  { label: '🇧🇪 Liga Jupiler', value: 'Liga Jupiler 🇧🇪' },
  { label: '🇳🇱 Eredivisie', value: 'Eredivisie 🇳🇱' },
  { label: '🇷🇺 Premier League', value: 'Premier League 🇷🇺' },
  { label: '🇦🇹 Bundesliga', value: 'Bundesliga 🇦🇹' },
  { label: '🇪🇺 Champions League', value: 'Champions League 🇪🇺' },
  { label: '🌎 Libertadores', value: 'Libertadores 🌎' },
  { label: '🇺🇸 NBA', value: 'NBA 🇺🇸' }
] as const;

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
  // Insert flag before trailing time if formatted like "Liga Jupiler - 16:45"
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
    .replace(/^(?:jogo|partida|evento|duelo|match|confronto|mercado|aposta|entrada|tip|pick|linha|sele[cç][aã]o|liga|campeonato|torneio)\s*[:\-–]\s*/i, '')
    .trim();
}

/**
 * Strips decorative symbols (⚽, 🔥, 🎯, etc.) while PRESERVING country flag emojis (🇧🇪, 🇷🇺, 🇩🇪, etc.).
 */
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
    /one-[a-z0-9-]+\.(com|pro|xyz|top|win|bet)/i.test(lower) ||
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
  if (
    /^(?:liga|campeonato|torneio|copa|ta[cç]a)\b/i.test(clean)
  ) {
    return true;
  }
  return false;
}

/**
 * Parses structured multi-line or single-line betting slips/tips locally in browser:
 * Example:
 *   Liga Jupiler 🇧🇪 - 16:45
 *   Mechelen x Club Brugge
 *   BTTS e Over 2.5 Gols @1.80 (1 un)
 * Produces event: "Liga Jupiler 🇧🇪 - 16:45 Mechelen x Club Brugge"
 */
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

export async function parseBetLink(rawInput: string): Promise<ParsedBetLinkResult> {
  const trimmed = rawInput.trim();
  const hasUrl = /https?:\/\//i.test(trimmed);
  const hasShareCodeParam = /sharebet[=:][a-zA-Z0-9_-]{4,}/i.test(trimmed);
  const isBareShareCode = /^[a-zA-Z0-9]{6,16}$/.test(trimmed);

  const localTip = parseBetTipText(trimmed);

  if (!hasUrl && !hasShareCodeParam && !isBareShareCode) {
    if (localTip) {
      return localTip;
    }
    throw new Error(
      'Não foi possível identificar os dados do texto. Tente informar o jogo (ex: Time A x Time B) e o mercado.'
    );
  }

  try {
    const response = await fetch('/api/parse-bet-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: trimmed })
    });

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? ((await response.json().catch(() => null)) as
          | (ParsedBetLinkResult & { error?: string })
          | null)
      : null;

    if (!response.ok || !data?.success) {
      if (localTip && (localTip.event || localTip.market)) {
        return {
          ...localTip,
          bookmaker: detectBookmakerInText(trimmed) || localTip.bookmaker,
          warning: data?.error
            ? `${data.error} Dados do texto colado foram preenchidos abaixo.`
            : localTip.warning
        };
      }
      throw new Error(
        data?.error || 'Não foi possível identificar os dados desse link de aposta.'
      );
    }

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
  } catch (err) {
    if (localTip && (localTip.event || localTip.market)) {
      return {
        ...localTip,
        bookmaker: detectBookmakerInText(trimmed) || localTip.bookmaker
      };
    }
    throw err instanceof Error
      ? err
      : new Error('Não foi possível identificar os dados desse link de aposta.');
  }
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
