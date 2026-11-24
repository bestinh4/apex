import assert from 'node:assert/strict';
import {
  matchFootballCatalogMarket,
  splitEventAndInlineMarket
} from '../src/lib/betLinkParser';

const event = 'Live 🇧🇷 Serie A Fluminense vs Mirassol';
const sample = `${event} Totais: Acima De 1.0`;
const split = splitEventAndInlineMarket(sample);

assert.equal(split.eventPart, event);
assert.equal(split.marketPart, 'Totais: Acima De 1.0');

const dynamicLines = [
  { line: '1.0', expectedMarket: 'gols-asiaticos', expectedSelection: 'Mais de 1.0 Gols Asiáticos' },
  { line: '0.75', expectedMarket: 'gols-asiaticos', expectedSelection: 'Mais de 0.75 Gols Asiáticos' },
  { line: '1.25', expectedMarket: 'gols-asiaticos', expectedSelection: 'Mais de 1.25 Gols Asiáticos' },
  { line: '2.25', expectedMarket: 'gols-asiaticos', expectedSelection: 'Mais de 2.25 Gols Asiáticos' },
  { line: '1.5', expectedMarket: 'gols-over-under', expectedSelection: 'Mais de 1.5 Gols (Over/Under 1.5)' },
  { line: '3.5', expectedMarket: 'gols-over-under', expectedSelection: 'Mais de 3.5 Gols (Over/Under 3.5)' }
];

for (const item of dynamicLines) {
  const hit = matchFootballCatalogMarket(`Totais: Acima de ${item.line}`, event);
  assert.ok(hit, `Deve reconhecer a linha ${item.line}`);
  assert.equal(hit.market.id, item.expectedMarket);
  assert.equal(hit.selection, item.expectedSelection);
}

const under = matchFootballCatalogMarket('Totais: Abaixo de 2.25', event);
assert.equal(under?.market.id, 'gols-asiaticos');
assert.equal(under?.selection, 'Menos de 2.25 Gols Asiáticos');

console.log('betMarketParsing: todos os testes passaram.');
