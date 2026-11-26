/**
 * Official Multi-Sport Exchange Market Rules (39 Sports + Casino & Matka)
 * Structured with exact Bookmaker, Match, and Fancy sections matching live exchange market rules.
 */

export const ALL_RULE_SPORTS = [
  { key: 'football', label: 'Football' },
  { key: 'horse-racing', label: 'Horse Racing' },
  { key: 'e-games', label: 'E Games' },
  { key: 'basketball', label: 'Basketball' },
  { key: 'motogp', label: 'MotoGP' },
  { key: 'chess', label: 'Chess' },
  { key: 'volleyball', label: 'Volleyball' },
  { key: 'ice-hockey', label: 'Ice Hockey' },
  { key: 'tennis', label: 'Tennis' },
  { key: 'badminton', label: 'Badminton' },
  { key: 'cycling', label: 'Cycling' },
  { key: 'mma', label: 'Mixed Martial Arts' },
  { key: 'motorbikes', label: 'Motorbikes' },
  { key: 'athletics', label: 'Athletics' },
  { key: 'basketball-3x3', label: 'Basketball 3X3' },
  { key: 'sumo', label: 'Sumo' },
  { key: 'virtual-sports', label: 'Virtual sports' },
  { key: 'handball', label: 'Handball' },
  { key: 'cricket', label: 'Cricket' },
  { key: 'politics', label: 'Politics' },
  { key: 'golf', label: 'Golf' },
  { key: 'motor-sports', label: 'Motor Sports' },
  { key: 'baseball', label: 'Baseball' },
  { key: 'rugby-union', label: 'Rugby Union' },
  { key: 'rugby-league', label: 'Rugby League' },
  { key: 'darts', label: 'Darts' },
  { key: 'american-football', label: 'American Football' },
  { key: 'snooker', label: 'Snooker' },
  { key: 'boxing', label: 'Boxing' },
  { key: 'soccer', label: 'Soccer' },
  { key: 'esports', label: 'Esports' },
  { key: 'greyhound-racing', label: 'Greyhound Racing' },
  { key: 'kabaddi', label: 'Kabaddi' },
  { key: 'boat-racing', label: 'Boat Racing' },
  { key: 'esoccer', label: 'Esoccer' },
  { key: 'wrestling', label: 'Wrestling' },
  { key: 'beach-volleyball', label: 'Beach Volleyball' },
  { key: 'table-tennis', label: 'Table Tennis' },
  { key: 'futsal', label: 'Futsal' },
  { key: 'casino', label: 'Casino & Matka' },
];

