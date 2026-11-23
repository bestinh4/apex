export interface FootballMarket {
  id: string;
  name: string;
  category: 'Resultado & Linhas' | 'Gols & BTTS' | 'Handicap Asiático' | 'Escanteios' | 'Cartões' | 'Props de Jogadores' | 'Especiais & Minutos';
  popular?: boolean;
  selections: string[];
}

export const FOOTBALL_MARKETS: FootballMarket[] = [
  // 1. Resultado & Linhas
  {
    id: '1x2',
    name: 'Resultado Final (1X2 / Moneyline)',
    category: 'Resultado & Linhas',
    popular: true,
    selections: [
      'Casa (1)',
      'Empate (X)',
      'Fora (2)'
    ]
  },
  {
    id: 'dupla-chance',
    name: 'Dupla Chance (Double Chance)',
    category: 'Resultado & Linhas',
    popular: true,
    selections: [
      '1X (Casa ou Empate)',
      'X2 (Empate ou Fora)',
      '12 (Casa ou Fora)'
    ]
  },
  {
    id: 'dnb',
    name: 'Empate Anula a Aposta (DNB / Draw No Bet)',
    category: 'Resultado & Linhas',
    popular: true,
    selections: [
      'Casa (DNB 1)',
      'Fora (DNB 2)'
    ]
  },
  {
    id: 'ht-ft',
    name: 'Intervalo / Final do Jogo (HT / FT)',
    category: 'Resultado & Linhas',
    selections: [
      'Casa / Casa (1/1)',
      'Casa / Empate (1/X)',
      'Casa / Fora (1/2)',
      'Empate / Casa (X/1)',
      'Empate / Empate (X/X)',
      'Empate / Fora (X/2)',
      'Fora / Casa (2/1)',
      'Fora / Empate (2/X)',
      'Fora / Fora (2/2)'
    ]
  },
  {
    id: 'resultado-1t',
    name: 'Resultado 1º Tempo (1X2 HT)',
    category: 'Resultado & Linhas',
    selections: [
      'Casa 1º Tempo',
      'Empate 1º Tempo',
      'Fora 1º Tempo'
    ]
  },
  {
    id: 'resultado-2t',
    name: 'Resultado 2º Tempo (1X2 2T)',
    category: 'Resultado & Linhas',
    selections: [
      'Casa 2º Tempo',
      'Empate 2º Tempo',
      'Fora 2º Tempo'
    ]
  },
  {
    id: 'win-to-nil',
    name: 'Vencer Sem Sofrer Gols (Win to Nil)',
    category: 'Resultado & Linhas',
    selections: [
      'Casa Vence Sem Sofrer Gols',
      'Fora Vence Sem Sofrer Gols'
    ]
  },

  // 2. Gols & BTTS
  {
    id: 'gols-over-under',
    name: 'Total de Gols FT (Over / Under)',
    category: 'Gols & BTTS',
    popular: true,
    selections: [
      'Mais de 0.5 Gols (Over 0.5)',
      'Menos de 0.5 Gols (Under 0.5)',
      'Mais de 1.5 Gols (Over 1.5)',
      'Menos de 1.5 Gols (Under 1.5)',
      'Mais de 2.5 Gols (Over 2.5)',
      'Menos de 2.5 Gols (Under 2.5)',
      'Mais de 3.5 Gols (Over 3.5)',
      'Menos de 3.5 Gols (Under 3.5)',
      'Mais de 4.5 Gols (Over 4.5)',
      'Menos de 4.5 Gols (Under 4.5)',
      'Mais de 5.5 Gols (Over 5.5)',
      'Menos de 5.5 Gols (Under 5.5)'
    ]
  },
  {
    id: 'btts',
    name: 'Ambas as Equipes Marcam (BTTS)',
    category: 'Gols & BTTS',
    popular: true,
    selections: [
      'Sim (Ambas Marcam)',
      'Não (Ambas Não Marcam)'
    ]
  },
  {
    id: 'btts-over-under',
    name: 'Ambas Marcam + Total de Gols (BTTS & O/U)',
    category: 'Gols & BTTS',
    popular: true,
    selections: [
      'Ambas Marcam Sim & Mais de 2.5 Gols',
      'Ambas Marcam Sim & Menos de 2.5 Gols',
      'Ambas Marcam Sim & Mais de 1.5 Gols',
      'Ambas Marcam Sim & Mais de 3.5 Gols',
      'Ambas Marcam Não & Menos de 2.5 Gols'
    ]
  },
  {
    id: 'btts-resultado',
    name: 'Resultado + Ambas Marcam (Combo)',
    category: 'Gols & BTTS',
    selections: [
      'Casa Vence & Ambas Marcam Sim',
      'Fora Vence & Ambas Marcam Sim',
      'Empate & Ambas Marcam Sim',
      'Casa Vence & Ambas Marcam Não',
      'Fora Vence & Ambas Marcam Não'
    ]
  },
  {
    id: 'gols-1t',
    name: 'Total de Gols 1º Tempo (Over/Under HT)',
    category: 'Gols & BTTS',
    popular: true,
    selections: [
      'Mais de 0.5 Gols 1º Tempo',
      'Menos de 0.5 Gols 1º Tempo',
      'Mais de 1.0 Gol 1º Tempo (Asiático)',
      'Mais de 1.5 Gols 1º Tempo',
      'Menos de 1.5 Gols 1º Tempo'
    ]
  },
  {
    id: 'gols-2t',
    name: 'Total de Gols 2º Tempo (Over/Under 2T)',
    category: 'Gols & BTTS',
    selections: [
      'Mais de 0.5 Gols 2º Tempo',
      'Menos de 0.5 Gols 2º Tempo',
      'Mais de 1.5 Gols 2º Tempo',
      'Menos de 1.5 Gols 2º Tempo'
    ]
  },
  {
    id: 'gols-equipe-casa',
    name: 'Total de Gols - Equipe da Casa',
    category: 'Gols & BTTS',
    selections: [
      'Casa: Mais de 0.5 Gols',
      'Casa: Mais de 1.5 Gols',
      'Casa: Mais de 2.5 Gols',
      'Casa: Menos de 1.5 Gols'
    ]
  },
  {
    id: 'gols-equipe-fora',
    name: 'Total de Gols - Equipe Visitante',
    category: 'Gols & BTTS',
    selections: [
      'Fora: Mais de 0.5 Gols',
      'Fora: Mais de 1.5 Gols',
      'Fora: Mais de 2.5 Gols',
      'Fora: Menos de 1.5 Gols'
    ]
  },
  {
    id: 'multigols',
    name: 'Faixa de Gols (Multigols)',
    category: 'Gols & BTTS',
    selections: [
      '1 a 2 Gols na Partida',
      '2 a 3 Gols na Partida',
      '2 a 4 Gols na Partida',
      '3 a 5 Gols na Partida',
      '4 ou mais Gols'
    ]
  },
  {
    id: 'ambas-marcam-1t',
    name: 'Ambas Marcam no 1º Tempo',
    category: 'Gols & BTTS',
    selections: [
      'Ambas Marcam no 1T: Sim',
      'Ambas Marcam no 1T: Não'
    ]
  },
  {
    id: 'clean-sheet',
    name: 'Sem Sofrer Gols (Clean Sheet)',
    category: 'Gols & BTTS',
    selections: [
      'Casa não sofre gols (Sim)',
      'Fora não sofre gols (Sim)'
    ]
  },

  // 3. Handicap Asiático (HA)
  {
    id: 'ha-linhas-inteiras',
    name: 'Handicap Asiático (Linhas Inteiras)',
    category: 'Handicap Asiático',
    popular: true,
    selections: [
      'Casa 0.0 (DNB Asiático)',
      'Fora 0.0 (DNB Asiático)',
      'Casa -1.0 Handicap Asiático',
      'Fora +1.0 Handicap Asiático',
      'Casa -2.0 Handicap Asiático',
      'Fora +2.0 Handicap Asiático'
    ]
  },
  {
    id: 'ha-meias-linhas',
    name: 'Handicap Asiático (Meias Linhas -0.5 / +0.5)',
    category: 'Handicap Asiático',
    popular: true,
    selections: [
      'Casa -0.5 (Vitória Simples)',
      'Fora +0.5 (Dupla Chance Fora)',
      'Casa -1.5 Handicap Asiático',
      'Fora +1.5 Handicap Asiático',
      'Casa -2.5 Handicap Asiático',
      'Fora +2.5 Handicap Asiático'
    ]
  },
  {
    id: 'ha-quartos-linha',
    name: 'Handicap Asiático (Quartos de Linha .25 / .75)',
    category: 'Handicap Asiático',
    popular: true,
    selections: [
      'Casa -0.25 (0, -0.5)',
      'Fora +0.25 (0, +0.5)',
      'Casa -0.75 (-0.5, -1.0)',
      'Fora +0.75 (+0.5, +1.0)',
      'Casa -1.25 (-1.0, -1.5)',
      'Fora +1.25 (+1.0, +1.5)'
    ]
  },
  {
    id: 'ha-1t',
    name: 'Handicap Asiático 1º Tempo (HT)',
    category: 'Handicap Asiático',
    selections: [
      'Casa 0.0 (1º Tempo)',
      'Fora 0.0 (1º Tempo)',
      'Casa -0.5 (1º Tempo)',
      'Fora +0.5 (1º Tempo)'
    ]
  },
  {
    id: 'gols-asiaticos',
    name: 'Gols Asiáticos (Linhas Inteiras & Quartos)',
    category: 'Handicap Asiático',
    popular: true,
    selections: [
      'Mais de 2.0 Gols Asiáticos',
      'Menos de 2.0 Gols Asiáticos',
      'Mais de 2.25 Gols Asiáticos (2.0, 2.5)',
      'Menos de 2.25 Gols Asiáticos (2.0, 2.5)',
      'Mais de 2.75 Gols Asiáticos (2.5, 3.0)',
      'Menos de 2.75 Gols Asiáticos (2.5, 3.0)',
      'Mais de 3.0 Gols Asiáticos',
      'Menos de 3.0 Gols Asiáticos'
    ]
  },
  {
    id: 'handicap-europeu',
    name: 'Handicap Europeu (3 Opções)',
    category: 'Handicap Asiático',
    selections: [
      'Casa (-1)',
      'Empate (-1)',
      'Fora (+1)',
      'Casa (-2)',
      'Fora (+2)'
    ]
  },

  // 4. Escanteios
  {
    id: 'escanteios-over-under',
    name: 'Total de Escanteios FT (Over / Under)',
    category: 'Escanteios',
    popular: true,
    selections: [
      'Mais de 6.5 Escanteios',
      'Mais de 7.5 Escanteios',
      'Menos de 7.5 Escanteios',
      'Mais de 8.5 Escanteios',
      'Menos de 8.5 Escanteios',
      'Mais de 9.5 Escanteios',
      'Menos de 9.5 Escanteios',
      'Mais de 10.5 Escanteios',
      'Menos de 10.5 Escanteios',
      'Mais de 11.5 Escanteios',
      'Menos de 11.5 Escanteios',
      'Mais de 12.5 Escanteios',
      'Menos de 12.5 Escanteios'
    ]
  },
  {
    id: 'escanteios-asiaticos',
    name: 'Escanteios Asiáticos',
    category: 'Escanteios',
    popular: true,
    selections: [
      'Mais de 9.0 Escanteios Asiáticos',
      'Menos de 9.0 Escanteios Asiáticos',
      'Mais de 10.0 Escanteios Asiáticos',
      'Menos de 10.0 Escanteios Asiáticos',
      'Mais de 11.0 Escanteios Asiáticos',
      'Menos de 11.0 Escanteios Asiáticos'
    ]
  },
  {
    id: 'escanteios-1t',
    name: 'Escanteios 1º Tempo (Over / Under HT)',
    category: 'Escanteios',
    selections: [
      'Mais de 4.5 Escanteios no 1T',
      'Menos de 4.5 Escanteios no 1T',
      'Mais de 5.5 Escanteios no 1T',
      'Menos de 5.5 Escanteios no 1T'
    ]
  },
  {
    id: 'escanteios-equipe',
    name: 'Escanteios por Equipe (Casa / Fora)',
    category: 'Escanteios',
    selections: [
      'Casa: Mais de 4.5 Escanteios',
      'Casa: Mais de 5.5 Escanteios',
      'Fora: Mais de 3.5 Escanteios',
      'Fora: Mais de 4.5 Escanteios'
    ]
  },
  {
    id: 'handicap-escanteios',
    name: 'Handicap de Escanteios',
    category: 'Escanteios',
    selections: [
      'Casa -1.5 Escanteios',
      'Fora +1.5 Escanteios',
      'Casa -2.5 Escanteios',
      'Fora +2.5 Escanteios'
    ]
  },
  {
    id: 'corrida-escanteios',
    name: 'Corrida para X Escanteios (Race to Corners)',
    category: 'Escanteios',
    selections: [
      'Casa primeiro a 5 Escanteios',
      'Fora primeiro a 5 Escanteios',
      'Casa primeiro a 7 Escanteios',
      'Fora primeiro a 7 Escanteios',
      'Casa primeiro a 9 Escanteios'
    ]
  },

  // 5. Cartões & Disciplina
  {
    id: 'cartoes-over-under',
    name: 'Total de Cartões FT (Over / Under)',
    category: 'Cartões',
    popular: true,
    selections: [
      'Mais de 2.5 Cartões',
      'Mais de 3.5 Cartões',
      'Menos de 3.5 Cartões',
      'Mais de 4.5 Cartões',
      'Menos de 4.5 Cartões',
      'Mais de 5.5 Cartões',
      'Menos de 5.5 Cartões',
      'Mais de 6.5 Cartões',
      'Menos de 6.5 Cartões'
    ]
  },
  {
    id: 'cartoes-asiaticos',
    name: 'Cartões Asiáticos',
    category: 'Cartões',
    selections: [
      'Mais de 4.0 Cartões Asiáticos',
      'Menos de 4.0 Cartões Asiáticos',
      'Mais de 5.0 Cartões Asiáticos',
      'Menos de 5.0 Cartões Asiáticos'
    ]
  },
  {
    id: 'cartoes-1t',
    name: 'Cartões 1º Tempo (HT)',
    category: 'Cartões',
    selections: [
      'Mais de 1.5 Cartões no 1T',
      'Menos de 1.5 Cartões no 1T',
      'Mais de 2.5 Cartões no 1T'
    ]
  },
  {
    id: 'cartao-vermelho',
    name: 'Cartão Vermelho na Partida (Expulsão)',
    category: 'Cartões',
    selections: [
      'Sim (Haverá cartão vermelho)',
      'Não (Sem cartão vermelho)'
    ]
  },
  {
    id: 'cartoes-equipe',
    name: 'Cartões por Equipe',
    category: 'Cartões',
    selections: [
      'Casa: Mais de 1.5 Cartões',
      'Casa: Mais de 2.5 Cartões',
      'Fora: Mais de 1.5 Cartões',
      'Fora: Mais de 2.5 Cartões'
    ]
  },

  // 6. Props de Jogadores
  {
    id: 'marcador-gol',
    name: 'Marcador de Gol (Anytime Goalscorer)',
    category: 'Props de Jogadores',
    popular: true,
    selections: [
      'Marcar a Qualquer Momento',
      'Primeiro Marcador do Jogo',
      'Último Marcador do Jogo',
      'Marcar 2 ou mais Gols (Doblete)',
      'Marcar 3 ou mais Gols (Hat-Trick)'
    ]
  },
  {
    id: 'chutes-no-gol',
    name: 'Chutes no Gol do Jogador (Shots on Target)',
    category: 'Props de Jogadores',
    popular: true,
    selections: [
      'Mais de 0.5 Chutes no Alvo',
      'Mais de 1.5 Chutes no Alvo',
      'Mais de 2.5 Chutes no Alvo'
    ]
  },
  {
    id: 'finalizacoes-totais',
    name: 'Finalizações Totais do Jogador',
    category: 'Props de Jogadores',
    selections: [
      'Mais de 1.5 Finalizações',
      'Mais de 2.5 Finalizações',
      'Mais de 3.5 Finalizações'
    ]
  },
  {
    id: 'desarmes-jogador',
    name: 'Desarmes do Jogador (Tackles)',
    category: 'Props de Jogadores',
    selections: [
      'Mais de 1.5 Desarmes',
      'Mais de 2.5 Desarmes',
      'Mais de 3.5 Desarmes'
    ]
  },
  {
    id: 'faltas-jogador',
    name: 'Faltas Cometidas / Sofridas do Jogador',
    category: 'Props de Jogadores',
    selections: [
      'Cometer 1+ Faltas',
      'Cometer 2+ Faltas',
      'Sofrer 2+ Faltas'
    ]
  },
  {
    id: 'jogador-receber-cartao',
    name: 'Jogador Receber Cartão',
    category: 'Props de Jogadores',
    selections: [
      'Receber Cartão (Amarelo ou Vermelho)'
    ]
  },
  {
    id: 'assistencia-jogador',
    name: 'Assistência de Gol do Jogador',
    category: 'Props de Jogadores',
    selections: [
      'Dar 1 ou mais Assistências (Sim)'
    ]
  },

  // 7. Especiais & Minutos
  {
    id: 'penalti-partida',
    name: 'Pênalti Marcado na Partida',
    category: 'Especiais & Minutos',
    selections: [
      'Pênalti Marcado: Sim',
      'Pênalti Marcado: Não',
      'Pênalti Convertido: Sim'
    ]
  },
  {
    id: 'gol-minutos',
    name: 'Gol nos Primeiros Minutos',
    category: 'Especiais & Minutos',
    selections: [
      'Gol antes dos 15:00 minutos: Sim',
      'Gol antes dos 15:00 minutos: Não',
      'Gol antes dos 30:00 minutos: Sim'
    ]
  },
  {
    id: 'placar-exato',
    name: 'Placar Exato (Correct Score)',
    category: 'Especiais & Minutos',
    selections: [
      '1 x 0',
      '2 x 0',
      '2 x 1',
      '3 x 0',
      '3 x 1',
      '0 x 0',
      '1 x 1',
      '2 x 2',
      '0 x 1',
      '0 x 2',
      '1 x 2',
      'Qualquer Outro Resultado'
    ]
  },
  {
    id: 'impar-par',
    name: 'Total de Gols Ímpar / Par',
    category: 'Especiais & Minutos',
    selections: [
      'Total de Gols: Ímpar',
      'Total de Gols: Par'
    ]
  },
  {
    id: 'proximo-gol-live',
    name: 'Próximo Gol (Ao Vivo / Live)',
    category: 'Especiais & Minutos',
    popular: true,
    selections: [
      'Casa marca o Próximo Gol',
      'Fora marca o Próximo Gol',
      'Sem Mais Gols na Partida'
    ]
  },
  {
    id: 'resto-partida-live',
    name: 'Resultado do Resto da Partida (Ao Vivo)',
    category: 'Resultado & Linhas',
    selections: [
      'Casa vence o Resto da Partida',
      'Empate no Resto da Partida',
      'Fora vence o Resto da Partida'
    ]
  }
];

