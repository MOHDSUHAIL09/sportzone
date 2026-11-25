export function getDateString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMonthString(offsetMonths = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetMonths);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function formatMatchTime(isoString) {
  if (!isoString) return 'TBD';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return 'TBD';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatMatchDate(isoString) {
  if (!isoString) return 'TBD';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return 'TBD';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTimeShort(isoString) {
  if (!isoString) return 'TBD';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return 'TBD';
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatNumber(val) {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return '—';
  return Number(val).toLocaleString();
}

export function formatCoins(val) {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return '0';
  return Math.round(Number(val)).toLocaleString();
}

export function isLiveFixture(fixture) {
  const type = fixture?.status?.type;
  return type === 'inprogress' || type === 'interrupted';
}

export function isFinishedFixture(fixture) {
  return fixture?.status?.type === 'finished';
}

export function isUpcomingFixture(fixture) {
  return fixture?.status?.type === 'notstarted';
}

export function canPredictFixture(fixture) {
  if (!fixture || !fixture.id) return false;
  if (fixture.status?.type !== 'notstarted') return false;
  if (!fixture.startTime) return false;
  const startMs = new Date(fixture.startTime).getTime();
  if (Number.isNaN(startMs)) return false;
  return startMs > Date.now();
}

export function getTeamDisplayName(sideObj, fallback = 'TBD') {
  if (!sideObj) return fallback;
  return sideObj.shortName || sideObj.name || fallback;
}

export function getInitials(name = '') {
  const parts = String(name)
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'SZ';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function getScoreValue(scoreObj) {
  if (!scoreObj || typeof scoreObj !== 'object') return null;
  if (scoreObj.current !== null && scoreObj.current !== undefined) {
    return scoreObj.current;
  }
  if (scoreObj.normalTime !== null && scoreObj.normalTime !== undefined) {
    return scoreObj.normalTime;
  }
  return null;
}

export function formatCricketScore(scoreObj) {
  if (!scoreObj) return '—';
  const innings = scoreObj.innings && typeof scoreObj.innings === 'object' ? Object.values(scoreObj.innings) : [];
  if (innings.length > 0) {
    return innings
      .map((inn) => {
        if (typeof inn === 'object' && inn !== null) {
          const runs = inn.score ?? inn.runs ?? '';
          const wkts = inn.wickets !== undefined && inn.wickets !== null ? `/${inn.wickets}` : '';
          const ov = inn.overs ? ` (${inn.overs})` : '';
          return `${runs}${wkts}${ov}`;
        }
        return String(inn);
      })
      .join(' & ');
  }
  const current = getScoreValue(scoreObj);
  return current !== null ? String(current) : '—';
}

export function getScoreText(fixture, side) {
  const scoreObj = side === 'home' ? fixture?.homeScore : fixture?.awayScore;
  if (fixture?.sport === 'cricket' && scoreObj?.innings && Object.keys(scoreObj.innings).length > 0) {
    return formatCricketScore(scoreObj);
  }
  const val = getScoreValue(scoreObj);
  return val !== null ? String(val) : '—';
}

export function getPeriodPairs(fixture) {
  const homePeriods = fixture?.homeScore?.periods || {};
  const awayPeriods = fixture?.awayScore?.periods || {};
  const keys = Array.from(new Set([...Object.keys(homePeriods), ...Object.keys(awayPeriods)]));
  return keys
    .filter((k) => homePeriods[k] !== null && homePeriods[k] !== undefined)
    .map((k, idx) => ({
      key: k,
      label: k.replace(/^period/i, 'P').replace(/^overtime/i, 'OT').toUpperCase() || `P${idx + 1}`,
      home: homePeriods[k] ?? '—',
      away: awayPeriods[k] ?? '—',
    }));
}

export function determineFixtureWinner(fixture) {
  if (!fixture) return null;
  if (fixture.winner === 'home' || fixture.winner === 'away' || fixture.winner === 'draw') {
    return fixture.winner;
  }
  const h = getScoreValue(fixture.homeScore);
  const a = getScoreValue(fixture.awayScore);
  if (h === null || a === null) return null;
  if (Number(h) > Number(a)) return 'home';
  if (Number(a) > Number(h)) return 'away';
  return 'draw';
}

export function sportSupportsDraw(sportSlug) {
  const drawSports = new Set([
    'football',
    'cricket',
    'handball',
    'rugby',
    'ice-hockey',
    'futsal',
    'minifootball',
    'bandy',
    'waterpolo',
    'floorball',
  ]);
  return drawSports.has(sportSlug);
}

export function formatSportName(slug = '') {
  if (!slug) return 'Sport';
  const map = {
    football: 'Football',
    cricket: 'Cricket',
    tennis: 'Tennis',
    basketball: 'Basketball',
    'table-tennis': 'Table Tennis',
    'ice-hockey': 'Ice Hockey',
    'american-football': 'American Football',
    mma: 'MMA',
    esports: 'Esports',
    volleyball: 'Volleyball',
    handball: 'Handball',
    baseball: 'Baseball',
    rugby: 'Rugby',
    darts: 'Darts',
    snooker: 'Snooker',
    futsal: 'Futsal',
    badminton: 'Badminton',
    waterpolo: 'Water Polo',
    cycling: 'Cycling',
    motorsport: 'Motorsport',
    minifootball: 'Minifootball',
    floorball: 'Floorball',
    bandy: 'Bandy',
    padel: 'Padel',
    'aussie-rules': 'Aussie Rules',
  };
  return map[slug] || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatClock(fixture) {
  if (!fixture) return '';
  if (fixture.clock && typeof fixture.clock === 'object') {
    if (fixture.clock.display) return fixture.clock.display;
    if (fixture.clock.minute !== undefined && fixture.clock.minute !== null) {
      return `${fixture.clock.minute}'`;
    }
  }
  return fixture.status?.description || '';
}

export function extractMatchOddsMultipliers(oddsData, sportSlug) {
  const defaults = sportSupportsDraw(sportSlug)
    ? { home: 2.1, draw: 3.2, away: 2.6, source: 'standard' }
    : { home: 1.9, draw: null, away: 1.95, source: 'standard' };

  const markets = oddsData?.markets || (oddsData?.market ? [oddsData.market] : []);
  if (!Array.isArray(markets) || markets.length === 0) return defaults;

  const primary =
    markets.find((m) => m.kind === 'result' || m.kind === 'winner') || markets[0];
  if (!primary?.choices || !Array.isArray(primary.choices)) return defaults;

  let home = null;
  let draw = null;
  let away = null;

  primary.choices.forEach((choice) => {
    const dec = Number(choice.decimal);
    if (!dec || Number.isNaN(dec)) return;
    const outcome = String(choice.outcome || choice.name || '').toLowerCase();
    if (outcome === '1' || outcome === 'home' || outcome.includes('home')) {
      home = dec;
    } else if (outcome === 'x' || outcome === 'draw' || outcome.includes('draw')) {
      draw = dec;
    } else if (outcome === '2' || outcome === 'away' || outcome.includes('away')) {
      away = dec;
    }
  });

  if (home || away) {
    return {
      home: home || defaults.home,
      draw: sportSupportsDraw(sportSlug) ? draw || defaults.draw : null,
      away: away || defaults.away,
      source: 'sportsapi',
    };
  }
  return defaults;
}

function clampOdd(val, min = 1.02, max = 95) {
  const n = Math.max(min, Math.min(max, Number(val) || 1.9));
  if (n >= 20) return Math.round(n);
  if (n >= 10) return Number(n.toFixed(1));
  return Number(n.toFixed(2));
}

function extractNumericScore(fixture, side) {
  const obj = side === 'home' ? fixture?.homeScore : fixture?.awayScore;
  if (!obj) return null;
  if (fixture?.sport === 'cricket' && obj.innings && typeof obj.innings === 'object') {
    const inns = Object.values(obj.innings);
    if (inns.length > 0) {
      const last = inns[inns.length - 1];
      const runs = Number(last?.score ?? last?.runs);
      if (!Number.isNaN(runs)) return runs;
    }
  }
  const v = getScoreValue(obj);
  return v !== null && !Number.isNaN(Number(v)) ? Number(v) : null;
}

/**
 * Computes match exchange odds: uses real SportsAPI /v2/odds when present on the plan,
 * and falls back to calibrated live-score-driven demo exchange odds otherwise so the
 * Exchange Board & Match Details always display active Back/Lay markets.
 */
export function computeLiveExchangeOdds(fixture, realOddsData = null) {
  const sport = fixture?.sport || 'cricket';
  const extracted = realOddsData ? extractMatchOddsMultipliers(realOddsData, sport) : null;

  const isTestCricket =
    sport === 'cricket' &&
    (String(fixture?.league?.name || '').toLowerCase().includes('test') ||
      String(fixture?.cricket?.matchType || '').toLowerCase().includes('test') ||
      String(fixture?.league?.name || '').toLowerCase().includes('ranji') ||
      String(fixture?.league?.name || '').toLowerCase().includes('shield'));

  const allowDraw = sport === 'football' || sport === 'handball' || sport === 'rugby' || isTestCricket;

  if (extracted && extracted.source === 'sportsapi') {
    return {
      home: clampOdd(extracted.home),
      draw: allowDraw && extracted.draw ? clampOdd(extracted.draw) : null,
      away: clampOdd(extracted.away),
      source: 'sportsapi',
    };
  }

  // Deterministic seed per fixture ID + real live score influence
  const seed = Number(String(fixture?.id || '137').replace(/\D/g, '').slice(-5)) || 137;
  const hScore = extractNumericScore(fixture, 'home');
  const aScore = extractNumericScore(fixture, 'away');

  let homeProb = 0.32 + ((seed % 42) / 100); // 0.32 - 0.73 base implied probability

  if (isLiveFixture(fixture) && hScore !== null && aScore !== null) {
    const diff = hScore - aScore;
    if (sport === 'cricket') {
      homeProb = Math.max(0.08, Math.min(0.92, 0.5 + diff / 140));
    } else if (sport === 'football' || sport === 'ice-hockey') {
      homeProb = Math.max(0.08, Math.min(0.92, 0.5 + diff * 0.18));
    } else if (sport === 'basketball') {
      homeProb = Math.max(0.08, Math.min(0.92, 0.5 + diff / 28));
    } else {
      homeProb = Math.max(0.1, Math.min(0.9, 0.5 + diff * 0.14));
    }
  }

  const drawProb = allowDraw ? (isTestCricket ? 0.12 + ((seed % 14) / 100) : 0.24 + ((seed % 10) / 100)) : 0;
  const remaining = Math.max(0.1, 1 - drawProb);
  const pHome = Math.max(0.03, Math.min(0.94, homeProb * remaining));
  const pAway = Math.max(0.03, Math.min(0.94, (1 - homeProb) * remaining));

  const homeOdd = clampOdd(1 / pHome);
  const awayOdd = clampOdd(1 / pAway);
  const drawOdd = allowDraw ? clampOdd(1 / Math.max(0.02, drawProb)) : null;

  return {
    home: homeOdd,
    draw: drawOdd,
    away: awayOdd,
    source: 'demo-calibrated',
  };
}

