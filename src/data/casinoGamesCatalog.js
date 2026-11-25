// Exact 77-game visual catalog replicating the uploaded screenshots in order,
// paired with playable demo virtual-coin game rules (cards, roulette, dice, cricket, football, matka).

export const GAME_CATEGORIES = [
  { key: 'all', label: 'All Games' },
  { key: 'teenpatti', label: 'Teenpatti' },
  { key: 'poker', label: 'Poker' },
  { key: 'baccarat', label: 'Baccarat' },
  { key: 'dragon-tiger', label: 'Dragon Tiger' },
  { key: 'andar-bahar', label: 'Andar Bahar' },
  { key: 'lucky7', label: 'Lucky 7' },
  { key: '32cards', label: '32 Cards' },
  { key: 'roulette', label: 'Roulette & Dice' },
  { key: 'sports', label: 'Sports Games' },
  { key: 'matka', label: 'Matka & Lottery' },
  { key: 'bollywood', label: 'Bollywood & Special' },
];

export const CASINO_GAMES = [
  // Row 1 (from reference screenshot 2)
  { id: 'goal-2', title: 'GOAL 2', posterTitle: 'GOAL 2', category: 'sports', engine: 'football', theme: 'football-gold' },
  { id: 'matka', title: 'MATKA', posterTitle: 'MATKA MARKET', subtitle: 'OPEN TO CLOSE', category: 'matka', engine: 'matka', theme: 'matka-dark' },
  { id: 'dolidana', title: 'DOLIDANA', posterTitle: 'DOLI DANA', subtitle: 'LIVE', category: 'roulette', engine: 'dice', theme: 'dice-emerald' },
  { id: 'mogambo', title: 'MOGAMBO', posterTitle: 'MOGAMBO', category: 'bollywood', engine: 'card-duel', theme: 'bollywood-amber' },
  { id: 'lucky-6', title: 'LUCKY 6', posterTitle: 'LUCKY 6', category: 'lucky7', engine: 'lucky7', theme: 'lucky-pot' },
  { id: 'beach-roulette', title: 'BEACH ROULETTE', posterTitle: 'BEACH ROULETTE', category: 'roulette', engine: 'roulette', theme: 'roulette-beach' },
  { id: 'roulette', title: 'ROULETTE', posterTitle: 'ROULETTE', category: 'roulette', engine: 'roulette', theme: 'roulette-classic' },
  { id: 'vip-roulette', title: 'VIP ROULETTE', posterTitle: 'VIP ROULETTE', category: 'roulette', engine: 'roulette', theme: 'roulette-vip' },
  { id: 'teenpatti-poison-oneday', title: 'TEENPATTI POISON ONE DAY', posterTitle: 'POISON TEENPATTI', subtitle: 'ONE DAY', category: 'teenpatti', engine: 'card-duel', theme: 'poison-dark' },
  { id: 'unique-teenpatti', title: 'UNIQUE TEENPATTI', posterTitle: 'UNIQUE TEENPATTI', subtitle: '1 2 3 4 5 6', category: 'teenpatti', engine: 'card-duel', theme: 'unique-crimson' },

  // Row 2
  { id: 'teenpatti-poison-2020', title: 'TEENPATTI POISON 20-20', posterTitle: 'POISON TEENPATTI', subtitle: '20-20', category: 'teenpatti', engine: 'card-duel', theme: 'joker-green' },
  { id: 'unlimited-joker-2020', title: 'UNLIMITED JOKER 20-20', posterTitle: 'UNLIMITED JOKER', subtitle: '20-20', category: 'teenpatti', engine: 'card-duel', theme: 'joker-teal' },
  { id: 'teenpatti-joker-2020', title: 'TEENPATTI JOKER 20-20', posterTitle: 'TEENPATTI JOKER', subtitle: '20-20', category: 'teenpatti', engine: 'card-duel', theme: 'joker-purple' },
  { id: 'unlimited-joker-oneday', title: 'UNLIMITED JOKER ONEDAY', posterTitle: 'UNLIMITED JOKER', subtitle: 'ONE DAY', category: 'teenpatti', engine: 'card-duel', theme: 'joker-gold' },
  { id: '20-20-teenpatti-c', title: '20-20 TEENPATTI C', posterTitle: '20-20 TEENPATTI C', category: 'teenpatti', engine: 'card-duel', theme: 'cards-white' },
  { id: 'bollywood-casino-2', title: 'BOLLYWOOD CASINO 2', posterTitle: '2 BOLLYWOOD CASINO', category: 'bollywood', engine: 'card-duel', theme: 'bollywood-neon' },
  { id: 'unique-roulette', title: 'UNIQUE ROULETTE', posterTitle: 'UNIQUE ROULETTE', category: 'roulette', engine: 'roulette', theme: 'roulette-gold' },
  { id: 'mini-superover', title: 'MINI SUPEROVER', posterTitle: 'MINI SUPER OVER', subtitle: 'IND vs AUS', category: 'sports', engine: 'cricket', theme: 'cricket-royal' },
  { id: 'goal', title: 'GOAL', posterTitle: 'GOAL', category: 'sports', engine: 'football', theme: 'football-green' },
  { id: 'andar-bahar-150', title: 'ANDAR BAHAR 150 CARDS', posterTitle: 'ANDAR BAHAR', subtitle: '150 CARDS', category: 'andar-bahar', engine: 'andar-bahar', theme: 'ab-gold' },

  // Row 3
  { id: 'lucky-15', title: 'LUCKY 15', posterTitle: 'LUCKY 15', category: 'sports', engine: 'cricket', theme: 'cricket-comic' },
  { id: 'super-over2', title: 'SUPER OVER2', posterTitle: 'SUPER OVER 2', subtitle: 'IND v ENG', category: 'sports', engine: 'cricket', theme: 'cricket-sky' },
  { id: 'queen-top-open', title: 'QUEEN TOP OPEN TEENPATTI', posterTitle: 'QUEEN TOP OPEN', subtitle: 'TEENPATTI', category: 'teenpatti', engine: 'card-duel', theme: 'felt-gold' },
  { id: 'jack-top-open', title: 'JACK TOP OPEN TEENPATTI', posterTitle: 'JACK TOP OPEN', subtitle: 'TEENPATTI', category: 'teenpatti', engine: 'card-duel', theme: 'felt-gold' },
  { id: 'sic-bo2', title: 'SIC BO2', posterTitle: 'DOUBLE SICBO', category: 'roulette', engine: 'dice', theme: 'dice-dark' },
  { id: 'instant-teenpatti-3', title: 'INSTANT TEENPATTI 3.0', posterTitle: 'INSTANT TEENPATTI 3.0', category: 'teenpatti', engine: 'card-duel', theme: 'instant-red' },
  { id: 'sic-bo', title: 'SIC BO', posterTitle: 'SIC BO', category: 'roulette', engine: 'dice', theme: 'dice-crimson' },
  { id: 'ball-by-ball', title: 'BALL BY BALL', posterTitle: 'BALL BY BALL', category: 'sports', engine: 'cricket', theme: 'cricket-stadium' },
  { id: 'instant-teenpatti-2', title: 'INSTANT TEENPATTI 2.0', posterTitle: 'INSTANT TEENPATTI 2.0', category: 'teenpatti', engine: 'card-duel', theme: 'instant-red' },
  { id: 'teenpatti-1-day', title: 'TEENPATTI 1-DAY', posterTitle: 'TEENPATTI 1-DAY', category: 'teenpatti', engine: 'card-duel', theme: 'felt-classic' },

  // Row 4 (matches top of screenshot 1!)
  { id: '20-20-teenpatti', title: '20-20 TEENPATTI', posterTitle: 'TEENPATTI 20-20', category: 'teenpatti', engine: 'card-duel', theme: 'felt-classic' },
  { id: 'teenpatti-test', title: 'TEENPATTI TEST', posterTitle: 'TEENPATTI TEST', category: 'teenpatti', engine: 'card-duel', theme: 'felt-classic' },
  { id: 'teenpatti-open', title: 'TEENPATTI OPEN', posterTitle: 'OPEN TEENPATTI', category: 'teenpatti', engine: 'card-duel', theme: 'felt-classic' },
  { id: 'poker-1-day', title: 'POKER 1-DAY', posterTitle: 'POKER 1-DAY', category: 'poker', engine: 'card-duel', theme: 'poker-felt' },
  { id: '20-20-poker', title: '20-20 POKER', posterTitle: 'POKER 20-20', category: 'poker', engine: 'card-duel', theme: 'poker-felt' },
  { id: 'poker-6-players', title: 'POKER 6 PLAYERS', posterTitle: 'POKER 6 PLAYER', category: 'poker', engine: 'card-duel', theme: 'poker-felt' },
  { id: 'baccarat', title: 'BACCARAT', posterTitle: 'BACCARAT', category: 'baccarat', engine: 'baccarat', theme: 'baccarat-seal' },
  { id: 'baccarat-2', title: 'BACCARAT 2', posterTitle: 'ONLINE BACCARAT', category: 'baccarat', engine: 'baccarat', theme: 'baccarat-ring' },
  { id: '20-20-dragon-tiger', title: '20-20 DRAGON TIGER', posterTitle: '20-20 DRAGON TIGER', category: 'dragon-tiger', engine: 'dragon-tiger', theme: 'dt-green' },
  { id: '1-day-dragon-tiger', title: '1 DAY DRAGON TIGER', posterTitle: '1-DAY DRAGON TIGER', category: 'dragon-tiger', engine: 'dragon-tiger', theme: 'dt-green' },

  // Row 5
  { id: '20-20-dtl', title: '20-20 D T L', posterTitle: '20-20 DRAGON TIGER LION', category: 'dragon-tiger', engine: 'dragon-tiger', theme: 'dt-green' },
  { id: '20-20-dragon-tiger-2', title: '20-20 DRAGON TIGER 2', posterTitle: '20-20 DRAGON TIGER 2', category: 'dragon-tiger', engine: 'dragon-tiger', theme: 'dt-blue' },
  { id: '32-cards-a', title: '32 CARDS A', posterTitle: '32 CARDS-A', category: '32cards', engine: '32cards', theme: 'cards32-green' },
  { id: '32-cards-b', title: '32 CARDS B', posterTitle: '32 CARDS-B', category: '32cards', engine: '32cards', theme: 'cards32-studio' },
  { id: 'andar-bahar', title: 'ANDAR BAHAR', posterTitle: 'ANDAR BAHAR', category: 'andar-bahar', engine: 'andar-bahar', theme: 'ab-green' },
  { id: 'andar-bahar-2', title: 'ANDAR BAHAR 2', posterTitle: 'ANDAR BAHAR 2', category: 'andar-bahar', engine: 'andar-bahar', theme: 'ab-red' },
  { id: 'lucky-7-a', title: 'LUCKY 7 - A', posterTitle: '777', subtitle: 'LUCKY 7 - A', category: 'lucky7', engine: 'lucky7', theme: 'lucky7-green' },
  { id: 'lucky-7-b', title: 'LUCKY 7 - B', posterTitle: 'LUCKY 7-B', category: 'lucky7', engine: 'lucky7', theme: 'lucky7-blue' },
  { id: '3-cards-judgement', title: '3 CARDS JUDGEMENT', posterTitle: '3 CARDS JUDGEMENT', category: '32cards', engine: 'card-duel', theme: 'judgement-navy' },
  { id: 'worli-matka', title: 'WORLI MATKA', posterTitle: 'WORLI MATKA', category: 'matka', engine: 'matka', theme: 'matka-green' },

  // Row 6
  { id: 'instant-worli', title: 'INSTANT WORLI', posterTitle: 'INSTANT WORLI', category: 'matka', engine: 'matka', theme: 'matka-green' },
  { id: 'amar-akbar-anthony', title: 'AMAR AKBAR ANTHONY', posterTitle: 'AMAR AKBAR ANTHONY', category: 'bollywood', engine: 'bollywood', theme: 'aaa-retro' },
  { id: 'bollywood-casino', title: 'BOLLYWOOD CASINO', posterTitle: 'BOLLYWOOD', subtitle: 'CASINO', category: 'bollywood', engine: 'bollywood', theme: 'bollywood-purple' },
  { id: 'lottery', title: 'LOTTERY', posterTitle: 'LOTTERY', subtitle: '777', category: 'matka', engine: 'matka', theme: 'lottery-gold' },
  { id: '5five-cricket', title: '5FIVE CRICKET', posterTitle: '5FIVE CRICKET', category: 'sports', engine: 'cricket', theme: 'cricket-stadium' },
  { id: 'cricket-match-20-20', title: 'CRICKET MATCH 20-20', posterTitle: 'CRICKET MATCH 20-20', category: 'sports', engine: 'cricket', theme: 'cricket-night' },
  { id: 'teenpatti-2-0', title: 'TEENPATTI - 2.0', posterTitle: 'TEENPATTI 2.0', category: 'teenpatti', engine: 'card-duel', theme: 'felt-classic' },
  { id: 'queen', title: 'QUEEN', posterTitle: 'CASINO QUEEN', category: 'bollywood', engine: 'card-duel', theme: 'queen-gold' },
  { id: 'race20', title: 'RACE20', posterTitle: 'RACE 20', category: 'sports', engine: 'card-duel', theme: 'race-turf' },
  { id: 'lucky-7-c', title: 'LUCKY 7 - C', posterTitle: 'LUCKY7-C CASINO', category: 'lucky7', engine: 'lucky7', theme: 'lucky7-pink' },

  // Row 7
  { id: 'super-over', title: 'SUPER OVER', posterTitle: 'SUPER OVER', subtitle: 'ENG vs RSA', category: 'sports', engine: 'cricket', theme: 'cricket-night' },
  { id: 'the-trap', title: 'THE TRAP', posterTitle: 'THE TRAP', category: 'bollywood', engine: 'card-duel', theme: 'trap-black' },
  { id: '2-cards-teenpatti', title: '2 CARDS TEENPATTI', posterTitle: '2 CARDS TEENPATTI', category: 'teenpatti', engine: 'card-duel', theme: 'felt-teal' },
  { id: '29card-baccarat', title: '29CARD BACCARAT', posterTitle: '29 BACCARAT', category: 'baccarat', engine: 'baccarat', theme: 'baccarat-dark' },
  { id: 'muflis-teenpatti', title: 'MUFLIS TEENPATTI', posterTitle: 'MUFLIS TEENPATTI', category: 'teenpatti', engine: 'card-duel', theme: 'felt-navy' },
  { id: 'race-to-17', title: 'RACE TO 17', posterTitle: 'RACE TO 17', category: '32cards', engine: 'card-duel', theme: 'race17-purple' },
  { id: '20-20-teenpatti-b', title: '20-20 TEENPATTI B', posterTitle: '20-20 TEENPATTI B', category: 'teenpatti', engine: 'card-duel', theme: 'felt-purple' },
  { id: 'trio', title: 'TRIO', posterTitle: 'TRIO', category: '32cards', engine: 'card-duel', theme: 'trio-sky' },
  { id: 'note-number', title: 'NOTE NUMBER', posterTitle: 'NOTE NUMBER', category: 'lucky7', engine: 'lucky7', theme: 'note-gold' },
  { id: '1-card-20-20', title: '1 CARD 20-20', posterTitle: '1 CARD 20-20', category: 'teenpatti', engine: 'card-duel', theme: 'felt-deep' },

  // Row 8
  { id: '1-card-one-day', title: '1 CARD ONE-DAY', posterTitle: '1 CARD ONE-DAY', category: 'teenpatti', engine: 'card-duel', theme: 'felt-deep' },
  { id: 'andar-bahar-2-0', title: 'ANDAR BAHAR 2.0', posterTitle: 'ANDAR BAHAR 2.0', category: 'andar-bahar', engine: 'andar-bahar', theme: 'ab-green' },
  { id: 'amar-akbar-anthony-2', title: 'AMAR AKBAR ANTHONY 2.0', posterTitle: 'AMAR AKBAR ANTHONY 2.0', category: 'bollywood', engine: 'bollywood', theme: 'aaa-dark' },
  { id: 'race-to-2nd', title: 'RACE TO 2ND', posterTitle: 'RACE TO 2ND', category: 'sports', engine: 'card-duel', theme: 'race-gold' },
  { id: 'instant-teenpatti', title: 'INSTANT TEENPATTI', posterTitle: 'INSTANT TEENPATTI', category: 'teenpatti', engine: 'card-duel', theme: 'felt-navy' },
  { id: 'dus-ka-dum', title: 'DUS KA DUM', posterTitle: 'DUS KA DUM', category: 'bollywood', engine: 'card-duel', theme: 'dus-crimson' },
  { id: '1-card-meter', title: '1 CARD METER', posterTitle: '1 CARD METER', category: 'teenpatti', engine: 'card-duel', theme: 'meter-gold' },
];
