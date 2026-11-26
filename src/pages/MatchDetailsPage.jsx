import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FiChevronDown,
  FiChevronRight,
  FiChevronUp,
  FiInfo,
  FiRefreshCw,
  FiX,
} from 'react-icons/fi';
import {
  getFixtureById,
  getFixtureEvents,
  getFixtureH2H,
  getFixtureH2HFixtures,
  getFixtureLineups,
  getFixtureOdds,
  getFixturePlayByPlay,
  getFixtureScorecard,
  getFixtureStatistics,
} from '../services/sportsApi';
import EntityImage from '../components/EntityImage';
import ExchangeRulesModal from '../components/ExchangeRulesModal';
import { ApiErrorCard, EmptyStateCard, LoadingTableSkeleton } from '../components/StateBlocks';
import { useArena } from '../context/ArenaContext';
import { classifyFixtureStatus } from '../utils/marketRulesEngine';
import {
  calculateMarketCashout,
  computeMarketBook,
  isBookmakerMarket,
  isFancyMarket,
} from '../utils/exchangeCashout';
import {
  computeLiveExchangeOdds,
  formatDateTimeShort,
  formatSportName,
  getPeriodPairs,
  getScoreText,
  getTeamDisplayName,
  isFinishedFixture,
  isLiveFixture,
} from '../utils/formatters';

function formatHeaderDateTime(iso) {
  if (!iso) return '--/--/---- --:--:--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--/--/---- --:--:--';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function getShortCode(team, fallback = 'TM') {
  if (!team) return fallback;
  if (team.nameCode) return String(team.nameCode).toUpperCase().slice(0, 6);
  if (team.shortName && team.shortName.length <= 6) return team.shortName.toUpperCase();
  const name = getTeamDisplayName(team, fallback);
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0] + (words[2]?.[0] || '')).toUpperCase();
  }
  return name.slice(0, 3).toUpperCase();
}

function formatTossNote(fixture, homeName, awayName) {
  const toss = fixture?.cricket?.toss;
  if (toss) {
    if (typeof toss === 'string') return toss;
    if (typeof toss === 'object') {
      const winnerRaw = String(toss.winner || '').toLowerCase();
      const winnerTeam =
        winnerRaw === 'home'
          ? homeName
          : winnerRaw === 'away'
          ? awayName
          : toss.winner || homeName;
      const decision = toss.decision ? ` and chose to ${toss.decision}` : '';
      return `${winnerTeam} won the toss${decision}`;
    }
  }
  if (fixture?.status?.description) {
    return fixture.status.description;
  }
  return `${homeName} vs ${awayName} · ${fixture?.league?.name || formatSportName(fixture?.sport)}`;
}

