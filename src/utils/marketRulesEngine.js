import { determineFixtureWinner, getTeamDisplayName } from './formatters';

/**
 * Official Exchange Market Settlement Engine
 * Enforces authentic Football & multi-sport market rules:
 * - Regular time (90 min + stoppage only, excluding Extra Time & Penalty Shootouts)
 * - 48-hour postponement / Walkover / Forfeit void refunds
 * - Already-determined settlement on abandoned matches (Over Goals, BTTS Yes)
 * - Draw No Bet void on Draw
 * - Goals Odd/Even (0-0 = Even)
 * - Team A/B +1/+2/+3 Virtual-Goal Handicap adjustment
 * - 1st Period Winner, 1st Half Under/Over, HT/FT, Correct Score
 */

function toInt(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return Number.isFinite(n) ? Math.floor(n) : null;
}

/**
 * Extract 90-minute regular time score (excluding extra time / penalty shootouts)
 * and 1st-half score from a SportsAPI fixture object.
 */
export function extractFootballRegularScores(fixture) {
  const hs = fixture?.homeScore || {};
  const as = fixture?.awayScore || {};

  const htHome = toInt(hs.period1 ?? hs.halfTime ?? hs.ht);
  const htAway = toInt(as.period1 ?? as.halfTime ?? as.ht);

  const p2Home = toInt(hs.period2);
  const p2Away = toInt(as.period2);

  // Prefer explicit normaltime, else period1 + period2 (excludes extra1/extra2/penalties), else current
  let ftHome = toInt(hs.normaltime ?? hs.regular);
  let ftAway = toInt(as.normaltime ?? as.regular);

  if (ftHome === null && htHome !== null && p2Home !== null) {
    ftHome = htHome + p2Home;
  }
  if (ftAway === null && htAway !== null && p2Away !== null) {
    ftAway = htAway + p2Away;
  }

  if (ftHome === null) ftHome = toInt(hs.current ?? hs.display ?? hs.total);
  if (ftAway === null) ftAway = toInt(as.current ?? as.display ?? as.total);

  const regularWinner =
    ftHome !== null && ftAway !== null
      ? ftHome > ftAway
        ? 'home'
        : ftAway > ftHome
        ? 'away'
        : 'draw'
      : null;

  const htWinner =
    htHome !== null && htAway !== null
      ? htHome > htAway
        ? 'home'
        : htAway > htHome
        ? 'away'
        : 'draw'
      : null;

  return { ftHome, ftAway, htHome, htAway, regularWinner, htWinner };
}

/**
 * Check if fixture was forfeited, awarded by walkover, postponed, canceled, or abandoned.
 */
export function classifyFixtureStatus(fixture) {
  const type = String(fixture?.status?.type || '').toLowerCase();
  const desc = String(fixture?.status?.description || '').toLowerCase();

  const isWalkoverOrForfeit =
    desc.includes('walkover') ||
    desc.includes('forfeit') ||
    desc.includes('awarded') ||
    type === 'walkover' ||
    type === 'forfeit';

  const isAbandoned =
    type === 'abandoned' ||
    type === 'interrupted' ||
    desc.includes('abandoned') ||
    desc.includes('suspended');

  const isCanceledOrPostponed =
    type === 'canceled' ||
    type === 'cancelled' ||
    type === 'postponed' ||
    desc.includes('postponed') ||
    desc.includes('canceled') ||
    desc.includes('cancelled');

  const isFinished = type === 'finished' && !isWalkoverOrForfeit;

  return {
    isFinished,
    isWalkoverOrForfeit,
    isAbandoned,
    isCanceledOrPostponed,
    isSettleable: isFinished || isWalkoverOrForfeit || isAbandoned || isCanceledOrPostponed,
  };
}

/**
 * Football Handicap Market evaluator (Team A/B +1/+2/+3)
 * Example: Actual 1-3, Market "Team A +2" => Adjusted Team A = 1+2 = 3 vs Team B = 3 => "draw"
 */
