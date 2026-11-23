/**
 * Sistema unificado de normalização de nomes de times e resolução de identificadores canônicos.
 * Executado antes da busca de escudos (cache, base verificada e APIs externas) para garantir
 * que variações ortográficas, acentos, abreviações e pequenos erros de digitação (ex.: 'Newcastle'
 * e 'Newcastl') sejam mapeados para o mesmo identificador.
 */

export interface NormalizeTeamNameOptions {
  /** Expande abreviações comuns (Utd, Atl., St., Man. City) e exônimos em português (Veneza, Munique). Padrão: true. */
  expandAbbreviations?: boolean;
  /** Remove prefixos/sufixos institucionais (FC, SC, EC, 1., 1909) e conectores (de, da, do). Padrão: true. */
  stripDecorations?: boolean;
}

const BRAZILIAN_STATE_SUFFIX_REGEX =
  /(?:^|\s|-)((?:mg|sp|rj|rs|pr|ba|pe|ce|go|df|sc|pb|pa|rn|al|se|ma|pi|mt|ms|to|es|am|ro|ac|ap|rr))$/i;

const EXPLICIT_BRAZILIAN_HYPHEN_STATE_REGEX =
  /\s*-\s*(mg|sp|rj|rs|pr|ba|pe|ce|go|df|sc|pb|pa|rn|al|se|ma|pi|mt|ms|to|es|am|ro|ac|ap|rr)\b/i;

/**
 * Remove diacríticos/acentos e normaliza caracteres especiais europeus/nórdicos (ø, ł, æ, œ, ß, đ).
 */
export function stripDiacritics(input: string): string {
  return (input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[øØ]/g, (ch) => (ch === 'Ø' ? 'O' : 'o'))
    .replace(/[łŁ]/g, (ch) => (ch === 'Ł' ? 'L' : 'l'))
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .replace(/[æÆ]/g, (ch) => (ch === 'Æ' ? 'AE' : 'ae'))
    .replace(/[œŒ]/g, (ch) => (ch === 'Œ' ? 'OE' : 'oe'))
    .replace(/ß/g, 'ss')
    .replace(/[đĐðÐ]/g, (ch) => (ch === 'Đ' || ch === 'Ð' ? 'D' : 'd'));
}

/**
 * Indica se o nome bruto possui sufixo explícito de UF brasileira após hífen (ex.: 'Botafogo-SP', 'Atlético-MG').
 */
export function hasBrazilianStateSuffix(rawName: string): boolean {
  return EXPLICIT_BRAZILIAN_HYPHEN_STATE_REGEX.test(rawName || '');
}

/**
 * Regras de expansão aplicadas APÓS minúsculas, remoção de acentos e limpeza de pontuação
 * (portanto 'Man. City', 'Man City' e 'Man-City' já chegam como 'man city').
 */