const FOOTBALL_RULES = {
  bookmaker: [
    'If the match will not take place within 48 hours of the original kick-off time bets will be void.',
    'If the selection is in a multiple bet or accumulator any refund must be requested before kick-off of the first leg of the multiple bet.',
    'Where a confirmed postponed match features as part of a multiple bet, the bet will stand on the remaining selections in the multiple.',
    'Please note that games which have their kick-off altered well in advance to accommodate live TV, or to ease fixture congestion will not be classed as postponed.',
    'If a match is forfeited or a team is given a walkover victory without the match having kicked off, then all bets will be void. Any subsequently awarded scoreline will not count for settlement purposes.',
  ],
  match: [
    {
      heading: 'Match Odds',
      body: "All bets apply to the relevant full 'regular time' period including stoppage time. Any extra-time and/or penalty shoot-out is not included. For the cancellation of a goal, due to VAR, bets matched between the time of the goal being scored and the time at which the video assistant referee finishes the review will be voided. For the cancellation of a red card, due to VAR, bets matched after the time at which the video assistant referee commences the review will be voided.",
    },
    {
      heading: 'Under_Over Goals',
      body: 'In the event of a match starting but not being completed, all bets will be void, unless the specific market outcome is already determined.',
    },
    {
      heading: '1st Period Winner',
      body: 'Bets will be void if the match is abandoned before half-time.',
    },
    {
      heading: 'Next Goal',
      body: 'Own goals count to the side credited with the goal.',
    },
    {
      heading: 'Draw No Bet',
      body: 'Predict which team will be the winner. In case of a draw, all bets will be void. If a game is abandoned, bets will be void.',
    },
    {
      heading: 'Both Teams to Score',
      body: 'Predict whether both teams will score at least one goal in the game. Own goals count towards the team credited with the goal. If a game is abandoned, bets will be void, unless the outcome of these bets is already determined. "Yes" – meaning that both teams will score. "No" – meaning that either team will not score.',
    },
    {
      heading: 'Total Corners',
      body: 'Predict which team will take the named corner in the game. If this specific corner is not taken in the game, bets will be void. For example, game finishes or is abandoned with 8 corners taken – all bets on any corner after the 8th will be void (9th, 10th, etc.).',
    },
    {
      heading: 'Goals Odd/Even',
      body: 'Any match resulting in 0-0 will be settled on an even number of goals. For Team Odd/Even markets, if the specified team does not score then we will settle on an even number of goals. In the event of an abandoned match then bets for that match will be void.',
    },
    {
      heading: '1X2 Corners',
      body: 'Predict which team will get more corners in a match. Awarded, but not taken corners (there is a corner, but before it is taken the referee signals for the end of the first half or the match) will not count for settlement purposes. Also if a corner needs to be re-taken for any reason, it will be counted as 1 corner.',
    },
    {
      heading: 'Under/Over Card in Match (Number of cards)',
      body: 'Predict the number of the cards which will be shown in a match. If a player is sent off for 2 yellow cards, this counts as 2 yellow cards and 1 red card for betting purposes. If the match is abandoned for any reason, all bets will be void unless market is already determined, e.g. Team 1 over 2.5 yellow cards - 3 yellow cards awarded to Team 1 before abandonment is settled as a winner. Cards for non-players (already substituted players, managers, players on bench which are not substituted in) are not considered. Settlement will be made with reference to all available evidence to cards shown during the scheduled 90 minutes play. Any card shown after the full-time whistle blow will be disregarded.',
    },
    {
      heading: 'First Half Under/Over Goals',
      body: 'How many goals will be scored in this first half of this match? All bets apply to Full Time according to the match officials, plus any stoppage time. Extra-time/penalty shoot-outs are not included.',
    },
    {
      heading: 'Penalty Taken?',
      body: 'Will a penalty be awarded and taken during this match? All bets apply to Full Time according to the match officials, plus any stoppage time. Extra-time/penalty shoot-outs are not included.',
    },
    {
      heading: 'Correct Score',
      body: 'Predict the score of this match. This market will not be partially settled during the fixture and will be fully settled at full time. All bets apply to Full Time according to the match officials, plus any stoppage time. Extra-time/penalty shoot-outs are not included.',
    },
    {
      heading: 'Corners Number/Odds',
      body: 'How many corners will be taken in the match? Only corners that are taken will be counted. All bets apply to Full Time according to the match officials, plus any stoppage time. Extra-time/penalty shoot-outs are not included.',
    },
    {
      heading: 'Team_A/B +1/2/3',
      body: "Who will win this match with the stated handicap applied? All bets apply to Full Time according to the match officials, plus any stoppage time. Extra-time/penalty shoot-outs are not included.\n\nFootball Handicap Market — Definition & Settlement:\n• Team A +1: One virtual goal is added to Team A's final score. The adjusted score determines the market result.\n• Team A +2: Two virtual goals are added to Team A's final score. The adjusted score determines the market result.\n• Team A +3: Three virtual goals are added to Team A's final score. The adjusted score determines the market result.\n• Team B +1: One virtual goal is added to Team B's final score. The adjusted score determines the market result.\n• Team B +2: Two virtual goals are added to Team B's final score. The adjusted score determines the market result.\n• Team B +3: Three virtual goals are added to Team B's final score. The adjusted score determines the market result.\n\nSettlement Example:\nActual Final Score: Team A 1–3 Team B\n1. Market: Team A +2\n• Team A actual score: 1\n• Handicap: +2\n• Adjusted Team A score: 1 + 2 = 3\n• Team B score: 3\n• Adjusted Score: Team A 3–3 Team B\n• Market Result: Draw",
    },
    {
      heading: 'HT/FT',
      body: 'Bets will be void if the match is abandoned. Extra-time and penalty shootouts do not count.',
    },
    {
      heading: 'Illegitimate Activity & Integrity Policy',
      body: 'The company reserves the right to suspend or void any ID/bets found to be illegitimate, including cases involving VPN usage, bots/robot use, multiple entries from the same or different IP addresses, exploitation or manipulation of odds in any market, and similar activities. Note: Only winning bets will be voided.',
    },
    {
      heading: 'For Live Streaming and Animation',
      body: 'Although the current score, time elapsed, video and other data provided on this site is sourced from "live" feeds provided by third parties, you should be aware that this data may be subject to a time delay and/or be inaccurate. Please also be aware that other customers may have access to data that is faster and/or more accurate than the data shown on the site. If you rely on this data to place bets, you do so entirely at your own risk. SportZone provides this data AS IS with no warranty as to the accuracy, completeness or timeliness of such data and accepts no responsibility for any loss (direct or indirect) suffered by you as a result of your reliance on it.',
    },
    {
      heading: 'Technical Error & Provider Suspension',
      body: 'In the event of a technical error or any unforeseen circumstance that leads to the suspension of the Provider’s side of any market (Match_Odds, Over/Under, etc.) during a sporting event, and the market does not resume, the outcome will be settled based on the current result (win/loss) at the time of suspension. All bets placed prior to suspension will remain valid and will be settled accordingly. The company assumes no responsibility or liability for such interruptions or outcomes.',
    },
  ],
  fancy: [
    {
      heading: '(1) Tournament Total Goals',
      body: 'For markets applying to the whole tournament, goals scored in 90 minutes or in extra-time will count. Goals scored in penalty shootouts do not count.',
    },
    {
      heading: '(2) Player Tournament Total Goals',
      body: 'Player must take some part in the tournament for bets to stand. Goals in 90 minutes and extra-time count. Goals scored in penalty shootouts do not count.',
    },
    {
      heading: '(3) Tournament Total Headed Goals',
      body: 'For markets applying to the whole tournament, goals scored in 90 minutes or in extra-time will count.',
    },
    {
      heading: '(4) Tournament Total Own Goals',
      body: 'For markets applying to the whole tournament, Own goals scored in 90 minutes or in extra-time will count.',
    },
    {
      heading: '(5) Tournament Total Corners',
      body: 'Only corners taken in 90 minutes count.',
    },
    {
      heading: '(6) Tournament Total Yellow / Red Cards',
      body: 'The maximum number of cards per player per match is one yellow and one red (e.g. a second yellow card leading to a red card does not count). Cards awarded in extra-time do not count. Only players on the pitch count (e.g., if a manager or a substitute on the bench is shown a card, it will not count for these markets).',
    },
    {
      heading: '(7) Tournament Total Converted / Missed Penalties',
      body: 'Penalties taken in 90 minutes, extra-time and penalty shootouts all count. If a penalty has to be re-taken the previous disallowed penalty(ies) do not count.',
    },
    {
      heading: '(8) Tournament Total Matches with Extra Time',
      body: 'Matches that go beyond 90 minutes into extra time count. Matches decided in extra time or by penalty shootout are included.',
    },
    {
      heading: '(9) Tournament Total Penalty Shootouts',
      body: 'Matches decided by penalty shootout count. Only official FIFA-recognised penalty shootouts are included.',
    },
  ],
};

