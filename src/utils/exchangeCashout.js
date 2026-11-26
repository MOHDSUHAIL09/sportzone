/**
 * Authentic Exchange Book Exposure & Cashout Hedging Engine
 * Supports both Decimal Odds (MATCH_ODDS, Tied Match, Football markets)
 * and Indian Exchange Bookmaker Bhav / Paisa Odds (Bookmaker, Bookmaker 2).
 */

export function isBookmakerMarket(marketName) {
  const m = String(marketName || '').trim().toLowerCase();
  return m === 'bookmaker' || m === 'bookmaker 2' || m === 'bookmaker2';
}

export function isFancyMarket(marketName) {
  const m = String(marketName || '').trim().toLowerCase();
  return m === 'normal' || m === 'over by over' || m === 'ball by ball' || m === 'fancy';
}

export function toDecimalOdds(marketName, rawOdds) {
  const n = Number(rawOdds);
  if (!Number.isFinite(n) || n <= 0) return 1.01;
  if (isBookmakerMarket(marketName)) {
    // Bhav / paisa pricing: e.g. 23 -> 1.23, 24.5 -> 1.245, 408 -> 5.08
    return Number((1 + Math.max(0.01, n / 100)).toFixed(4));
  }
  return Math.max(1.01, n);
}

/**
 * Compute per-runner net profit/loss book and true worst-case exposure for a market.
 * Optionally includes a hypothetical bet (for live slip preview or post-cashout verification).
 */
export function computeMarketBook(bets = [], marketName = 'MATCH_ODDS', runnerNames = [], hypotheticalBets = []) {
  const active = (bets || []).filter(
    (b) =>
      b.market === marketName &&
      ['matched', 'pending', 'unmatched'].includes(String(b.status || 'matched').toLowerCase())
  );

  const extra = Array.isArray(hypotheticalBets)
    ? hypotheticalBets.filter(Boolean)
    : hypotheticalBets
    ? [hypotheticalBets]
    : [];

  const allBets = [...active, ...extra];

  // Ensure every runner referenced by any bet is present alongside the market's official runners
  const uniqueRunners = [];
  const seen = new Set();
  for (const r of runnerNames || []) {
    if (r && !seen.has(r)) {
      seen.add(r);
      uniqueRunners.push(r);
    }
  }
  for (const b of allBets) {
    if (b.runner && !seen.has(b.runner)) {
      seen.add(b.runner);
      uniqueRunners.push(b.runner);
    }
  }

  // If a bet exists on only 1 runner in a 2-way market without runnerNames passed (e.g. header exposure calc),
  // include a synthetic "Other Outcome" so opposing side loss/profit is always captured accurately.
  if (allBets.length > 0 && uniqueRunners.length < 2) {
    uniqueRunners.push('__OTHER_OUTCOME__');
  }

  if (allBets.length === 0) {
    return {
      hasBets: false,
      betCount: 0,
      runners: uniqueRunners,
      netByRunner: {},
      minNet: 0,
      maxNet: 0,
      worstCaseExposure: 0,
    };
  }

  const netByRunner = {};
  for (const runner of uniqueRunners) {
    let net = 0;
    for (const b of allBets) {
      const dec = toDecimalOdds(marketName, b.odds);
      const stake = Number(b.stake) || 0;
      const isThis = b.runner === runner;
      if (b.side === 'back' || b.side === 'yes') {
        net += isThis ? stake * (dec - 1) : -stake;
      } else {
        net += isThis ? -(stake * (dec - 1)) : stake;
      }
    }
    netByRunner[runner] = Number(net.toFixed(2));
  }

  const values = Object.values(netByRunner);
  const minNet = values.length ? Math.min(...values) : 0;
  const maxNet = values.length ? Math.max(...values) : 0;
  const worstCaseExposure = minNet < 0 ? Number(Math.abs(minNet).toFixed(2)) : 0;

  return {
    hasBets: true,
    betCount: allBets.length,
    runners: uniqueRunners,
    netByRunner,
    minNet: Number(minNet.toFixed(2)),
    maxNet: Number(maxNet.toFixed(2)),
    worstCaseExposure,
  };
}

/**
 * Compute TRUE total exchange exposure across all open bets in the user's account.
 * Groups mutually-exclusive book markets (MATCH_ODDS, Bookmaker, Bookmaker 2, etc.) by (fixtureId, market)
 * so opposing Back + Lay positions offset exposure accurately instead of double-charging.
 */
