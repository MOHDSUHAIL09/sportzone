import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getFixtureById } from '../services/sportsApi';
import apiClient from '../services/apiClient';
import { useAuth } from './AuthContext';
import {
  canPredictFixture,
  determineFixtureWinner,
  getScoreValue,
  getTeamDisplayName,
} from '../utils/formatters';
import {
  classifyFixtureStatus,
  evaluateExchangeBetSettlement,
} from '../utils/marketRulesEngine';

const STORAGE_KEY = 'sportzone_demo_arena_state_v1';
const INITIAL_COINS = 2500;
const DAILY_BONUS_COINS = 500;
const DAILY_BONUS_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_BUTTON_VALUES = [
  { label: '100', value: 100 },
  { label: '250', value: 250 },
  { label: '500', value: 500 },
  { label: '1K', value: 1000 },
  { label: '2.5K', value: 2500 },
  { label: '5K', value: 5000 },
];

// Benchmark predictors for the Demo Leaderboard (user's live localStorage score is ranked dynamically alongside these)
const DEMO_BENCHMARK_PLAYERS = [
  { id: 'bench-1', name: 'Marcus_V', favoriteSport: 'football', coins: 6420, rewardPoints: 1840, wins: 19, total: 26, bestStreak: 6 },
  { id: 'bench-2', name: 'PriyaCricket', favoriteSport: 'cricket', coins: 5180, rewardPoints: 1490, wins: 15, total: 22, bestStreak: 5 },
  { id: 'bench-3', name: 'AceReturner', favoriteSport: 'tennis', coins: 4390, rewardPoints: 1210, wins: 13, total: 20, bestStreak: 4 },
  { id: 'bench-4', name: 'HoopsMetrics', favoriteSport: 'basketball', coins: 3850, rewardPoints: 980, wins: 11, total: 18, bestStreak: 4 },
  { id: 'bench-5', name: 'TacticalXI', favoriteSport: 'football', coins: 3120, rewardPoints: 740, wins: 8, total: 14, bestStreak: 3 },
  { id: 'bench-6', name: 'CourtVision', favoriteSport: 'tennis', coins: 2690, rewardPoints: 520, wins: 6, total: 11, bestStreak: 2 },
  { id: 'bench-7', name: 'PitchSide99', favoriteSport: 'cricket', coins: 2150, rewardPoints: 340, wins: 4, total: 9, bestStreak: 2 },
];

function createDefaultState() {
  const now = new Date().toISOString();
  return {
    profile: {
      displayName: 'Arena Challenger',
      favoriteSport: 'football',
      joinedAt: now,
    },
    coins: INITIAL_COINS,
    rewardPoints: 100,
    currentStreak: 0,
    bestStreak: 0,
    lastDailyClaimAt: null,
    predictions: [],
    exchangeBets: [],
    buttonValues: DEFAULT_BUTTON_VALUES,
    transactions: [
      {
        id: 'tx-welcome',
        type: 'grant',
        label: 'Demo Welcome Virtual Coins',
        amount: INITIAL_COINS,
        balanceAfter: INITIAL_COINS,
        createdAt: now,
      },
    ],
    favorites: {
      teams: [],
      leagues: [],
      fixtures: [],
    },
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw);
    return {
      ...createDefaultState(),
      ...parsed,
      profile: { ...createDefaultState().profile, ...(parsed.profile || {}) },
      favorites: { ...createDefaultState().favorites, ...(parsed.favorites || {}) },
      exchangeBets: Array.isArray(parsed.exchangeBets) ? parsed.exchangeBets : [],
      buttonValues:
        Array.isArray(parsed.buttonValues) && parsed.buttonValues.length > 0
          ? parsed.buttonValues
          : DEFAULT_BUTTON_VALUES,
    };
  } catch {
    return createDefaultState();
  }
}

const ArenaContext = createContext(null);

