import React, { useState, useMemo } from 'react';
import { FiSearch, FiX, FiRefreshCw, FiPlay } from 'react-icons/fi';
import { GiCoins } from 'react-icons/gi';
import { CASINO_GAMES, GAME_CATEGORIES } from '../data/casinoGamesCatalog';
import { useArena } from '../context/ArenaContext';
import { formatCoins } from '../utils/formatters';

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const STAKES = [50, 100, 250, 500];

function drawRandomCard() {
  const rankIdx = Math.floor(Math.random() * RANKS.length);
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  const rank = RANKS[rankIdx];
  const value = rankIdx === 0 ? 14 : rankIdx + 1;
  const isRed = suit === '♥' || suit === '♦';
  return { rank, suit, value, isRed };
}

function getEngineOptions(engine) {
  switch (engine) {
    case 'dragon-tiger':
      return [
        { key: 'dragon', label: 'Dragon', mult: 1.98 },
        { key: 'tie', label: 'Tie', mult: 8.0 },
        { key: 'tiger', label: 'Tiger', mult: 1.98 },
      ];
    case 'andar-bahar':
      return [
        { key: 'andar', label: 'Andar', mult: 1.95 },
        { key: 'bahar', label: 'Bahar', mult: 2.0 },
      ];
    case 'baccarat':
      return [
        { key: 'player', label: 'Player', mult: 2.0 },
        { key: 'tie', label: 'Tie', mult: 8.5 },
        { key: 'banker', label: 'Banker', mult: 1.95 },
      ];
    case 'lucky7':
      return [
        { key: 'low', label: 'Low (A–6)', mult: 2.0 },
        { key: 'seven', label: 'Exact 7', mult: 11.0 },
        { key: 'high', label: 'High (8–K)', mult: 2.0 },
      ];
    case '32cards':
      return [
        { key: 'p8', label: 'Player 8', mult: 3.6 },
        { key: 'p9', label: 'Player 9', mult: 3.4 },
        { key: 'p10', label: 'Player 10', mult: 3.1 },
        { key: 'p11', label: 'Player 11', mult: 2.8 },
      ];
    case 'roulette':
      return [
        { key: 'red', label: 'Red', mult: 2.0 },
        { key: 'zero', label: 'Zero (0)', mult: 18.0 },
        { key: 'black', label: 'Black', mult: 2.0 },
      ];
    case 'dice':
      return [
        { key: 'small', label: 'Small (4–10)', mult: 1.98 },
        { key: 'triple', label: 'Any Triple', mult: 12.0 },
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
        { key: 'lucky9', label: 'Exact 7 or 9', mult: 4.5 },
      ];
    case 'bollywood':
      return [
        { key: 'amar', label: 'Amar (A–6)', mult: 2.1 },
        { key: 'akbar', label: 'Akbar (7–10)', mult: 3.1 },
        { key: 'anthony', label: 'Anthony (J–K)', mult: 4.0 },
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
    const d = drawRandomCard();
    const t = drawRandomCard();
    const winner = d.value > t.value ? 'dragon' : t.value > d.value ? 'tiger' : 'tie';
    return {
      won: winner === pick,
      visual: { type: 'cards', items: [{ label: 'Dragon', card: d }, { label: 'Tiger', card: t }] },
      resultText: `Dragon ${d.rank}${d.suit} vs Tiger ${t.rank}${t.suit} → ${winner.toUpperCase()} wins`,
    };
  }
  if (engine === 'andar-bahar') {
    const joker = drawRandomCard();
    const winner = Math.random() < 0.5 ? 'andar' : 'bahar';
    const matchCard = { ...joker, suit: SUITS[(SUITS.indexOf(joker.suit) + 1) % 4] };
    return {
      won: winner === pick,
      visual: { type: 'cards', items: [{ label: 'Center Card', card: joker }, { label: winner.toUpperCase(), card: matchCard }] },
      resultText: `Matched ${joker.rank} on ${winner.toUpperCase()} side`,
    };
  }
  if (engine === 'baccarat') {
    const p1 = drawRandomCard();
    const b1 = drawRandomCard();
    const pScore = (p1.value >= 10 ? 0 : p1.value) % 10;
    const bScore = (b1.value >= 10 ? 0 : b1.value) % 10;
    const winner = pScore > bScore ? 'player' : bScore > pScore ? 'banker' : 'tie';
    return {
      won: winner === pick,
      visual: { type: 'cards', items: [{ label: `Player (${pScore})`, card: p1 }, { label: `Banker (${bScore})`, card: b1 }] },
      resultText: `Player ${pScore} vs Banker ${bScore} → ${winner.toUpperCase()}`,
    };
  }
  if (engine === 'lucky7') {
    const c = drawRandomCard();
    const num = c.value === 14 ? 1 : c.value;
    const winner = num < 7 ? 'low' : num === 7 ? 'seven' : 'high';
    return {
      won: winner === pick,
      visual: { type: 'cards', items: [{ label: 'Drawn Card', card: c }] },
      resultText: `Card drawn: ${c.rank}${c.suit} (${winner.toUpperCase()})`,
    };
  }
  if (engine === '32cards') {
    const base = [8, 9, 10, 11];
    const hands = base.map((b) => {
      const c = drawRandomCard();
      return { key: `p${b}`, label: `P${b} (${b + c.value})`, total: b + c.value, card: c };
    });
    const best = hands.reduce((a, b) => (b.total > a.total ? b : a), hands[0]);
    return {
      won: best.key === pick,
      visual: { type: 'cards', items: hands.map((h) => ({ label: h.label, card: h.card })) },
      resultText: `Highest total: ${best.label}`,
    };
  }
  if (engine === 'roulette') {
    const n = Math.floor(Math.random() * 37);
    const color = n === 0 ? 'zero' : n % 2 === 0 ? 'black' : 'red';
    return {
      won: color === pick,
      visual: { type: 'badge', big: String(n), sub: color.toUpperCase() },
      resultText: `Wheel landed on ${n} (${color.toUpperCase()})`,
    };
  }
  if (engine === 'dice') {
    const d1 = 1 + Math.floor(Math.random() * 6);
    const d2 = 1 + Math.floor(Math.random() * 6);
    const d3 = 1 + Math.floor(Math.random() * 6);
    const sum = d1 + d2 + d3;
    const isTriple = d1 === d2 && d2 === d3;
    const winner = isTriple ? 'triple' : sum <= 10 ? 'small' : 'big';
    return {
      won: winner === pick,
      visual: { type: 'badge', big: `${d1} · ${d2} · ${d3}`, sub: `TOTAL ${sum}` },
      resultText: `Dice rolled ${d1}-${d2}-${d3} (Total ${sum} · ${winner.toUpperCase()})`,
    };
  }
  if (engine === 'cricket') {
    const outcomes = [
      { key: 'dot', label: 'WICKET / DOT', big: '0 / W' },
      { key: 'runs', label: '2 RUNS', big: '2' },
      { key: 'runs', label: '1 RUN', big: '1' },
      { key: 'boundary', label: 'FOUR!', big: '4' },
      { key: 'boundary', label: 'SIX!', big: '6' },
    ];
    const hit = outcomes[Math.floor(Math.random() * outcomes.length)];
    return {
      won: hit.key === pick,
      visual: { type: 'badge', big: hit.big, sub: hit.label },
      resultText: `Ball outcome: ${hit.label}`,
    };
  }
  if (engine === 'football') {
    const scored = Math.random() < 0.5;
    const winner = scored ? 'goal' : 'save';
    return {
      won: winner === pick,
      visual: { type: 'badge', big: scored ? 'GOAL!' : 'SAVED', sub: scored ? 'Top Corner' : 'Keeper Stop' },
      resultText: scored ? 'Penalty converted — GOAL!' : 'Goalkeeper blocked the strike!',
    };
  }
  if (engine === 'matka') {
    const n = Math.floor(Math.random() * 10);
    const isLucky = n === 7 || n === 9;
    const won = pick === 'lucky9' ? isLucky : pick === 'even' ? n % 2 === 0 : n % 2 === 1;
    return {
      won,
      visual: { type: 'badge', big: String(n), sub: n % 2 === 0 ? 'EVEN' : 'ODD' },
      resultText: `Winning Matka Digit: ${n}`,
    };
  }
  if (engine === 'bollywood') {
    const c = drawRandomCard();
    const num = c.value === 14 ? 1 : c.value;
    const winner = num <= 6 ? 'amar' : num <= 10 ? 'akbar' : 'anthony';
    return {
      won: winner === pick,
      visual: { type: 'cards', items: [{ label: winner.toUpperCase(), card: c }] },
      resultText: `Card ${c.rank}${c.suit} → ${winner.toUpperCase()}`,
    };
  }
  const a = drawRandomCard();
  const b = drawRandomCard();
  const winner = a.value >= b.value ? 'playerA' : 'playerB';
  return {
    won: winner === pick,
    visual: { type: 'cards', items: [{ label: 'Player A', card: a }, { label: 'Player B', card: b }] },
    resultText: `Player A (${a.rank}${a.suit}) vs Player B (${b.rank}${b.suit}) → ${winner === 'playerA' ? 'Player A' : 'Player B'} wins`,
  };
}

/** Crisp illustrated SVG motif inside each game poster tile */
function GamePosterArt({ game }) {
  const { theme, engine } = game;

  if (theme === 'baccarat-seal' || theme === 'baccarat-ring') {
    return (
      <svg viewBox="0 0 120 110" className="ex-tile-svg" aria-hidden="true">
        <circle cx="60" cy="55" r="42" fill="none" stroke="#f5c451" strokeWidth={theme === 'baccarat-seal' ? 6 : 3.5} strokeDasharray={theme === 'baccarat-ring' ? '4 3' : 'none'} />
        <circle cx="60" cy="55" r="33" fill="rgba(0,0,0,0.55)" stroke="#d99a26" strokeWidth="1.5" />
        <path d="M46 39 L53 31 L60 38 L67 31 L74 39 L71 45 L49 45 Z" fill="#f5c451" />
        <text x="60" y="61" textAnchor="middle" fill="#fde68a" fontSize="11.5" fontWeight="800" fontFamily="Barlow Condensed, sans-serif">
          {theme === 'baccarat-seal' ? 'BACCARAT' : 'ONLINE'}
        </text>
        {theme === 'baccarat-ring' && (
          <text x="60" y="73" textAnchor="middle" fill="#f5c451" fontSize="10" fontWeight="800" fontFamily="Barlow Condensed, sans-serif">
            BACCARAT
          </text>
        )}
      </svg>
    );
  }

  if (engine === 'dragon-tiger') {
    return (
      <svg viewBox="0 0 120 110" className="ex-tile-svg" aria-hidden="true">
        <circle cx="60" cy="58" r="24" fill="rgba(255,200,40,0.22)" stroke="#fbbf24" strokeWidth="1.5" />
        <g transform="translate(22, 34)">
          <path d="M8 22 C4 12, 16 4, 28 8 C24 14, 28 18, 22 24 C16 26, 10 26, 8 22 Z" fill="#ffffff" opacity="0.95" />
          <circle cx="20" cy="13" r="1.8" fill="#0d5b2d" />
        </g>
        <g transform="translate(64, 34)">
          <circle cx="18" cy="16" r="13" fill="#ffffff" opacity="0.95" />
          <path d="M10 12 L15 15 M26 12 L21 15 M14 21 L22 21" stroke="#0d5b2d" strokeWidth="2" strokeLinecap="round" />
        </g>
        <rect x="26" y="76" width="24" height="28" rx="3" fill="#ffffff" transform="rotate(-12 38 90)" />
        <rect x="70" y="76" width="24" height="28" rx="3" fill="#ffffff" transform="rotate(12 82 90)" />
        <text x="38" y="94" textAnchor="middle" fill="#dc2626" fontSize="12" fontWeight="800">A♥</text>
        <text x="82" y="94" textAnchor="middle" fill="#111827" fontSize="12" fontWeight="800">K♠</text>
      </svg>
    );
  }

  if (engine === 'andar-bahar') {
    return (
      <svg viewBox="0 0 120 110" className="ex-tile-svg" aria-hidden="true">
        <polygon points="18,46 42,36 42,42 96,42 96,50 42,50 42,56" fill="#ef4444" />
        <text x="64" y="49" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="800">ANDAR</text>
        <polygon points="102,72 78,62 78,68 24,68 24,76 78,76 78,82" fill="#facc15" />
        <text x="56" y="75" textAnchor="middle" fill="#111111" fontSize="9.5" fontWeight="800">BAHAR</text>
      </svg>
    );
  }

  if (engine === 'roulette') {
    return (
      <svg viewBox="0 0 120 110" className="ex-tile-svg" aria-hidden="true">
        <circle cx="60" cy="54" r="38" fill="#1f1410" stroke="#eab308" strokeWidth="4" />
        <circle cx="60" cy="54" r="28" fill="none" stroke="#dc2626" strokeWidth="8" strokeDasharray="11 11" />
        <circle cx="60" cy="54" r="28" fill="none" stroke="#111827" strokeWidth="8" strokeDasharray="11 11" strokeDashoffset="11" />
        <circle cx="60" cy="54" r="14" fill="#ca8a04" stroke="#fef08a" strokeWidth="2" />
        <circle cx="60" cy="54" r="4" fill="#ffffff" />
      </svg>
    );
  }

  if (engine === 'dice') {
    return (
      <svg viewBox="0 0 120 110" className="ex-tile-svg" aria-hidden="true">
        <rect x="26" y="38" width="32" height="32" rx="6" fill="#dc2626" stroke="#fca5a5" strokeWidth="1.5" transform="rotate(-10 42 54)" />
        <circle cx="35" cy="48" r="2.6" fill="#ffffff" />
        <circle cx="48" cy="59" r="2.6" fill="#ffffff" />
        <circle cx="42" cy="54" r="2.6" fill="#ffffff" />
        <rect x="60" y="42" width="32" height="32" rx="6" fill="#b91c1c" stroke="#fde047" strokeWidth="1.5" transform="rotate(12 76 58)" />
        <circle cx="70" cy="51" r="2.5" fill="#ffffff" />
        <circle cx="82" cy="51" r="2.5" fill="#ffffff" />
        <circle cx="70" cy="63" r="2.5" fill="#ffffff" />
        <circle cx="82" cy="63" r="2.5" fill="#ffffff" />
      </svg>
    );
  }

  if (engine === 'cricket') {
    return (
      <svg viewBox="0 0 120 110" className="ex-tile-svg" aria-hidden="true">
        <ellipse cx="60" cy="86" rx="48" ry="18" fill="rgba(22,163,74,0.6)" />
        <rect x="48" y="48" width="3.5" height="36" fill="#fde047" />
        <rect x="58" y="48" width="3.5" height="36" fill="#fde047" />
        <rect x="68" y="48" width="3.5" height="36" fill="#fde047" />
        <rect x="47" y="46" width="26" height="3" fill="#f59e0b" />
        <circle cx="32" cy="66" r="10" fill="#dc2626" stroke="#fecaca" strokeWidth="1.5" />
        <path d="M24 62 Q32 66 40 70" stroke="#ffffff" strokeWidth="1.3" strokeDasharray="2 2" fill="none" />
      </svg>
    );
  }

  if (engine === 'football') {
    return (
      <svg viewBox="0 0 120 110" className="ex-tile-svg" aria-hidden="true">
        <rect x="16" y="28" width="88" height="58" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2.5" />
        <line x1="38" y1="28" x2="38" y2="86" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
        <line x1="60" y1="28" x2="60" y2="86" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
        <line x1="82" y1="28" x2="82" y2="86" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
        <circle cx="60" cy="62" r="19" fill="#ffffff" stroke="#111827" strokeWidth="2" />
        <polygon points="60,51 68,57 65,67 55,67 52,57" fill="#111827" />
      </svg>
    );
  }

  if (engine === 'matka') {
    return (
      <svg viewBox="0 0 120 110" className="ex-tile-svg" aria-hidden="true">
        <ellipse cx="60" cy="70" rx="28" ry="22" fill="#92400e" stroke="#f59e0b" strokeWidth="2.5" />
        <ellipse cx="60" cy="48" rx="18" ry="6" fill="#78350f" stroke="#fbbf24" strokeWidth="2" />
        <circle cx="52" cy="44" r="5" fill="#fde047" />
        <circle cx="61" cy="42" r="5.5" fill="#facc15" />
        <circle cx="69" cy="45" r="4.5" fill="#fde047" />
      </svg>
    );
  }

  if (engine === 'lucky7') {
    return (
      <svg viewBox="0 0 120 110" className="ex-tile-svg" aria-hidden="true">
        <text x="60" y="76" textAnchor="middle" fill="#fde047" stroke="#92400e" strokeWidth="2" fontSize="54" fontWeight="900" fontFamily="Barlow Condensed, sans-serif">
          777
        </text>
      </svg>
    );
  }

  // Default: Crisp Fan of Playing Cards (Teenpatti / Poker / 32 Cards / Bollywood)
  return (
    <svg viewBox="0 0 120 110" className="ex-tile-svg" aria-hidden="true">
      <g transform="rotate(-14 44 68)">
        <rect x="24" y="42" width="36" height="50" rx="4" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" />
        <text x="32" y="56" fill="#111827" fontSize="13" fontWeight="800">A</text>
        <text x="42" y="76" textAnchor="middle" fill="#111827" fontSize="20">♠</text>
      </g>
      <g transform="rotate(4 62 66)">
        <rect x="44" y="38" width="36" height="50" rx="4" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" />
        <text x="52" y="52" fill="#dc2626" fontSize="13" fontWeight="800">A</text>
        <text x="62" y="72" textAnchor="middle" fill="#dc2626" fontSize="20">♥</text>
      </g>
      <g transform="rotate(18 80 70)">
        <rect x="64" y="42" width="36" height="50" rx="4" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" />
        <text x="72" y="56" fill="#111827" fontSize="13" fontWeight="800">A</text>
        <text x="82" y="76" textAnchor="middle" fill="#111827" fontSize="20">♣</text>
      </g>
    </svg>
  );
}

function InstantGameModal({ game, onClose }) {
  const { state, playInstantGameRound } = useArena();
  const options = useMemo(() => getEngineOptions(game.engine), [game.engine]);
  const [pick, setPick] = useState(options[0].key);
  const [stake, setStake] = useState(100);
  const [roundResult, setRoundResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

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
    const payout = outcome.won ? Math.round(numStake * chosen.mult) : 0;
    const txRes = playInstantGameRound({
      gameName: game.title,
      stake: numStake,
      payout,
      won: outcome.won,
      summary: outcome.resultText,
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
      <div className="sz-card w-100" style={{ maxWidth: 560, backgroundColor: '#11141B', borderColor: 'var(--sz-border-strong)' }}>
        <div className="d-flex align-items-center justify-content-between pb-3 mb-3" style={{ borderBottom: '1px solid var(--sz-border)' }}>
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

        {/* Visual Table Arena */}
        <div
          className="rounded p-3 mb-3 text-center"
          style={{
            background: 'radial-gradient(circle at center, #0e4a2b 0%, #072214 100%)',
            border: '2px solid rgba(245, 196, 81, 0.35)',
            minHeight: 148,
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
                  {roundResult.visual.items.map((item, i) => (
                    <div key={i} className="text-center">
                      <div className="small text-white-50 mb-1" style={{ fontSize: '0.72rem' }}>
                        {item.label}
                      </div>
                      <div
                        className="rounded d-flex flex-column align-items-center justify-content-center fw-bold shadow"
                        style={{
                          width: 58,
                          height: 78,
                          backgroundColor: '#ffffff',
                          color: item.card.isRed ? '#dc2626' : '#111827',
                          fontSize: '1.2rem',
                        }}
                      >
                        <span>{item.card.rank}</span>
                        <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>{item.card.suit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-2">
                  <div className="sz-mono fw-bold display-5 text-white">{roundResult.visual.big}</div>
                  <div className="small fw-bold" style={{ color: '#fde047' }}>{roundResult.visual.sub}</div>
                </div>
              )}

              <div
                className="fw-bold small mt-1"
                style={{ color: roundResult.won ? '#20D98B' : '#f87171' }}
              >
                {roundResult.resultText} —{' '}
                {roundResult.won
                  ? `YOU WON +${formatCoins(roundResult.payout)} COINS!`
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
          <span className="small sz-muted">Demo localStorage virtual coins only</span>
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
              <div className="ex-tile-poster-title">{game.posterTitle}</div>
              <GamePosterArt game={game} />
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