const EXPANSION_RULES: Array<[RegExp, string]> = [
  // Siglas / apelidos completos de clubes (precisam rodar antes das expansões parciais)
  [/^nufc$/i, 'newcastle united'],
  [/^mufc$/i, 'manchester united'],
  [/^mcfc$/i, 'manchester city'],
  [/^thfc$/i, 'tottenham hotspur'],
  [/^whufc$/i, 'west ham united'],
  [/^bha$|^bhafc$/i, 'brighton hove albion'],
  [/^lfc$/i, 'liverpool'],
  [/^cfc$/i, 'chelsea'],
  [/^afc$/i, 'arsenal'],
  [/^psg$|\bparis\s+sg\b/gi, 'paris saint germain'],
  [/^bvb$/i, 'borussia dortmund'],
  [/^spurs$/i, 'tottenham hotspur'],
  [/\bwolves\b/gi, 'wolverhampton wanderers'],
  [/\bman\s+city\b/gi, 'manchester city'],
  [/\bman\s+(?:utd|united)\b/gi, 'manchester united'],
  [/\bnottm\b/gi, 'nottingham'],
  [/\bnottm\s+forest\b/gi, 'nottingham forest'],
  [/\bunion\s+sg\b/gi, 'union saint gilloise'],
  [/\bbusan\s+i\s+park\b/gi, 'busan ipark'],
  [/\bsuwon\s+samsung(?:\s+bluewings)?\b/gi, 'suwon bluewings'],
  [/\bjunior\s+barranquilla\b/gi, 'atletico junior'],
  [/\bnacional\s+montevideo\b/gi, 'nacional montevideo'],
  [/\bnewells\s+old\s+boys\b/gi, 'newells old boys'],
  [/\bm\s+gladbach\b|\bmonchengladbach\b/gi, 'borussia monchengladbach'],

  // Clubes brasileiros com UF ou siglas comuns
  [/\b(?:atletico|atl)\s+mg\b|\bca\s+mineiro\b/gi, 'atletico mineiro'],
  [/\b(?:athletico|atletico|atl)\s+pr\b/gi, 'athletico paranaense'],
  [/\b(?:atletico|atl)\s+go\b|\batletico\s+clube\s+goianiense\b/gi, 'atletico goianiense'],
  [/\b(?:america|amer)\s+mg\b/gi, 'america mineiro'],
  [/\brb\s+bragantino\b/gi, 'red bull bragantino'],
  [/\brb\s+salzburg\b|\brb\s+salzburgo\b/gi, 'red bull salzburg'],
  [/\brb\s+leipzig\b/gi, 'red bull leipzig'],

  // Abreviações genéricas de palavras
  [/\butd\b/gi, 'united'],
  [/\batl\b/gi, 'atletico'],
  [/\bath\b/gi, 'athletic'],
  [/\bind\b/gi, 'independiente'],
  [/\bdep\b/gi, 'deportivo'],
  [/\bsheff\b/gi, 'sheffield'],
  [/\bsp\b(?=\s+(?:braga|portugal))/gi, 'sporting'],
  [/\blp\b/gi, 'la plata'],
  [/\bst\b/gi, 'saint'],
  [/\bste\b/gi, 'sainte'],
  [/\bmt\b/gi, 'mount'],
  [/\bft\b(?=\s+[a-z])/gi, 'fort'],
  [/\bloko\b/gi, 'lokomotiv'],

  // Exônimos em português e variantes multilíngues
  [/\binter\s+(?:de\s+)?milao\b|\binter\s+milan\b/gi, 'internazionale'],
  [/\binternacional\s+de\s+porto\s+alegre\b/gi, 'internacional'],
  [/\bsporting\s+(?:de\s+portugal|lisboa|lisbon)\b/gi, 'sporting cp'],
  [/\bsporting\s+braga\b|\bsc\s+braga\b/gi, 'braga'],
  [/\bolympique\s+(?:de\s+)?marseille\b|\bolympique\s+(?:de\s+)?marselha\b|\bmarselha\b/gi, 'marseille'],
  [/\bolympique\s+(?:lyonnais|lyon)\b/gi, 'lyon'],
  [/\bsalzburgo\b/gi, 'salzburg'],
  [/\broyal\s+antwerp\b|\bantuerpia\b/gi, 'antwerp'],
  [/\bestrela\s+(?:da\s+)?amadora\b/gi, 'estrela'],
  [/\bestrela\s+vermelha\b/gi, 'red star belgrade'],
  [/\bdinamo\s+(?:de\s+)?kiev\b/gi, 'dynamo kyiv'],
  [/\bzenit\s+(?:saint\s+petersburg|sao\s+petersburgo)\b/gi, 'zenit'],
  [/\bsao\s+petersburgo\b/gi, 'saint petersburg'],
  [/\bcolonia\b|\bkoln\b/gi, 'cologne'],
  [/\bmunique\b|\bmunchen\b/gi, 'munich'],
  [/\bmoskow\b|\bmoscou\b/gi, 'moscow'],
  [/\bmilao\b/gi, 'milan'],
  [/\bveneza\b/gi, 'venezia'],
  [/\bgotemburgo\b/gi, 'goteborg'],
  [/\bnapoles\b/gi, 'napoli'],
  [/\bturim\b/gi, 'torino'],
  [/\bflorenca\b/gi, 'fiorentina'],
  [/\bbolonha\b/gi, 'bologna'],
  [/\bgenova\b/gi, 'genoa'],
  [/\bpadua\b/gi, 'padova'],
  [/\bsevilha\b/gi, 'sevilla'],
  [/\bsarago[c]?a\b/gi, 'zaragoza'],
  [/\bcorunha\b/gi, 'coruna'],
  [/\bbasileia\b/gi, 'basel'],
  [/\bzurique\b/gi, 'zurich'],
  [/\bgenebra\b/gi, 'geneva'],
  [/\bvarsovia\b/gi, 'warsaw'],
  [/\bcracovia\b/gi, 'krakow'],
  [/\bpraga\b/gi, 'prague'],
  [/\bbelgrado\b/gi, 'belgrade'],
  [/\batenas\b/gi, 'athens'],
  [/\bsalonica\b/gi, 'thessaloniki'],
  [/\bbucareste\b/gi, 'bucharest'],
  [/\bhamburgo\b/gi, 'hamburg'],
  [/\bestugarda\b/gi, 'stuttgart'],
  [/\bestrasburgo\b/gi, 'strasbourg'],
  [/\bbordeus\b/gi, 'bordeaux'],
  [/\bbruxelas\b/gi, 'brussels'],
  [/\bcopenhague\b|\bkobenhavn\b/gi, 'copenhagen'],
  [/\bestocolmo\b/gi, 'stockholm'],
  [/\bviena\b|\bwien\b/gi, 'vienna'],

  // Seleções em português
  [/^brasil$/i, 'brazil'],
  [/^espanha$/i, 'spain'],
  [/^franca$/i, 'france'],
  [/^alemanha$/i, 'germany'],
  [/^italia$/i, 'italy'],
  [/^inglaterra$/i, 'england'],
  [/^holanda$|^paises\s+baixos$/i, 'netherlands'],
  [/^belgica$/i, 'belgium'],
  [/^suica$/i, 'switzerland'],
  [/^suecia$/i, 'sweden'],
  [/^dinamarca$/i, 'denmark'],
  [/^noruega$/i, 'norway'],
  [/^polonia$/i, 'poland'],
  [/^escocia$/i, 'scotland'],
  [/^austria$/i, 'austria'],
  [/^turquia$/i, 'turkey'],
  [/^grecia$/i, 'greece'],
  [/^russia$/i, 'russia'],
  [/^ucrania$/i, 'ukraine'],
  [/^coreia\s+do\s+sul$/i, 'south korea'],
  [/^japao$/i, 'japan'],
  [/^marrocos$/i, 'morocco'],
  [/^estados\s+unidos$/i, 'usa']
];