export function ArenaProvider({ children }) {
  const { user, settings, updateUserState } = useAuth();
  const [state, setState] = useState(loadState);
  const [settling, setSettling] = useState(false);

  // Sync authoritative server virtual balance whenever user signs in or balance changes on backend
  useEffect(() => {
    if (user && typeof user.virtualBalance === 'number') {
      setState((prev) =>
        prev.coins === user.virtualBalance
          ? prev
          : { ...prev, coins: Number(user.virtualBalance) }
      );
    }
  }, [user]);

  // Sync admin-configured stake preset button values from backend
  useEffect(() => {
    if (Array.isArray(settings?.buttonValues) && settings.buttonValues.length > 0) {
      setState((prev) => ({
        ...prev,
        buttonValues: settings.buttonValues,
      }));
    }
  }, [settings?.buttonValues]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage quota errors
    }
  }, [state]);

  const updateProfile = useCallback((updates) => {
    setState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        ...updates,
      },
    }));
  }, []);

  const hasPredictedFixture = useCallback(
    (fixtureId) => state.predictions.some((p) => String(p.fixtureId) === String(fixtureId)),
    [state.predictions]
  );

  const getPredictionForFixture = useCallback(
    (fixtureId) => state.predictions.find((p) => String(p.fixtureId) === String(fixtureId)) || null,
    [state.predictions]
  );

  /**
   * Place a virtual-coin prediction on a real SportsAPI fixture.
   * Enforces:
   * - Match must not have started yet (real API status + startTime check)
   * - No duplicate predictions for the same fixture
   * - Valid coin stake <= user's current demo virtual coin balance
   */
  const placePrediction = useCallback(
    (fixture, { pick, stake, predictedHomeScore, predictedAwayScore, multiplier }) => {
      if (!fixture || !fixture.id) {
        return { ok: false, error: 'Invalid fixture selected.' };
      }
      if (!canPredictFixture(fixture)) {
        return {
          ok: false,
          error: 'Predictions are locked once a match has started or finished.',
        };
      }
      if (state.predictions.some((p) => String(p.fixtureId) === String(fixture.id))) {
        return {
          ok: false,
          error: 'You already have an active prediction on this match. Duplicate picks are not allowed.',
        };
      }
      const numericStake = Math.floor(Number(stake));
      if (!numericStake || numericStake < 10) {
        return { ok: false, error: 'Minimum virtual stake is 10 coins.' };
      }
      if (numericStake > state.coins) {
        return { ok: false, error: 'Insufficient virtual coins for this stake.' };
      }
      if (!['home', 'draw', 'away'].includes(pick)) {
        return { ok: false, error: 'Please select a match outcome (Home, Draw, or Away).' };
      }

      const cleanHomeScore =
        predictedHomeScore !== '' && predictedHomeScore !== null && predictedHomeScore !== undefined
          ? Number(predictedHomeScore)
          : null;
      const cleanAwayScore =
        predictedAwayScore !== '' && predictedAwayScore !== null && predictedAwayScore !== undefined
          ? Number(predictedAwayScore)
          : null;

      const safeMultiplier = Math.max(1.15, Math.min(25, Number(multiplier) || 2.0));
      const potentialPayout = Math.round(numericStake * safeMultiplier);
      const now = new Date().toISOString();
      const homeName = getTeamDisplayName(fixture.home, 'Home');
      const awayName = getTeamDisplayName(fixture.away, 'Away');
      const newBalance = state.coins - numericStake;

      const prediction = {
        id: `pred-${fixture.id}-${Date.now()}`,
        fixtureId: fixture.id,
        sport: fixture.sport || 'football',
        leagueName: fixture.league?.name || 'Tournament',
        homeTeam: {
          id: fixture.home?.id || null,
          name: homeName,
          image: fixture.home?.image || null,
        },
        awayTeam: {
          id: fixture.away?.id || null,
          name: awayName,
          image: fixture.away?.image || null,
        },
        startTime: fixture.startTime,
        pick,
        predictedHomeScore: Number.isNaN(cleanHomeScore) ? null : cleanHomeScore,
        predictedAwayScore: Number.isNaN(cleanAwayScore) ? null : cleanAwayScore,
        stake: numericStake,
        multiplier: Number(safeMultiplier.toFixed(2)),
        potentialPayout,
        status: 'pending',
        actualHomeScore: null,
        actualAwayScore: null,
        actualWinner: null,
        exactScoreHit: false,
        payout: 0,
        rewardPointsEarned: 0,
        placedAt: now,
        settledAt: null,
      };

      const tx = {
        id: `tx-wager-${Date.now()}`,
        type: 'wager',
        label: `Prediction: ${homeName} vs ${awayName} (${pick.toUpperCase()})`,
        amount: -numericStake,
        balanceAfter: newBalance,
        fixtureId: fixture.id,
        createdAt: now,
      };

      setState((prev) => ({
        ...prev,
        coins: prev.coins - numericStake,
        predictions: [prediction, ...prev.predictions],
        transactions: [tx, ...prev.transactions].slice(0, 100),
      }));

      return { ok: true, prediction };
    },
    [state.coins, state.predictions]
  );

  /**
   * Settle a single pending prediction using REAL live SportsAPI fixture results.
   */
  const settleSinglePrediction = useCallback(
    async (predictionId) => {
      const target = state.predictions.find((p) => p.id === predictionId);
      if (!target || target.status !== 'pending') {
        return { settled: false, message: 'Prediction is already settled.' };
      }

      const res = await getFixtureById(target.fixtureId, { forceRefresh: true });
      const fixture = res?.data;
      if (!fixture) {
        return { settled: false, message: 'Fixture data unavailable from SportsAPI.' };
      }

      const statusType = fixture.status?.type;
      const now = new Date().toISOString();

      // Handle canceled / postponed matches -> refund stake
      if (statusType === 'canceled' || statusType === 'postponed') {
        setState((prev) => {
          const newCoins = prev.coins + target.stake;
          return {
            ...prev,
            coins: newCoins,
            predictions: prev.predictions.map((p) =>
              p.id === predictionId
                ? { ...p, status: 'void', payout: target.stake, settledAt: now }
                : p
            ),
            transactions: [
              {
                id: `tx-refund-${Date.now()}`,
                type: 'refund',
                label: `Void Refund (${statusType}): ${target.homeTeam.name} vs ${target.awayTeam.name}`,
                amount: target.stake,
                balanceAfter: newCoins,
                fixtureId: target.fixtureId,
                createdAt: now,
              },
              ...prev.transactions,
            ].slice(0, 100),
          };
        });
        return { settled: true, outcome: 'void', message: `Match ${statusType}. Stake refunded.` };
      }

      if (statusType !== 'finished') {
        return {
          settled: false,
          message: `Match is currently "${fixture.status?.description || statusType}". Settlement runs once finished.`,
        };
      }

      const actualWinner = determineFixtureWinner(fixture);
      const actualHome = getScoreValue(fixture.homeScore);
      const actualAway = getScoreValue(fixture.awayScore);
      const winnerCorrect = actualWinner === target.pick;
      const hasScorePick =
        target.predictedHomeScore !== null && target.predictedAwayScore !== null;
      const exactScoreHit =
        hasScorePick &&
        actualHome !== null &&
        actualAway !== null &&
        Number(actualHome) === Number(target.predictedHomeScore) &&
        Number(actualAway) === Number(target.predictedAwayScore);

      let payout = 0;
      let pointsEarned = 0;
      if (winnerCorrect) {
        payout = target.potentialPayout;
        pointsEarned = Math.max(50, Math.round(target.stake * 0.4));
        if (exactScoreHit) {
          const exactBonus = Math.round(target.stake * 1.5);
          payout += exactBonus;
          pointsEarned += 200;
        }
      } else if (exactScoreHit) {
        payout = Math.round(target.stake * 1.5);
        pointsEarned = 150;
      }

      const outcomeStatus = winnerCorrect || exactScoreHit ? 'won' : 'lost';

      setState((prev) => {
        const newCoins = prev.coins + payout;
        const nextStreak = outcomeStatus === 'won' ? prev.currentStreak + 1 : 0;
        const nextBest = Math.max(prev.bestStreak, nextStreak);
        const newTxs = [...prev.transactions];
        if (payout > 0) {
          newTxs.unshift({
            id: `tx-win-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: 'win',
            label: `${exactScoreHit ? 'Exact Score + Win' : 'Winning Pick'}: ${target.homeTeam.name} vs ${target.awayTeam.name}`,
            amount: payout,
            balanceAfter: newCoins,
            fixtureId: target.fixtureId,
            createdAt: now,
          });
        }
        return {
          ...prev,
          coins: newCoins,
          rewardPoints: prev.rewardPoints + pointsEarned,
          currentStreak: nextStreak,
          bestStreak: nextBest,
          predictions: prev.predictions.map((p) =>
            p.id === predictionId
              ? {
                  ...p,
                  status: outcomeStatus,
                  actualHomeScore: actualHome,
                  actualAwayScore: actualAway,
                  actualWinner,
                  exactScoreHit,
                  payout,
                  rewardPointsEarned: pointsEarned,
                  settledAt: now,
                }
              : p
          ),
          transactions: newTxs.slice(0, 100),
        };
      });

      return {
        settled: true,
        outcome: outcomeStatus,
        payout,
        pointsEarned,
        message:
          outcomeStatus === 'won'
            ? `Settled: WON +${payout} coins & +${pointsEarned} pts!`
            : `Settled: Final score ${actualHome ?? '?'}-${actualAway ?? '?'} (${actualWinner || 'N/A'}).`,
      };
    },
    [state.predictions]
  );

  const settleAllPending = useCallback(async () => {
    const pending = state.predictions.filter((p) => p.status === 'pending');
    if (pending.length === 0) {
      return { checked: 0, settled: 0, message: 'No pending predictions to check.' };
    }
    setSettling(true);
    let settledCount = 0;
    let errors = 0;
    try {
      // Only query matches whose scheduled start time has already passed to save SportsAPI quota!
      const eligible = pending.filter((p) => {
        const startMs = new Date(p.startTime).getTime();
        return Number.isNaN(startMs) || startMs <= Date.now();
      });
      if (eligible.length === 0) {
        return {
          checked: 0,
          settled: 0,
          message: 'All pending matches have not started yet. Check back after full time.',
        };
      }
      for (const pred of eligible) {
        try {
          const result = await settleSinglePrediction(pred.id);
          if (result.settled) settledCount++;
        } catch {
          errors++;
        }
      }
      return {
        checked: eligible.length,
        settled: settledCount,
        message:
          settledCount > 0
            ? `Checked ${eligible.length} match(es) via SportsAPI and settled ${settledCount} prediction(s).`
            : errors > 0
            ? 'Could not verify one or more fixtures due to an API error.'
            : `Checked ${eligible.length} match(es) — still in progress or awaiting official result.`,
      };
    } finally {
      setSettling(false);
    }
  }, [state.predictions, settleSinglePrediction]);

  const canClaimDailyBonus = useMemo(() => {
    if (!state.lastDailyClaimAt) return true;
    return Date.now() - new Date(state.lastDailyClaimAt).getTime() >= DAILY_BONUS_COOLDOWN_MS;
  }, [state.lastDailyClaimAt]);

  const claimDailyBonus = useCallback(() => {
    if (!canClaimDailyBonus) {
      return { ok: false, error: 'Daily demo virtual coin bonus already claimed in the last 24 hours.' };
    }
    const now = new Date().toISOString();
    setState((prev) => {
      const nextCoins = prev.coins + DAILY_BONUS_COINS;
      return {
        ...prev,
        coins: nextCoins,
        rewardPoints: prev.rewardPoints + 25,
        lastDailyClaimAt: now,
        transactions: [
          {
            id: `tx-daily-${Date.now()}`,
            type: 'bonus',
            label: 'Daily Demo Virtual Coins Bonus',
            amount: DAILY_BONUS_COINS,
            balanceAfter: nextCoins,
            createdAt: now,
          },
          ...prev.transactions,
        ].slice(0, 100),
      };
    });
    return { ok: true, amount: DAILY_BONUS_COINS };
  }, [canClaimDailyBonus]);

  const toggleFavorite = useCallback((bucket, item) => {
    if (!['teams', 'leagues', 'fixtures'].includes(bucket) || !item?.id) return;
    setState((prev) => {
      const list = prev.favorites[bucket] || [];
      const exists = list.some((x) => String(x.id) === String(item.id));
      const updated = exists
        ? list.filter((x) => String(x.id) !== String(item.id))
        : [item, ...list].slice(0, 40);
      return {
        ...prev,
        favorites: {
          ...prev.favorites,
          [bucket]: updated,
        },
      };
    });
  }, []);

  const isFavorite = useCallback(
    (bucket, id) => {
      const list = state.favorites?.[bucket] || [];
      return list.some((x) => String(x.id) === String(id));
    },
    [state.favorites]
  );

  const resetDemoAccount = useCallback(() => {
    const fresh = createDefaultState();
    setState(fresh);
  }, []);

  const stats = useMemo(() => {
    const total = state.predictions.length;
    const pending = state.predictions.filter((p) => p.status === 'pending').length;
    const won = state.predictions.filter((p) => p.status === 'won').length;
    const lost = state.predictions.filter((p) => p.status === 'lost').length;
    const settled = won + lost;
    const winRate = settled > 0 ? Math.round((won / settled) * 100) : 0;
    const totalStaked = state.predictions.reduce((sum, p) => sum + (p.stake || 0), 0);
    const totalWonCoins = state.predictions.reduce((sum, p) => sum + (p.payout || 0), 0);
    const netProfit = totalWonCoins - state.predictions.filter((p) => p.status !== 'pending').reduce((s, p) => s + p.stake, 0);
    return {
      total,
      pending,
      won,
      lost,
      settled,
      winRate,
      totalStaked,
      totalWonCoins,
      netProfit,
    };
  }, [state.predictions]);

  const leaderboard = useMemo(() => {
    const userRow = {
      id: 'current-user',
      name: state.profile.displayName || 'Arena Challenger',
      favoriteSport: state.profile.favoriteSport || 'football',
      coins: state.coins,
      rewardPoints: state.rewardPoints,
      wins: stats.won,
      total: stats.settled,
      bestStreak: state.bestStreak,
      isCurrentUser: true,
    };
    const combined = [...DEMO_BENCHMARK_PLAYERS, userRow].sort((a, b) => {
      if (b.rewardPoints !== a.rewardPoints) return b.rewardPoints - a.rewardPoints;
      return b.coins - a.coins;
    });
    return combined.map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
      accuracy: entry.total > 0 ? Math.round((entry.wins / entry.total) * 100) : 0,
    }));
  }, [state.profile, state.coins, state.rewardPoints, state.bestStreak, stats.won, stats.settled]);

  const playInstantGameRound = useCallback(
    ({ gameName, stake, payout = 0, won = false, summary = '' }) => {
      const numericStake = Math.floor(Number(stake));
      if (!numericStake || numericStake < 10) {
        return { ok: false, error: 'Minimum virtual stake is 10 coins.' };
      }
      if (numericStake > state.coins) {
        return { ok: false, error: 'Insufficient demo virtual coins.' };
      }
      const numericPayout = Math.max(0, Math.round(Number(payout) || 0));
      const netDelta = numericPayout - numericStake;
      const now = new Date().toISOString();

      setState((prev) => {
        const nextCoins = Math.max(0, prev.coins + netDelta);
        const pointsGain = won ? Math.max(15, Math.round(numericStake * 0.2)) : 0;
        const nextStreak = won ? prev.currentStreak + 1 : 0;
        const nextBest = Math.max(prev.bestStreak, nextStreak);
        return {
          ...prev,
          coins: nextCoins,
          rewardPoints: prev.rewardPoints + pointsGain,
          currentStreak: nextStreak,
          bestStreak: nextBest,
          transactions: [
            {
              id: `tx-game-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              type: won ? 'win' : 'wager',
              label: `${gameName}: ${summary || (won ? 'Won round' : 'Played round')}`,
              amount: netDelta,
              balanceAfter: nextCoins,
              createdAt: now,
            },
            ...prev.transactions,
          ].slice(0, 120),
        };
      });

      if (user) {
        apiClient
          .post('/wallet/sync-casino', {
            gameName,
            stake: numericStake,
            payout: numericPayout,
            won,
            summary,
          })
          .then((res) => {
            if (res.data?.user) updateUserState(res.data.user);
          })
          .catch(() => {});
      }

      return { ok: true, netDelta };
    },
    [state.coins, user, updateUserState]
  );

  const placeExchangeBet = useCallback(
    ({
      fixtureId,
      matchTitle,
      market,
      runner,
      side,
      odds,
      rate = null,
      stake,
      liability,
      potentialProfit = null,
      potentialReturn = null,
      minStake = 10,
      maxStake = 500000,
    }) => {
      const numericStake = Math.floor(Number(stake));
      const numericOdds = Number(odds);
      const effectiveMin = Math.max(10, Number(minStake) || 10);
      const effectiveMax = Math.max(effectiveMin, Number(maxStake) || 500000);

      if (!fixtureId) {
        return { ok: false, error: 'Invalid match selected.' };
      }
      if (!Number.isFinite(numericOdds) || numericOdds <= 0) {
        return { ok: false, error: 'Please enter valid odds greater than 0.' };
      }
      if (!Number.isFinite(numericStake) || numericStake <= 0) {
        return { ok: false, error: 'Please enter a valid stake amount.' };
      }
      if (numericStake < effectiveMin) {
        return { ok: false, error: `Minimum stake for this market is ${effectiveMin}.` };
      }
      if (numericStake > effectiveMax) {
        return { ok: false, error: `Maximum stake for this market is ${effectiveMax.toLocaleString()}.` };
      }
      const numericLiability = Math.max(1, Number((Number(liability) || numericStake).toFixed(2)));
      if (numericLiability > state.coins) {
        return {
          ok: false,
          error: `Insufficient balance (${Math.round(state.coins)} available, ${Math.round(numericLiability)} required).`,
        };
      }

      const now = new Date().toISOString();
      const computedProfit =
        potentialProfit !== null && Number.isFinite(Number(potentialProfit))
          ? Number(Number(potentialProfit).toFixed(2))
          : numericStake;
      const computedReturn =
        potentialReturn !== null && Number.isFinite(Number(potentialReturn))
          ? Number(Number(potentialReturn).toFixed(2))
          : Number((numericLiability + computedProfit).toFixed(2));

      const bet = {
        id: `exb-${fixtureId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        fixtureId: String(fixtureId),
        matchTitle: matchTitle || 'Match',
        market: market || 'MATCH_ODDS',
        runner: runner || 'Selection',
        side: side || 'back', // 'back' | 'lay' | 'yes' | 'no'
        odds: numericOdds,
        rate: rate !== null && rate !== undefined ? Number(rate) : null,
        stake: numericStake,
        liability: numericLiability,
        potentialProfit: computedProfit,
        potentialReturn: computedReturn,
        status: 'matched', // 'matched' | 'unmatched' | 'pending' | 'won' | 'lost' | 'void'
        settledPayout: 0,
        settledAt: null,
        placedAt: now,
      };

      setState((prev) => {
        const nextCoins = Math.max(0, Number((prev.coins - numericLiability).toFixed(2)));
        return {
          ...prev,
          coins: nextCoins,
          exchangeBets: [bet, ...(prev.exchangeBets || [])].slice(0, 150),
          transactions: [
            {
              id: `tx-exb-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
              type: 'wager',
              label: `${market}: ${runner} (${String(side || 'back').toUpperCase()} @ ${numericOdds})`,
              amount: -numericLiability,
              balanceAfter: nextCoins,
              fixtureId,
              createdAt: now,
            },
            ...prev.transactions,
          ].slice(0, 120),
        };
      });

      if (user) {
        apiClient
          .post('/wallet/sync-bet', {
            fixtureId: String(fixtureId),
            eventName: matchTitle || 'Match',
            marketName: market || 'MATCH_ODDS',
            selection: runner || 'Selection',
            side: side || 'back',
            odds: numericOdds,
            stake: numericStake,
            liability: numericLiability,
            potentialProfit: computedProfit,
          })
          .then((res) => {
            if (res.data?.user) updateUserState(res.data.user);
          })
          .catch(() => {});
      }

      return { ok: true, bet };
    },
    [state.coins, user, updateUserState]
  );

  /**
   * Settle matched/pending exchange bets for a fixture using official market rules
   * (regular time 90m+stoppage for Football, 48h postpone/walkover void, Draw No Bet void on Draw,
   * Goals Odd/Even 0-0=Even, Team A/B +1/+2/+3 Handicap, BTTS, U/O abandonment rules, 1st Period, HT/FT, Correct Score).
   */
  const settleExchangeBetsForFixture = useCallback((fixture) => {
    if (!fixture || !fixture.id) return { settled: 0 };
    const statusInfo = classifyFixtureStatus(fixture);
    if (!statusInfo.isSettleable) {
      return { settled: 0 };
    }

    const fxId = String(fixture.id);
    const now = new Date().toISOString();
    let settledCount = 0;

    setState((prev) => {
      const existing = prev.exchangeBets || [];
      const openForFx = existing.filter(
        (b) =>
          String(b.fixtureId) === fxId &&
          (b.status === 'matched' || b.status === 'pending' || b.status === 'unmatched')
      );
      if (openForFx.length === 0) return prev;

      let nextCoins = prev.coins;
      const newTxs = [...prev.transactions];

      const updatedBets = existing.map((b) => {
        if (
          String(b.fixtureId) !== fxId ||
          !['matched', 'pending', 'unmatched'].includes(b.status)
        ) {
          return b;
        }

        const evaluation = evaluateExchangeBetSettlement(b, fixture);
        if (evaluation.outcome === 'pending') {
          return b;
        }

        if (evaluation.outcome === 'void') {
          const refund = Number(b.liability || b.stake || 0);
          nextCoins = Number((nextCoins + refund).toFixed(2));
          settledCount += 1;
          newTxs.unshift({
            id: `tx-exvoid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: 'refund',
            label: `Void Refund (${b.market}): ${b.runner} — ${evaluation.reason}`,
            amount: refund,
            balanceAfter: nextCoins,
            fixtureId: fxId,
            createdAt: now,
          });
          return {
            ...b,
            status: 'void',
            settledPayout: refund,
            settledReason: evaluation.reason,
            settledAt: now,
          };
        }

        const isBack = b.side === 'back' || b.side === 'yes';
        const betWon = evaluation.outcome === 'won';
        const liabilityAmt = Number(b.liability || b.stake || 0);
        const profitAmt = Number(
          b.potentialProfit !== undefined && b.potentialProfit !== null
            ? b.potentialProfit
            : isBack
            ? Number((b.stake * Math.max(0.01, Number(b.odds) - 1)).toFixed(2))
            : b.stake
        );
        const payout = betWon ? Number((liabilityAmt + profitAmt).toFixed(2)) : 0;

        settledCount += 1;
        if (payout > 0) {
          nextCoins = Number((nextCoins + payout).toFixed(2));
          newTxs.unshift({
            id: `tx-exwin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: 'win',
            label: `Settled WIN (${b.market}): ${b.runner}`,
            amount: payout,
            balanceAfter: nextCoins,
            fixtureId: fxId,
            createdAt: now,
          });
        }

        return {
          ...b,
          status: betWon ? 'won' : 'lost',
          settledPayout: payout,
          settledReason: evaluation.reason,
          settledAt: now,
        };
      });

      if (settledCount === 0) return prev;
      return {
        ...prev,
        coins: nextCoins,
        exchangeBets: updatedBets,
        transactions: newTxs.slice(0, 120),
      };
    });

    return { settled: settledCount };
  }, []);

  const settleAllExchangeBets = useCallback(async () => {
    const openBets = (state.exchangeBets || []).filter(
      (b) => b.status === 'matched' || b.status === 'pending' || b.status === 'unmatched'
    );
    if (openBets.length === 0) {
      return { checked: 0, settled: 0, message: 'No open exchange bets to verify.' };
    }
    const uniqueFixtureIds = [...new Set(openBets.map((b) => b.fixtureId))];
    setSettling(true);
    let totalSettled = 0;
    let apiErrors = 0;
    try {
      for (const fxId of uniqueFixtureIds) {
        try {
          const res = await getFixtureById(fxId, { forceRefresh: true });
          if (res?.data) {
            const out = settleExchangeBetsForFixture(res.data);
            totalSettled += out.settled;
          }
        } catch {
          apiErrors += 1;
        }
      }
      return {
        checked: uniqueFixtureIds.length,
        settled: totalSettled,
        message:
          totalSettled > 0
            ? `Verified via SportsAPI and settled ${totalSettled} bet(s).`
            : apiErrors > 0
            ? 'SportsAPI verification encountered an error. Please try again.'
            : 'All open bets are on live or scheduled matches awaiting official full-time result.',
      };
    } finally {
      setSettling(false);
    }
  }, [state.exchangeBets, settleExchangeBetsForFixture]);

  const getExchangeBetsForFixture = useCallback(
    (fixtureId) => (state.exchangeBets || []).filter((b) => String(b.fixtureId) === String(fixtureId)),
    [state.exchangeBets]
  );

  const updateButtonValues = useCallback((nextButtons) => {
    if (!Array.isArray(nextButtons) || nextButtons.length === 0) return;
    const cleaned = nextButtons.map((btn, idx) => {
      const num = Math.max(10, Math.floor(Number(btn.value) || 100));
      const lbl = String(btn.label || num).trim() || String(num);
      return { label: lbl.slice(0, 10), value: num, idx };
    }).map(({ label, value }) => ({ label, value }));
    setState((prev) => ({
      ...prev,
      buttonValues: cleaned,
    }));
  }, []);

  const value = useMemo(
    () => ({
      state,
      stats,
      leaderboard,
      settling,
      canClaimDailyBonus,
      updateProfile,
      hasPredictedFixture,
      getPredictionForFixture,
      placePrediction,
      settleSinglePrediction,
      settleAllPending,
      claimDailyBonus,
      toggleFavorite,
      isFavorite,
      resetDemoAccount,
      playInstantGameRound,
      placeExchangeBet,
      settleExchangeBetsForFixture,
      settleAllExchangeBets,
      getExchangeBetsForFixture,
      updateButtonValues,
    }),
    [
      state,
      stats,
      leaderboard,
      settling,
      canClaimDailyBonus,
      updateProfile,
      hasPredictedFixture,
      getPredictionForFixture,
      placePrediction,
      settleSinglePrediction,
      settleAllPending,
      claimDailyBonus,
      toggleFavorite,
      isFavorite,
      resetDemoAccount,
      playInstantGameRound,
      placeExchangeBet,
      settleExchangeBetsForFixture,
      settleAllExchangeBets,
      getExchangeBetsForFixture,
      updateButtonValues,
    ]
  );

  return <ArenaContext.Provider value={value}>{children}</ArenaContext.Provider>;
}

export function useArena() {
  const ctx = useContext(ArenaContext);
  if (!ctx) throw new Error('useArena must be used inside ArenaProvider');
  return ctx;
}