const CRICKET_RULES = {
  bookmaker: [
    'Bookmaker runs with 0% market commission and instant acceptance.',
    'Rates are quoted in Indian Bhav (paise): Back Profit = Stake × (Rate / 100); Lay Liability = Stake × (Rate / 100).',
    'If a match is abandoned or declared No Result without an official winner (including DLS), all Bookmaker bets are voided.',
    'In Limited Overs (ODI / T20 / T10) matches decided by Super Over, Bookmaker settles on the official Super Over winner.',
  ],
  match: [
    {
      heading: 'Match Odds',
      body: 'All bets settle on the official result declared by the governing cricket board (ICC / BCCI / tournament official). Back Profit = Stake × (Odds - 1); Lay Liability = Stake × (Odds - 1). In Test Matches, Draw is a valid runner (X).',
    },
    {
      heading: 'Tied Match & Super Over',
      body: 'Tied Match settles as YES only if scores are strictly level at the end of regulation overs before Super Over. Completed Match settles YES only if an official result (including DLS) is achieved.',
    },
    {
      heading: 'Rain / DLS & Abandoned Matches',
      body: 'If a match is shortened by weather and decided via Duckworth-Lewis-Stern (DLS), Match Odds stand on the official DLS winner. If no official result is declared, all unsettled Match Odds bets are voided.',
    },
  ],
  fancy: [
    {
      heading: '(1) Session & Lambi Runs (YES / NO)',
      body: 'YES (Back): Profit = Stake × (Rate / 100), Liability = Stake; wins if actual runs >= quoted line. NO (Lay): Profit = Stake, Liability = Stake × (Rate / 100); wins if actual runs < quoted line.',
    },
    {
      heading: '(2) All-Out & Rain Reduced Overs',
      body: 'If a team is All-Out before the session overs complete, the session stands on the final score achieved. If overs are reduced due to rain before a session completes and the team is not all-out, incomplete sessions are voided; already-completed sessions stand.',
    },
    {
      heading: '(3) Batsman Runs, Fall of Wicket (FOW) & Boundaries',
      body: 'Batsman Runs stand if the batter faces at least one legal delivery (retired hurt counts on final score if not returning). Total Fours/Sixes count only boundaries off the bat (no overthrows or leg-byes).',
    },
  ],
};