export function computeTotalExchangeExposure(exchangeBets = []) {
  const open = (exchangeBets || []).filter((b) =>
    ['matched', 'pending', 'unmatched'].includes(String(b.status || 'matched').toLowerCase())
  );
  if (!open.length) return 0;

  const groupedBooks = new Map();
  let fancyExposure = 0;

  for (const b of open) {
    if (isFancyMarket(b.market)) {
      fancyExposure += Number(b.liability || b.stake || 0);
    } else {
      const key = `${b.fixtureId}::${b.market}`;
      if (!groupedBooks.has(key)) {
        groupedBooks.set(key, { market: b.market, bets: [], runnerSet: new Set() });
      }
      const entry = groupedBooks.get(key);
      entry.bets.push(b);
      if (b.runner) entry.runnerSet.add(b.runner);
      if (Array.isArray(b.marketRunners)) {
        b.marketRunners.forEach((rn) => {
          if (rn) entry.runnerSet.add(rn);
        });
      }
    }
  }

  let bookExposure = 0;
  for (const entry of groupedBooks.values()) {
    const runners = Array.from(entry.runnerSet);
    const book = computeMarketBook(entry.bets, entry.market, runners);
    bookExposure += book.worstCaseExposure;
  }

  return Number((bookExposure + fancyExposure).toFixed(2));
}

function buildHedgeLeg(marketName, runnerName, side, rawOdds, rawStake) {
  const stake = Number(rawStake.toFixed(2));
  const dec = toDecimalOdds(marketName, rawOdds);
  const profit = side === 'back' ? Number((stake * (dec - 1)).toFixed(2)) : stake;
  const liability = side === 'back' ? stake : Number((stake * (dec - 1)).toFixed(2));
  return {
    market: marketName,
    runner: runnerName,
    side,
    odds: rawOdds,
    decimalOdds: dec,
    stake,
    liability,
    potentialProfit: profit,
    potentialReturn: Number((liability + profit).toFixed(2)),
    isCashout: true,
  };
}

/**
 * Calculate exact Green-Book / Loss-Cut Cashout hedge leg(s) for MATCH_ODDS, Bookmaker, or Bookmaker 2.
 * runnersWithOdds: Array<{ name: string, backOdds: number | null, layOdds: number | null, suspended?: boolean }>
 */
