import assert from 'node:assert/strict';
import {
  damerauLevenshtein,
  normalizeTeamName,
  stripDiacritics
} from '../src/lib/teamNormalization';
import {
  getCachedTeamCrest,
  resolveCanonicalTeamId,
  resolveTeamCrest
} from '../src/lib/teamCrestService';

interface TestCase {
  name: string;
  fn: () => Promise<void> | void;
}

const tests: TestCase[] = [];

function test(name: string, fn: () => Promise<void> | void) {
  tests.push({ name, fn });
}

test('stripDiacritics e normalizeTeamName removem acentos, caracteres especiais e convertem para minúsculas', () => {
  assert.equal(stripDiacritics('São Paulo'), 'Sao Paulo');
  assert.equal(stripDiacritics('Bodø/Glimt'), 'Bodo/Glimt');
  assert.equal(stripDiacritics('Brøndby IF'), 'Brondby IF');
  assert.equal(stripDiacritics('IFK Göteborg'), 'IFK Goteborg');
  assert.equal(stripDiacritics('Fenerbahçe'), 'Fenerbahce');

  assert.equal(normalizeTeamName('São Paulo FC'), 'sao paulo');
  assert.equal(normalizeTeamName('Grêmio FBPA'), 'gremio');
  assert.equal(normalizeTeamName('Bodø/Glimt'), 'bodo glimt');
  assert.equal(normalizeTeamName('1. FC Köln'), 'cologne');
  assert.equal(normalizeTeamName('1. FSV Mainz 05'), 'mainz');
  assert.equal(normalizeTeamName('Como 1907'), 'como');
  assert.equal(normalizeTeamName('Bologna FC 1909'), 'bologna');
});

test('normalizeTeamName trata pontuações, abreviações e exônimos consistentemente', () => {
  assert.equal(normalizeTeamName('Man. City'), 'manchester city');
  assert.equal(normalizeTeamName('Man City'), 'manchester city');
  assert.equal(normalizeTeamName('Man. Utd'), 'manchester united');
  assert.equal(normalizeTeamName("Nott'm Forest"), 'nottingham forest');
  assert.equal(normalizeTeamName('Atl. Madrid'), 'atletico madrid');
  assert.equal(normalizeTeamName('Atlético de Madrid'), 'atletico madrid');
  assert.equal(normalizeTeamName('Atl.-MG'), 'atletico mineiro');
  assert.equal(normalizeTeamName('CA Mineiro'), 'atletico mineiro');
  assert.equal(normalizeTeamName('Athletico-PR'), 'athletico paranaense');
  assert.equal(normalizeTeamName('Dep. Alavés'), 'deportivo alaves');
  assert.equal(normalizeTeamName('Sheff. Utd'), 'sheffield united');
  assert.equal(normalizeTeamName('St. Étienne'), 'saint etienne');
  assert.equal(normalizeTeamName('AS Saint-Étienne'), 'saint etienne');
  assert.equal(normalizeTeamName('FC St. Pauli'), 'saint pauli');
  assert.equal(normalizeTeamName('Union SG'), 'union saint gilloise');
  assert.equal(normalizeTeamName('Royale Union Saint-Gilloise'), 'union saint gilloise');
  assert.equal(normalizeTeamName('Estudiantes LP'), 'estudiantes plata');
  assert.equal(normalizeTeamName('Estudiantes de La Plata'), 'estudiantes plata');
  assert.equal(normalizeTeamName('Sport Club do Recife'), 'sport recife');
  assert.equal(normalizeTeamName('Sport Recife'), 'sport recife');
  assert.equal(normalizeTeamName('Veneza'), 'venezia');
  assert.equal(normalizeTeamName('Venezia FC'), 'venezia');
  assert.equal(normalizeTeamName('IFK Gotemburgo'), 'ifk goteborg');
  assert.equal(normalizeTeamName('IFK Göteborg'), 'ifk goteborg');
  assert.equal(normalizeTeamName('Bayern de Munique'), 'bayern munich');
  assert.equal(normalizeTeamName('FC Bayern München'), 'bayern munich');
  assert.equal(normalizeTeamName('RB Leipzig'), 'red bull leipzig');
});

