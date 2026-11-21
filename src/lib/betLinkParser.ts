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

export function looksLikeBetLinkInput(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/https?:\/\//i.test(trimmed)) return true;
  if (/sharebet[=:][a-zA-Z0-9_-]{4,}/i.test(trimmed)) return true;
  // Also auto-trigger on multi-line tipster text or "Time A x Time B" / "@1.80"
  if (trimmed.includes('\n') && trimmed.length >= 10) return true;
  if (/\b\S+\s+(?:x|vs\.?)\s+\S+/i.test(trimmed)) return true;
  return false;
}

function stripLeadingDecorations(line: string): string {
  return line
    .replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\u200d\ufe0f•▪▸►➤✅🔥🎯📌⚽🏀🎾🏐🏓🥊🏒💰📊🏆⏰📅]+\s*/gu, '')
    .replace(/^(?:jogo|partida|evento|duelo|match|confronto|mercado|aposta|entrada|tip|pick|linha|sele[cç][aã]o|liga|campeonato|torneio)\s*[:\-–]\s*/i, '')
    .trim();
}

function stripEmojis(text: string): string {
  return text
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u200d\ufe0f]/gu, '')
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
  if (
    /\b(t[eê]nis\s+de\s+mesa|tt\s*cup|setka|ping\s*pong)\b/i.test(lower)
  ) {
    return 'Tênis de Mesa';
  }
  if (
    /\b(atp|wta|challenger|itf|grand\s*slam|tie[-\s]?break|t[eê]nis|games?\b)\b/i.test(lower)
  ) {
    return 'Tênis';
  }
  if (
    /\b(v[oô]lei|volleyball|superliga|liga\s+das\s+na[cç][oõ]es)\b/i.test(lower)
  ) {
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

  // Match @1.80 or @ 1,80
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

  // 1. Monetary stake: R$ 50,00 or Stake: 50
  const moneyMatch =
    cleaned.match(/R\$\s*(\d+(?:[.,]\d{1,2})?)/i) ||
    cleaned.match(/\b(?:stake|valor)\s*[:=]?\s*(?:R\$\s*)?(\d+(?:[.,]\d{1,2})?)(?!\s*(?:unidades?|unid|un|u)\b)/i);
  if (moneyMatch) {
    const n = Number(moneyMatch[1].replace(',', '.'));
    if (Number.isFinite(n) && n > 0 && n < 1_000_000) {
      stake = Number(n.toFixed(2));
      cleaned = cleaned.replace(moneyMatch[0], ' ');
    }
  }

  // 2. Units: (1 un), (0.5u), 1.5 un, 2 unidades
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

  // Remove empty parentheses or trailing separators left over
  cleaned = cleaned
    .replace(/\(\s*\)/g, ' ')
    .replace(/[|•\-–]+\s*$/g, '')
    .replace(/^\s*[|•\-–]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return { stake, units, cleaned };
}

function isMatchupLine(line: string): boolean {
  const clean = stripEmojis(stripLeadingDecorations(line));
  if (!clean) return false;
  // "Team A x Team B" or "Team A vs Team B" or "Team A v Team B"
  if (/^.+?\s+(?:x|vs\.?|v)\s+.+$/i.test(clean)) return true;
  // "Team A - Team B" only when right side isn't a time like "16:45" or "16h45"
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
  const clean = stripEmojis(line).trim();
  if (!clean) return false;
  if (/\s+[-–]\s+\d{1,2}[:h]\d{2}\b/i.test(clean)) return true;
  if (
    /^(?:liga|campeonato|torneio|copa|brasileir[aã]o|premier|laliga|la liga|serie a|bundesliga|ligue 1|champions|europa|libertadores|sul-americana|nba|nbb|atp|wta|jupiler|eredivisie)\b/i.test(
      clean
    ) &&
    !isMatchupLine(clean)
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
 */
export function parseBetTipText(rawInput: string): ParsedBetLinkResult | null {
  const withoutUrls = rawInput.replace(/https?:\/\/[^\s<>"'`]+/gi, '').trim();
  if (!withoutUrls) return null;

  const rawLines = withoutUrls
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Support single-line pipe-separated format if user pasted with "|"
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
  let event = '';
  const marketCandidates: string[] = [];

  for (const originalLine of lines) {
    // Clean per-line odd/stake/units/emojis/labels
    const step1 = extractOddFromText(originalLine).cleaned;
    const step2 = extractStakeOrUnitsFromText(step1).cleaned;
    const cleanLine = stripEmojis(stripLeadingDecorations(step2));

    if (!cleanLine) continue;

    // If line is purely metadata like "16:45" or "1 unidade" skip
    if (/^\d{1,2}[:h]\d{2}$/i.test(cleanLine)) continue;

    // 1. Check matchup line ("Mechelen x Club Brugge")
    if (!event && isMatchupLine(cleanLine)) {
      event = cleanLine.replace(/\s+/g, ' ').trim();
      continue;
    }

    // 2. Check league/header line ("Liga Jupiler 🇧🇪 - 16:45")
    if (!tournament && isLeagueOrHeaderLine(originalLine)) {
      tournament = stripEmojis(originalLine)
        .replace(/\s*[-–|]?\s*\d{1,2}[:h]\d{2}\b/gi, '')
        .replace(/^(?:liga|campeonato|torneio)\s*[:\-–]\s*/i, (m) => m)
        .replace(/[-–\s]+$/g, '')
        .trim();
      continue;
    }

    // 3. Otherwise treat as market / selection line ("BTTS e Over 2.5 Gols")
    marketCandidates.push(cleanLine);
  }

  // Fallback if single-line tip had event + market mixed, or no explicit matchup separator
  if (!event && marketCandidates.length >= 2 && !tournament) {
    tournament = marketCandidates.shift() || '';
  }

  const market = marketCandidates.join(' · ').trim();

  if (!event && !market && odd === null && stake === null && units === null) {
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
    event,
    market,
    tournament: tournament || undefined,
    odd,
    stake,
    units,
    stakeIncludedInSource: stake !== null || units !== null,
    status: 'PENDENTE',
    isMultiple: false,
    selectionsCount: 1,
    legs: event || market
      ? [
          {
            event: event || 'Entrada',
            sport,
            tournament: tournament || undefined,
            marketGroup: market || 'Mercado',
            selection: market || '',
            odd: odd || 0
          }
        ]
      : [],
    partial: !event || !market || odd === null,
    warning
  };
}

export async function parseBetLink(rawInput: string): Promise<ParsedBetLinkResult> {
  const trimmed = rawInput.trim();
  const hasUrl = /https?:\/\//i.test(trimmed);
  const hasShareCodeParam = /sharebet[=:][a-zA-Z0-9_-]{4,}/i.test(trimmed);
  const isBareShareCode = /^[a-zA-Z0-9]{6,16}$/.test(trimmed);

  const localTip = parseBetTipText(trimmed);

  // If user pasted a text tip (like Liga / Mechelen x Club Brugge / BTTS e Over 2.5 Gols @1.80)
  // without a URL/sharebet code, parse immediately on the client without risking network/API errors!
  if (!hasUrl && !hasShareCodeParam && !isBareShareCode) {
    if (localTip) {
      return localTip;
    }
    throw new Error(
      'Não foi possível identificar os dados do texto. Tente informar o jogo (ex: Time A x Time B) e o mercado.'
    );
  }

  // URL or 1win sharebet code -> resolve via backend API, with resilient fallback to local tip if available
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
          warning:
            data?.error
              ? `${data.error} Dados do texto colado foram preenchidos abaixo.`
              : localTip.warning
        };
      }
      throw new Error(
        data?.error || 'Não foi possível identificar os dados desse link de aposta.'
      );
    }

    // Merge local tip details if server only partially resolved (e.g. expired odd + pasted text)
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

/**
 * Tries to match an imported bookmaker/tip market (e.g., "BTTS e Over 2.5 Gols"
 * or "Total e ambos os times marcam: Acima De 2.5 E Sim")
 * to the closest catalog entry in FOOTBALL_MARKETS so the category/market picker highlights cleanly,
 * while the exact imported market label remains preserved in `customMarketText`.
 */
export function matchFootballCatalogMarket(
  marketText: string
): { market: FootballMarket; selection?: string } | null {
  const n = normalizeStr(marketText);
  if (!n) return null;

  const findById = (id: string) => FOOTBALL_MARKETS.find((m) => m.id === id);

  if (
    (n.includes('ambas') || n.includes('ambos') || n.includes('btts')) &&
    (n.includes('total') || n.includes('acima') || n.includes('abaixo') || n.includes('over') || n.includes('under') || n.includes('vence') || n.includes('empate'))
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
  if (n.includes('total') || n.includes('acima') || n.includes('abaixo') || n.includes('over') || n.includes('under') || n.includes('mais de') || n.includes('menos de')) {
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