export function calculateMarketCashout(bets = [], marketName = 'MATCH_ODDS', runnersWithOdds = []) {
  const runnerNames = runnersWithOdds.map((r) => r.name);
  const currentBook = computeMarketBook(bets, marketName, runnerNames);

  if (!currentBook.hasBets) {
    return {
      eligible: false,
      alreadyHedged: false,
      reason: `Place a Back or Lay bet in ${marketName} first to use Cashout.`,
      currentBook,
    };
  }

  const spread = Number((currentBook.maxNet - currentBook.minNet).toFixed(2));
  if (spread < 2) {
    return {
      eligible: false,
      alreadyHedged: true,
      guaranteedPL: currentBook.minNet,
      reason: '',
      currentBook,
    };
  }

  const activeRunners = runnersWithOdds.filter((r) => !r.suspended);
  if (activeRunners.length < 2) {
    return {
      eligible: false,
      alreadyHedged: false,
      reason: `${marketName} Cashout is temporarily unavailable while market is suspended.`,
      currentBook,
    };
  }

  // 2-Runner Market (Cricket MATCH_ODDS, Bookmaker, Bookmaker 2, Tennis, Basketball, etc.)
  if (runnersWithOdds.length === 2) {
    const [rA, rB] = runnersWithOdds;
    const pA = currentBook.netByRunner[rA.name] ?? 0;
    const pB = currentBook.netByRunner[rB.name] ?? 0;

    const leader = pA >= pB ? rA : rB;
    const trailer = pA >= pB ? rB : rA;
    const pHigh = Math.max(pA, pB);
    const pLow = Math.min(pA, pB);
    const diff = pHigh - pLow;

    const candidates = [];

    // Option 1: LAY the leading runner at its current Lay price
    if (!leader.suspended && leader.layOdds && Number(leader.layOdds) > 0) {
      const layDec = toDecimalOdds(marketName, leader.layOdds);
      const stake = diff / layDec;
      if (stake >= 1) {
        const leg = buildHedgeLeg(marketName, leader.name, 'lay', leader.layOdds, stake);
        const afterBook = computeMarketBook(bets, marketName, runnerNames, [leg]);
        candidates.push({
          legs: [leg],
          guaranteedPL: afterBook.minNet,
          afterBook,
        });
      }
    }

    // Option 2: BACK the trailing runner at its current Back price
    if (!trailer.suspended && trailer.backOdds && Number(trailer.backOdds) > 0) {
      const backDec = toDecimalOdds(marketName, trailer.backOdds);
      const stake = diff / backDec;
      if (stake >= 1) {
        const leg = buildHedgeLeg(marketName, trailer.name, 'back', trailer.backOdds, stake);
        const afterBook = computeMarketBook(bets, marketName, runnerNames, [leg]);
        candidates.push({
          legs: [leg],
          guaranteedPL: afterBook.minNet,
          afterBook,
        });
      }
    }

    if (!candidates.length) {
      return {
        eligible: false,
        alreadyHedged: false,
        reason: 'Live odds unavailable for Cashout right now.',
        currentBook,
      };
    }

    // Choose whichever hedge gives the higher guaranteed profit (or smaller loss)
    candidates.sort((a, b) => b.guaranteedPL - a.guaranteedPL);
    const best = candidates[0];
    const exposureReleased = Number(
      (currentBook.worstCaseExposure - best.afterBook.worstCaseExposure).toFixed(2)
    );

    return {
      eligible: true,
      alreadyHedged: false,
      market: marketName,
      legs: best.legs,
      primaryLeg: best.legs[0],
      guaranteedPL: best.guaranteedPL,
      currentBook,
      afterBook: best.afterBook,
      currentExposure: currentBook.worstCaseExposure,
      newExposure: best.afterBook.worstCaseExposure,
      exposureReleased,
      runnerNames,
    };
  }

  // 3+ Runner Market (Football / Test Cricket MATCH_ODDS with Draw)
  const nets = runnersWithOdds.map((r) => ({
    runner: r,
    net: currentBook.netByRunner[r.name] ?? 0,
  }));

  // Case A: Only 1 runner differs from all other runners (standard single-runner trade)
  const sortedByNet = [...nets].sort((a, b) => b.net - a.net);
  const top = sortedByNet[0];
  const bottom = sortedByNet[sortedByNet.length - 1];
  const restAfterTop = sortedByNet.slice(1);
  const restBeforeBottom = sortedByNet.slice(0, -1);

  const othersEqualAfterTop = restAfterTop.every((x) => Math.abs(x.net - bottom.net) < 0.5);
  const othersEqualBeforeBottom = restBeforeBottom.every((x) => Math.abs(x.net - top.net) < 0.5);

  const legs = [];

  if (othersEqualAfterTop && top.runner.layOdds && !top.runner.suspended) {
    const layDec = toDecimalOdds(marketName, top.runner.layOdds);
    const stake = (top.net - bottom.net) / layDec;
    if (stake >= 1) {
      legs.push(buildHedgeLeg(marketName, top.runner.name, 'lay', top.runner.layOdds, stake));
    }
  } else if (othersEqualBeforeBottom && bottom.runner.backOdds && !bottom.runner.suspended) {
    const backDec = toDecimalOdds(marketName, bottom.runner.backOdds);
    const stake = (top.net - bottom.net) / backDec;
    if (stake >= 1) {
      legs.push(buildHedgeLeg(marketName, bottom.runner.name, 'back', bottom.runner.backOdds, stake));
    }
  } else {
    // General multi-runner equalization: lay every runner above the minimum down toward equalized value
    // Solve target equalized P/L: sum_i (P_i - T) / L_i = 0? No: if we lay runner i by S_i,
    // net_i' = P_i - S_i * L_i + sum_j S_j = T  =>  S_i = (P_i - baseline) / L_i
    // Iteratively neutralize each runner above minNet using exact sequential LAY legs.
    const workingBets = [...bets];
    for (let iter = 0; iter < runnersWithOdds.length - 1; iter += 1) {
      const wb = computeMarketBook(workingBets, marketName, runnerNames);
      const ranked = runnersWithOdds
        .map((r) => ({ r, net: wb.netByRunner[r.name] ?? 0 }))
        .sort((a, b) => b.net - a.net);
      const hi = ranked[0];
      const lo = ranked[ranked.length - 1];
      if (hi.net - lo.net < 1) break;
      if (hi.r.layOdds && !hi.r.suspended) {
        const layDec = toDecimalOdds(marketName, hi.r.layOdds);
        const stake = (hi.net - lo.net) / layDec;
        if (stake >= 1) {
          const leg = buildHedgeLeg(marketName, hi.r.name, 'lay', hi.r.layOdds, stake);
          legs.push(leg);
          workingBets.push({ ...leg, status: 'matched' });
        }
      }
    }
  }

  if (!legs.length) {
    return {
      eligible: false,
      alreadyHedged: false,
      reason: 'Unable to calculate Cashout hedge at current market prices.',
      currentBook,
    };
  }

  const afterBook = computeMarketBook(bets, marketName, runnerNames, legs);
  const exposureReleased = Number(
    (currentBook.worstCaseExposure - afterBook.worstCaseExposure).toFixed(2)
  );

  return {
    eligible: true,
    alreadyHedged: false,
    market: marketName,
    legs,
    primaryLeg: legs[0],
    guaranteedPL: afterBook.minNet,
    currentBook,
    afterBook,
    currentExposure: currentBook.worstCaseExposure,
    newExposure: afterBook.worstCaseExposure,
    exposureReleased,
    runnerNames,
  };
}
