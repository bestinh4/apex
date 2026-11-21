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
  bookmaker: string;
  sport: string;
  event: string;
  market: string;
  odd: number | null;
  stake: number | null;
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
  return false;
}

export async function parseBetLink(rawInput: string): Promise<ParsedBetLinkResult> {
  const response = await fetch('/api/parse-bet-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: rawInput.trim() })
  });

  const data = (await response.json().catch(() => null)) as
    | (ParsedBetLinkResult & { error?: string })
    | null;

  if (!response.ok || !data?.success) {
    throw new Error(
      data?.error || 'Não foi possível identificar os dados desse link de aposta.'
    );
  }

  return data;
}

function normalizeStr(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Tries to match an imported bookmaker market (e.g., "Total e ambos os times marcam: Acima De 2.5 E Sim")
 * to the closest catalog entry in FOOTBALL_MARKETS so the category/market picker highlights cleanly,
 * while the exact imported market label remains preserved in `customMarketText`.
 */
export function matchFootballCatalogMarket(
  marketText: string
): { market: FootballMarket; selection?: string } | null {
  const n = normalizeStr(marketText);
  if (!n) return null;

  const findById = (id: string) => FOOTBALL_MARKETS.find((m) => m.id === id);

  if ((n.includes('ambas') || n.includes('ambos')) && (n.includes('total') || n.includes('acima') || n.includes('abaixo'))) {
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
  if (n.includes('handicap asiatico') || n.includes('asian handicap')) {
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
  if (n.includes('1x2') || n.includes('vencedor') || n.includes('resultado final')) {
    const m = findById('1x2');
    if (m) return { market: m };
  }
  if (n.includes('total') || n.includes('acima') || n.includes('abaixo') || n.includes('over') || n.includes('under')) {
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