const DECORATION_ACRONYMS = new Set([
  'fc', 'cf', 'ec', 'sc', 'ac', 'cr', 'se', 'ca', 'ce', 'aa', 'ad', 'sd', 'cd', 'ud',
  'rc', 'rcd', 'as', 'us', 'ss', 'ssc', 'sl', 'ogc', 'krc', 'kaa', 'rsc', 'pfc', 'bfc',
  'afc', 'fsv', 'tsg', 'vfb', 'vfl', 'nk', 'gnk', 'hnk', 'sk', 'fk', 'sv', 'kv', 'jk',
  'bk', 'ik', 'if', 'fbpa', 'fr', 'bc', 'sfc', 'gfc', 'cfc', 'lfc', 'hsc', 'sco', 'aj',
  'losc', 'alsace', 'tsv', 'bsc', 'aac', 'ff'
]);

const DECORATION_BOILERPLATE = new Set([
  'clube', 'club', 'esporte', 'sociedade', 'esportiva', 'regatas', 'balompie',
  'futbol', 'football', 'calcio', 'association', 'royale', 'royal'
]);

const CONNECTOR_WORDS = new Set([
  'de', 'da', 'do', 'dos', 'das', 'del', 'la', 'el', 'le', 'les', 'y', 'e', 'van', 'der', 'and'
]);