export const FOOTBALL_CATEGORIES = [
  'Todos os Mercados',
  'Resultado & Linhas',
  'Gols & BTTS',
  'Handicap Asiático',
  'Escanteios',
  'Cartões',
  'Props de Jogadores',
  'Especiais & Minutos'
] as const;

export const BOOKMAKERS = [
  '1win',
  'Bet365',
  'Betano',
  'Stake',
  'Pinnacle',
  'Betfair',
  'Superbet',
  'Novibet',
  'KTO',
  'EstrelaBet',
  'Sportingbet',
  '1xBet'
] as const;

export const SPORTS_LIST = [
  'Futebol',
  'Basquete',
  'Tênis',
  'Vôlei',
  'Tênis de Mesa',
  'MMA / eSports',
  'Hóquei no Gelo'
] as const;

export const OTHER_SPORT_MARKETS: Record<string, string[]> = {
  Basquete: [
    'Vencedor da Partida (Moneyline)',
    'Handicap / Spread (-4.5 / +4.5)',
    'Total de Pontos (Over / Under)',
    'Pontos do Jogador (Over / Under)',
    'Rebotes + Assistências (PRA)',
    'Triplos Convertidos (3PT)',
    'Vencedor do 1º Quarto / 1º Tempo'
  ],
  'Tênis': [
    'Vencedor da Partida (ML)',
    'Vencedor do Set Atual (Ao Vivo)',
    'Handicap de Games (-3.5 / +3.5)',
    'Handicap de Sets (-1.5 / +1.5)',
    'Total de Games (Over / Under)',
    'Placar Exato em Sets (2-0 / 2-1)',
    'Tie-Break na Partida (Sim / Não)'
  ],
  'Vôlei': [
    'Vencedor da Partida (ML)',
    'Vencedor do Set Atual (Ao Vivo)',
    'Handicap de Pontos / Sets',
    'Total de Pontos (Over / Under)',
    'Total de Sets (Mais/Menos 3.5)'
  ],
  'Tênis de Mesa': [
    'Vencedor da Partida (ML)',
    'Vencedor do Set Atual (Ao Vivo)',
    'Handicap de Pontos no Set',
    'Total de Pontos (Over / Under)'
  ],
  'MMA / eSports': [
    'Vencedor da Luta / Série (ML)',
    'Vencedor do Mapa Atual (Ao Vivo)',
    'Handicap de Mapas (-1.5 / +1.5)',
    'Total de Rounds / Mapas (Over / Under)',
    'Vitória por Nocaute / Finalização / Decisão',
    'Primeira Morte / First Blood'
  ],
  'Hóquei no Gelo': [
    'Vencedor da Partida (Moneyline / OT)',
    'Tempo Regulamentar (1X2)',
    'Total de Gols (Over / Under 5.5)',
    'Handicap Asiático (-1.5 / +1.5)'
  ]
};
