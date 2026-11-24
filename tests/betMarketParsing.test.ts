import assert from 'node:assert/strict';
import {
  matchFootballCatalogMarket,
  splitEventAndInlineMarket
} from '../src/lib/betLinkParser';

const sample = 'Live 🇧🇷 Serie A Fluminense vs Mirassol Totais: Acima De 1.0';
const split = splitEventAndInlineMarket(sample);

assert.equal(
  split.eventPart,
  'Live 🇧🇷 Serie A Fluminense vs Mirassol',
  'O cabeçalho do campeonato e o confronto devem permanecer no evento.'
);
assert.equal(
  split.marketPart,
  'Totais: Acima De 1.0',
  'O texto do mercado deve ser separado integralmente do evento.'
);

const match = matchFootballCatalogMarket(split.marketPart, split.eventPart);
assert.ok(match, 'O mercado de gols deve ser identificado.');
assert.equal(match.market.id, 'gols-asiaticos');
assert.equal(match.market.name, 'Gols Asiáticos (Linhas Inteiras & Quartos)');
assert.equal(match.selection, 'Mais de 1.0 Gols Asiáticos');

// Também deve reconhecer a forma direta, sem depender do prefixo "Totais:".
const directMatch = matchFootballCatalogMarket('Acima de 1.0', split.eventPart);
assert.equal(directMatch?.market.id, 'gols-asiaticos');
assert.equal(directMatch?.selection, 'Mais de 1.0 Gols Asiáticos');

console.log('betMarketParsing: todos os testes passaram.');