test("Newcastle e Newcastl (além de Utd/FC/NUFC/transposições) mapeiam para o mesmo identificador canônico e escudo", async () => {
  const variants = [
    'Newcastle',
    'Newcastl',
    'newcastl',
    'Newcastel',
    'Newcastl Utd',
    'Newcastle Utd',
    'Newcastle United',
    'Newcastle United FC',
    'NUFC'
  ];

  const expectedId = 'newcastle-united';
  const expectedUrl = 'https://a.espncdn.com/i/teamlogos/soccer/500/361.png';

  for (const variant of variants) {
    assert.equal(
      resolveCanonicalTeamId(variant, 'Futebol', '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League'),
      expectedId,
      `Esperava canonicalId '${expectedId}' para '${variant}'`
    );

    const syncHit = getCachedTeamCrest(variant, 'Futebol', '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League');
    assert.ok(syncHit, `Esperava match síncrono verificado para '${variant}'`);
    assert.equal(syncHit.canonicalId, expectedId);
    assert.equal(syncHit.crestUrl, expectedUrl);

    const asyncHit = await resolveTeamCrest(variant, 'Futebol');
    assert.equal(asyncHit.canonicalId, expectedId);
    assert.equal(asyncHit.crestUrl, expectedUrl);
  }
});

test('Outras variações com truncamento/erro leve e exônimos convergem para o mesmo identificador', () => {
  assert.equal(resolveCanonicalTeamId('Motherwell'), resolveCanonicalTeamId('Motherwel'));
  assert.equal(resolveCanonicalTeamId('Motherwell FC'), resolveCanonicalTeamId('Motherwell'));

  assert.equal(resolveCanonicalTeamId('Liverpool'), resolveCanonicalTeamId('Liverpol'));
  assert.equal(resolveCanonicalTeamId('Corinthians'), resolveCanonicalTeamId('Corintians'));

  assert.equal(resolveCanonicalTeamId('Manchester City'), resolveCanonicalTeamId('Man. City'));
  assert.equal(resolveCanonicalTeamId('Manchester City'), resolveCanonicalTeamId('Manchestr City'));

  assert.equal(resolveCanonicalTeamId('Veneza'), resolveCanonicalTeamId('Venezia FC'));
  assert.equal(resolveCanonicalTeamId('IFK Gotemburgo'), resolveCanonicalTeamId('IFK Göteborg'));
  assert.equal(resolveCanonicalTeamId('IFK Gotemburgo'), resolveCanonicalTeamId('Gotemburgo'));
  assert.equal(resolveCanonicalTeamId('Atl.-MG'), resolveCanonicalTeamId('Atlético Mineiro'));
  assert.equal(resolveCanonicalTeamId('Estudiantes LP'), resolveCanonicalTeamId('Estudiantes de La Plata'));
});