function formatCountdown(startIso, nowMs) {
  if (!startIso) return '00:00:00';
  const target = new Date(startIso).getTime();
  if (Number.isNaN(target) || target <= nowMs) return '00:00:00';
  const diffSec = Math.floor((target - nowMs) / 1000);
  const hrs = Math.floor(diffSec / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  const secs = diffSec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}

function parseCricketInningsDetail(scoreObj) {
  if (!scoreObj || !scoreObj.innings || typeof scoreObj.innings !== 'object') return null;
  const list = Object.values(scoreObj.innings).filter((x) => x && typeof x === 'object');
  if (!list.length) return null;
  const last = list[list.length - 1];
  const runs = Number(last.score ?? last.runs);
  const wkts = last.wickets !== undefined && last.wickets !== null ? Number(last.wickets) : null;
  const oversRaw = last.overs ? String(last.overs) : '';
  const oversNum = parseFloat(oversRaw);
  let crr = null;
  if (!Number.isNaN(runs) && oversNum > 0) {
    const whole = Math.floor(oversNum);
    const balls = Math.round((oversNum - whole) * 10);
    const trueOvers = whole + balls / 6;
    if (trueOvers > 0) crr = (runs / trueOvers).toFixed(2);
  }
  return {
    runs: Number.isNaN(runs) ? null : runs,
    wickets: wkts,
    overs: oversRaw,
    crr,
    display:
      !Number.isNaN(runs)
        ? `${runs}${wkts !== null && !Number.isNaN(wkts) ? `/${wkts}` : ''}`
        : null,
  };
}

function buildOverTimeline(fixture, liveScoreOvers) {
  if (fixture?.sport !== 'cricket' || !isLiveFixture(fixture)) return [];
  const currOv = Math.max(4, Math.floor(parseFloat(liveScoreOvers || '19')) || 19);
  const seed = Number(String(fixture?.id || '77').replace(/\D/g, '').slice(-4)) || 77;
  const presets = [
    ['4', '1', '0'],
    ['4', '2', '1', '1', '0', '0'],
    ['4', '0', '0', '5WD', 'WD', '0', '1', '0'],
    ['0', 'W', '4', '1', '6', '2'],
    ['1', '0', '4', '0', '1', '0'],
  ];
  return [0, 1, 2, 3].map((offset) => {
    const balls = presets[(seed + offset) % presets.length];
    const total = balls.reduce((sum, b) => {
      if (b === 'W') return sum;
      if (b === 'WD' || b === 'NB') return sum + 1;
      const m = String(b).match(/^(\d+)/);
      return sum + (m ? Number(m[1]) : 0);
    }, 0);
    return {
      overNum: Math.max(1, currOv - offset),
      runs: total,
      balls,
    };
  });
}

function tickStep(price) {
  if (price < 2) return 0.01;
  if (price < 3) return 0.02;
  if (price < 5) return 0.05;
  if (price < 10) return 0.2;
  if (price < 20) return 0.5;
  return 1.0;
}

function roundOdd(val) {
  if (val >= 10) return Math.round(val);
  if (val >= 5) return Number(val.toFixed(1));
  return Number(val.toFixed(2));
}

function buildExchangeLadder(baseOdd, seedNum) {
  const safeBase = Math.max(1.03, Number(baseOdd) || 1.95);
  const step = tickStep(safeBase);
  const b1 = roundOdd(safeBase);
  const b2 = roundOdd(Math.max(1.01, b1 - step));
  const b3 = roundOdd(Math.max(1.01, b2 - step));
  const l1 = roundOdd(b1 + step);
  const l2 = roundOdd(l1 + step);
  const l3 = roundOdd(l2 + step);

  const vol = (offset) => {
    const raw = ((seedNum * 173 + offset * 911) % 8800) + 120;
    return raw > 1000 ? (raw / 1.15).toFixed(2) : (raw / 3.2).toFixed(2);
  };

  return {
    backs: [
      { price: b3, vol: vol(1), level: 3 },
      { price: b2, vol: vol(2), level: 2 },
      { price: b1, vol: vol(3), level: 1 },
    ],
    lays: [
      { price: l1, vol: vol(4), level: 1 },
      { price: l2, vol: vol(5), level: 2 },
      { price: l3, vol: vol(6), level: 3 },
    ],
  };
}

function buildNormalSessionMarkets(fixture, homeCode, awayCode, lineupNames = [], battingRuns = null) {
  const sport = fixture?.sport || 'cricket';
  const seed = Number(String(fixture?.id || '101').replace(/\D/g, '').slice(-4)) || 101;
  const p1 = lineupNames[0] || `${awayCode} Batter 1`;
  const p2 = lineupNames[1] || `${awayCode} Batter 2`;

  if (sport === 'cricket') {
    const baseRun = battingRuns !== null && battingRuns > 20 ? battingRuns : 150 + (seed % 18);
    const over20 = baseRun + 6;
    const p1Base = 16 + (seed % 18);
    const p2Base = 14 + (seed % 14);

    return {
      left: [
        {
          id: 'n-l1',
          name: `20 over run ${awayCode} adv`,
          rows: [{ no: over20, noRate: 100, yes: over20 + 1, yesRate: 100 }],
          min: '100',
          max: '5L',
        },
        {
          id: 'n-l2',
          name: `20 over run bhav ${awayCode} adv`,
          rows: [{ no: over20, noRate: 80, yes: over20, yesRate: 60 }],
          min: '100',
          max: '3L',
        },
        {
          id: 'n-l3',
          name: `20 over run bhav ${awayCode} 3 adv`,
          rows: [{ no: over20 - 1, noRate: 50, yes: over20 - 1, yesRate: 35 }],
          min: '100',
          max: '2L',
        },
        {
          id: 'n-l4',
          name: `${p1} run`,
          rows: [{ no: p1Base, noRate: 110, yes: p1Base, yesRate: 90 }],
          min: '100',
          max: '1L',
        },
      ],
      right: [
        {
          id: 'n-r1',
          name: `20 over run ${awayCode} 2 adv`,
          rows: [{ no: over20, noRate: 100, yes: over20 + 1, yesRate: 100 }],
          min: '100',
          max: '1L',
        },
        {
          id: 'n-r2',
          name: `20 over run bhav ${awayCode} 2 adv`,
          rows: [{ no: over20, noRate: 70, yes: over20, yesRate: 50 }],
          min: '100',
          max: '3L',
        },
        {
          id: 'n-r3',
          name: `${p2} run`,
          rows: [{ no: p2Base, noRate: 110, yes: p2Base, yesRate: 90 }],
          min: '100',
          max: '1L',
        },
      ],
    };
  }

  return {
    left: [
      {
        id: 'n-l1',
        name: `1st Half Total ${homeCode} v ${awayCode}`,
        rows: [{ no: 1, noRate: 105, yes: 2, yesRate: 95 }],
        min: '100',
        max: '2L',
      },
      {
        id: 'n-l2',
        name: `${homeCode} Total Line`,
        badge: 'Badla',
        rows: [{ no: 2, noRate: 100, yes: 3, yesRate: 100 }],
        min: '100',
        max: '1L',
      },
      {
        id: 'n-l3',
        name: `${homeCode} Corners / Points`,
        rows: [{ no: 5, noRate: 100, yes: 6, yesRate: 100 }],
        min: '100',
        max: '50K',
      },
    ],
    right: [
      {
        id: 'n-r1',
        name: 'Total Match Score Line',
        rows: [
          { no: 3, noRate: 100, yes: 4, yesRate: 100 },
          { no: 3, noRate: 110, yes: 3, yesRate: 85 },
        ],
        min: '100',
        max: '50K',
      },
      {
        id: 'n-r2',
        name: `${awayCode} Total Line`,
        rows: [{ no: 1, noRate: 110, yes: 2, yesRate: 90 }],
        min: '100',
        max: '1L',
      },
      {
        id: 'n-r3',
        name: 'Match Specials Line',
        rows: [{ no: 4, noRate: 105, yes: 5, yesRate: 95 }],
        min: '100',
        max: '50K',
      },
    ],
  };
}

function buildOverByOverMarkets(fixture, awayCode, currentOversStr) {
  const sport = fixture?.sport || 'cricket';
  const currOv = Math.max(6, Math.min(20, Math.ceil(parseFloat(currentOversStr || '19.3') || 19.3)));
  const prevOv = Math.max(1, currOv - 2);

  if (sport === 'cricket') {
    return {
      left: [
        {
          id: 'obo-l1',
          name: `Only ${prevOv} over run ${awayCode}`,
          suspended: true,
          rows: [{ no: 8, noRate: 100, yes: 9, yesRate: 100 }],
          min: '100',
          max: '1L',
        },
        {
          id: 'obo-l2',
          name: `Only ${currOv} over run ${awayCode}`,
          rows: [{ no: 9, noRate: 105, yes: 10, yesRate: 95 }],
          min: '100',
          max: '1L',
        },
      ],
      right: [
        {
          id: 'obo-r1',
          name: `Only ${currOv} over boundaries ${awayCode}`,
          rows: [{ no: 2, noRate: 130, yes: 2, yesRate: 80 }],
          min: '100',
          max: '50K',
        },
        {
          id: 'obo-r2',
          name: `Only ${currOv} over sixes ${awayCode}`,
          rows: [{ no: 1, noRate: 120, yes: 1, yesRate: 85 }],
          min: '100',
          max: '25K',
        },
      ],
    };
  }

  return {
    left: [
      {
        id: 'obo-l1',
        name: `Next 10 Min Points / Goals`,
        rows: [{ no: 1, noRate: 110, yes: 1, yesRate: 90 }],
        min: '100',
        max: '1L',
      },
    ],
    right: [
      {
        id: 'obo-r1',
        name: `Current Period Total Line`,
        rows: [{ no: 2, noRate: 115, yes: 2, yesRate: 85 }],
        min: '100',
        max: '50K',
      },
    ],
  };
}

function buildBallByBallMarkets(fixture, awayCode, currentOversStr) {
  const sport = fixture?.sport || 'cricket';
  const rawOv = String(currentOversStr || '19.3');
  const [ovPart, ballPart] = rawOv.split('.');
  const overNum = Math.max(1, Number(ovPart) || 19);
  const nextBall = Math.min(6, (Number(ballPart) || 3) + 1);
  const afterBall = nextBall < 6 ? nextBall + 1 : 1;
  const afterOver = nextBall < 6 ? overNum : overNum + 1;

  if (sport === 'cricket') {
    return {
      left: [
        {
          id: 'bbb-l1',
          name: `Over ${overNum} Ball ${nextBall} run ${awayCode}`,
          rows: [{ no: 1, noRate: 110, yes: 2, yesRate: 95 }],
          min: '100',
          max: '25K',
        },
        {
          id: 'bbb-l2',
          name: `Over ${overNum} Ball ${nextBall} boundary`,
          rows: [{ no: 1, noRate: 165, yes: 1, yesRate: 55 }],
          min: '100',
          max: '25K',
        },
      ],
      right: [
        {
          id: 'bbb-r1',
          name: `Over ${afterOver} Ball ${afterBall} run ${awayCode}`,
          rows: [{ no: 1, noRate: 105, yes: 2, yesRate: 95 }],
          min: '100',
          max: '25K',
        },
        {
          id: 'bbb-r2',
          name: `Next Ball Dot / Wicket ${awayCode}`,
          rows: [{ no: 1, noRate: 120, yes: 1, yesRate: 80 }],
          min: '100',
          max: '25K',
        },
      ],
    };
  }

  return {
    left: [
      {
        id: 'bbb-l1',
        name: `Next Play Score / Event`,
        rows: [{ no: 1, noRate: 120, yes: 1, yesRate: 80 }],
        min: '100',
        max: '25K',
      },
    ],
    right: [
      {
        id: 'bbb-r1',
        name: `Next Set / Drive Boundary`,
        rows: [{ no: 1, noRate: 130, yes: 1, yesRate: 75 }],
        min: '100',
        max: '25K',
      },
    ],
  };
}

const DEFAULT_TEN_STAKES = [
  { label: '1k', value: 1000 },
  { label: '2k', value: 2000 },
  { label: '5k', value: 5000 },
  { label: '10k', value: 10000 },
  { label: '20k', value: 20000 },
  { label: '25k', value: 25000 },
  { label: '50k', value: 50000 },
  { label: '75k', value: 75000 },
  { label: '90k', value: 90000 },
  { label: '95k', value: 95000 },
];

const MOBILE_QUICK_STAKES = [
  { label: '100', value: 100 },
  { label: '250', value: 250 },
  { label: '500', value: 500 },
  { label: '1K', value: 1000 },
  { label: '2.5K', value: 2500 },
  { label: '5K', value: 5000 },
  { label: '10K', value: 10000 },
  { label: '25K', value: 25000 },
  { label: '50K', value: 50000 },
];

function parseMarketLimit(raw, fallback) {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const s = String(raw || '').trim().toUpperCase();
  if (!s) return fallback;
  if (s.endsWith('L')) {
    const n = parseFloat(s.slice(0, -1));
    return Number.isFinite(n) ? Math.round(n * 100000) : fallback;
  }
  if (s.endsWith('K')) {
    const n = parseFloat(s.slice(0, -1));
    return Number.isFinite(n) ? Math.round(n * 1000) : fallback;
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function formatMoneyNum(val) {
  const n = Number(val) || 0;
  return Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function MatchDetailsPage() {
  const { id } = useParams();
  const {
    state,
    placeExchangeBet,
    executeMarketCashout,
    settleExchangeBetsForFixture,
    getExchangeBetsForFixture,
  } = useArena();

  const [fixture, setFixture] = useState(null);
  const [oddsData, setOddsData] = useState(null);
  const [lineupPlayers, setLineupPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const [liveTick, setLiveTick] = useState(0);

  // Mobile-only (<= 768px) detection & bottom-sheet animation state (Desktop remains 100% untouched)
  const [isMobileView, setIsMobileView] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false
  );
  const [mobileSheetVisible, setMobileSheetVisible] = useState(false);

  // Right-side Live Match panel & Place Bet slip (exact layout from reference screenshot)
  const [liveBoxOpen, setLiveBoxOpen] = useState(false);
  const [liveEvents, setLiveEvents] = useState([]);
  const [liveEventsLoaded, setLiveEventsLoaded] = useState(false);
  const [slip, setSlip] = useState(null);
  const [oddsInput, setOddsInput] = useState('');
  const [stakeInput, setStakeInput] = useState('500');
  const [slipError, setSlipError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Expandable full SportsAPI Match Insights drawer (via chevron on scoreboard ribbon)
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [insightTab, setInsightTab] = useState('statistics');
  const [insightData, setInsightData] = useState({});
  const [insightLoading, setInsightLoading] = useState(false);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);

  async function loadFixture(forceRefresh = false) {
    setLoading(true);
    setError(null);
    try {
      const [fxRes, oddsRes] = await Promise.allSettled([
        getFixtureById(id, { forceRefresh }),
        getFixtureOdds(id, { forceRefresh }),
      ]);
      if (fxRes.status === 'fulfilled' && fxRes.value?.data) {
        const fxData = fxRes.value.data;
        setFixture(fxData);
        // Automatically settle open bets ONLY when SportsAPI confirms match finished/canceled/postponed/abandoned/walkover
        if (classifyFixtureStatus(fxData).isSettleable) {
          settleExchangeBetsForFixture(fxData);
        }
      } else {
        setError(fxRes.reason || new Error('Could not load fixture'));
      }
      if (oddsRes.status === 'fulfilled') {
        setOddsData(oddsRes.value?.data || null);
      } else {
        setOddsData(null);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setSlip(null);
    setMobileSheetVisible(false);
    setSlipError(null);
    setIsSubmitting(false);
    setInsightsOpen(false);
    setInsightData({});
    setLiveBoxOpen(false);
    setLiveEvents([]);
    setLiveEventsLoaded(false);
    setLineupPlayers([]);
    loadFixture(false);
  }, [id]);

  // Listen for <= 768px mobile viewport breakpoint without touching desktop behavior
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(max-width: 768px)');
    const onChange = (e) => setIsMobileView(e.matches);
    setIsMobileView(mq.matches);
    if (mq.addEventListener) {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);

  // Lock background page scroll + support Escape key while Mobile Bottom Sheet is open
  useEffect(() => {
    if (!isMobileView || !slip) {
      setMobileSheetVisible(false);
      return undefined;
    }
    const raf = requestAnimationFrame(() => setMobileSheetVisible(true));
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        closeMobileSheet();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isMobileView, slip]);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Gentle live market rate oscillation for live matches (pauses while editing bet slip)
  useEffect(() => {
    if (!fixture || !isLiveFixture(fixture) || slip) return undefined;
    const t = setInterval(() => {
      setLiveTick((prev) => (prev + 1) % 6);
    }, 4500);
    return () => clearInterval(t);
  }, [fixture, slip]);

  useEffect(() => {
    if (!liveBoxOpen || liveEventsLoaded || !fixture?.id) return;
    let active = true;
    async function fetchLiveFeed() {
      try {
        const [evRes, pbpRes] = await Promise.allSettled([
          getFixtureEvents(fixture.id),
          getFixturePlayByPlay(fixture.id),
        ]);
        if (!active) return;
        const ev = evRes.status === 'fulfilled' ? evRes.value?.data || [] : [];
        const pbp = pbpRes.status === 'fulfilled' ? pbpRes.value?.data || [] : [];
        setLiveEvents(ev.length ? ev : pbp);
      } finally {
        if (active) setLiveEventsLoaded(true);
      }
    }
    fetchLiveFeed();
    return () => {
      active = false;
    };
  }, [liveBoxOpen, liveEventsLoaded, fixture?.id]);

  useEffect(() => {
    if (!insightsOpen || !fixture?.id || insightData[insightTab]) return;
    let active = true;
    async function loadInsight() {
      setInsightLoading(true);
      try {
        if (insightTab === 'statistics') {
          const res = await getFixtureStatistics(fixture.id);
          if (active) setInsightData((p) => ({ ...p, statistics: res?.data || null }));
        } else if (insightTab === 'lineups') {
          const res = await getFixtureLineups(fixture.id);
          const data = res?.data || null;
          if (active) {
            setInsightData((p) => ({ ...p, lineups: data }));
            const awayNames = (data?.away?.players || [])
              .slice(0, 4)
              .map((pl) => pl.player?.name || pl.name)
              .filter(Boolean);
            if (awayNames.length) setLineupPlayers(awayNames);
          }
        } else if (insightTab === 'events') {
          const [evRes, pbpRes] = await Promise.allSettled([
            getFixtureEvents(fixture.id),
            getFixturePlayByPlay(fixture.id),
          ]);
          if (active) {
            setInsightData((p) => ({
              ...p,
              events: {
                events: evRes.status === 'fulfilled' ? evRes.value?.data || [] : [],
                pbp: pbpRes.status === 'fulfilled' ? pbpRes.value?.data || [] : [],
              },
            }));
          }
        } else if (insightTab === 'h2h') {
          const [sumRes, histRes] = await Promise.allSettled([
            getFixtureH2H(fixture.id),
            getFixtureH2HFixtures(fixture.id),
          ]);
          if (active) {
            setInsightData((p) => ({
              ...p,
              h2h: {
                summary: sumRes.status === 'fulfilled' ? sumRes.value?.data : null,
                fixtures: histRes.status === 'fulfilled' ? histRes.value?.data || [] : [],
              },
            }));
          }
        } else if (insightTab === 'scorecard') {
          const res = await getFixtureScorecard(fixture.id);
          if (active) setInsightData((p) => ({ ...p, scorecard: res?.data || null }));
        }
      } catch {
        if (active) setInsightData((p) => ({ ...p, [insightTab]: null }));
      } finally {
        if (active) setInsightLoading(false);
      }
    }
    loadInsight();
    return () => {
      active = false;
    };
  }, [insightsOpen, insightTab, fixture?.id, insightData]);

  const fixtureBets = getExchangeBetsForFixture(id);

  // Merge user custom buttonValues into the 10-button 2x5 grid
  const tenStakeButtons = useMemo(() => {
    const custom = Array.isArray(state.buttonValues) ? state.buttonValues : [];
    return DEFAULT_TEN_STAKES.map((def, i) => custom[i] || def);
  }, [state.buttonValues]);

  const marketConfig = useMemo(() => {
    if (!fixture) return null;
    const homeName = getTeamDisplayName(fixture.home, 'Home');
    const awayName = getTeamDisplayName(fixture.away, 'Away');
    const homeCode = getShortCode(fixture.home, 'HM');
    const awayCode = getShortCode(fixture.away, 'AW');
    const seed = Number(String(fixture.id || '42').replace(/\D/g, '').slice(-5)) || 42;
    const liveOdds = computeLiveExchangeOdds(fixture, oddsData);

    const homeInn = parseCricketInningsDetail(fixture.homeScore);
    const awayInn = parseCricketInningsDetail(fixture.awayScore);
    const activeRuns = awayInn?.runs ?? homeInn?.runs ?? null;

    const liveFlag = isLiveFixture(fixture);
    const tickDeltas = [0, 0.01, -0.01, 0.02, -0.01, 0];
    const bmDeltas = [0, 0.5, -1, 1.5, -0.5, 0];
    const dOdd = liveFlag ? tickDeltas[liveTick % tickDeltas.length] : 0;
    const dBm = liveFlag ? bmDeltas[liveTick % bmDeltas.length] : 0;

    const adjHomeOdd = Math.max(1.03, Number((liveOdds.home + dOdd).toFixed(2)));
    const adjAwayOdd = Math.max(1.03, Number((liveOdds.away - dOdd * 2).toFixed(2)));

    const runners = [
      { key: 'home', name: homeName, ladder: buildExchangeLadder(adjHomeOdd, seed + 11) },
      { key: 'away', name: awayName, ladder: buildExchangeLadder(adjAwayOdd, seed + 29) },
    ];
    if (liveOdds.draw) {
      runners.push({
        key: 'draw',
        name: 'The Draw',
        ladder: buildExchangeLadder(liveOdds.draw, seed + 47),
      });
    }

    // Bookmaker 1 & Bookmaker 2 Bhav prices (e.g., 23 / 24.5 for favorite, 408 / 434 for underdog)
    const favIsHome = adjHomeOdd <= adjAwayOdd;
    const favRateRaw = Math.max(6, Math.min(95, Number(((Math.min(adjHomeOdd, adjAwayOdd) - 1) * 100 + dBm).toFixed(1))));
    const dogRateRaw = Math.max(105, Math.round((Math.max(adjHomeOdd, adjAwayOdd) - 1) * 100 - dBm * 4));
    const bm1FavLay = Number((favRateRaw + 1.5).toFixed(1));
    const bm1DogLay = dogRateRaw + Math.max(14, Math.round(dogRateRaw * 0.065));

    const bookmakerRunners = [
      {
        key: 'home',
        name: homeName,
        back: favIsHome ? favRateRaw : dogRateRaw,
        lay: favIsHome ? bm1FavLay : bm1DogLay,
        vol: favIsHome ? '1500000' : '150000',
      },
      {
        key: 'away',
        name: awayName,
        back: favIsHome ? dogRateRaw : favRateRaw,
        lay: favIsHome ? bm1DogLay : bm1FavLay,
        vol: favIsHome ? '150000' : '1500000',
      },
    ];

    const bm2FavLay = Number((favRateRaw + 1).toFixed(1));
    const bm2DogBack = dogRateRaw + 8;
    const bm2DogLay = bm1DogLay;

    const bookmaker2Runners = [
      {
        key: 'home',
        name: homeName,
        back: favIsHome ? favRateRaw : bm2DogBack,
        lay: favIsHome ? bm2FavLay : bm2DogLay,
        vol: favIsHome ? '100000' : '10000',
      },
      {
        key: 'away',
        name: awayName,
        back: favIsHome ? bm2DogBack : favRateRaw,
        lay: favIsHome ? bm2DogLay : bm2FavLay,
        vol: favIsHome ? '10000' : '100000',
      },
    ];

    const activeOvers = awayInn?.overs || homeInn?.overs || '19.3';
    const normal = buildNormalSessionMarkets(fixture, homeCode, awayCode, lineupPlayers, activeRuns);
    const overByOver = buildOverByOverMarkets(fixture, awayCode, activeOvers);
    const ballByBall = buildBallByBallMarkets(fixture, awayCode, activeOvers);
    const overTimeline = buildOverTimeline(fixture, activeOvers);

    const sportKey = String(fixture.sport || '').toLowerCase();
    const isFootballSport =
      sportKey === 'football' || sportKey === 'soccer' || sportKey === 'esoccer' || sportKey === 'futsal';

    const footballMarkets = isFootballSport
      ? [
          {
            key: 'uo25',
            title: 'Under/Over 2.5 Goals',
            ruleNote: '90 min + stoppage time only. Settled early if already determined before abandonment.',
            runners: [
              { name: 'Over 2.5', ladder: buildExchangeLadder(1.88, seed + 101) },
              { name: 'Under 2.5', ladder: buildExchangeLadder(2.02, seed + 107) },
            ],
          },
          {
            key: 'btts',
            title: 'Both Teams to Score',
            ruleNote: 'Own goals count. Abandoned bets void unless both teams already scored.',
            runners: [
              { name: 'Yes', ladder: buildExchangeLadder(1.84, seed + 113) },
              { name: 'No', ladder: buildExchangeLadder(2.08, seed + 119) },
            ],
          },
          {
            key: 'dnb',
            title: 'Draw No Bet',
            ruleNote: 'Regular time only. In case of a Draw, all bets are void and 100% refunded.',
            runners: [
              { name: homeName, ladder: buildExchangeLadder(Math.max(1.18, Number((liveOdds.home * 0.78).toFixed(2))), seed + 127) },
              { name: awayName, ladder: buildExchangeLadder(Math.max(1.18, Number((liveOdds.away * 0.78).toFixed(2))), seed + 131) },
            ],
          },
          {
            key: 'oddeven',
            title: 'Goals Odd/Even',
            ruleNote: '0-0 settles as EVEN. Abandoned match bets are voided.',
            runners: [
              { name: 'Even', ladder: buildExchangeLadder(1.92, seed + 137) },
              { name: 'Odd', ladder: buildExchangeLadder(1.98, seed + 139) },
            ],
          },
          {
            key: '1st-period',
            title: '1st Period Winner',
            ruleNote: 'First half + stoppage time. Void if match is abandoned before half-time.',
            runners: [
              { name: homeName, ladder: buildExchangeLadder(Math.max(1.5, Number((liveOdds.home * 1.22).toFixed(2))), seed + 149) },
              { name: 'The Draw', ladder: buildExchangeLadder(2.15, seed + 151) },
              { name: awayName, ladder: buildExchangeLadder(Math.max(1.5, Number((liveOdds.away * 1.22).toFixed(2))), seed + 157) },
            ],
          },
          {
            key: 'fh-uo15',
            title: 'First Half Under/Over 1.5 Goals',
            ruleNote: '1st half + stoppage time only. Extra-time & penalties excluded.',
            runners: [
              { name: 'Over 1.5', ladder: buildExchangeLadder(2.65, seed + 163) },
              { name: 'Under 1.5', ladder: buildExchangeLadder(1.52, seed + 167) },
            ],
          },
          {
            key: 'hc-home-1',
            title: `${homeName} +1 Handicap`,
            ruleNote: `+1 virtual goal added to ${homeName} regular-time score.`,
            runners: [
              { name: `${homeName} (+1)`, ladder: buildExchangeLadder(1.42, seed + 173) },
              { name: 'Draw', ladder: buildExchangeLadder(4.2, seed + 179) },
              { name: awayName, ladder: buildExchangeLadder(3.6, seed + 181) },
            ],
          },
          {
            key: 'hc-home-2',
            title: `${homeName} +2 Handicap`,
            ruleNote: `+2 virtual goals added to ${homeName} regular-time score (e.g. 1-3 actual -> 3-3 Draw).`,
            runners: [
              { name: `${homeName} (+2)`, ladder: buildExchangeLadder(1.16, seed + 191) },
              { name: 'Draw', ladder: buildExchangeLadder(6.8, seed + 193) },
              { name: awayName, ladder: buildExchangeLadder(7.4, seed + 197) },
            ],
          },
          {
            key: 'hc-away-1',
            title: `${awayName} +1 Handicap`,
            ruleNote: `+1 virtual goal added to ${awayName} regular-time score.`,
            runners: [
              { name: homeName, ladder: buildExchangeLadder(3.4, seed + 199) },
              { name: 'Draw', ladder: buildExchangeLadder(4.1, seed + 211) },
              { name: `${awayName} (+1)`, ladder: buildExchangeLadder(1.48, seed + 223) },
            ],
          },
          {
            key: 'htft',
            title: 'HT/FT',
            ruleNote: 'Half-Time / Full-Time in regular 90 minutes. Void if abandoned.',
            runners: [
              { name: `${homeName} / ${homeName}`, ladder: buildExchangeLadder(3.1, seed + 227) },
              { name: `Draw / ${homeName}`, ladder: buildExchangeLadder(5.2, seed + 229) },
              { name: 'Draw / Draw', ladder: buildExchangeLadder(5.0, seed + 233) },
              { name: `Draw / ${awayName}`, ladder: buildExchangeLadder(5.8, seed + 239) },
              { name: `${awayName} / ${awayName}`, ladder: buildExchangeLadder(3.8, seed + 241) },
            ],
          },
          {
            key: 'correct-score',
            title: 'Correct Score',
            ruleNote: 'Full regular time (90 min + stoppage) exact score. Settled only at full time.',
            runners: [
              { name: '1-0', ladder: buildExchangeLadder(6.8, seed + 251) },
              { name: '2-0', ladder: buildExchangeLadder(9.4, seed + 257) },
              { name: '2-1', ladder: buildExchangeLadder(8.6, seed + 263) },
              { name: '1-1', ladder: buildExchangeLadder(6.4, seed + 269) },
              { name: '0-0', ladder: buildExchangeLadder(8.8, seed + 271) },
              { name: '0-1', ladder: buildExchangeLadder(7.6, seed + 277) },
              { name: '1-2', ladder: buildExchangeLadder(9.8, seed + 281) },
            ],
          },
        ]
      : [];

    return {
      homeName,
      awayName,
      homeCode,
      awayCode,
      homeInn,
      awayInn,
      runners,
      bookmakerRunners,
      bookmaker2Runners,
      normal,
      overByOver,
      ballByBall,
      overTimeline,
      footballMarkets,
    };
  }, [fixture, oddsData, lineupPlayers, liveTick]);

  if (loading) {
    return (
      <div className="p-2">
        <LoadingTableSkeleton rows={8} />
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-2">
        <ApiErrorCard error={error} onRetry={() => loadFixture(true)} />
      </div>
    );
  }
  if (!fixture || !marketConfig) {
    return (
      <div className="p-2">
        <EmptyStateCard title="Match not found" message="SportsAPI returned no fixture for this ID." />
      </div>
    );
  }

  const {
    homeName,
    awayName,
    homeCode,
    awayCode,
    homeInn,
    awayInn,
    runners,
    bookmakerRunners,
    bookmaker2Runners,
    normal,
    overByOver,
    ballByBall,
    overTimeline,
    footballMarkets,
  } = marketConfig;

  const live = isLiveFixture(fixture);
  const finished = isFinishedFixture(fixture);
  const venueParts = [fixture.venue?.name, fixture.venue?.city, fixture.venue?.country].filter(Boolean);
  const statusLabel = live ? 'LIVE' : finished ? 'FINISHED' : 'Scheduled';
  const matchFormatTag =
    fixture.cricket?.matchType ||
    (fixture.sport === 'cricket' ? 'T20' : formatSportName(fixture.sport));
  const tossLine = formatTossNote(fixture, homeName, awayName);
  const matchTitle = `${homeName} v ${awayName}`;

  function closeMobileSheet() {
    if (isMobileView) {
      setMobileSheetVisible(false);
      setTimeout(() => {
        setSlip(null);
      }, 220);
    } else {
      setSlip(null);
    }
  }

  function openBetSlip({
    market,
    runner,
    side,
    odds,
    rate = null,
    minStake = 100,
    maxStake = 500000,
    marketRunners = null,
    initialStake = '',
    isCashout = false,
    cashoutQuote = null,
  }) {
    if (finished) return;
    setSlipError(null);
    setIsSubmitting(false);
    const resolvedMin = isCashout ? 1 : parseMarketLimit(minStake, market === 'MATCH_ODDS' ? 10 : 100);
    const resolvedMax = parseMarketLimit(maxStake, 1500000);
    setSlip({
      market,
      runner,
      side,
      odds,
      rate,
      minStake: resolvedMin,
      maxStake: resolvedMax,
      marketRunners,
      isCashout,
      cashoutQuote,
    });
    setOddsInput(String(odds));
    setStakeInput(initialStake !== '' && initialStake !== null && initialStake !== undefined ? String(initialStake) : '');
  }

  function computeSlipPreview() {
    if (!slip) {
      return { stake: 0, profit: 0, potentialReturn: 0, liability: 0, exposureDelta: 0, validationError: null };
    }

    const rawStakeStr = String(stakeInput ?? '').trim();
    const parsedStake = rawStakeStr === '' ? NaN : Number(rawStakeStr);
    const parsedOdds = Number(oddsInput);
    const activeOdd = Number.isFinite(parsedOdds) && parsedOdds > 0 ? parsedOdds : 0;
    const s = Number.isFinite(parsedStake) && parsedStake > 0 ? Number(parsedStake.toFixed(2)) : 0;

    let profit = 0;
    let liability = 0;
    let potentialReturn = 0;

    if (s > 0 && activeOdd > 0) {
      if (isFancyMarket(slip.market)) {
        const rateFactor = (Number(slip.rate) || 100) / 100;
        if (slip.side === 'yes') {
          profit = Number((s * rateFactor).toFixed(2));
          liability = s;
          potentialReturn = Number((s + profit).toFixed(2));
        } else {
          profit = s;
          liability = Number((s * rateFactor).toFixed(2));
          potentialReturn = Number((liability + profit).toFixed(2));
        }
      } else if (isBookmakerMarket(slip.market)) {
        const rateFrac = Math.max(0.01, activeOdd / 100);
        if (slip.side === 'back') {
          profit = Number((s * rateFrac).toFixed(2));
          liability = s;
          potentialReturn = Number((s + profit).toFixed(2));
        } else {
          profit = s;
          liability = Number((s * rateFrac).toFixed(2));
          potentialReturn = Number((liability + profit).toFixed(2));
        }
      } else {
        const dec = Math.max(1.01, activeOdd);
        if (slip.side === 'back') {
          profit = Number((s * (dec - 1)).toFixed(2));
          potentialReturn = Number((s * dec).toFixed(2));
          liability = s;
        } else {
          profit = s;
          liability = Number((s * (dec - 1)).toFixed(2));
          potentialReturn = Number((liability + profit).toFixed(2));
        }
      }
    }

    // Calculate true net exposure delta so offsetting Lay/Back hedges & Cashout release exposure cleanly
    let exposureDelta = liability;
    if (s > 0 && activeOdd > 0 && !isFancyMarket(slip.market)) {
      const rNames =
        Array.isArray(slip.marketRunners) && slip.marketRunners.length >= 2
          ? slip.marketRunners
          : runners.map((r) => r.name);
      const prevBook = computeMarketBook(fixtureBets, slip.market, rNames);
      const isMultiLegCashout =
        slip.isCashout &&
        slip.cashoutQuote?.legs?.length > 1 &&
        Math.abs(s - Number(slip.cashoutQuote.primaryLeg?.stake || 0)) < 0.05 &&
        Math.abs(activeOdd - Number(slip.cashoutQuote.primaryLeg?.odds || 0)) < 0.01;
      const hypotheticalLegs = isMultiLegCashout
        ? slip.cashoutQuote.legs
        : [
            {
              market: slip.market,
              runner: slip.runner,
              side: slip.side,
              odds: activeOdd,
              stake: s,
              status: 'matched',
            },
          ];
      const nextBook = computeMarketBook(fixtureBets, slip.market, rNames, hypotheticalLegs);
      exposureDelta = Number((nextBook.worstCaseExposure - prevBook.worstCaseExposure).toFixed(2));
    }

    const minLimit = slip.isCashout ? 1 : slip.minStake || 10;
    const maxLimit = slip.maxStake || 1500000;
    let validationError = null;
    if (!Number.isFinite(parsedOdds) || parsedOdds <= 0) {
      validationError = 'Enter valid odds greater than 0.';
    } else if (!isBookmakerMarket(slip.market) && !isFancyMarket(slip.market) && parsedOdds <= 1) {
      validationError = 'Decimal odds must be greater than 1.00.';
    } else if (rawStakeStr === '') {
      validationError = 'Enter a stake amount.';
    } else if (!Number.isFinite(parsedStake) || parsedStake <= 0) {
      validationError = 'Stake must be greater than 0.';
    } else if (s < minLimit) {
      validationError = `Minimum stake is ${minLimit.toLocaleString()}.`;
    } else if (s > maxLimit) {
      validationError = `Maximum stake is ${maxLimit.toLocaleString()}.`;
    } else if (exposureDelta > state.coins + 0.01) {
      validationError = `Insufficient balance (${Math.round(state.coins).toLocaleString()} available).`;
    }

    return { stake: s, profit, potentialReturn, liability, exposureDelta, validationError };
  }

  async function handleConfirmSlip(e) {
    e.preventDefault();
    if (!slip || isSubmitting) return;
    const calc = computeSlipPreview();
    if (calc.validationError) {
      setSlipError(calc.validationError);
      return;
    }

    setIsSubmitting(true);
    setSlipError(null);
    try {
      const liveCheck = await getFixtureById(fixture.id, { forceRefresh: false }).catch(() => null);
      const latestFx = liveCheck?.data || fixture;
      if (latestFx && isFinishedFixture(latestFx)) {
        setFixture(latestFx);
        settleExchangeBetsForFixture(latestFx);
        setSlipError('Market closed — official match result already confirmed.');
        return;
      }

      const activeOdd = Number(oddsInput) || slip.odds;
      const isMultiLegCashout =
        slip.isCashout &&
        slip.cashoutQuote?.legs?.length > 1 &&
        Math.abs(calc.stake - Number(slip.cashoutQuote.primaryLeg?.stake || 0)) < 0.05 &&
        Math.abs(activeOdd - Number(slip.cashoutQuote.primaryLeg?.odds || 0)) < 0.01;

      if (isMultiLegCashout) {
        const res = executeMarketCashout({
          fixtureId: fixture.id,
          matchTitle,
          market: slip.market,
          legs: slip.cashoutQuote.legs,
          runnerNames: slip.cashoutQuote.runnerNames,
          guaranteedPL: slip.cashoutQuote.guaranteedPL,
        });
        if (!res.ok) {
          setSlipError(res.error);
          return;
        }
        setSlip(null);
        setStakeInput('');
        if (isMobileView) closeMobileSheet();
        return;
      }

      const res = placeExchangeBet({
        fixtureId: fixture.id,
        matchTitle,
        market: slip.market,
        runner: isFancyMarket(slip.market) ? `${slip.runner} / ${slip.rate || 100}` : slip.runner,
        side: slip.side,
        odds: activeOdd,
        rate: slip.rate,
        stake: calc.stake,
        liability: calc.liability,
        potentialProfit: calc.profit,
        potentialReturn: calc.potentialReturn,
        minStake: slip.minStake,
        maxStake: slip.maxStake,
        marketRunners: slip.marketRunners,
        isCashout: Boolean(slip.isCashout),
      });

      if (!res.ok) {
        setSlipError(res.error);
      } else {
        setSlip(null);
        setStakeInput('');
        if (isMobileView) closeMobileSheet();
      }
    } catch (err) {
      setSlipError(err?.message || 'Unable to place bet right now.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Live Cashout Quote Engine for MATCH_ODDS, Bookmaker, and Bookmaker 2
  const matchOddsLiveRunners = runners.map((r) => ({
    name: r.name,
    backOdds: r.ladder.backs[r.ladder.backs.length - 1]?.price ?? null,
    layOdds: r.ladder.lays[0]?.price ?? null,
    suspended: finished,
  }));

  const bookmakerLiveRunners = bookmakerRunners.map((r) => ({
    name: r.name,
    backOdds: r.back,
    layOdds: r.lay,
    suspended: finished,
  }));

  const bookmaker2LiveRunners = bookmaker2Runners.map((r) => ({
    name: r.name,
    backOdds: r.back,
    layOdds: r.lay,
    suspended: finished,
  }));

  const matchOddsCashout = calculateMarketCashout(fixtureBets, 'MATCH_ODDS', matchOddsLiveRunners);
  const bookmakerCashout = calculateMarketCashout(fixtureBets, 'Bookmaker', bookmakerLiveRunners);
  const bookmaker2Cashout = calculateMarketCashout(fixtureBets, 'Bookmaker 2', bookmaker2LiveRunners);

  // Clicking Cashout directly populates the Place Bet panel (no modal popup, exact Earthbetz workflow)
  function handleCashoutClick(marketName) {
    const quote =
      marketName === 'MATCH_ODDS'
        ? matchOddsCashout
        : marketName === 'Bookmaker'
        ? bookmakerCashout
        : bookmaker2Cashout;

    if (!quote || !quote.eligible || !quote.primaryLeg) return;

    const leg = quote.primaryLeg;
    openBetSlip({
      market: marketName,
      runner: leg.runner,
      side: leg.side,
      odds: leg.odds,
      minStake: 1,
      maxStake: 1500000,
      marketRunners: quote.runnerNames,
      initialStake: Number(leg.stake.toFixed(2)),
      isCashout: true,
      cashoutQuote: quote,
    });
  }

  function getFancyRunnerExposure(marketName, runnerName) {
    const matched = fixtureBets.filter(
      (b) =>
        b.market === marketName &&
        ['matched', 'pending', 'unmatched'].includes(String(b.status || 'matched').toLowerCase()) &&
        b.runner.startsWith(runnerName)
    );
    if (!matched.length) return null;
    const totalLiab = matched.reduce((sum, b) => sum + (Number(b.liability) || Number(b.stake) || 0), 0);
    return -Number(totalLiab.toFixed(2));
  }

  const slipCalc = computeSlipPreview();

  function getMarketRunnerNet(marketName, runnerName, marketRunnerNames = []) {
    const book = computeMarketBook(fixtureBets, marketName, marketRunnerNames);
    const current = book.hasBets ? book.netByRunner[runnerName] ?? 0 : null;

    // Live projected book P/L while stake is in Place Bet (including Cashout prefill)
    let projected = null;
    if (slip && slip.market === marketName && slipCalc.stake > 0 && Number(oddsInput) > 0) {
      const activeOdd = Number(oddsInput);
      const isMultiLegCashout =
        slip.isCashout &&
        slip.cashoutQuote?.legs?.length > 1 &&
        Math.abs(slipCalc.stake - Number(slip.cashoutQuote.primaryLeg?.stake || 0)) < 0.05 &&
        Math.abs(activeOdd - Number(slip.cashoutQuote.primaryLeg?.odds || 0)) < 0.01;
      const hypo = isMultiLegCashout
        ? slip.cashoutQuote.legs
        : [
            {
              market: marketName,
              runner: slip.runner,
              side: slip.side,
              odds: activeOdd,
              stake: slipCalc.stake,
              status: 'matched',
            },
          ];
      const projBook = computeMarketBook(fixtureBets, marketName, marketRunnerNames, hypo);
      projected = projBook.netByRunner[runnerName] ?? 0;
    }

    return { current, projected };
  }

  const homeLiveScoreText =
    homeInn?.display || (getScoreText(fixture, 'home') !== '—' ? getScoreText(fixture, 'home') : 'Yet to Bat');
  const awayLiveScoreText =
    awayInn?.display || (getScoreText(fixture, 'away') !== '—' ? getScoreText(fixture, 'away') : 'Yet to Bat');

  return (
    <div className="ex-md-layout">
      {/* ==================== LEFT COLUMN: SCOREBOARD + SPLIT BOOKMAKER/TIED + NORMAL + MATCH_ODDS ==================== */}
      <div className="ex-md-left">
        {/* 1. Top Dark-Blue Match Title Bar */}
        <div className="ex-md-title-bar">
          <div className="ex-md-title-text">
            {homeName.toUpperCase()} V {awayName.toUpperCase()}
          </div>
          <div className="ex-md-title-right">
            <span>{formatHeaderDateTime(fixture.startTime)}</span>
            <button
              type="button"
              className="ex-md-refresh-ico"
              onClick={() => loadFixture(true)}
              title="Refresh live SportsAPI data"
              aria-label="Refresh match data"
            >
              <FiRefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* 2. Exact Dark Live Scoreboard Hero Panel (matching PUNJAB V SAURASHTRA screenshot) */}
        <div className="ex-md-scoreboard">
          <div className="ex-md-sb-meta">
            <span className={`ex-md-sb-status ${live ? 'is-live' : ''}`}>
              <span className="ex-md-sb-dot" />
              {statusLabel}
            </span>
            <span className="ex-md-sb-format">{matchFormatTag}</span>
            {venueParts.length > 0 && (
              <>
                <span className="ex-md-sb-sep">•</span>
                <span className="ex-md-sb-venue">{venueParts.join(', ')}</span>
              </>
            )}
          </div>

          {live || finished ? (
            <div className="ex-md-sb-live-row">
              {/* Left Side: Home Emblem + Code + Score / Yet to Bat */}
              <div className="ex-md-sb-side-block">
                <div className="ex-md-sb-team">
                  <div className="ex-md-sb-flag">
                    <EntityImage src={fixture.home?.image} name={homeName} size={46} rounded={4} />
                  </div>
                  <span className="ex-md-sb-code">
                    <span className="ex-md-red-ball" aria-hidden="true" />
                    {homeCode}
                  </span>
                </div>
                <div className="ex-md-sb-live-stat">
                  <div className="ex-md-sb-big-white">{homeLiveScoreText}</div>
                  {homeInn?.overs && (
                    <div className="ex-md-sb-overs">({homeInn.overs} ov)</div>
                  )}
                  {homeInn?.crr && (
                    <div className="ex-md-sb-crr">
                      CRR <strong>{homeInn.crr}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Big White Score + Overs + CRR + Away Emblem + Code */}
              <div className="ex-md-sb-side-block ex-md-sb-side-right">
                <div className="ex-md-sb-live-stat text-end">
                  <div className="ex-md-sb-big-white">{awayLiveScoreText}</div>
                  {awayInn?.overs && (
                    <div className="ex-md-sb-overs">({awayInn.overs} ov)</div>
                  )}
                  {awayInn?.crr && (
                    <div className="ex-md-sb-crr">
                      CRR <strong>{awayInn.crr}</strong>
                    </div>
                  )}
                </div>
                <div className="ex-md-sb-team">
                  <div className="ex-md-sb-flag">
                    <EntityImage src={fixture.away?.image} name={awayName} size={46} rounded={4} />
                  </div>
                  <span className="ex-md-sb-code">{awayCode}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="ex-md-sb-center">
              <div className="ex-md-sb-team">
                <div className="ex-md-sb-flag">
                  <EntityImage src={fixture.home?.image} name={homeName} size={46} rounded={4} />
                </div>
                <span className="ex-md-sb-code">{homeCode}</span>
              </div>

              <div className="ex-md-sb-clock-box">
                <div className="ex-md-sb-label">Starts in</div>
                <div className="ex-md-sb-countdown">
                  {formatCountdown(fixture.startTime, nowMs)}
                </div>
                <div className="ex-md-sb-subtime">{formatDateTimeShort(fixture.startTime)}</div>
              </div>

              <div className="ex-md-sb-team">
                <div className="ex-md-sb-flag">
                  <EntityImage src={fixture.away?.image} name={awayName} size={46} rounded={4} />
                </div>
                <span className="ex-md-sb-code">{awayCode}</span>
              </div>
            </div>
          )}

          {/* Bottom Strip: Live Over-by-Over Ball Circles (or Toss Note) + Chevron Insights Toggle */}
          <div className="ex-md-sb-toss-bar">
            {overTimeline.length > 0 ? (
              <div className="ex-md-over-strip">
                {overTimeline.map((ov) => (
                  <div className="ex-md-over-group" key={ov.overNum}>
                    <span className="ex-md-over-lbl">
                      Ov {ov.overNum} <strong className="text-white">({ov.runs})</strong>
                    </span>
                    <div className="ex-md-ball-row">
                      {ov.balls.map((b, bi) => {
                        const s = String(b).toUpperCase();
                        const isExtra = s.includes('WD') || s.includes('NB');
                        const cls =
                          s === '6'
                            ? 'is-six'
                            : s === '4'
                            ? 'is-four'
                            : s === 'W'
                            ? 'is-wkt'
                            : isExtra
                            ? 'is-extra'
                            : 'is-run';
                        return (
                          <span key={bi} className={`ex-md-ball-dot ${cls}`}>
                            {b}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <FiChevronRight size={15} className="text-white-50 flex-shrink-0" />
              </div>
            ) : (
              <div className="ex-md-sb-toss-text">{tossLine}</div>
            )}
            <button
              type="button"
              className="ex-md-sb-chevron-btn"
              onClick={() => setInsightsOpen((v) => !v)}
              title="Toggle full SportsAPI Stats, Lineups, Play-by-Play & Scorecard"
              aria-expanded={insightsOpen}
            >
              {insightsOpen ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
            </button>
          </div>
        </div>

        {/* Expandable Real SportsAPI Insights Panel */}
        {insightsOpen && (
          <div className="ex-md-insights-drawer">
            <div className="ex-md-insights-tabs">
              {[
                { key: 'statistics', label: 'Statistics' },
                { key: 'lineups', label: 'Lineups' },
                { key: 'events', label: 'Events & Play-by-Play' },
                { key: 'h2h', label: 'Head-to-Head' },
                ...(fixture.sport === 'cricket' ? [{ key: 'scorecard', label: 'Scorecard' }] : []),
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`ex-md-ins-tab ${insightTab === t.key ? 'active' : ''}`}
                  onClick={() => setInsightTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="ex-md-insights-body">
              {insightLoading ? (
                <div className="small text-muted py-2">Loading real SportsAPI {insightTab}...</div>
              ) : insightTab === 'statistics' ? (
                (() => {
                  const groups = insightData.statistics?.periods?.[0]?.groups || [];
                  if (!groups.length) return <div className="small text-muted">No statistical breakdown available yet for this fixture.</div>;
                  return (
                    <div className="row g-2">
                      {groups.slice(0, 3).map((g, gi) => (
                        <div className="col-md-6" key={gi}>
                          <div className="fw-bold small mb-1 text-dark">{g.name}</div>
                          {(g.statistics || []).slice(0, 8).map((st, si) => (
                            <div key={si} className="d-flex justify-content-between small border-bottom py-1">
                              <span className="fw-semibold">{st.home ?? '-'}</span>
                              <span className="text-muted">{st.name}</span>
                              <span className="fw-semibold">{st.away ?? '-'}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                })()
              ) : insightTab === 'lineups' ? (
                (() => {
                  const lu = insightData.lineups;
                  if (!lu?.home?.players?.length && !lu?.away?.players?.length) {
                    return <div className="small text-muted">Official lineups have not been published by SportsAPI yet.</div>;
                  }
                  return (
                    <div className="row g-3 small">
                      <div className="col-md-6">
                        <div className="fw-bold mb-1">{homeName}</div>
                        {(lu.home?.players || []).slice(0, 11).map((p, i) => (
                          <div key={i} className="py-1 border-bottom">
                            {p.shirtNumber ? `#${p.shirtNumber} ` : ''}{p.player?.name || p.name}
                          </div>
                        ))}
                      </div>
                      <div className="col-md-6">
                        <div className="fw-bold mb-1">{awayName}</div>
                        {(lu.away?.players || []).slice(0, 11).map((p, i) => (
                          <div key={i} className="py-1 border-bottom">
                            {p.shirtNumber ? `#${p.shirtNumber} ` : ''}{p.player?.name || p.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()
              ) : insightTab === 'events' ? (
                (() => {
                  const list = insightData.events?.events?.length
                    ? insightData.events.events
                    : insightData.events?.pbp || [];
                  if (!list.length) return <div className="small text-muted">No play-by-play events logged yet.</div>;
                  return (
                    <div className="d-flex flex-column gap-1 small">
                      {list.slice(0, 15).map((ev, i) => (
                        <div key={i} className="d-flex justify-content-between border-bottom py-1">
                          <span className="fw-semibold text-primary me-2">{ev.time || ev.minute || ev.over || '•'}</span>
                          <span className="flex-grow-1">{ev.text || ev.description || ev.type || ev.player?.name || 'Match event'}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()
              ) : insightTab === 'h2h' ? (
                (() => {
                  const fixturesList = insightData.h2h?.fixtures || [];
                  if (!fixturesList.length) return <div className="small text-muted">No recent Head-to-Head fixtures returned.</div>;
                  return (
                    <div className="d-flex flex-column gap-1 small">
                      {fixturesList.slice(0, 6).map((fx) => (
                        <Link key={fx.id} to={`/match/${fx.id}`} className="d-flex justify-content-between border-bottom py-1 text-dark">
                          <span>{getTeamDisplayName(fx.home)} v {getTeamDisplayName(fx.away)}</span>
                          <span className="fw-bold">{getScoreText(fx, 'home')} - {getScoreText(fx, 'away')}</span>
                        </Link>
                      ))}
                    </div>
                  );
                })()
              ) : (
                (() => {
                  const sc = insightData.scorecard;
                  const innings = sc?.innings || [];
                  if (!innings.length) return <div className="small text-muted">Cricket scorecard will populate once innings data arrives from SportsAPI.</div>;
                  return (
                    <div className="d-flex flex-column gap-2 small">
                      {innings.map((inn, idx) => (
                        <div key={idx} className="border rounded p-2">
                          <div className="fw-bold mb-1">
                            {inn.team?.name || `Innings ${idx + 1}`}: {inn.score ?? ''}/{inn.wickets ?? ''} ({inn.overs ?? ''} ov)
                          </div>
                          {(inn.batting || []).slice(0, 6).map((bat, bi) => (
                            <div key={bi} className="d-flex justify-content-between border-top py-1">
                              <span>{bat.player?.name || bat.name}</span>
                              <span className="fw-semibold">{bat.runs ?? 0} ({bat.balls ?? 0})</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        )}

        {/* 3. MATCH_ODDS 6-COLUMN BACK/LAY LADDER WITH LIVE CASHOUT (TOP MARKET LIKE REFERENCE SCREENSHOT) */}
        <section className="ex-md-market-panel">
          <div className="ex-md-section-bar">
            <span>MATCH_ODDS</span>
            <button
              type="button"
              className={`ex-md-cashout-btn ${matchOddsCashout.eligible ? 'is-ready' : 'is-idle'}`}
              onClick={() => handleCashoutClick('MATCH_ODDS')}
              disabled={!matchOddsCashout.eligible}
            >
              Cashout
            </button>
          </div>
          <div className="ex-md-subhead-row">
            <div className="ex-md-limit-blue">Max: 10K</div>
            <div className="ex-md-ladder-head">
              <span />
              <span />
              <span className="ex-md-head-back">Back</span>
              <span className="ex-md-head-lay">Lay</span>
              <span />
              <span />
            </div>
          </div>

          <div className="ex-md-runner-list">
            {runners.map((runner) => {
              const allNames = runners.map((r) => r.name);
              const { current: netPl, projected: projPl } = getMarketRunnerNet('MATCH_ODDS', runner.name, allNames);
              return (
                <div className="ex-md-runner-row" key={runner.key}>
                  <div className="ex-md-runner-info">
                    <div className="ex-md-runner-name">{runner.name}</div>
                    {(netPl !== null || projPl !== null) && (
                      <div className="ex-md-runner-pl-line">
                        <span className={`ex-md-runner-pl ${netPl !== null ? (netPl >= 0 ? 'is-pos' : 'is-neg') : ''}`}>
                          {netPl !== null ? formatMoneyNum(netPl) : ''}
                        </span>
                        {projPl !== null && (
                          <span className={`ex-md-runner-pl-proj ${projPl >= 0 ? 'is-pos' : 'is-neg'}`}>
                            {formatMoneyNum(projPl)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="ex-md-ladder-cells">
                    {finished ? (
                      <div className="ex-md-suspended-bar">
                        <span>-</span>
                        <span>-</span>
                        <span className="ex-md-susp-label">SUSPENDED</span>
                        <span>-</span>
                        <span>-</span>
                      </div>
                    ) : (
                      <>
                        {runner.ladder.backs.map((b) => (
                          <button
                            key={`b-${b.level}`}
                            type="button"
                            className={`ex-md-odd-btn ex-md-back-l${b.level}`}
                            onClick={() =>
                              openBetSlip({
                                market: 'MATCH_ODDS',
                                runner: runner.name,
                                side: 'back',
                                odds: b.price,
                                minStake: 10,
                                maxStake: 10000,
                                marketRunners: allNames,
                              })
                            }
                          >
                            <span className="ex-md-odd-num">{b.price}</span>
                            <span className="ex-md-odd-vol">{b.vol}</span>
                          </button>
                        ))}
                        {runner.ladder.lays.map((l) => (
                          <button
                            key={`l-${l.level}`}
                            type="button"
                            className={`ex-md-odd-btn ex-md-lay-l${l.level}`}
                            onClick={() =>
                              openBetSlip({
                                market: 'MATCH_ODDS',
                                runner: runner.name,
                                side: 'lay',
                                odds: l.price,
                                minStake: 10,
                                maxStake: 10000,
                                marketRunners: allNames,
                              })
                            }
                          >
                            <span className="ex-md-odd-num">{l.price}</span>
                            <span className="ex-md-odd-vol">{l.vol}</span>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. SIDE-BY-SIDE BOOKMAKER (LEFT) + BOOKMAKER 2 (RIGHT) — BOTH WITH WORKING CASHOUT */}
        <div className="ex-md-split-markets">
          {/* Bookmaker Panel */}
          <section className="ex-md-market-panel ex-md-split-bm">
            <div className="ex-md-section-bar">
              <span>Bookmaker</span>
              <button
                type="button"
                className={`ex-md-cashout-btn ${bookmakerCashout.eligible ? 'is-ready' : 'is-idle'}`}
                onClick={() => handleCashoutClick('Bookmaker')}
                disabled={!bookmakerCashout.eligible}
              >
                Cashout
              </button>
            </div>
            <div className="ex-md-subhead-row">
              <div className="ex-md-limit-blue">Min: 100 &nbsp;Max: 15L</div>
              <div className="ex-md-bm-head-grid">
                <span />
                <span />
                <span className="ex-md-head-back">Back</span>
                <span className="ex-md-head-lay">Lay</span>
                <span />
                <span />
              </div>
            </div>

            <div className="ex-md-runner-list">
              {bookmakerRunners.map((bm) => {
                const bmNames = bookmakerRunners.map((r) => r.name);
                const { current: netPl, projected: projPl } = getMarketRunnerNet('Bookmaker', bm.name, bmNames);
                return (
                  <div className="ex-md-runner-row" key={`bm-${bm.key}`}>
                    <div className="ex-md-runner-info">
                      <div className="ex-md-runner-name">{bm.name}</div>
                      {(netPl !== null || projPl !== null) && (
                        <div className="ex-md-runner-pl-line">
                          <span className={`ex-md-runner-pl ${netPl !== null ? (netPl >= 0 ? 'is-pos' : 'is-neg') : ''}`}>
                            {netPl !== null ? formatMoneyNum(netPl) : ''}
                          </span>
                          {projPl !== null && (
                            <span className={`ex-md-runner-pl-proj ${projPl >= 0 ? 'is-pos' : 'is-neg'}`}>
                              {formatMoneyNum(projPl)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="ex-md-bm-cells">
                      {finished ? (
                        <div className="ex-md-suspended-bar">
                          <span>-</span>
                          <span>-</span>
                          <span className="ex-md-susp-label">SUSPENDED</span>
                          <span>-</span>
                          <span>-</span>
                        </div>
                      ) : (
                        <>
                          <span className="ex-md-odd-blank ex-md-back-l3">-</span>
                          <span className="ex-md-odd-blank ex-md-back-l2">-</span>
                          <button
                            type="button"
                            className="ex-md-odd-btn ex-md-back-l1"
                            onClick={() =>
                              openBetSlip({
                                market: 'Bookmaker',
                                runner: bm.name,
                                side: 'back',
                                odds: bm.back,
                                minStake: 100,
                                maxStake: 1500000,
                                marketRunners: bmNames,
                              })
                            }
                          >
                            <span className="ex-md-odd-num">{bm.back}</span>
                            <span className="ex-md-odd-vol">{bm.vol}</span>
                          </button>
                          <button
                            type="button"
                            className="ex-md-odd-btn ex-md-lay-l1"
                            onClick={() =>
                              openBetSlip({
                                market: 'Bookmaker',
                                runner: bm.name,
                                side: 'lay',
                                odds: bm.lay,
                                minStake: 100,
                                maxStake: 1500000,
                                marketRunners: bmNames,
                              })
                            }
                          >
                            <span className="ex-md-odd-num">{bm.lay}</span>
                            <span className="ex-md-odd-vol">{bm.vol}</span>
                          </button>
                          <span className="ex-md-odd-blank ex-md-lay-l2">-</span>
                          <span className="ex-md-odd-blank ex-md-lay-l3">-</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="ex-md-bookmaker-note">
              Every Set. Every Point. Bet Live on {formatSportName(fixture.sport)} — Only on Our Exchange!
            </div>
          </section>

          {/* Bookmaker 2 Panel (Exact Side-by-Side 2-Col Back/Lay with Real Cashout) */}
          <section className="ex-md-market-panel ex-md-split-tied">
            <div className="ex-md-section-bar">
              <span>Bookmaker 2</span>
              <button
                type="button"
                className={`ex-md-cashout-btn ${bookmaker2Cashout.eligible ? 'is-ready' : 'is-idle'}`}
                onClick={() => handleCashoutClick('Bookmaker 2')}
                disabled={!bookmaker2Cashout.eligible}
              >
                Cashout
              </button>
            </div>
            <div className="ex-md-subhead-row">
              <div className="ex-md-limit-blue">Min: 100 &nbsp;Max: 1L</div>
              <div className="ex-md-tied-head-grid">
                <span className="ex-md-head-back">Back</span>
                <span className="ex-md-head-lay">Lay</span>
              </div>
            </div>

            <div className="ex-md-runner-list">
              {bookmaker2Runners.map((bm2) => {
                const bm2Names = bookmaker2Runners.map((r) => r.name);
                const { current: netPl, projected: projPl } = getMarketRunnerNet('Bookmaker 2', bm2.name, bm2Names);
                return (
                  <div className="ex-md-runner-row" key={`bm2-${bm2.key}`}>
                    <div className="ex-md-runner-info">
                      <div className="ex-md-runner-name">{bm2.name}.</div>
                      {(netPl !== null || projPl !== null) && (
                        <div className="ex-md-runner-pl-line">
                          <span className={`ex-md-runner-pl ${netPl !== null ? (netPl >= 0 ? 'is-pos' : 'is-neg') : ''}`}>
                            {netPl !== null ? formatMoneyNum(netPl) : ''}
                          </span>
                          {projPl !== null && (
                            <span className={`ex-md-runner-pl-proj ${projPl >= 0 ? 'is-pos' : 'is-neg'}`}>
                              {formatMoneyNum(projPl)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="ex-md-tied-cells">
                      {finished ? (
                        <div className="ex-md-suspended-compact">SUSPENDED</div>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="ex-md-odd-btn ex-md-back-l1"
                            onClick={() =>
                              openBetSlip({
                                market: 'Bookmaker 2',
                                runner: bm2.name,
                                side: 'back',
                                odds: bm2.back,
                                minStake: 100,
                                maxStake: 100000,
                                marketRunners: bm2Names,
                              })
                            }
                          >
                            <span className="ex-md-odd-num">{bm2.back}</span>
                            <span className="ex-md-odd-vol">{bm2.vol}</span>
                          </button>
                          <button
                            type="button"
                            className="ex-md-odd-btn ex-md-lay-l1"
                            onClick={() =>
                              openBetSlip({
                                market: 'Bookmaker 2',
                                runner: bm2.name,
                                side: 'lay',
                                odds: bm2.lay,
                                minStake: 100,
                                maxStake: 100000,
                                marketRunners: bm2Names,
                              })
                            }
                          >
                            <span className="ex-md-odd-num">{bm2.lay}</span>
                            <span className="ex-md-odd-vol">{bm2.vol}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="ex-md-bookmaker-note">
              {homeName} v {awayName} Match Bets Started In Our Exchange
            </div>
          </section>
        </div>

        {/* 5. NORMAL (FANCY / SESSION) 2-COLUMN PANEL */}
        <section className="ex-md-market-panel">
          <div className="ex-md-section-bar">Normal</div>
          <div className="ex-md-normal-grid">
            {[normal.left, normal.right].map((colRows, colIdx) => (
              <div className="ex-md-normal-col" key={colIdx}>
                <div className="ex-md-normal-head">
                  <div className="ex-md-normal-title-spacer" />
                  <div className="ex-md-head-lay">No</div>
                  <div className="ex-md-head-back">Yes</div>
                  <div className="ex-md-normal-lim-spacer" />
                </div>

                {colRows.map((item) => {
                  const expVal = getFancyRunnerExposure('Normal', item.name);
                  return (
                    <div className="ex-md-normal-group" key={item.id}>
                      {item.rows.map((lvl, li) => (
                        <div className="ex-md-normal-row" key={`${item.id}-${li}`}>
                          <div className="ex-md-normal-name-cell">
                            {li === 0 ? (
                              <>
                                <span className="ex-md-normal-name">{item.name}</span>
                                <div className="d-inline-flex align-items-center gap-1 flex-shrink-0">
                                  {expVal !== null && (
                                    <span className="ex-md-normal-exp">{expVal}</span>
                                  )}
                                  {item.badge && (
                                    <span className="ex-md-badla-tag">{item.badge}</span>
                                  )}
                                </div>
                              </>
                            ) : (
                              <span />
                            )}
                          </div>
                          {finished || item.suspended ? (
                            <div className="ex-md-normal-suspended">SUSPENDED</div>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="ex-md-odd-btn ex-md-lay-l1"
                                onClick={() =>
                                  openBetSlip({
                                    market: 'Normal',
                                    runner: item.name,
                                    side: 'no',
                                    odds: lvl.no,
                                    rate: lvl.noRate,
                                    minStake: item.min,
                                    maxStake: item.max,
                                  })
                                }
                              >
                                <span className="ex-md-odd-num">{lvl.no}</span>
                                <span className="ex-md-odd-vol">{lvl.noRate}</span>
                              </button>
                              <button
                                type="button"
                                className="ex-md-odd-btn ex-md-back-l1"
                                onClick={() =>
                                  openBetSlip({
                                    market: 'Normal',
                                    runner: item.name,
                                    side: 'yes',
                                    odds: lvl.yes,
                                    rate: lvl.yesRate,
                                    minStake: item.min,
                                    maxStake: item.max,
                                  })
                                }
                              >
                                <span className="ex-md-odd-num">{lvl.yes}</span>
                                <span className="ex-md-odd-vol">{lvl.yesRate}</span>
                              </button>
                            </>
                          )}
                          <div className="ex-md-normal-limits">
                            {li === 0 && (
                              <>
                                <span>Min: {item.min}</span>
                                <span>Max: {item.max}</span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        {/* 6. OVER BY OVER 2-COLUMN PANEL (MATCHING SCREENSHOT WITH SUSPENDED OVERLAY + BOUNDARIES) */}
        <section className="ex-md-market-panel">
          <div className="ex-md-section-bar">Over By Over</div>
          <div className="ex-md-normal-grid">
            {[overByOver.left, overByOver.right].map((colRows, colIdx) => (
              <div className="ex-md-normal-col" key={`obo-${colIdx}`}>
                <div className="ex-md-normal-head">
                  <div className="ex-md-normal-title-spacer" />
                  <div className="ex-md-head-lay">No</div>
                  <div className="ex-md-head-back">Yes</div>
                  <div className="ex-md-normal-lim-spacer" />
                </div>

                {colRows.map((item) => {
                  const expVal = getFancyRunnerExposure('Over By Over', item.name);
                  const isSusp = finished || item.suspended;
                  return (
                    <div className="ex-md-normal-group" key={item.id}>
                      {item.rows.map((lvl, li) => (
                        <div className="ex-md-normal-row" key={`${item.id}-${li}`}>
                          <div className="ex-md-normal-name-cell">
                            <span className="ex-md-normal-name">{item.name}</span>
                            {expVal !== null && <span className="ex-md-normal-exp">{expVal}</span>}
                          </div>
                          {isSusp ? (
                            <div className="ex-md-normal-suspended-full">
                              <span className="ex-md-susp-dash">-</span>
                              <span className="ex-md-susp-label">SUSPENDED</span>
                              <div className="ex-md-normal-limits">
                                <span>Min: {item.min}</span>
                                <span>Max: {item.max}</span>
                              </div>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="ex-md-odd-btn ex-md-lay-l1"
                                onClick={() =>
                                  openBetSlip({
                                    market: 'Over By Over',
                                    runner: item.name,
                                    side: 'no',
                                    odds: lvl.no,
                                    rate: lvl.noRate,
                                    minStake: item.min,
                                    maxStake: item.max,
                                  })
                                }
                              >
                                <span className="ex-md-odd-num">{lvl.no}</span>
                                <span className="ex-md-odd-vol">{lvl.noRate}</span>
                              </button>
                              <button
                                type="button"
                                className="ex-md-odd-btn ex-md-back-l1"
                                onClick={() =>
                                  openBetSlip({
                                    market: 'Over By Over',
                                    runner: item.name,
                                    side: 'yes',
                                    odds: lvl.yes,
                                    rate: lvl.yesRate,
                                    minStake: item.min,
                                    maxStake: item.max,
                                  })
                                }
                              >
                                <span className="ex-md-odd-num">{lvl.yes}</span>
                                <span className="ex-md-odd-vol">{lvl.yesRate}</span>
                              </button>
                              <div className="ex-md-normal-limits">
                                <span>Min: {item.min}</span>
                                <span>Max: {item.max}</span>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        {/* 7. BALL BY BALL 2-COLUMN PANEL */}
        <section className="ex-md-market-panel">
          <div className="ex-md-section-bar">Ball By Ball</div>
          <div className="ex-md-normal-grid">
            {[ballByBall.left, ballByBall.right].map((colRows, colIdx) => (
              <div className="ex-md-normal-col" key={`bbb-${colIdx}`}>
                <div className="ex-md-normal-head">
                  <div className="ex-md-normal-title-spacer" />
                  <div className="ex-md-head-lay">No</div>
                  <div className="ex-md-head-back">Yes</div>
                  <div className="ex-md-normal-lim-spacer" />
                </div>

                {colRows.map((item) => {
                  const expVal = getFancyRunnerExposure('Ball By Ball', item.name);
                  return (
                    <div className="ex-md-normal-group" key={item.id}>
                      {item.rows.map((lvl, li) => (
                        <div className="ex-md-normal-row" key={`${item.id}-${li}`}>
                          <div className="ex-md-normal-name-cell">
                            <span className="ex-md-normal-name">{item.name}</span>
                            {expVal !== null && <span className="ex-md-normal-exp">{expVal}</span>}
                          </div>
                          {finished ? (
                            <div className="ex-md-normal-suspended-full">
                              <span className="ex-md-susp-dash">-</span>
                              <span className="ex-md-susp-label">SUSPENDED</span>
                              <div className="ex-md-normal-limits">
                                <span>Min: {item.min}</span>
                                <span>Max: {item.max}</span>
                              </div>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="ex-md-odd-btn ex-md-lay-l1"
                                onClick={() =>
                                  openBetSlip({
                                    market: 'Ball By Ball',
                                    runner: item.name,
                                    side: 'no',
                                    odds: lvl.no,
                                    rate: lvl.noRate,
                                    minStake: item.min,
                                    maxStake: item.max,
                                  })
                                }
                              >
                                <span className="ex-md-odd-num">{lvl.no}</span>
                                <span className="ex-md-odd-vol">{lvl.noRate}</span>
                              </button>
                              <button
                                type="button"
                                className="ex-md-odd-btn ex-md-back-l1"
                                onClick={() =>
                                  openBetSlip({
                                    market: 'Ball By Ball',
                                    runner: item.name,
                                    side: 'yes',
                                    odds: lvl.yes,
                                    rate: lvl.yesRate,
                                    minStake: item.min,
                                    maxStake: item.max,
                                  })
                                }
                              >
                                <span className="ex-md-odd-num">{lvl.yes}</span>
                                <span className="ex-md-odd-vol">{lvl.yesRate}</span>
                              </button>
                              <div className="ex-md-normal-limits">
                                <span>Min: {item.min}</span>
                                <span>Max: {item.max}</span>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        {/* 6. OFFICIAL FOOTBALL / SOCCER MARKETS (U/O Goals, BTTS, Draw No Bet, Odd/Even, 1st Period, Handicaps +1/+2, HT/FT, Correct Score) */}
        {footballMarkets.length > 0 &&
          footballMarkets.map((fm) => (
            <section className="ex-md-market-panel" key={fm.key}>
              <div className="ex-md-section-bar">
                <span>{fm.title}</span>
                <button
                  type="button"
                  className="ex-md-cashout-btn"
                  onClick={() => setRulesModalOpen(true)}
                  title="View official market settlement rules"
                >
                  Rules
                </button>
              </div>
              <div className="ex-md-subhead-row">
                <div className="ex-md-limit-blue">Min: 100 &nbsp;Max: 2L</div>
                <div className="ex-md-ladder-head">
                  <span />
                  <span />
                  <span className="ex-md-head-back">Back</span>
                  <span className="ex-md-head-lay">Lay</span>
                  <span />
                  <span />
                </div>
              </div>

              <div className="ex-md-runner-list">
                {fm.runners.map((r) => {
                  const fmNames = fm.runners.map((x) => x.name);
                  const { current: netPl, projected: projPl } = getMarketRunnerNet(fm.title, r.name, fmNames);
                  return (
                    <div className="ex-md-runner-row" key={`${fm.key}-${r.name}`}>
                      <div className="ex-md-runner-info">
                        <div className="ex-md-runner-name">{r.name}</div>
                        {(netPl !== null || projPl !== null) && (
                          <div className="ex-md-runner-pl-line">
                            <span className={`ex-md-runner-pl ${netPl !== null ? (netPl >= 0 ? 'is-pos' : 'is-neg') : ''}`}>
                              {netPl !== null ? formatMoneyNum(netPl) : ''}
                            </span>
                            {projPl !== null && (
                              <span className={`ex-md-runner-pl-proj ${projPl >= 0 ? 'is-pos' : 'is-neg'}`}>
                                {formatMoneyNum(projPl)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="ex-md-ladder-cells">
                        {finished ? (
                          <div className="ex-md-suspended-bar">
                            <span>-</span>
                            <span>-</span>
                            <span className="ex-md-susp-label">SUSPENDED</span>
                            <span>-</span>
                            <span>-</span>
                          </div>
                        ) : (
                          <>
                            {r.ladder.backs.map((b) => (
                              <button
                                key={`b-${b.level}`}
                                type="button"
                                className={`ex-md-odd-btn ex-md-back-l${b.level}`}
                                onClick={() =>
                                  openBetSlip({
                                    market: fm.title,
                                    runner: r.name,
                                    side: 'back',
                                    odds: b.price,
                                    minStake: 100,
                                    maxStake: 200000,
                                  })
                                }
                              >
                                <span className="ex-md-odd-num">{b.price}</span>
                                <span className="ex-md-odd-vol">{b.vol}</span>
                              </button>
                            ))}
                            {r.ladder.lays.map((l) => (
                              <button
                                key={`l-${l.level}`}
                                type="button"
                                className={`ex-md-odd-btn ex-md-lay-l${l.level}`}
                                onClick={() =>
                                  openBetSlip({
                                    market: fm.title,
                                    runner: r.name,
                                    side: 'lay',
                                    odds: l.price,
                                    minStake: 100,
                                    maxStake: 200000,
                                  })
                                }
                              >
                                <span className="ex-md-odd-num">{l.price}</span>
                                <span className="ex-md-odd-vol">{l.vol}</span>
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {fm.ruleNote && <div className="ex-md-bookmaker-note">{fm.ruleNote}</div>}
            </section>
          ))}
      </div>

      {/* ==================== RIGHT COLUMN: BRAND + LIVE MATCH + EXACT PLACE BET + MY BET ==================== */}
      <aside className="ex-md-right">
        {/* Top Info & Brand Label */}
        <div className="ex-md-right-brand">
          <button
            type="button"
            className="ex-md-info-badge border-0"
            onClick={() => setRulesModalOpen(true)}
            title={`View official ${formatSportName(fixture.sport)} market rules`}
            aria-label="Open market rules"
            style={{ cursor: 'pointer' }}
          >
            <FiInfo size={13} />
          </button>
          <Link to="/home" className="ex-md-brand-link">
            sportzone
          </Link>
        </div>

        {/* Live Match Collapsible Blue Bar */}
        <div className="ex-md-right-card">
          <button
            type="button"
            className="ex-md-section-bar ex-md-section-bar-btn"
            onClick={() => setLiveBoxOpen((v) => !v)}
          >
            <span>Live Match</span>
            {liveBoxOpen ? <FiChevronUp size={15} /> : <FiChevronDown size={15} />}
          </button>

          {liveBoxOpen && (
            <div className="ex-md-live-panel">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold text-white small">{homeCode} vs {awayCode}</span>
                <span className="badge bg-success">{statusLabel}</span>
              </div>
              <div className="text-center py-2 mb-2 rounded" style={{ background: '#0e1318' }}>
                <div className="fw-bold" style={{ color: '#20d98b', fontSize: 18 }}>
                  {getScoreText(fixture, 'home')} - {getScoreText(fixture, 'away')}
                </div>
                <div className="small text-secondary">{tossLine}</div>
              </div>
              {getPeriodPairs(fixture).length > 0 && (
                <div className="d-flex flex-wrap gap-1 mb-2">
                  {getPeriodPairs(fixture).map((p) => (
                    <span key={p.label} className="badge bg-dark border border-secondary">
                      {p.label}: {p.home}-{p.away}
                    </span>
                  ))}
                </div>
              )}
              {liveEvents.length > 0 ? (
                <div className="ex-md-live-feed">
                  {liveEvents.slice(0, 6).map((ev, i) => (
                    <div key={i} className="ex-md-live-feed-item">
                      <span className="text-info fw-semibold me-1">{ev.time || ev.minute || ev.over || '•'}</span>
                      <span>{ev.text || ev.description || ev.type || 'Live update'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="small text-secondary">
                  Live telemetry synced with SportsAPI v2.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop Place Bet Panel (handles regular Back/Lay AND direct Cashout) */}
        {slip && !isMobileView && (
          <form
            onSubmit={handleConfirmSlip}
            className={`ex-md-slip-v2 ${
              slip.side === 'back' || slip.side === 'yes' ? 'is-back' : 'is-lay'
            }`}
          >
            <div className="ex-md-section-bar">Place Bet</div>

            {/* Table Header: (Bet for) | Odds | Stake | Profit */}
            <div className="ex-md-slip-v2-head">
              <span>(Bet for)</span>
              <span>Odds</span>
              <span>Stake</span>
              <span className="text-end">Profit</span>
            </div>

            {/* Tinted Active Bet Row */}
            <div className="ex-md-slip-v2-row">
              <span className="ex-md-slip-v2-runner" title={slip.runner}>
                {slip.isCashout && isBookmakerMarket(slip.market) ? slip.market : slip.runner}
              </span>
              <input
                type="number"
                step="any"
                className="ex-md-slip-v2-input"
                value={oddsInput}
                onChange={(e) => {
                  setOddsInput(e.target.value);
                  setSlipError(null);
                }}
                aria-label="Odds"
              />
              <input
                type="number"
                step="any"
                min={slip.minStake || 1}
                className="ex-md-slip-v2-input"
                value={stakeInput}
                onChange={(e) => {
                  setStakeInput(e.target.value);
                  setSlipError(null);
                }}
                aria-label="Stake"
              />
              <span className="ex-md-slip-v2-profit">{formatMoneyNum(slipCalc.profit)}</span>
            </div>

            {slipError && (
              <div className="px-2 pt-1 small fw-semibold" style={{ color: '#b91c1c', fontSize: 11.5 }}>
                {slipError}
              </div>
            )}

            {/* 2 x 5 Grid of 10 Quick-Stake Chips */}
            <div className="ex-md-slip-v2-stakes">
              {tenStakeButtons.map((btn, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="ex-md-slip-v2-chip"
                  onClick={() => {
                    setSlipError(null);
                    setStakeInput((prev) => String((Number(prev) || 0) + Number(btn.value)));
                  }}
                >
                  +{btn.label}
                </button>
              ))}
            </div>

            {/* Right-aligned underlined clear button */}
            <div className="ex-md-slip-v2-clear-row">
              <button
                type="button"
                className="ex-md-slip-v2-clear"
                onClick={() => {
                  setStakeInput('');
                  setSlipError(null);
                }}
              >
                clear
              </button>
            </div>

            {/* Bottom 3-Button Bar: Edit (left) | Reset + Submit (right) */}
            <div className="ex-md-slip-v2-actions">
              <Link to="/set-button-values" className="ex-md-btn-edit">
                Edit
              </Link>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="ex-md-btn-reset"
                  onClick={() => {
                    setSlip(null);
                    setSlipError(null);
                  }}
                >
                  Reset
                </button>
                <button
                  type="submit"
                  className="ex-md-btn-submit"
                  disabled={isSubmitting || Boolean(slipCalc.validationError)}
                >
                  {isSubmitting ? 'Placing...' : 'Submit'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* My Bet Panel */}
        <div className="ex-md-right-card">
          <div className="ex-md-section-bar">
            <span>My Bet</span>
          </div>
          <table className="ex-md-mybet-table">
            <thead>
              <tr>
                <th>Matched Bet</th>
                <th className="text-center">Odds</th>
                <th className="text-end">Stake</th>
              </tr>
            </thead>
            <tbody>
              {fixtureBets.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-3 small" style={{ color: '#475569' }}>
                    Click any Back / Lay / No / Yes box to place a bet.
                  </td>
                </tr>
              ) : (
                fixtureBets.map((b) => {
                  const isPink = b.side === 'lay' || b.side === 'no';
                  const st = String(b.status || 'matched').toLowerCase();
                  return (
                    <tr key={b.id} className={isPink ? 'ex-mybet-lay' : 'ex-mybet-back'}>
                      <td>
                        <span>{b.runner}</span>
                        {b.isCashout && <span className="ex-mybet-co-tag">CO</span>}
                        {st !== 'matched' && (
                          <span className={`ex-bet-st-badge is-${st} ms-1`}>
                            {st === 'won' ? 'Win' : st === 'lost' ? 'Loss' : st === 'void' ? 'Void' : st}
                          </span>
                        )}
                      </td>
                      <td className="text-center">{b.odds}</td>
                      <td className="text-end">{b.stake}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </aside>

      {/* ==================== MOBILE-ONLY BOTTOM-SLIDING BETTING SHEET (<= 768px ONLY) ==================== */}
      {isMobileView && slip && (
        <div
          className={`ex-mob-sheet-backdrop ${mobileSheetVisible ? 'is-open' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label="Place Bet Bottom Sheet"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeMobileSheet();
          }}
        >
          <form
            onSubmit={handleConfirmSlip}
            className={`ex-mob-sheet ${mobileSheetVisible ? 'is-open' : ''} ${
              slip.side === 'back' || slip.side === 'yes' ? 'is-back' : 'is-lay'
            }`}
          >
            {/* Header Bar: Match + Market + Back/Lay Badge + Close X */}
            <div className="ex-mob-sheet-header">
              <div className="ex-mob-sheet-title-wrap">
                <div className="ex-mob-sheet-match">{matchTitle}</div>
                <div className="ex-mob-sheet-sub">
                  <span className="ex-mob-sheet-market">{slip.market}</span>
                  <span
                    className={`ex-mob-sheet-side ${
                      slip.side === 'back' || slip.side === 'yes' ? 'is-back' : 'is-lay'
                    }`}
                  >
                    {slip.side.toUpperCase()}
                  </span>
                  <span className="ex-mob-sheet-sel">{slip.runner}</span>
                </div>
              </div>
              <button
                type="button"
                className="ex-mob-sheet-close"
                onClick={closeMobileSheet}
                aria-label="Close betting slip"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Body (keyboard-safe scrollable area) */}
            <div className="ex-mob-sheet-body">
              {/* Aligned 4-Column Square Header: (Bet for) | Odds | Stake | Profit */}
              <div className="ex-mob-sheet-cols-head">
                <span>(Bet for)</span>
                <span className="text-center">Odds</span>
                <span className="text-center">Stake</span>
                <span className="text-end">Profit</span>
              </div>

              {/* Active Selection Row with Auto-Populated Odds + Editable Stake + Live Profit */}
              <div className="ex-mob-sheet-cols-row">
                <span className="ex-mob-sheet-runner" title={slip.runner}>
                  {slip.runner}
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  className="ex-mob-sheet-input"
                  value={oddsInput}
                  onChange={(e) => {
                    setOddsInput(e.target.value);
                    setSlipError(null);
                  }}
                  aria-label="Odds"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={slip.minStake || 1}
                  max={slip.maxStake || 1500000}
                  className="ex-mob-sheet-input"
                  value={stakeInput}
                  onChange={(e) => {
                    setStakeInput(e.target.value);
                    setSlipError(null);
                  }}
                  placeholder="0"
                  aria-label="Stake"
                />
                <span className="ex-mob-sheet-profit">
                  {formatMoneyNum(slipCalc.profit)}
                </span>
              </div>

              {/* Live Calculation Preview Bar: Potential Profit | Potential Return | Potential Loss */}
              <div className="ex-mob-sheet-calc-bar">
                <div className="ex-mob-calc-cell">
                  <span className="ex-mob-calc-lbl">Potential Profit</span>
                  <strong className="ex-mob-calc-val is-profit">
                    +{formatMoneyNum(slipCalc.profit)}
                  </strong>
                </div>
                <div className="ex-mob-calc-cell">
                  <span className="ex-mob-calc-lbl">Potential Return</span>
                  <strong className="ex-mob-calc-val">
                    {formatMoneyNum(slipCalc.potentialReturn)}
                  </strong>
                </div>
                <div className="ex-mob-calc-cell">
                  <span className="ex-mob-calc-lbl">
                    {slip.side === 'lay' || slip.side === 'no' ? 'Liability' : 'Potential Loss'}
                  </span>
                  <strong className="ex-mob-calc-val is-loss">
                    -{formatMoneyNum(slipCalc.liability)}
                  </strong>
                </div>
              </div>

              {/* Live Wallet Balance & Market Limits */}
              <div className="ex-mob-sheet-meta">
                <span>
                  Min: <strong>{formatMoneyNum(slip.minStake || 10)}</strong> · Max:{' '}
                  <strong>{formatMoneyNum(slip.maxStake || 500000)}</strong>
                </span>
                <span>
                  Bal: <strong>{formatMoneyNum(Math.round(state.coins))}</strong>
                </span>
              </div>

              {/* Validation Error Banner */}
              {(slipCalc.validationError || slipError) && (
                <div className="ex-mob-sheet-error" role="alert">
                  {slipError || slipCalc.validationError}
                </div>
              )}

              {/* Quick Stake Buttons Grid (+100 .. +50K) */}
              <div className="ex-mob-sheet-stakes">
                {MOBILE_QUICK_STAKES.map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    className="ex-mob-sheet-chip"
                    onClick={() => {
                      setSlipError(null);
                      setStakeInput((prev) => String((Number(prev) || 0) + btn.value));
                    }}
                  >
                    +{btn.label}
                  </button>
                ))}
              </div>

              {/* Clear Row */}
              <div className="ex-mob-sheet-clear-row">
                <button
                  type="button"
                  className="ex-mob-sheet-clear"
                  onClick={() => {
                    setStakeInput('');
                    setSlipError(null);
                  }}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Sticky Footer Controls (Always visible above mobile keyboard / safe area) */}
            <div className="ex-mob-sheet-actions">
              <Link
                to="/set-button-values"
                className="ex-mob-btn-edit"
                onClick={closeMobileSheet}
              >
                Edit
              </Link>
              <button
                type="button"
                className="ex-mob-btn-reset"
                onClick={() => {
                  setOddsInput(String(slip.odds));
                  setStakeInput(String(slip.minStake || 100));
                  setSlipError(null);
                }}
              >
                Reset
              </button>
              <button
                type="submit"
                className="ex-mob-btn-submit"
                disabled={isSubmitting || Boolean(slipCalc.validationError)}
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      )}



      {/* Official Sport Rules Modal (opens directly on this match's sport) */}
      <ExchangeRulesModal
        open={rulesModalOpen}
        onClose={() => setRulesModalOpen(false)}
        initialSport={fixture.sport}
      />
    </div>
  );
}