const TENNIS_RULES = {
  bookmaker: [
    'Match bets stand once the 1st set is fully completed. If a player retires or is disqualified after Set 1 completes, the player advancing to the next round is settled as the winner.',
    'If a match ends by walkover or retirement BEFORE Set 1 is completed, all Match Odds and Bookmaker bets are voided.',
    'Changes in surface, venue, or schedule delay do not void bets provided the match completes within the tournament.',
  ],
  match: [
    {
      heading: 'Match Odds & Set Betting',
      body: 'All bets apply to the official tournament result. In Set Winner and Game Handicap markets, if a player retires before the relevant set/match completes, unsettled markets are voided unless already determined.',
    },
    {
      heading: 'Tie-Break & Super Tie-Break',
      body: 'A match tie-break (10-point super tie-break) counts as 1 set and 1 game for Total Games and Handicap markets unless explicitly stated otherwise.',
    },
  ],
  fancy: [
    {
      heading: '(1) Total Aces & Double Faults',
      body: 'Settled strictly on official ATP / WTA / ITF match statistics. Void if match is not completed unless line is already exceeded.',
    },
    {
      heading: '(2) Next Game Winner / Deuce',
      body: 'Applies only to the named service game. If the game is not completed due to retirement, bets on that game are void unless already settled.',
    },
  ],
};

const CASINO_RULES = {
  bookmaker: [
    'All live instant tables settle immediately per round using standard 52-card (or 32-card for 32 Cards) shuffled decks and official market payouts.',
    'Simulated virtual credits are used exclusively for demo and entertainment purposes.',
  ],
  match: [
    {
      heading: 'Teenpatti (3-Card Rules)',
      body: 'Each side (Player A & Player B) receives 3 cards. Ranking: Trail (AAA highest) > Pure Sequence (A-K-Q > A-2-3 > K-Q-J...) > Sequence > Color > Pair > High Card. Exact tie pushes (100% refund).',
    },
    {
      heading: 'Dragon Tiger (A=1 Lowest → K=13 Highest)',
      body: 'Dragon & Tiger pay 2.00x; Tie pays 11.00x. On a Tie, 50% of Dragon/Tiger stakes are automatically refunded.',
    },
    {
      heading: 'Baccarat (Punto Banco Official Tableau)',
      body: 'A=1, 2–9=face, 10/J/Q/K=0 (mod 10). Natural 8/9 stands; official 3rd-card draw rules apply. Player pays 2.00x, Banker pays 1.95x, Tie pays 9.00x. Tie pushes Player/Banker bets (100% refund).',
    },
    {
      heading: '32 Cards, Lucky 7, Andar Bahar, Roulette, Matka & Doli Dana',
      body: '32 Cards uses 6–K deck only (6=6…K=13) added to base 8/9/10/11 with tiebreaker redraw. Lucky 7 refunds 50% of Low/High on Exact 7 (12x). Andar Bahar alternates real deck deals until Joker rank matches. European Roulette uses official Red/Black pockets & 36x Zero. Matka draws 3-card Patti summed mod 10. Doli Dana pays 24x Any Triple (Small/Big lose on triple).',
    },
  ],
  fancy: [
    {
      heading: '(1) Round Void & Connection Policy',
      body: 'Any interrupted or canceled round before result confirmation automatically refunds the virtual stake.',
    },
  ],
};