test('Guardas de desambiguação impedem falsos positivos entre homônimos e rivais', () => {
  // Newcastle Jets não pode colidir com Newcastle United
  assert.notEqual(resolveCanonicalTeamId('Newcastle Jets'), 'newcastle-united');
  assert.equal(getCachedTeamCrest('Newcastle Jets'), null);

  // Manchester City vs Manchester United não podem colidir por fuzzy
  assert.equal(resolveCanonicalTeamId('Manchestr City'), 'manchester-city');
  assert.equal(resolveCanonicalTeamId('Manchestr Utd'), 'manchester-united');

  // Botafogo-SP não pode herdar escudo do Botafogo RJ
  assert.equal(resolveCanonicalTeamId('Botafogo'), 'botafogo');
  assert.equal(resolveCanonicalTeamId('Botafogo-SP'), 'botafogo-sp');
  assert.equal(getCachedTeamCrest('Botafogo-SP'), null);

  // Suwon FC vs Suwon Bluewings permanecem separados
  assert.equal(resolveCanonicalTeamId('Suwon FC'), 'suwon-fc');
  assert.equal(resolveCanonicalTeamId('Suwon Samsung Bluewings'), 'suwon-bluewings');
  assert.notEqual(
    getCachedTeamCrest('Suwon FC')?.crestUrl,
    getCachedTeamCrest('Suwon Bluewings')?.crestUrl
  );

  // Inter Itália vs Inter Brasil
  assert.equal(resolveCanonicalTeamId('Inter', 'Futebol', '🇮🇹 Serie A'), 'internazionale');
  assert.equal(resolveCanonicalTeamId('Inter', 'Futebol', '🇧🇷 Brasileirão'), 'internacional');

  // Vitória Brasil vs Vitória de Guimarães
  assert.equal(resolveCanonicalTeamId('Vitória', 'Futebol', '🇧🇷 Brasileirão'), 'vitoria');
  assert.equal(resolveCanonicalTeamId('Vitória', 'Futebol', '🇵🇹 Liga Portugal'), 'vitoria-de-guimaraes');

  // Clubes estrangeiros protegidos por contexto
  assert.equal(getCachedTeamCrest('Everton', 'Futebol', '🇨🇱 Campeonato Chileno'), null);
  assert.notEqual(resolveCanonicalTeamId('Everton', 'Futebol', '🇨🇱 Chile'), 'everton');

  assert.equal(getCachedTeamCrest('Barcelona', 'Futebol', '🇪🇨 LigaPro'), null);
  assert.notEqual(resolveCanonicalTeamId('Barcelona', 'Futebol', '🇪🇨 LigaPro'), 'barcelona');

  assert.equal(getCachedTeamCrest('Athletic Club', 'Futebol', '🇧🇷 Série B'), null);
  assert.notEqual(resolveCanonicalTeamId('Athletic Club', 'Futebol', '🇧🇷 Série B'), 'athletic-club');

  // Nomes curtos distintos não colidem
  assert.equal(resolveCanonicalTeamId('Nice'), 'nice');
  assert.equal(resolveCanonicalTeamId('Lens'), 'lens');
  assert.equal(resolveCanonicalTeamId('Lyon'), 'lyon');
});

test('damerauLevenshtein identifica corretamente transposições e truncamentos de 1 caractere', () => {
  assert.equal(damerauLevenshtein('newcastl', 'newcastle'), 1);
  assert.equal(damerauLevenshtein('newcastel', 'newcastle'), 1);
  assert.equal(damerauLevenshtein('motherwel', 'motherwell'), 1);
});

test('Cache deduplica buscas externas quando variantes normalizam para o mesmo identificador canônico', async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;

  globalThis.fetch = (async () => {
    fetchCalls += 1;
    return {
      ok: true,
      json: async () => ({
        results: [
          {
            type: 'team',
            contents: [
              {
                displayName: 'Deportivo La Coruña',
                subtitle: 'Spanish Segunda División',
                sport: 'soccer',
                image: { default: 'https://example.com/depor.png' }
              }
            ]
          }
        ]
      })
    } as unknown as Response;
  }) as typeof fetch;

  try {
    const first = await resolveTeamCrest('Dep. La Coruña', 'Futebol', '🇪🇸 LaLiga 2');
    const callsAfterFirst = fetchCalls;
    assert.equal(first.crestUrl, 'https://example.com/depor.png');
    assert.equal(first.canonicalId, 'deportivo-coruna');
    assert.equal(callsAfterFirst, 1);

    const second = await resolveTeamCrest('Deportivo de La Coruna FC', 'Futebol', '🇪🇸 LaLiga 2');
    assert.equal(second.crestUrl, 'https://example.com/depor.png');
    assert.equal(second.canonicalId, first.canonicalId);
    assert.equal(fetchCalls, callsAfterFirst, 'Segunda consulta normalizada deve acertar o cache sem novo fetch');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

async function run() {
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`PASS: ${t.name}`);
      passed += 1;
    } catch (err) {
      console.error(`FAIL: ${t.name}`);
      console.error(err);
      failed += 1;
    }
  }
  console.log(`\nResumo: ${passed} aprovados, ${failed} reprovados (total ${tests.length}).`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

run();