const FOUNDATION_NUMBER_REGEX = /^(?:0[4579]|9[68]|1[89]\d{2}|20[0-2]\d)$/;

/**
 * Normaliza o nome de um clube/seleção antes da busca pelos escudos:
 * 1. Remove acentos/diacríticos e padroniza minúsculas;
 * 2. Padroniza pontuação (pontos, hífens, barras, apóstrofos, '&');
 * 3. Expande abreviações e exônimos (ex.: 'Utd' -> 'united', 'Man. City' -> 'manchester city');
 * 4. Opcionalmente remove decorações institucionais (FC, SC, 1., 1909, 'de', 'do') preservando
 *    sufixos estaduais brasileiros quando relevantes (ex.: 'Botafogo-SP').
 */
export function normalizeTeamName(
  rawName: string,
  options: NormalizeTeamNameOptions = {}
): string {
  const { expandAbbreviations = true, stripDecorations = true } = options;
  if (!rawName) return '';

  const hadExplicitBrazilState = hasBrazilianStateSuffix(rawName);

  // Remove prefixo ordinal alemão/austríaco "1." antes de converter pontos em espaço
  let cleaned = stripDiacritics(rawName.normalize('NFKC'))
    .toLowerCase()
    .replace(/(?:^|\s)1\.(?=\s|$)/g, ' ')
    .replace(/['’`´]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[./_,;:|+\-–—]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!cleaned) return '';

  if (expandAbbreviations) {
    for (const [regex, replacement] of EXPANSION_RULES) {
      cleaned = cleaned.replace(regex, replacement);
    }
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  }

  if (!stripDecorations) {
    return cleaned;
  }

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  // Preserva o último token se for UF brasileira não expandida (ex.: Botafogo-SP -> 'botafogo sp')
  const lastToken = tokens[tokens.length - 1] || '';
  const preserveLastStateToken =
    hadExplicitBrazilState &&
    tokens.length >= 2 &&
    BRAZILIAN_STATE_SUFFIX_REGEX.test(lastToken) &&
    lastToken.length === 2;

  const filtered = tokens.filter((tok, idx) => {
    if (preserveLastStateToken && idx === tokens.length - 1) return true;
    if (FOUNDATION_NUMBER_REGEX.test(tok)) return false;
    if (DECORATION_ACRONYMS.has(tok)) return false;
    if (DECORATION_BOILERPLATE.has(tok)) return false;
    if (CONNECTOR_WORDS.has(tok)) return false;
    return true;
  });

  if (filtered.length === 0) {
    // Evita esvaziar nomes inteiramente compostos de palavras genéricas (ex.: "Sport Club")
    return tokens.filter((tok) => !CONNECTOR_WORDS.has(tok)).join(' ') || cleaned;
  }

  return filtered.join(' ');
}

/**
 * Gera um slug ASCII determinístico a partir de um nome já normalizado ou bruto.
 */
export function toCanonicalSlug(name: string): string {
  return stripDiacritics(name)
    .toLowerCase()
    .replace(/['’`´]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Calcula a distância Damerau-Levenshtein (suporta inserção, remoção, substituição e transposição adjacente,
 * como 'Newcastl' <-> 'Newcastle' ou 'Newcastel' <-> 'Newcastle').
 */
export function damerauLevenshtein(a: string, b: string): number {
  const lenA = a.length;
  const lenB = b.length;
  if (lenA === 0) return lenB;
  if (lenB === 0) return lenA;
  if (a === b) return 0;

  const dp: number[][] = Array.from({ length: lenA + 1 }, () => new Array<number>(lenB + 1).fill(0));
  for (let i = 0; i <= lenA; i++) dp[i][0] = i;
  for (let j = 0; j <= lenB; j++) dp[0][j] = j;

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let val = Math.min(
        dp[i - 1][j] + 1, // deleção
        dp[i][j - 1] + 1, // inserção
        dp[i - 1][j - 1] + cost // substituição
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        val = Math.min(val, dp[i - 2][j - 2] + cost); // transposição adjacente
      }
      dp[i][j] = val;
    }
  }
  return dp[lenA][lenB];
}