function buildStandardSportRules(sportLabel, extras = {}) {
  return {
    bookmaker: extras.bookmaker || [
      `All ${sportLabel} bets settle on the official result declared by the governing federation or tournament organizer.`,
      'If an event does not take place within 48 hours of its scheduled start time, all unsettled bets are voided and stakes refunded.',
      'If a match or contestant is forfeited or awarded a walkover prior to starting, all bets will be void.',
    ],
    match: extras.match || [
      {
        heading: `${sportLabel} Match Odds`,
        body: extras.matchOddsBody || `All bets apply to official full-time regulation play${extras.includesOT ? ' including overtime/extra periods' : ' (excluding overtime/extra periods unless stated)'}.`,
      },
      {
        heading: 'Over / Under & Handicap Markets',
        body: 'In the event of an event starting but not completing, unsettled markets are voided unless the specific market outcome is already mathematically determined.',
      },
      {
        heading: 'Technical Error & Integrity Policy',
        body: 'The company reserves the right to suspend or void illegitimate bets (VPN abuse, bots, odds manipulation). Live streaming/score feeds are provided AS IS and may be subject to delay.',
      },
    ],
    fancy: extras.fancy || [
      {
        heading: `(1) ${sportLabel} Period / Session Lines`,
        body: 'Period, quarter, or set lines settle immediately upon completion of that period. Incomplete periods due to abandonment are void unless already determined.',
      },
      {
        heading: '(2) Tournament Specials',
        body: 'Outright and tournament total lines stand provided the competition reaches an official conclusion.',
      },
    ],
  };
}