export function evaluateFootballHandicap(ftHome, ftAway, teamSide, plusGoals) {
  if (ftHome === null || ftAway === null) return null;
  const adjHome = teamSide === 'home' ? ftHome + plusGoals : ftHome;
  const adjAway = teamSide === 'away' ? ftAway + plusGoals : ftAway;
  if (adjHome > adjAway) return 'home';
  if (adjAway > adjHome) return 'away';
  return 'draw';
}

function parseLineNumber(text) {
  const match = String(text || '').match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Settle any exchange bet against a confirmed fixture following official market rules.
 * Returns: { outcome: 'won' | 'lost' | 'void' | 'pending', reason: string }
 */
export function evaluateExchangeBetSettlement(bet, fixture) {
  if (!bet || !fixture) return { outcome: 'pending', reason: 'Missing fixture data' };

  const statusInfo = classifyFixtureStatus(fixture);
  if (!statusInfo.isSettleable) {
    return { outcome: 'pending', reason: 'Match not yet finalized' };
  }

  // Unmatched bets at settlement always void & refund liability
  if (bet.status === 'unmatched') {
    return { outcome: 'void', reason: 'Unmatched bet refunded at full time' };
  }

  // Rule: Walkover / Forfeit without kick-off OR Postponed > 48h / Canceled -> ALL bets VOID
  if (statusInfo.isWalkoverOrForfeit) {
    return { outcome: 'void', reason: 'Walkover / Forfeit — all bets void per market rules' };
  }
  if (statusInfo.isCanceledOrPostponed) {
    return { outcome: 'void', reason: 'Postponed / Canceled (>48h rule) — stake refunded' };
  }

  const sport = String(fixture.sport || '').toLowerCase();
  const isFootball = sport === 'football' || sport === 'soccer' || sport === 'esoccer' || sport === 'futsal';
  const homeName = getTeamDisplayName(fixture.home, 'Home').toLowerCase();
  const awayName = getTeamDisplayName(fixture.away, 'Away').toLowerCase();
  const marketRaw = String(bet.market || '').trim();
  const marketLower = marketRaw.toLowerCase();
  const runnerLower = String(bet.runner || '').trim().toLowerCase();
  const isBack = bet.side === 'back' || bet.side === 'yes';

  const scores = extractFootballRegularScores(fixture);
  const officialWinner = isFootball
    ? scores.regularWinner
    : determineFixtureWinner(fixture);

  // Helper to resolve back/lay once selection win boolean is known
  const finalize = (didSelectionWin, reason) => ({
    outcome: (isBack ? didSelectionWin : !didSelectionWin) ? 'won' : 'lost',
    reason,
  });

  // 1. Under / Over Goals (Full 90-min regular time)
  if (
    marketLower.includes('under/over') ||
    marketLower.includes('under_over') ||
    marketLower.includes('over/under')
  ) {
    const isFirstHalf =
      marketLower.includes('first half') ||
      marketLower.includes('1st half') ||
      runnerLower.includes('1st half');

    const line = parseLineNumber(marketRaw) ?? parseLineNumber(runnerLower) ?? 2.5;
    const hGoals = isFirstHalf ? scores.htHome : scores.ftHome;
    const aGoals = isFirstHalf ? scores.htAway : scores.ftAway;
    const totalGoals = hGoals !== null && aGoals !== null ? hGoals + aGoals : null;
    const isOverPick = runnerLower.includes('over');
    const isUnderPick = runnerLower.includes('under');

    if (totalGoals !== null && (isOverPick || isUnderPick)) {
      // Abandoned rule: settle ONLY if already determined (totalGoals > line)
      if (statusInfo.isAbandoned) {
        if (totalGoals > line) {
          return finalize(isOverPick, `Market already determined (${totalGoals} goals > ${line}) before abandonment`);
        }
        return { outcome: 'void', reason: 'Match abandoned before Over/Under outcome was determined' };
      }
      if (totalGoals === line) {
        return { outcome: 'void', reason: `Exact goal line (${line}) push — stake refunded` };
      }
      return finalize(isOverPick ? totalGoals > line : totalGoals < line, `Regular time total: ${totalGoals} goals`);
    }
    if (statusInfo.isAbandoned) {
      return { outcome: 'void', reason: 'Match abandoned — void refund' };
    }
  }

  // 2. Both Teams to Score (BTTS)
  if (marketLower.includes('both teams to score') || marketLower === 'btts') {
    const bothScored =
      scores.ftHome !== null && scores.ftAway !== null && scores.ftHome >= 1 && scores.ftAway >= 1;
    if (statusInfo.isAbandoned) {
      // Abandoned rule: settle if already determined (both teams already scored)
      if (bothScored) {
        return finalize(runnerLower === 'yes', 'BTTS already determined before abandonment');
      }
      return { outcome: 'void', reason: 'Match abandoned before BTTS outcome was determined' };
    }
    if (scores.ftHome !== null && scores.ftAway !== null) {
      if (runnerLower === 'yes') return finalize(bothScored, `Regular time ${scores.ftHome}-${scores.ftAway}`);
      if (runnerLower === 'no') return finalize(!bothScored, `Regular time ${scores.ftHome}-${scores.ftAway}`);
    }
  }

  // Remaining markets void immediately on abandonment (unless 1st Period already finished before HT)
  if (statusInfo.isAbandoned) {
    if (marketLower.includes('1st period') && scores.htWinner && scores.ftHome !== null) {
      // If abandoned after half-time, 1st Period Winner stands only if 2nd half started
      const desc = String(fixture?.status?.description || '').toLowerCase();
      if (desc.includes('2nd') || desc.includes('second')) {
        if (runnerLower === homeName) return finalize(scores.htWinner === 'home', '1st Period completed before abandonment');
        if (runnerLower === awayName) return finalize(scores.htWinner === 'away', '1st Period completed before abandonment');
        if (runnerLower === 'draw' || runnerLower === 'the draw') return finalize(scores.htWinner === 'draw', '1st Period completed before abandonment');
      }
    }
    return { outcome: 'void', reason: 'Match abandoned — bets voided per market rules' };
  }

  // 3. Draw No Bet (Regular time; exact Draw => VOID & refund!)
  if (marketLower.includes('draw no bet')) {
    if (!officialWinner) return { outcome: 'pending', reason: 'Awaiting regular time score' };
    if (officialWinner === 'draw') {
      return { outcome: 'void', reason: 'Draw No Bet: Match ended in a Draw — stake refunded' };
    }
    if (runnerLower === homeName) return finalize(officialWinner === 'home', 'Draw No Bet settled on regular time');
    if (runnerLower === awayName) return finalize(officialWinner === 'away', 'Draw No Bet settled on regular time');
  }

  // 4. Goals Odd / Even (0-0 settles as EVEN!)
  if (marketLower.includes('odd/even') || marketLower.includes('odd / even')) {
    if (scores.ftHome !== null && scores.ftAway !== null) {
      const total = scores.ftHome + scores.ftAway;
      const isEven = total % 2 === 0; // 0-0 => 0 % 2 === 0 => EVEN
      if (runnerLower.includes('even')) return finalize(isEven, `Total ${total} goals (0-0 = Even)`);
      if (runnerLower.includes('odd')) return finalize(!isEven, `Total ${total} goals`);
    }
  }

  // 5. 1st Period Winner
  if (marketLower.includes('1st period')) {
    if (!scores.htWinner) return { outcome: 'pending', reason: 'Awaiting 1st half score' };
    if (runnerLower === homeName) return finalize(scores.htWinner === 'home', `1st Half ${scores.htHome}-${scores.htAway}`);
    if (runnerLower === awayName) return finalize(scores.htWinner === 'away', `1st Half ${scores.htHome}-${scores.htAway}`);
    if (runnerLower === 'draw' || runnerLower === 'the draw') return finalize(scores.htWinner === 'draw', `1st Half ${scores.htHome}-${scores.htAway}`);
  }

  // 6. Team A/B +1 / +2 / +3 Handicap (Virtual goal adjustment)
  const hcMatch = marketRaw.match(/\+(\d+)/);
  if (marketLower.includes('handicap') || hcMatch) {
    const plusGoals = hcMatch ? Number(hcMatch[1]) : 1;
    const isAwayHandicap =
      marketLower.includes('team b') ||
      (awayName && marketLower.includes(awayName) && !marketLower.includes(homeName));
    const hcSide = isAwayHandicap ? 'away' : 'home';
    const hcResult = evaluateFootballHandicap(scores.ftHome, scores.ftAway, hcSide, plusGoals);
    if (hcResult) {
      if (runnerLower.includes('draw')) {
        return finalize(hcResult === 'draw', `Handicap (+${plusGoals}) adjusted result: ${hcResult.toUpperCase()}`);
      }
      if (runnerLower.includes(homeName) || runnerLower.includes('team a')) {
        return finalize(hcResult === 'home', `Handicap (+${plusGoals}) adjusted result: ${hcResult.toUpperCase()}`);
      }
      if (runnerLower.includes(awayName) || runnerLower.includes('team b')) {
        return finalize(hcResult === 'away', `Handicap (+${plusGoals}) adjusted result: ${hcResult.toUpperCase()}`);
      }
    }
  }

  // 7. HT / FT (Half-Time / Full-Time)
  if (marketLower === 'ht/ft' || marketLower.includes('ht/ft')) {
    if (scores.htWinner && scores.regularWinner) {
      const codeMap = { home: 'h', away: 'a', draw: 'd' };
      const htCode = codeMap[scores.htWinner];
      const ftCode = codeMap[scores.regularWinner];
      const parts = runnerLower.split('/').map((s) => s.trim());
      if (parts.length === 2) {
        const matchPart = (p, code) =>
          (code === 'h' && (p === homeName || p === 'home' || p === '1' || p === 'h')) ||
          (code === 'a' && (p === awayName || p === 'away' || p === '2' || p === 'a')) ||
          (code === 'd' && (p === 'draw' || p === 'x' || p === 'd'));
        const hit = matchPart(parts[0], htCode) && matchPart(parts[1], ftCode);
        return finalize(hit, `HT ${scores.htHome}-${scores.htAway} / FT ${scores.ftHome}-${scores.ftAway}`);
      }
    }
  }

  // 8. Correct Score (Regular Time only)
  if (marketLower.includes('correct score')) {
    if (scores.ftHome !== null && scores.ftAway !== null) {
      const scoreMatch = runnerLower.match(/^(\d+)\s*[-:]\s*(\d+)$/);
      if (scoreMatch) {
        const hit = Number(scoreMatch[1]) === scores.ftHome && Number(scoreMatch[2]) === scores.ftAway;
        return finalize(hit, `Final Regular Score: ${scores.ftHome}-${scores.ftAway}`);
      }
    }
  }

  // 9. Tied Match
  if (marketLower === 'tied match') {
    if (!officialWinner) return { outcome: 'pending', reason: 'Awaiting official result' };
    const isTie = officialWinner === 'draw';
    if (runnerLower === 'yes') return finalize(isTie, 'Tied Match settled');
    if (runnerLower === 'no') return finalize(!isTie, 'Tied Match settled');
  }

  // 10. MATCH_ODDS & Bookmaker (Regular time 90m+stoppage for Football, official result for others)
  if (marketLower === 'match_odds' || marketLower === 'match odds' || marketLower === 'bookmaker') {
    if (!officialWinner) return { outcome: 'pending', reason: 'Awaiting official result' };
    if (runnerLower === homeName) return finalize(officialWinner === 'home', 'Settled on official regular time result');
    if (runnerLower === awayName) return finalize(officialWinner === 'away', 'Settled on official regular time result');
    if (runnerLower === 'the draw' || runnerLower === 'draw') {
      return finalize(officialWinner === 'draw', 'Settled on official regular time result');
    }
  }

  return { outcome: 'pending', reason: 'Awaiting official market feed settlement' };
}
