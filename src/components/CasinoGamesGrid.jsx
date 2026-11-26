import React, { useState, useMemo } from 'react';
import { FiSearch, FiX, FiRefreshCw, FiPlay } from 'react-icons/fi';
import { GiCoins } from 'react-icons/gi';
import { CASINO_GAMES, GAME_CATEGORIES } from '../data/casinoGamesCatalog';
import { useArena } from '../context/ArenaContext';
import { formatCoins } from '../utils/formatters';
import imgFootballGoal from '../assets/images/casino_football_goal_1795690755040.jpg';
import imgMatkaGold from '../assets/images/casino_matka_gold_1795690753704.jpg';
import imgDiceSicbo from '../assets/images/casino_dice_sicbo_1795690756815.jpg';
import imgBollywoodGlam from '../assets/images/casino_bollywood_glam_1795690756031.jpg';
import imgLuckyEmerald from '../assets/images/casino_lucky_emerald_1795690763332.jpg';
import imgBeachRoulette from '../assets/images/casino_beach_roulette_1795690760025.jpg';
import imgVipRoulette from '../assets/images/casino_vip_roulette_1795690759569.jpg';
import imgPoisonJoker from '../assets/images/casino_poison_joker_1795690759388.jpg';
import imgJokerPurple from '../assets/images/casino_joker_purple_1795690761683.jpg';
import imgTeenpattiFelt from '../assets/images/casino_teenpatti_felt_1795690760303.jpg';
import imgTeenpattiRed from '../assets/images/casino_teenpatti_red_1795690764030.jpg';
import imgPokerHand from '../assets/images/casino_poker_hand_1795690764135.jpg';
import imgBaccaratGold from '../assets/images/casino_baccarat_gold_1795690765784.jpg';
import imgDragonTiger from '../assets/images/casino_dragon_tiger_1795690764394.jpg';
import imgCricketStadium from '../assets/images/casino_cricket_stadium_1795690766648.jpg';
import imgAndarBahar from '../assets/images/casino_andar_bahar_1795690767684.jpg';

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const RANKS_32 = ['6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const EUROPEAN_RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const STAKES = [50, 100, 250, 500];

function buildShuffledDeck(ranks = RANKS) {
  const deck = [];
  for (const suit of SUITS) {
    const isRed = suit === '♥' || suit === '♦';
    for (let i = 0; i < ranks.length; i++) {
      const rank = ranks[i];
      const rankIndex = RANKS.indexOf(rank); // 0=A, 1=2 ... 12=K
      deck.push({
        rank,
        suit,
        isRed,
        lowAceVal: rankIndex + 1, // A=1 ... K=13 (Dragon Tiger, Lucky 7, 32 Cards, Bollywood)
        highAceVal: rankIndex === 0 ? 14 : rankIndex + 1, // 2=2 ... K=13, A=14 (Teenpatti)
        baccaratVal: rankIndex === 0 ? 1 : rankIndex >= 9 ? 0 : rankIndex + 1, // A=1, 2-9=face, 10/J/Q/K=0
        matkaVal: rankIndex === 0 ? 1 : rankIndex >= 9 ? 0 : rankIndex + 1, // A=1, 2-9=face, 10/J/Q/K=0
      });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Official 3-Card Teenpatti Hand Evaluator
 * Rank order: 6=Trail (AAA best) > 5=Pure Sequence (A-K-Q > A-2-3 > K-Q-J...) > 4=Sequence > 3=Color > 2=Pair > 1=High Card
 */
function evaluateTeenpattiHand(cards) {
  const vals = cards.map((c) => c.highAceVal).sort((a, b) => b - a);
  const suits = cards.map((c) => c.suit);
  const isFlush = suits[0] === suits[1] && suits[1] === suits[2];

  const isAKQ = vals[0] === 14 && vals[1] === 13 && vals[2] === 12;
  const isA23 = vals[0] === 14 && vals[1] === 3 && vals[2] === 2;
  const isStandardSeq = vals[0] - vals[1] === 1 && vals[1] - vals[2] === 1;
  const isSeq = isAKQ || isA23 || isStandardSeq;

  // In Indian Teenpatti, A-K-Q is highest sequence, A-2-3 is 2nd highest (beats K-Q-J)
  const seqHigh = isAKQ ? 15 : isA23 ? 14 : vals[0];

  if (vals[0] === vals[1] && vals[1] === vals[2]) {
    return { category: 6, label: 'Trail', score: [6, vals[0], 0, 0] };
  }
  if (isSeq && isFlush) {
    return { category: 5, label: 'Pure Seq', score: [5, seqHigh, 0, 0] };
  }
  if (isSeq) {
    return { category: 4, label: 'Sequence', score: [4, seqHigh, 0, 0] };
  }
  if (isFlush) {
    return { category: 3, label: 'Color', score: [3, vals[0], vals[1], vals[2]] };
  }
  if (vals[0] === vals[1] || vals[1] === vals[2]) {
    const pairVal = vals[1];
    const kicker = vals[0] === vals[1] ? vals[2] : vals[0];
    return { category: 2, label: 'Pair', score: [2, pairVal, kicker, 0] };
  }
  return { category: 1, label: 'High Card', score: [1, vals[0], vals[1], vals[2]] };
}

function compareScores(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const av = a[i] || 0;
    const bv = b[i] || 0;
    if (av !== bv) return av > bv ? 1 : -1;
  }
  return 0;
}

function getMarketRuleSummary(engine) {
  switch (engine) {
    case 'dragon-tiger':
      return 'Market Rule: A (1) is lowest, K (13) is highest. Tie pays 11x; on Tie, 50% of Dragon/Tiger stake is refunded.';
    case 'andar-bahar':
      return 'Market Rule: Center Joker is dealt, then cards alternate Andar → Bahar from the 52-card deck until rank matches.';
    case 'baccarat':
      return 'Market Rule: A=1, 2–9=face, 10/J/Q/K=0 (mod 10). Natural 8/9 stands; official 3rd-card draw applies. Tie pushes Player/Banker (100% refund).';
    case 'lucky7':
      return 'Market Rule: Low (A–6) & High (8–K) pay 2.00x; Exact 7 pays 12.00x. If card is 7, Low/High bets get 50% stake refunded.';
    case '32cards':
      return 'Market Rule: 32-card deck only (6–K: 6=6 … J=11, Q=12, K=13) added to base 8/9/10/11. Highest total wins (ties redraw).';
    case 'roulette':
      return 'Market Rule: European single-zero wheel (0–36) with official Red/Black pockets. Red/Black pay 2.00x; Zero (0) pays 36.00x.';
    case 'dice':
      return 'Market Rule: 3 dice (Doli Dana / Sic Bo). Small (4–10) & Big (11–17) lose on Any Triple; Any Triple pays 24.00x.';
    case 'cricket':
      return 'Market Rule: Live over ball settlement — Dot/Wicket, 1–3 Runs, or 4/6 Boundary based on official ball outcome.';
    case 'football':
      return 'Market Rule: Instant penalty shootout settlement — Goal Scored vs Keeper Save / Miss.';
    case 'matka':
      return 'Market Rule: 3-card Patti (A=1…9=9, 10/J/Q/K=0) summed mod 10 decides winning Single Digit (0–9).';
    case 'bollywood':
      return 'Market Rule: Amar (A–6), Akbar (7–10), Anthony (J–K) drawn from a single shuffled 52-card deck.';
    default:
      return 'Market Rule: 3-Card Teenpatti — Trail > Pure Seq (A-K-Q, A-2-3) > Sequence > Color > Pair > High Card. Exact tie pushes (100% refund).';
  }
}

function getEngineOptions(engine) {
  switch (engine) {
    case 'dragon-tiger':
      return [
        { key: 'dragon', label: 'Dragon', mult: 2.0 },
        { key: 'tie', label: 'Tie', mult: 11.0 },
        { key: 'tiger', label: 'Tiger', mult: 2.0 },
      ];
    case 'andar-bahar':
      return [
        { key: 'andar', label: 'Andar', mult: 1.9 },
        { key: 'bahar', label: 'Bahar', mult: 2.0 },
      ];
    case 'baccarat':
      return [
        { key: 'player', label: 'Player', mult: 2.0 },
        { key: 'tie', label: 'Tie', mult: 9.0 },
        { key: 'banker', label: 'Banker', mult: 1.95 },
      ];
    case 'lucky7':
      return [
        { key: 'low', label: 'Low (A–6)', mult: 2.0 },
        { key: 'seven', label: 'Exact 7', mult: 12.0 },
        { key: 'high', label: 'High (8–K)', mult: 2.0 },
      ];
    case '32cards':
      return [
        { key: 'p8', label: 'Player 8', mult: 11.5 },
        { key: 'p9', label: 'Player 9', mult: 5.5 },
        { key: 'p10', label: 'Player 10', mult: 3.3 },
        { key: 'p11', label: 'Player 11', mult: 2.2 },
      ];
    case 'roulette':
      return [
        { key: 'red', label: 'Red', mult: 2.0 },
        { key: 'zero', label: 'Zero (0)', mult: 36.0 },
        { key: 'black', label: 'Black', mult: 2.0 },
      ];
    case 'dice':
      return [
        { key: 'small', label: 'Small (4–10)', mult: 1.98 },
        { key: 'triple', label: 'Any Triple', mult: 24.0 },
        { key: 'big', label: 'Big (11–17)', mult: 1.98 },
      ];
    case 'cricket':
      return [
        { key: 'dot', label: 'Dot / Wicket', mult: 2.3 },
        { key: 'runs', label: '1–3 Runs', mult: 2.1 },
        { key: 'boundary', label: '4 or 6 Boundary', mult: 2.6 },
      ];
    case 'football':
      return [
        { key: 'goal', label: 'GOAL Scored', mult: 1.95 },
        { key: 'save', label: 'Keeper Save / Miss', mult: 2.05 },
      ];
    case 'matka':
      return [
        { key: 'even', label: 'Even Digit', mult: 1.96 },
        { key: 'odd', label: 'Odd Digit', mult: 1.96 },
        { key: 'lucky9', label: 'Exact 7 or 9', mult: 4.75 },
      ];
    case 'bollywood':
      return [
        { key: 'amar', label: 'Amar (A–6)', mult: 2.1 },
        { key: 'akbar', label: 'Akbar (7–10)', mult: 3.15 },
        { key: 'anthony', label: 'Anthony (J–K)', mult: 4.2 },
      ];
    default:
      return [
        { key: 'playerA', label: 'Player A', mult: 1.98 },
        { key: 'playerB', label: 'Player B', mult: 1.98 },
      ];
  }
}

function resolveEngineRound(engine, pick) {
  if (engine === 'dragon-tiger') {
    const deck = buildShuffledDeck();
    const d = deck[0];
    const t = deck[1];
    // Real Dragon Tiger rule: Ace = 1 (lowest), King = 13 (highest)
    const winner = d.lowAceVal > t.lowAceVal ? 'dragon' : t.lowAceVal > d.lowAceVal ? 'tiger' : 'tie';
    const isHalfRefund = winner === 'tie' && (pick === 'dragon' || pick === 'tiger');
    return {
      won: winner === pick,
      refundFactor: isHalfRefund ? 0.5 : 0,
      refundLabel: isHalfRefund ? 'TIE — 50% Stake Refunded' : '',
      visual: { type: 'cards', items: [{ label: 'Dragon', cards: [d] }, { label: 'Tiger', cards: [t] }] },
      resultText: `Dragon ${d.rank}${d.suit} (${d.lowAceVal}) vs Tiger ${t.rank}${t.suit} (${t.lowAceVal}) → ${winner.toUpperCase()}`,
    };
  }

  if (engine === 'andar-bahar') {
    const deck = buildShuffledDeck();
    const joker = deck[0];
    let matchedSide = 'andar';
    let matchCard = null;
    let cardsDealt = 0;
    for (let i = 1; i < deck.length; i++) {
      const side = i % 2 === 1 ? 'andar' : 'bahar';
      cardsDealt += 1;
      if (deck[i].rank === joker.rank) {
        matchedSide = side;
        matchCard = deck[i];
        break;
      }
    }
    return {
      won: matchedSide === pick,
      refundFactor: 0,
      visual: {
        type: 'cards',
        items: [
          { label: 'Joker Card', cards: [joker] },
          { label: `${matchedSide.toUpperCase()} (Card #${cardsDealt})`, cards: [matchCard] },
        ],
      },
      resultText: `Matched ${joker.rank} on ${matchedSide.toUpperCase()} in ${cardsDealt} card${cardsDealt > 1 ? 's' : ''}`,
    };
  }

  if (engine === 'baccarat') {
    const deck = buildShuffledDeck();
    let idx = 0;
    const pCards = [deck[idx++], deck[idx++]];
    const bCards = [deck[idx++], deck[idx++]];
    const handTotal = (arr) => arr.reduce((s, c) => s + c.baccaratVal, 0) % 10;

    let pScore = handTotal(pCards);
    let bScore = handTotal(bCards);

    // Official Punto Banco 3rd-Card Tableau (Natural 8 or 9 stands immediately)
    if (pScore < 8 && bScore < 8) {
      let playerThird = null;
      if (pScore <= 5) {
        playerThird = deck[idx++];
        pCards.push(playerThird);
        pScore = handTotal(pCards);
      }

      if (!playerThird) {
        if (bScore <= 5) {
          bCards.push(deck[idx++]);
          bScore = handTotal(bCards);
        }
      } else {
        const p3 = playerThird.baccaratVal;
        const bankerDraws =
          bScore <= 2 ||
          (bScore === 3 && p3 !== 8) ||
          (bScore === 4 && p3 >= 2 && p3 <= 7) ||
          (bScore === 5 && p3 >= 4 && p3 <= 7) ||
          (bScore === 6 && (p3 === 6 || p3 === 7));
        if (bankerDraws) {
          bCards.push(deck[idx++]);
          bScore = handTotal(bCards);
        }
      }
    }

    const winner = pScore > bScore ? 'player' : bScore > pScore ? 'banker' : 'tie';
    const isPush = winner === 'tie' && (pick === 'player' || pick === 'banker');
    return {
      won: winner === pick,
      refundFactor: isPush ? 1.0 : 0,
      refundLabel: isPush ? 'TIE PUSH — 100% Stake Refunded' : '',
      visual: {
        type: 'cards',
        items: [
          { label: `Player (${pScore})`, cards: pCards },
          { label: `Banker (${bScore})`, cards: bCards },
        ],
      },
      resultText: `Player ${pScore} vs Banker ${bScore} → ${winner.toUpperCase()}`,
    };
  }

  if (engine === 'lucky7') {
    const deck = buildShuffledDeck();
    const c = deck[0];
    const num = c.lowAceVal; // A=1 ... 7=7 ... K=13
    const winner = num < 7 ? 'low' : num === 7 ? 'seven' : 'high';
    const isHalfRefund = winner === 'seven' && (pick === 'low' || pick === 'high');
    return {
      won: winner === pick,
      refundFactor: isHalfRefund ? 0.5 : 0,
      refundLabel: isHalfRefund ? 'CARD 7 — 50% Stake Refunded' : '',
      visual: { type: 'cards', items: [{ label: 'Drawn Card', cards: [c] }] },
      resultText: `Card drawn: ${c.rank}${c.suit} (${winner === 'seven' ? 'EXACT 7' : winner.toUpperCase()})`,
    };
  }

  if (engine === '32cards') {
    // Authentic 32-Card deck (6 through King only: 6=6 ... 10=10, J=11, Q=12, K=13)
    const deck = buildShuffledDeck(RANKS_32);
    let idx = 0;
    const base = [8, 9, 10, 11];
    const hands = base.map((b) => {
      const c = deck[idx++];
      return { key: `p${b}`, base: b, total: b + c.lowAceVal, cards: [c] };
    });

    // Official tiebreaker: tied top players receive an extra card until single winner emerges
    for (let safety = 0; safety < 4; safety++) {
      const maxTotal = Math.max(...hands.map((h) => h.total));
      const leaders = hands.filter((h) => h.total === maxTotal);
      if (leaders.length === 1) break;
      leaders.forEach((h) => {
        if (idx < deck.length) {
          const extra = deck[idx++];
          h.cards.push(extra);
          h.total += extra.lowAceVal;
        }
      });
    }

    const best = hands.reduce((a, b) => (b.total > a.total ? b : a), hands[0]);
    return {
      won: best.key === pick,
      refundFactor: 0,
      visual: {
        type: 'cards',
        items: hands.map((h) => ({ label: `P${h.base} (${h.total})`, cards: h.cards })),
      },
      resultText: `Winner: Player ${best.base} (Total ${best.total})`,
    };
  }

  if (engine === 'roulette') {
    const n = Math.floor(Math.random() * 37);
    // Authentic European Roulette red/black pocket mapping
    const color = n === 0 ? 'zero' : EUROPEAN_RED.has(n) ? 'red' : 'black';
    return {
      won: color === pick,
      refundFactor: 0,
      visual: { type: 'badge', big: String(n), sub: color === 'zero' ? 'GREEN ZERO (0)' : color.toUpperCase() },
      resultText: `Wheel landed on ${n} (${color === 'zero' ? 'GREEN 0' : color.toUpperCase()})`,
    };
  }

  if (engine === 'dice') {
    const d1 = 1 + Math.floor(Math.random() * 6);
    const d2 = 1 + Math.floor(Math.random() * 6);
    const d3 = 1 + Math.floor(Math.random() * 6);
    const sum = d1 + d2 + d3;
    const isTriple = d1 === d2 && d2 === d3;
    // Standard Sic Bo / Doli Dana: Any Triple beats both Small and Big
    const winner = isTriple ? 'triple' : sum <= 10 ? 'small' : 'big';
    return {
      won: winner === pick,
      refundFactor: 0,
      visual: { type: 'badge', big: `${d1} · ${d2} · ${d3}`, sub: isTriple ? `TRIPLE (${sum})` : `TOTAL ${sum}` },
      resultText: `Dice rolled ${d1}-${d2}-${d3} (Total ${sum} · ${winner.toUpperCase()})`,
    };
  }

  if (engine === 'cricket') {
    const outcomes = [
      { key: 'dot', label: 'WICKET / DOT', big: '0 / W' },
      { key: 'dot', label: 'DOT BALL', big: '0' },
      { key: 'runs', label: '1 RUN', big: '1' },
      { key: 'runs', label: '2 RUNS', big: '2' },
      { key: 'runs', label: '3 RUNS', big: '3' },
      { key: 'boundary', label: 'FOUR!', big: '4' },
      { key: 'boundary', label: 'SIX!', big: '6' },
    ];
    const hit = outcomes[Math.floor(Math.random() * outcomes.length)];
    return {
      won: hit.key === pick,
      refundFactor: 0,
      visual: { type: 'badge', big: hit.big, sub: hit.label },
      resultText: `Ball outcome: ${hit.label}`,
    };
  }

  if (engine === 'football') {
    const scored = Math.random() < 0.5;
    const winner = scored ? 'goal' : 'save';
    return {
      won: winner === pick,
      refundFactor: 0,
      visual: { type: 'badge', big: scored ? 'GOAL!' : 'SAVED', sub: scored ? 'Top Corner' : 'Keeper Stop' },
      resultText: scored ? 'Penalty converted — GOAL!' : 'Goalkeeper blocked the strike!',
    };
  }

  if (engine === 'matka') {
    // Authentic Matka 3-card Patti (Panna) sum mod 10 => Single Digit 0–9
    const deck = buildShuffledDeck();
    const patti = [deck[0], deck[1], deck[2]];
    const rawSum = patti.reduce((s, c) => s + c.matkaVal, 0);
    const digit = rawSum % 10;
    const pattiStr = patti.map((c) => c.matkaVal).join('-');
    const isLucky = digit === 7 || digit === 9;
    const won = pick === 'lucky9' ? isLucky : pick === 'even' ? digit % 2 === 0 : digit % 2 === 1;
    return {
      won,
      refundFactor: 0,
      visual: { type: 'badge', big: String(digit), sub: `PATTI ${pattiStr} · ${digit % 2 === 0 ? 'EVEN' : 'ODD'}` },
      resultText: `Patti ${pattiStr} → Matka Digit ${digit} (${digit % 2 === 0 ? 'EVEN' : 'ODD'})`,
    };
  }

  if (engine === 'bollywood') {
    const deck = buildShuffledDeck();
    const c = deck[0];
    const num = c.lowAceVal;
    const winner = num <= 6 ? 'amar' : num <= 10 ? 'akbar' : 'anthony';
    return {
      won: winner === pick,
      refundFactor: 0,
      visual: { type: 'cards', items: [{ label: winner.toUpperCase(), cards: [c] }] },
      resultText: `Card ${c.rank}${c.suit} → ${winner.toUpperCase()}`,
    };
  }

  // Default: Real 3-Card Indian Teenpatti
  const deck = buildShuffledDeck();
  const handA = [deck[0], deck[2], deck[4]];
  const handB = [deck[1], deck[3], deck[5]];
  const evalA = evaluateTeenpattiHand(handA);
  const evalB = evaluateTeenpattiHand(handB);
  const cmp = compareScores(evalA.score, evalB.score);
  const isPush = cmp === 0;
  const winner = cmp > 0 ? 'playerA' : cmp < 0 ? 'playerB' : 'tie';
  return {
    won: !isPush && winner === pick,
    refundFactor: isPush ? 1.0 : 0,
    refundLabel: isPush ? 'EXACT TIE — 100% Stake Refunded' : '',
    visual: {
      type: 'cards',
      items: [
        { label: `Player A · ${evalA.label}`, cards: handA },
        { label: `Player B · ${evalB.label}`, cards: handB },
      ],
    },
    resultText: isPush
      ? `Player A (${evalA.label}) tied Player B (${evalB.label})`
      : `Player A (${evalA.label}) vs Player B (${evalB.label}) → ${winner === 'playerA' ? 'Player A' : 'Player B'} wins`,
  };
}

/** Map every catalog game to its photorealistic studio poster artwork + visual framing */
const GAME_ART_BY_THEME = {
  'football-gold': { src: imgFootballGoal, filter: 'contrast(1.06) saturate(1.12)' },
  'football-green': { src: imgFootballGoal, filter: 'hue-rotate(68deg) saturate(1.22)' },
  'matka-dark': { src: imgMatkaGold, filter: 'contrast(1.06)' },
  'matka-green': { src: imgMatkaGold, filter: 'hue-rotate(55deg) saturate(1.15)' },
  'lottery-gold': { src: imgLuckyEmerald, filter: 'hue-rotate(-40deg) saturate(1.25)' },
  'dice-emerald': { src: imgDiceSicbo, filter: 'contrast(1.06)' },
  'dice-dark': { src: imgDiceSicbo, filter: 'saturate(0.75) contrast(1.15) brightness(0.92)' },
  'dice-crimson': { src: imgDiceSicbo, filter: 'hue-rotate(-38deg) saturate(1.25)' },
  'bollywood-amber': { src: imgBollywoodGlam, filter: 'contrast(1.05)' },
  'bollywood-neon': { src: imgBollywoodGlam, filter: 'hue-rotate(250deg) saturate(1.3)' },
  'bollywood-purple': { src: imgBollywoodGlam, filter: 'hue-rotate(280deg) saturate(1.25)' },
  'aaa-retro': { src: imgBollywoodGlam, filter: 'sepia(0.25) saturate(1.25)' },
  'aaa-dark': { src: imgBollywoodGlam, filter: 'brightness(0.86) contrast(1.15)' },
  'dus-crimson': { src: imgTeenpattiRed, filter: 'contrast(1.12) saturate(1.2)' },
  'lucky-pot': { src: imgLuckyEmerald, filter: 'contrast(1.05)' },
  'lucky7-green': { src: imgLuckyEmerald, filter: 'saturate(1.15)' },
  'lucky7-blue': { src: imgLuckyEmerald, filter: 'hue-rotate(115deg) saturate(1.2)' },
  'lucky7-pink': { src: imgLuckyEmerald, filter: 'hue-rotate(220deg) saturate(1.25)' },
  'note-gold': { src: imgMatkaGold, filter: 'brightness(1.08) saturate(1.25)' },
  'roulette-beach': { src: imgBeachRoulette, filter: 'contrast(1.05) saturate(1.12)' },
  'roulette-classic': { src: imgVipRoulette, filter: 'contrast(1.06) saturate(1.1)' },
  'roulette-vip': { src: imgVipRoulette, filter: 'brightness(0.92) contrast(1.14)' },
  'roulette-gold': { src: imgVipRoulette, filter: 'hue-rotate(-14deg) saturate(1.22)' },
  'poison-dark': { src: imgPoisonJoker, filter: 'contrast(1.08)' },
  'joker-green': { src: imgPoisonJoker, filter: 'saturate(1.3) brightness(1.04)' },
  'joker-teal': { src: imgJokerPurple, filter: 'hue-rotate(-65deg) saturate(1.15)' },
  'joker-purple': { src: imgJokerPurple, filter: 'contrast(1.06) saturate(1.15)' },
  'joker-gold': { src: imgJokerPurple, filter: 'hue-rotate(60deg) saturate(1.1)' },
  'unique-crimson': { src: imgTeenpattiRed, filter: 'contrast(1.08) saturate(1.15)' },
  'cards-white': { src: imgTeenpattiFelt, filter: 'contrast(1.08)' },
  'instant-red': { src: imgTeenpattiRed, filter: 'saturate(1.22)' },
  'felt-gold': { src: imgAndarBahar, filter: 'contrast(1.06) saturate(1.1)' },
  'felt-classic': { src: imgTeenpattiFelt, filter: 'contrast(1.05)' },
  'felt-teal': { src: imgTeenpattiFelt, filter: 'hue-rotate(28deg) saturate(1.1)' },
  'felt-navy': { src: imgPokerHand, filter: 'hue-rotate(30deg) contrast(1.08)' },
  'felt-purple': { src: imgJokerPurple, filter: 'brightness(0.92) saturate(1.15)' },
  'felt-deep': { src: imgAndarBahar, filter: 'brightness(0.88) contrast(1.14)' },
  'queen-gold': { src: imgAndarBahar, filter: 'saturate(1.2) brightness(1.05)' },
  'poker-felt': { src: imgPokerHand, filter: 'contrast(1.08) saturate(1.1)' },
  'baccarat-seal': { src: imgBaccaratGold, filter: 'contrast(1.08) saturate(1.15)' },
  'baccarat-ring': { src: imgBaccaratGold, filter: 'hue-rotate(-18deg) contrast(1.1)' },
  'baccarat-dark': { src: imgBaccaratGold, filter: 'saturate(0.85) brightness(0.92)' },
  'dt-green': { src: imgDragonTiger, filter: 'contrast(1.06) saturate(1.12)' },
  'dt-blue': { src: imgDragonTiger, filter: 'hue-rotate(80deg) saturate(1.15)' },
  'cards32-green': { src: imgTeenpattiFelt, filter: 'saturate(1.12) brightness(0.95)' },
  'cards32-studio': { src: imgAndarBahar, filter: 'contrast(1.08)' },
  'judgement-navy': { src: imgPokerHand, filter: 'hue-rotate(48deg) contrast(1.1)' },
  'race17-purple': { src: imgJokerPurple, filter: 'hue-rotate(-25deg) contrast(1.08)' },
  'trio-sky': { src: imgTeenpattiFelt, filter: 'hue-rotate(45deg) saturate(1.15)' },
  'ab-gold': { src: imgAndarBahar, filter: 'saturate(1.15)' },
  'ab-green': { src: imgAndarBahar, filter: 'hue-rotate(75deg) saturate(1.12)' },
  'ab-red': { src: imgTeenpattiRed, filter: 'contrast(1.1)' },
  'cricket-royal': { src: imgCricketStadium, filter: 'hue-rotate(120deg) contrast(1.08)' },
  'cricket-comic': { src: imgCricketStadium, filter: 'saturate(1.28) brightness(1.04)' },
  'cricket-sky': { src: imgCricketStadium, filter: 'hue-rotate(15deg) brightness(1.06)' },
  'cricket-stadium': { src: imgCricketStadium, filter: 'contrast(1.06) saturate(1.12)' },
  'cricket-night': { src: imgCricketStadium, filter: 'brightness(0.9) contrast(1.15)' },
  'race-turf': { src: imgCricketStadium, filter: 'hue-rotate(-20deg) saturate(1.15)' },
  'race-gold': { src: imgFootballGoal, filter: 'hue-rotate(-12deg) contrast(1.08)' },
  'trap-black': { src: imgPoisonJoker, filter: 'saturate(0.65) contrast(1.18)' },
  'meter-gold': { src: imgBaccaratGold, filter: 'hue-rotate(12deg) saturate(1.15)' },
};

function getGameArtwork(game) {
  if (GAME_ART_BY_THEME[game.theme]) return GAME_ART_BY_THEME[game.theme];
  switch (game.engine) {
    case 'football':
      return { src: imgFootballGoal };
    case 'matka':
      return { src: imgMatkaGold };
    case 'dice':
      return { src: imgDiceSicbo };
    case 'roulette':
      return { src: imgVipRoulette };
    case 'baccarat':
      return { src: imgBaccaratGold };
    case 'dragon-tiger':
      return { src: imgDragonTiger };
    case 'cricket':
      return { src: imgCricketStadium };
    case 'lucky7':
      return { src: imgLuckyEmerald };
    case 'andar-bahar':
      return { src: imgAndarBahar };
    default:
      return { src: imgTeenpattiFelt };
  }
}

function GamePosterArt({ game }) {
  const [imgFailed, setImgFailed] = useState(false);
  const art = getGameArtwork(game);

  if (imgFailed || !art?.src) {
    return null;
  }

  return (
    <img
      src={art.src}
      alt={game.title}
      loading="lazy"
      referrerPolicy="no-referrer"
      className="ex-tile-bg-img"
      style={art.filter ? { filter: art.filter } : undefined}
      onError={() => setImgFailed(true)}
    />
  );
}

function InstantGameModal({ game, onClose }) {
  const { state, playInstantGameRound } = useArena();
  const options = useMemo(() => getEngineOptions(game.engine), [game.engine]);
  const [pick, setPick] = useState(options[0].key);
  const [stake, setStake] = useState(100);
  const [roundResult, setRoundResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const ruleSummary = useMemo(() => getMarketRuleSummary(game.engine), [game.engine]);

  function handlePlay() {
    setErrorMsg('');
    const chosen = options.find((o) => o.key === pick) || options[0];
    const numStake = Math.floor(Number(stake));
    if (!numStake || numStake < 10) {
      setErrorMsg('Minimum virtual stake is 10 coins.');
      return;
    }
    if (numStake > state.coins) {
      setErrorMsg('Insufficient demo virtual coins. Claim daily coins in Wallet.');
      return;
    }
    const outcome = resolveEngineRound(game.engine, chosen.key);
    const refundFactor = Number(outcome.refundFactor) || 0;
    const payout = outcome.won
      ? Math.round(numStake * chosen.mult)
      : refundFactor > 0
      ? Math.round(numStake * refundFactor)
      : 0;
    const summaryWithRefund = outcome.refundLabel
      ? `${outcome.resultText} (${outcome.refundLabel})`
      : outcome.resultText;
    const txRes = playInstantGameRound({
      gameName: game.title,
      stake: numStake,
      payout,
      won: outcome.won,
      summary: summaryWithRefund,
    });
    if (!txRes.ok) {
      setErrorMsg(txRes.error);
      return;
    }
    setRoundResult({
      ...outcome,
      payout,
      stake: numStake,
      chosenLabel: chosen.label,
    });
  }

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
      style={{ backgroundColor: 'rgba(0,0,0,0.82)', zIndex: 1090 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="instant-game-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sz-card w-100" style={{ maxWidth: 590, backgroundColor: '#11141B', borderColor: 'var(--sz-border-strong)' }}>
        <div className="d-flex align-items-center justify-content-between pb-3 mb-2" style={{ borderBottom: '1px solid var(--sz-border)' }}>
          <div>
            <h2 id="instant-game-title" className="sz-display h4 text-white mb-0">
              {game.title}
            </h2>
            <div className="small sz-muted">
              Demo Virtual Coin Table · Live Balance:{' '}
              <strong className="sz-mono sz-text-orange">{formatCoins(state.coins)}</strong>
            </div>
          </div>
          <button type="button" className="sz-btn sz-btn-ghost sz-btn-sm" onClick={onClose} aria-label="Close table">
            <FiX size={18} />
          </button>
        </div>

        {/* Authentic Market Rule Strip */}
        <div
          className="rounded px-2 py-1 mb-3"
          style={{
            backgroundColor: 'rgba(19, 94, 131, 0.18)',
            border: '1px solid rgba(56, 189, 248, 0.28)',
            fontSize: '0.74rem',
            color: '#bae6fd',
            lineHeight: 1.4,
          }}
        >
          {ruleSummary}
        </div>

        {/* Visual Table Arena */}
        <div
          className="rounded p-3 mb-3 text-center"
          style={{
            background: 'radial-gradient(circle at center, #0e4a2b 0%, #072214 100%)',
            border: '2px solid rgba(245, 196, 81, 0.35)',
            minHeight: 152,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {!roundResult ? (
            <div className="small text-white-50">
              Select your side and demo virtual stake below, then click <strong className="text-white">Deal / Play Round</strong>.
            </div>
          ) : (
            <>
              {roundResult.visual.type === 'cards' ? (
                <div className="d-flex flex-wrap justify-content-center gap-3 mb-2">
                  {roundResult.visual.items.map((item, i) => {
                    const cardList = item.cards || (item.card ? [item.card] : []);
                    const compact = cardList.length >= 3;
                    return (
                      <div key={i} className="text-center">
                        <div className="small text-white-50 mb-1 fw-semibold" style={{ fontSize: '0.73rem' }}>
                          {item.label}
                        </div>
                        <div className="d-flex justify-content-center gap-1">
                          {cardList.map((c, ci) => (
                            <div
                              key={ci}
                              className="rounded d-flex flex-column align-items-center justify-content-center fw-bold shadow"
                              style={{
                                width: compact ? 44 : 56,
                                height: compact ? 64 : 76,
                                backgroundColor: '#ffffff',
                                color: c.isRed ? '#dc2626' : '#111827',
                                fontSize: compact ? '0.96rem' : '1.15rem',
                              }}
                            >
                              <span>{c.rank}</span>
                              <span style={{ fontSize: compact ? '1.05rem' : '1.25rem', lineHeight: 1 }}>{c.suit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mb-2">
                  <div className="sz-mono fw-bold display-5 text-white">{roundResult.visual.big}</div>
                  <div className="small fw-bold" style={{ color: '#fde047' }}>{roundResult.visual.sub}</div>
                </div>
              )}

              <div
                className="fw-bold small mt-1"
                style={{
                  color: roundResult.won
                    ? '#20D98B'
                    : roundResult.refundFactor > 0
                    ? '#facc15'
                    : '#f87171',
                }}
              >
                {roundResult.resultText} —{' '}
                {roundResult.won
                  ? `YOU WON +${formatCoins(roundResult.payout)} COINS!`
                  : roundResult.refundFactor > 0
                  ? `${roundResult.refundLabel} (+${formatCoins(roundResult.payout)} returned)`
                  : `Lost ${formatCoins(roundResult.stake)} coins`}
              </div>
            </>
          )}
        </div>

        {/* Pick Options */}
        <div className="mb-3">
          <div className="small fw-semibold text-white mb-2">Select Outcome</div>
          <div className="d-flex flex-wrap gap-2">
            {options.map((opt) => (
              <button
                key={opt.key}
                type="button"
                className={`sz-pick-btn ${pick === opt.key ? 'selected' : ''}`}
                onClick={() => setPick(opt.key)}
              >
                <div className="small fw-semibold">{opt.label}</div>
                <div className="sz-mono fw-bold sz-text-green">{opt.mult.toFixed(2)}x</div>
              </button>
            ))}
          </div>
        </div>

        {/* Virtual Coin Stake */}
        <div className="mb-3">
          <div className="d-flex justify-content-between small mb-2">
            <span className="fw-semibold text-white">Demo Virtual Stake</span>
            <span className="sz-mono sz-muted">
              <GiCoins className="me-1 sz-text-orange" /> {formatCoins(state.coins)} available
            </span>
          </div>
          <div className="d-flex gap-2 mb-2">
            {STAKES.map((amt) => (
              <button
                key={amt}
                type="button"
                className={`sz-btn sz-btn-sm flex-fill ${Number(stake) === amt ? 'sz-btn-primary' : 'sz-btn-outline'}`}
                onClick={() => setStake(amt)}
                disabled={amt > state.coins}
              >
                {amt}
              </button>
            ))}
          </div>
          <input
            type="number"
            min="10"
            max={state.coins}
            step="10"
            className="sz-input w-100 sz-mono"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
          />
        </div>

        {errorMsg && (
          <div className="small mb-3" style={{ color: '#f87171' }}>
            {errorMsg}
          </div>
        )}

        <div className="d-flex justify-content-between align-items-center gap-2">
          <span className="small sz-muted">Simulated virtual credits · Official market rules</span>
          <button
            type="button"
            className="sz-btn sz-btn-primary"
            onClick={handlePlay}
            disabled={Number(stake) < 10 || Number(stake) > state.coins}
          >
            {roundResult ? <FiRefreshCw size={15} /> : <FiPlay size={15} />}
            {roundResult ? 'Play Again' : 'Deal / Play Round'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CasinoGamesGrid({
  initialCategory = 'all',
  showFilterBar = true,
  limit = null,
}) {
  const [category, setCategory] = useState(initialCategory);
  const [search, setSearch] = useState('');
  const [activeGame, setActiveGame] = useState(null);

  React.useEffect(() => {
    setCategory(initialCategory || 'all');
  }, [initialCategory]);

  const filtered = useMemo(() => {
    let list = CASINO_GAMES;
    if (category && category !== 'all') {
      list = list.filter((g) => g.category === category);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((g) => g.title.toLowerCase().includes(q));
    }
    return limit ? list.slice(0, limit) : list;
  }, [category, search, limit]);

  return (
    <div className="ex-games-section">
      {showFilterBar && (
        <div className="ex-games-toolbar">
          <div className="ex-games-cats">
            {GAME_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                className={`ex-games-cat-btn ${category === cat.key ? 'active' : ''}`}
                onClick={() => setCategory(cat.key)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="ex-games-search-box">
            <FiSearch size={14} className="ex-games-search-ico" />
            <input
              type="text"
              className="ex-games-search-input"
              placeholder="Search games..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Exact 10-Column Dense Square Game Tile Grid */}
      <div className="ex-games-grid">
        {filtered.map((game) => (
          <button
            key={game.id}
            type="button"
            className={`ex-game-tile ex-theme-${game.theme}`}
            onClick={() => setActiveGame(game)}
            title={`Play ${game.title}`}
          >
            <div className="ex-tile-artwork">
              <GamePosterArt game={game} />
              <div className="ex-tile-scrim" aria-hidden="true" />
              <div className="ex-tile-poster-title">{game.posterTitle}</div>
              {game.subtitle && <div className="ex-tile-poster-sub">{game.subtitle}</div>}
            </div>
            <div className="ex-tile-footer">{game.title}</div>
          </button>
        ))}
      </div>

      {activeGame && (
        <InstantGameModal game={activeGame} onClose={() => setActiveGame(null)} />
      )}
    </div>
  );
}