export const SPORTS_RULES_BY_KEY = {
  football: FOOTBALL_RULES,
  soccer: FOOTBALL_RULES,
  esoccer: {
    ...FOOTBALL_RULES,
    bookmaker: [
      'Esoccer matches follow official 8-minute / 10-minute / 12-minute regulation match clocks.',
      ...FOOTBALL_RULES.bookmaker,
    ],
  },
  futsal: FOOTBALL_RULES,
  cricket: CRICKET_RULES,
  tennis: TENNIS_RULES,
  casino: CASINO_RULES,
  'horse-racing': buildStandardSportRules('Horse Racing', {
    bookmaker: [
      'All Horse Racing bets settle on the official "Weighed In" result declared by the track stewards.',
      'Non-Runner Rule: Stakes on withdrawn horses prior to "Under Starter’s Orders" are refunded; Rule 4 deductions may apply to remaining runners.',
      'Dead Heat Rule: If two or more horses finish in an official Dead Heat, stake is divided equally among tied winners.',
    ],
    matchOddsBody: 'Win & Place markets settle strictly on official photo-finish and stewards’ weigh-in confirmation. Disqualifications after weigh-in do not alter settled bets.',
  }),
  'greyhound-racing': buildStandardSportRules('Greyhound Racing', {
    bookmaker: [
      'Settled on the official track result at the conclusion of the race. Vacant traps or withdrawn runners prior to race start are voided.',
      'If a race is declared a "No Race" and not re-run on the same card, all bets are void.',
    ],
  }),
  basketball: buildStandardSportRules('Basketball', {
    includesOT: true,
    matchOddsBody: 'Match Odds (Moneyline), Point Spread, and Total Points include Overtime unless explicitly labeled "Regulation Time / 3-Way". At least 43 minutes (NBA) or 35 minutes (FIBA) must be played for bets to stand.',
  }),
  'basketball-3x3': buildStandardSportRules('Basketball 3X3', {
    includesOT: true,
    matchOddsBody: 'Settled on official FIBA 3x3 final score (first to 21 points or highest score after 10 minutes, including overtime).',
  }),
  'ice-hockey': buildStandardSportRules('Ice Hockey', {
    matchOddsBody: '3-Way Match Odds (1 / X / 2) apply strictly to 60 minutes regulation time (three 20-minute periods). Moneyline (2-Way) includes Overtime and Shootout.',
  }),
  volleyball: buildStandardSportRules('Volleyball', {
    matchOddsBody: 'Settled on official match winner (best of 5 sets). Golden Set does not count toward Match Odds unless explicitly specified.',
  }),
  'beach-volleyball': buildStandardSportRules('Beach Volleyball', {
    matchOddsBody: 'Settled on official match winner (best of 3 sets). If a pair withdraws before completion, unsettled bets are void.',
  }),
  'table-tennis': buildStandardSportRules('Table Tennis', {
    matchOddsBody: 'Settled on official match winner. If a player retires before match completion, Match Odds are voided while already-completed set markets stand.',
  }),
  badminton: buildStandardSportRules('Badminton', {
    matchOddsBody: 'Settled on official BWF / tournament match result. Retirement before completion voids Match Odds; completed games stand.',
  }),
  kabaddi: buildStandardSportRules('Kabaddi', {
    matchOddsBody: 'Settled on official 40-minute regulation time (two 20-minute halves). Tie-breakers / Extra Time do not count for 3-Way Match Odds.',
  }),
  'american-football': buildStandardSportRules('American Football', {
    includesOT: true,
    matchOddsBody: 'Moneyline, Handicap, and Total Points include Overtime (except 3-Way Regulation markets). At least 55 minutes must be played for bets to stand.',
  }),
  baseball: buildStandardSportRules('Baseball', {
    includesOT: true,
    matchOddsBody: 'Settled on official final score including Extra Innings. Listed pitchers rule applies only where explicitly offered.',
  }),
  'rugby-union': buildStandardSportRules('Rugby Union', {
    matchOddsBody: 'All markets settle on 80 minutes regulation play plus injury time. Extra time does not count unless stated.',
  }),
  'rugby-league': buildStandardSportRules('Rugby League', {
    matchOddsBody: 'All markets settle on 80 minutes regulation play plus injury time. Golden Point extra time is excluded unless specified.',
  }),
  handball: buildStandardSportRules('Handball', {
    matchOddsBody: 'All markets settle on 60 minutes regular time. Extra time and 7-meter throws are excluded.',
  }),
  boxing: buildStandardSportRules('Boxing', {
    matchOddsBody: 'Settled on official ringside decision (KO, TKO, DQ, Points). Technical Draw or No Contest voids 2-way Moneyline unless Draw is offered.',
  }),
  mma: buildStandardSportRules('Mixed Martial Arts', {
    matchOddsBody: 'Settled on official UFC / promotion cage decision (KO/TKO, Submission, Decision). A No Contest voids Match Odds.',
  }),
  wrestling: buildStandardSportRules('Wrestling', {
    matchOddsBody: 'Settled on official referee / federation bout decision. Walkovers prior to bout start are void.',
  }),
  sumo: buildStandardSportRules('Sumo', {
    matchOddsBody: 'Settled on official Japan Sumo Association bout outcome (including mono-ii replay reversals). Fusensho (forfeit prior to tachiai) is void.',
  }),
  snooker: buildStandardSportRules('Snooker', {
    matchOddsBody: 'Settled on official WST / tournament match winner once at least one frame has been completed (retirement awards win to advancing player if frame 1 finished).',
  }),
  darts: buildStandardSportRules('Darts', {
    matchOddsBody: 'Settled on official PDC / WDF match result. If a match does not complete, Match Odds are void unless player advances after throwing at least one dart in walkover-exempt rules.',
  }),
  golf: buildStandardSportRules('Golf', {
    matchOddsBody: 'Outrights include playoffs. 2-Ball / 3-Ball round match-ups settle on official 18-hole scorecards; ties follow Dead Heat rules unless Draw is offered.',
  }),
  chess: buildStandardSportRules('Chess', {
    matchOddsBody: 'Settled on official FIDE / tournament game result (White Win / Draw / Black Win). Armageddon or rapid tiebreaks only count in "To Advance" markets.',
  }),
  motogp: buildStandardSportRules('MotoGP', {
    matchOddsBody: 'Settled on official FIM podium presentation at the conclusion of the race. Subsequent post-podium appeals do not alter settled bets.',
  }),
  motorbikes: buildStandardSportRules('Motorbikes', {
    matchOddsBody: 'Settled on official podium classification after race completion.',
  }),
  'motor-sports': buildStandardSportRules('Motor Sports', {
    matchOddsBody: 'Settled on official FIA / governing body podium classification immediately following the race.',
  }),
  cycling: buildStandardSportRules('Cycling', {
    matchOddsBody: 'Settled on official UCI podium presentation for the stage or general classification. Riders must cross the starting line for bets to stand.',
  }),
  athletics: buildStandardSportRules('Athletics', {
    matchOddsBody: 'Settled on official podium presentation / World Athletics final timing. Non-starters prior to the gun are void.',
  }),
  'boat-racing': buildStandardSportRules('Boat Racing', {
    matchOddsBody: 'Settled on official race finish order declared by race stewards. Disqualified boats prior to start are void.',
  }),
  esports: buildStandardSportRules('Esports', {
    includesOT: true,
    matchOddsBody: 'Settled on official match series winner (BO1/BO3/BO5) including overtime rounds/maps. Remakes before First Blood / Round 1 reset bets.',
  }),
  'e-games': buildStandardSportRules('E Games', {
    includesOT: true,
    matchOddsBody: 'Settled on official match server scoreboard at full time. Disconnected/aborted matches not resumed within 24 hours are void.',
  }),
  'virtual-sports': buildStandardSportRules('Virtual sports', {
    matchOddsBody: 'Settled automatically by certified RNG / official virtual event feed at full time.',
  }),
  politics: buildStandardSportRules('Politics', {
    bookmaker: [
      'Politics markets settle on the official certified result announced by the relevant national electoral commission.',
      'Bets stand regardless of election date postponements unless the office itself is abolished.',
    ],
    matchOddsBody: 'Settled strictly on the official certified winner sworn in or declared elected.',
  }),
};

export function normalizeRuleSportKey(sportRaw) {
  const s = String(sportRaw || '').trim().toLowerCase();
  if (!s) return 'football';
  if (s === 'football' || s === 'soccer') return 'football';
  if (s === 'cricket') return 'cricket';
  if (s === 'tennis') return 'tennis';
  if (s === 'basketball') return 'basketball';
  if (s.includes('table') && s.includes('tennis')) return 'table-tennis';
  if (s.includes('ice') && s.includes('hockey')) return 'ice-hockey';
  if (s.includes('horse')) return 'horse-racing';
  if (s.includes('greyhound')) return 'greyhound-racing';
  if (s.includes('mma') || s.includes('mixed')) return 'mma';
  if (s.includes('american') && s.includes('football')) return 'american-football';
  if (s.includes('rugby') && s.includes('league')) return 'rugby-league';
  if (s.includes('rugby')) return 'rugby-union';
  if (s.includes('beach')) return 'beach-volleyball';
  if (s.includes('3x3')) return 'basketball-3x3';
  if (s.includes('esport')) return 'esports';
  if (s.includes('esoccer')) return 'esoccer';
  if (s.includes('casino') || s.includes('matka')) return 'casino';
  const exact = ALL_RULE_SPORTS.find((item) => item.key === s || item.label.toLowerCase() === s);
  return exact ? exact.key : 'football';
}
