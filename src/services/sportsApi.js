import axios from 'axios';

export const SPORTSAPI_BASE_URL =
  import.meta.env.VITE_SPORTSAPI_BASE_URL || 'https://api.sportsapi.app/v2';

const OVERRIDE_KEY_STORAGE = 'sportzone_api_key_override';
const CACHE_PREFIX = 'sz_api_cache_v1:';
const QUOTA_STORAGE_KEY = 'sportzone_api_quota_v1';

// In-memory cache + in-flight request deduplication
const memoryCache = new Map();
const inFlightRequests = new Map();

// Default TTLs (ms) designed to strictly respect SportsAPI quota
export const CACHE_TTL = {
  LIVE: 45 * 1000,         // 45 seconds for live scores & live wire
  SHORT: 2 * 60 * 1000,    // 2 minutes for match sub-tabs & odds
  MEDIUM: 5 * 60 * 1000,   // 5 minutes for fixtures, counts, main events, search
  LONG: 15 * 60 * 1000,    // 15 minutes for sports, coverage, leagues, standings, profiles, rankings
};

export function getApiKey() {
  try {
    const override = localStorage.getItem(OVERRIDE_KEY_STORAGE);
    if (override && override.trim()) return override.trim();
  } catch {
    // ignore storage errors
  }
  return import.meta.env.VITE_SPORTSAPI_KEY || '';
}

export function setApiKeyOverride(key) {
  try {
    if (!key || !key.trim()) {
      localStorage.removeItem(OVERRIDE_KEY_STORAGE);
    } else {
      localStorage.setItem(OVERRIDE_KEY_STORAGE, key.trim());
    }
    clearApiCache();
  } catch {
    // ignore storage errors
  }
}

export function getStoredQuota() {
  try {
    const raw = localStorage.getItem(QUOTA_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveQuotaFromHeaders(headers) {
  if (!headers) return;
  const limit = headers['ratelimit-limit'] || headers['RateLimit-Limit'];
  const remaining = headers['ratelimit-remaining'] || headers['RateLimit-Remaining'];
  const reset = headers['ratelimit-reset'] || headers['RateLimit-Reset'];
  if (limit || remaining) {
    const payload = {
      limit: limit ? Number(limit) : null,
      remaining: remaining ? Number(remaining) : null,
      resetSeconds: reset ? Number(reset) : null,
      updatedAt: Date.now(),
    };
    try {
      localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage quota errors
    }
    window.dispatchEvent(new CustomEvent('sportzone:quota-updated', { detail: payload }));
  }
}

export const apiClient = axios.create({
  baseURL: SPORTSAPI_BASE_URL,
  timeout: 18000,
  headers: {
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const key = getApiKey();
  if (key) {
    config.headers.Authorization = `Bearer ${key}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    saveQuotaFromHeaders(response.headers);
    return response;
  },
  (error) => {
    if (error.response?.headers) {
      saveQuotaFromHeaders(error.response.headers);
    }
    return Promise.reject(normalizeApiError(error));
  }
);

export function normalizeApiError(error) {
  if (error && error.__normalized) return error;
  const status = error?.response?.status || 0;
  const apiErr = error?.response?.data?.error;
  const code = apiErr?.code || (status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : status === 429 ? 'rate_limited' : status === 404 ? 'not_found' : 'network_error');

  let message = apiErr?.message || error?.message || 'Unable to fetch data from SportsAPI.';
  if (status === 401) {
    message = 'SportsAPI authentication failed. Check that a valid Bearer API key is configured.';
  } else if (status === 403 && code === 'endpoint_not_in_plan') {
    message = 'This SportsAPI endpoint is not included in the current account plan.';
  } else if (status === 403) {
    message = apiErr?.message || 'Access denied for this endpoint or historical window on your current SportsAPI plan.';
  } else if (status === 429) {
    const retryAfter = error?.response?.headers?.['retry-after'];
    message = retryAfter
      ? `SportsAPI rate limit reached. Try again in ${retryAfter}s.`
      : 'SportsAPI rate limit reached. Cached views remain available while quota resets.';
  } else if (status === 404) {
    message = apiErr?.message || 'No data found for this resource on SportsAPI.';
  }

  return {
    __normalized: true,
    status,
    code,
    message,
    isPlanRestricted: status === 403,
    isUnauthorized: status === 401,
    isRateLimited: status === 429,
    isNotFound: status === 404,
  };
}

function cleanParams(params = {}) {
  const cleaned = {};
  Object.keys(params)
    .sort()
    .forEach((k) => {
      const val = params[k];
      if (val !== undefined && val !== null && val !== '') {
        cleaned[k] = val;
      }
    });
  return cleaned;
}

function buildCacheKey(path, params) {
  const cleaned = cleanParams(params);
  const qs = new URLSearchParams(cleaned).toString();
  return qs ? `${path}?${qs}` : path;
}

function readPersistentCache(cacheKey) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.expiresAt !== 'number') return null;
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(CACHE_PREFIX + cacheKey);
      return null;
    }
    return parsed.payload;
  } catch {
    return null;
  }
}

function writePersistentCache(cacheKey, payload, ttl) {
  try {
    const serialized = JSON.stringify({
      expiresAt: Date.now() + ttl,
      cachedAt: Date.now(),
      payload,
    });
    // Skip persisting unusually huge payloads (> 300KB) to keep localStorage fast
    if (serialized.length > 300_000) return;
    localStorage.setItem(CACHE_PREFIX + cacheKey, serialized);
  } catch {
    // Prune oldest cache entries if storage is full
    pruneOldCacheEntries();
  }
}

function pruneOldCacheEntries() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) keys.push(k);
    }
    keys.slice(0, Math.max(10, Math.floor(keys.length / 2))).forEach((k) => {
      localStorage.removeItem(k);
    });
  } catch {
    // ignore
  }
}

export function clearApiCache() {
  memoryCache.clear();
  try {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) toRemove.push(k);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

export function getCacheStats() {
  let persistentCount = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) persistentCount++;
    }
  } catch {
    // ignore
  }
  return {
    memoryEntries: memoryCache.size,
    persistentEntries: persistentCount,
    inFlight: inFlightRequests.size,
  };
}

/**
 * Core cached GET helper with in-flight deduplication and stale-fallback on 429.
 */
async function cachedGet(path, params = {}, options = {}) {
  const { ttl = CACHE_TTL.MEDIUM, forceRefresh = false } = options;
  const cleaned = cleanParams(params);
  const cacheKey = buildCacheKey(path, cleaned);

  if (!forceRefresh) {
    const mem = memoryCache.get(cacheKey);
    if (mem && Date.now() < mem.expiresAt) {
      return { ...mem.payload, _fromCache: true };
    }
    const persisted = readPersistentCache(cacheKey);
    if (persisted) {
      memoryCache.set(cacheKey, { expiresAt: Date.now() + ttl, payload: persisted });
      return { ...persisted, _fromCache: true };
    }
  }

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const reqPromise = apiClient
    .get(path, { params: cleaned })
    .then((res) => {
      const payload = res.data;
      memoryCache.set(cacheKey, { expiresAt: Date.now() + ttl, payload });
      writePersistentCache(cacheKey, payload, ttl);
      return { ...payload, _fromCache: false };
    })
    .finally(() => {
      inFlightRequests.delete(cacheKey);
    });

  inFlightRequests.set(cacheKey, reqPromise);
  return reqPromise;
}

async function apiPost(path, body = {}) {
  const res = await apiClient.post(path, body);
  return res.data;
}

// ============================================================================
// 1. CATALOG: SPORTS, COVERAGE, CATEGORIES
// ============================================================================
export const getSports = (options) =>
  cachedGet('/sports', {}, { ttl: CACHE_TTL.LONG, ...options });

export const getCoverage = (options) =>
  cachedGet('/coverage', {}, { ttl: CACHE_TTL.LONG, ...options });

export const getCategories = (sport, options) =>
  cachedGet('/categories', { sport }, { ttl: CACHE_TTL.LONG, ...options });

// ============================================================================
// 2. LIVE SCORES & LIVE SCORE WIRE
// ============================================================================
export const getLiveScores = (params = {}, options) =>
  cachedGet('/livescores', params, { ttl: CACHE_TTL.LIVE, ...options });

export const getLiveScoreWire = (params = {}, options) =>
  cachedGet('/livescores/wire', params, { ttl: CACHE_TTL.LIVE, ...options });

// ============================================================================
// 3. FIXTURES, COUNTS, MAIN EVENTS & MATCH DETAILS
// ============================================================================
export const getFixtures = (params = {}, options) =>
  cachedGet('/fixtures', params, { ttl: CACHE_TTL.MEDIUM, ...options });

export const getFixtureCounts = (params = {}, options) =>
  cachedGet('/fixtures/counts', params, { ttl: CACHE_TTL.MEDIUM, ...options });

export const getMainEvents = (params = {}, options) =>
  cachedGet('/fixtures/main-events', params, { ttl: CACHE_TTL.MEDIUM, ...options });

export const getFixtureById = (id, options) =>
  cachedGet(`/fixtures/${id}`, {}, { ttl: CACHE_TTL.SHORT, ...options });

export const getFixtureLineups = (id, options) =>
  cachedGet(`/fixtures/${id}/lineups`, {}, { ttl: CACHE_TTL.SHORT, ...options });

export const getFixtureStatistics = (id, options) =>
  cachedGet(`/fixtures/${id}/statistics`, {}, { ttl: CACHE_TTL.SHORT, ...options });

export const getFixtureEvents = (id, options) =>
  cachedGet(`/fixtures/${id}/events`, {}, { ttl: CACHE_TTL.SHORT, ...options });

export const getFixturePlayByPlay = (id, options) =>
  cachedGet(`/fixtures/${id}/play-by-play`, {}, { ttl: CACHE_TTL.SHORT, ...options });

export const getFixtureH2H = (id, options) =>
  cachedGet(`/fixtures/${id}/h2h`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getFixtureH2HFixtures = (id, options) =>
  cachedGet(`/fixtures/${id}/h2h/fixtures`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getFixtureManagers = (id, options) =>
  cachedGet(`/fixtures/${id}/managers`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getFixtureBestPlayers = (id, options) =>
  cachedGet(`/fixtures/${id}/best-players`, {}, { ttl: CACHE_TTL.SHORT, ...options });

export const getFixtureMomentum = (id, options) =>
  cachedGet(`/fixtures/${id}/momentum`, {}, { ttl: CACHE_TTL.SHORT, ...options });

export const getFixtureShotmap = (id, params = {}, options) =>
  cachedGet(`/fixtures/${id}/shotmap`, params, { ttl: CACHE_TTL.SHORT, ...options });

export const getFixtureForm = (id, options) =>
  cachedGet(`/fixtures/${id}/form`, {}, { ttl: CACHE_TTL.MEDIUM, ...options });

export const getFixtureTeamForm = (id, options) =>
  cachedGet(`/fixtures/${id}/team-form`, {}, { ttl: CACHE_TTL.MEDIUM, ...options });

export const getFixtureStreaks = (id, options) =>
  cachedGet(`/fixtures/${id}/streaks`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getFixtureTeamHeatmap = (id, team, options) =>
  cachedGet(`/fixtures/${id}/heatmap`, { team }, { ttl: CACHE_TTL.SHORT, ...options });

export const getFixturePlayerHeatmap = (id, playerId, options) =>
  cachedGet(`/fixtures/${id}/heatmap/${playerId}`, {}, { ttl: CACHE_TTL.SHORT, ...options });

export const getFixturePlayerActions = (id, playerId, options) =>
  cachedGet(`/fixtures/${id}/players/${playerId}/actions`, {}, { ttl: CACHE_TTL.SHORT, ...options });

export const getFixtureSeries = (id, options) =>
  cachedGet(`/fixtures/${id}/series`, {}, { ttl: CACHE_TTL.MEDIUM, ...options });

export const getFixtureAveragePositions = (id, options) =>
  cachedGet(`/fixtures/${id}/average-positions`, {}, { ttl: CACHE_TTL.SHORT, ...options });

export const getFixturePoints = (id, options) =>
  cachedGet(`/fixtures/${id}/points`, {}, { ttl: CACHE_TTL.SHORT, ...options });

export const getFixturePointSequence = (id, options) =>
  cachedGet(`/fixtures/${id}/point-sequence`, {}, { ttl: CACHE_TTL.SHORT, ...options });

export const getFixtureUmpires = (id, options) =>
  cachedGet(`/fixtures/${id}/umpires`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getFixtureWeather = (id, options) =>
  cachedGet(`/fixtures/${id}/weather`, {}, { ttl: CACHE_TTL.MEDIUM, ...options });

export const getFixtureScorecard = (id, options) =>
  cachedGet(`/fixtures/${id}/scorecard`, {}, { ttl: CACHE_TTL.SHORT, ...options });

export const getFixturePlayerOfTheMatch = (id, options) =>
  cachedGet(`/fixtures/${id}/player-of-the-match`, {}, { ttl: CACHE_TTL.SHORT, ...options });

export const getFixtureCurrentMeeting = (id, options) =>
  cachedGet(`/fixtures/${id}/current-meeting`, {}, { ttl: CACHE_TTL.SHORT, ...options });

export const getFixtureHighlights = (id, options) =>
  cachedGet(`/fixtures/${id}/highlights`, {}, { ttl: CACHE_TTL.MEDIUM, ...options });

export const getFixtureAtBatPitches = (id, atBatId, options) =>
  cachedGet(`/fixtures/${id}/at-bats/${atBatId}/pitches`, {}, { ttl: CACHE_TTL.SHORT, ...options });

export const getFixtureGames = (id, options) =>
  cachedGet(`/fixtures/${id}/games`, {}, { ttl: CACHE_TTL.SHORT, ...options });

export const getFixtureGameLineups = (id, gameId, options) =>
  cachedGet(`/fixtures/${id}/games/${gameId}/lineups`, {}, { ttl: CACHE_TTL.SHORT, ...options });

export const getFixtureGameBans = (id, gameId, options) =>
  cachedGet(`/fixtures/${id}/games/${gameId}/bans`, {}, { ttl: CACHE_TTL.SHORT, ...options });

export const getFixtureGameStatistics = (id, gameId, options) =>
  cachedGet(`/fixtures/${id}/games/${gameId}/statistics`, {}, { ttl: CACHE_TTL.SHORT, ...options });

export const getFixtureGameRounds = (id, gameId, options) =>
  cachedGet(`/fixtures/${id}/games/${gameId}/rounds`, {}, { ttl: CACHE_TTL.SHORT, ...options });

// ============================================================================
// 4. BETTING ODDS
// ============================================================================
export const getOdds = (params = {}, options) =>
  cachedGet('/odds', params, { ttl: CACHE_TTL.MEDIUM, ...options });

export const getFixtureOdds = (id, options) =>
  cachedGet(`/fixtures/${id}/odds`, {}, { ttl: CACHE_TTL.SHORT, ...options });

export const getFixtureWinningOdds = (id, options) =>
  cachedGet(`/fixtures/${id}/odds/winning`, {}, { ttl: CACHE_TTL.MEDIUM, ...options });

export const getFixtureStreakOdds = (id, options) =>
  cachedGet(`/fixtures/${id}/odds/streaks`, {}, { ttl: CACHE_TTL.MEDIUM, ...options });

// ============================================================================
// 5. TRACKING DATA
// ============================================================================
export const getFixtureTracking = (id, options) =>
  cachedGet(`/fixtures/${id}/tracking`, {}, { ttl: CACHE_TTL.SHORT, ...options });

export const getFixtureTrackingBall = (id, params = {}, options) =>
  cachedGet(`/fixtures/${id}/tracking/ball`, params, { ttl: CACHE_TTL.LIVE, ...options });

export const getFixtureTrackingEvents = (id, params = {}, options) =>
  cachedGet(`/fixtures/${id}/tracking/events`, params, { ttl: CACHE_TTL.LIVE, ...options });

export const getFixtureTrackingTimeline = (id, options) =>
  cachedGet(`/fixtures/${id}/tracking/timeline`, {}, { ttl: CACHE_TTL.SHORT, ...options });

export const getFixtureTrackingPlayers = (id, params = {}, options) =>
  cachedGet(`/fixtures/${id}/tracking/players`, params, { ttl: CACHE_TTL.LIVE, ...options });

// ============================================================================
// 6. TEAMS
// ============================================================================
export const getTeamById = (id, options) =>
  cachedGet(`/teams/${id}`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getTeamFixtures = (id, params = {}, options) =>
  cachedGet(`/teams/${id}/fixtures`, params, { ttl: CACHE_TTL.MEDIUM, ...options });

export const getTeamSquad = (id, options) =>
  cachedGet(`/teams/${id}/squad`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getTeamDepthChart = (id, options) =>
  cachedGet(`/teams/${id}/depth-chart`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getTeamTransfers = (id, options) =>
  cachedGet(`/teams/${id}/transfers`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getTeamStatistics = (id, params = {}, options) =>
  cachedGet(`/teams/${id}/statistics`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getTeamStatisticRanks = (id, params = {}, options) =>
  cachedGet(`/teams/${id}/statistics/ranks`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getTeamLeagues = (id, options) =>
  cachedGet(`/teams/${id}/leagues`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getTeamTrophies = (id, options) =>
  cachedGet(`/teams/${id}/trophies`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getTeamPositionHistory = (id, params = {}, options) =>
  cachedGet(`/teams/${id}/position-history`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getTeamGoalDistribution = (id, params = {}, options) =>
  cachedGet(`/teams/${id}/goal-distribution`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getTeamYearStatistics = (id, params = {}, options) =>
  cachedGet(`/teams/${id}/year-statistics`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getTeamGrandSlams = (id, options) =>
  cachedGet(`/teams/${id}/grand-slams`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getTeamRaceCareer = (id, options) =>
  cachedGet(`/teams/${id}/race-career`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getTeamRaceSeasons = (id, options) =>
  cachedGet(`/teams/${id}/race-seasons`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getTeamRaces = (id, params = {}, options) =>
  cachedGet(`/teams/${id}/races`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getTeamStatisticsSeasons = (id, options) =>
  cachedGet(`/teams/${id}/statistics/seasons`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getTeamTopPlayersSeasons = (id, options) =>
  cachedGet(`/teams/${id}/top-players/seasons`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getTeamStandingsSeasons = (id, options) =>
  cachedGet(`/teams/${id}/standings/seasons`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getTeamRankings = (id, options) =>
  cachedGet(`/teams/${id}/rankings`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getTeamTopPlayers = (id, params = {}, options) =>
  cachedGet(`/teams/${id}/top-players`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getTeamFeaturedFixture = (id, options) =>
  cachedGet(`/teams/${id}/featured-fixture`, {}, { ttl: CACHE_TTL.MEDIUM, ...options });

export const getTeamVideos = (id, options) =>
  cachedGet(`/teams/${id}/videos`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getTeamPerformance = (id, options) =>
  cachedGet(`/teams/${id}/performance`, {}, { ttl: CACHE_TTL.MEDIUM, ...options });

export const getTeamFeaturedPlayers = (id, options) =>
  cachedGet(`/teams/${id}/featured-players`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getTeamRecentLeagues = (id, options) =>
  cachedGet(`/teams/${id}/recent-leagues`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getTeamCareerStatistics = (id, options) =>
  cachedGet(`/teams/${id}/career-statistics`, {}, { ttl: CACHE_TTL.LONG, ...options });

// ============================================================================
// 7. PLAYERS & TRANSFERS
// ============================================================================
export const getPlayerById = (id, options) =>
  cachedGet(`/players/${id}`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getPlayerSeasons = (id, options) =>
  cachedGet(`/players/${id}/seasons`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getPlayerFixtures = (id, params = {}, options) =>
  cachedGet(`/players/${id}/fixtures`, params, { ttl: CACHE_TTL.MEDIUM, ...options });

export const getPlayerStatistics = (id, params = {}, options) =>
  cachedGet(`/players/${id}/statistics`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getPlayerTransfers = (id, options) =>
  cachedGet(`/players/${id}/transfers`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getPlayerShotChart = (id, params = {}, options) =>
  cachedGet(`/players/${id}/shot-chart`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getPlayerAttributes = (id, options) =>
  cachedGet(`/players/${id}/attributes`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getPlayerCharacteristics = (id, options) =>
  cachedGet(`/players/${id}/characteristics`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getPlayerNationalTeam = (id, options) =>
  cachedGet(`/players/${id}/national-team`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getPlayerStatisticsRankings = (id, params = {}, options) =>
  cachedGet(`/players/${id}/statistics/rankings`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getPlayerPenalties = (id, params = {}, options) =>
  cachedGet(`/players/${id}/penalties`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getPlayerHeatmap = (id, params = {}, options) =>
  cachedGet(`/players/${id}/heatmap`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getPlayerRatings = (id, params = {}, options) =>
  cachedGet(`/players/${id}/ratings`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getPlayerCareer = (id, options) =>
  cachedGet(`/players/${id}/career`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getPlayerLastYear = (id, options) =>
  cachedGet(`/players/${id}/last-year`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getPlayerVideos = (id, options) =>
  cachedGet(`/players/${id}/videos`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getTransfers = (params = {}, options) =>
  cachedGet('/transfers', params, { ttl: CACHE_TTL.LONG, ...options });

// ============================================================================
// 8. LEAGUES
// ============================================================================
export const getLeagues = (params = {}, options) =>
  cachedGet('/leagues', params, { ttl: CACHE_TTL.LONG, ...options });

export const getPopularLeagues = (params = {}, options) =>
  cachedGet('/leagues/popular', params, { ttl: CACHE_TTL.LONG, ...options });

export const getLeagueById = (id, options) =>
  cachedGet(`/leagues/${id}`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getLeagueSeasons = (id, options) =>
  cachedGet(`/leagues/${id}/seasons`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getLeagueSeasonById = (id, seasonId, options) =>
  cachedGet(`/leagues/${id}/seasons/${seasonId}`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getLeagueStandings = (id, params = {}, options) =>
  cachedGet(`/leagues/${id}/standings`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getLeagueCupTrees = (id, params = {}, options) =>
  cachedGet(`/leagues/${id}/cup-trees`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getLeagueRounds = (id, params = {}, options) =>
  cachedGet(`/leagues/${id}/rounds`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getLeagueFixtures = (id, params = {}, options) =>
  cachedGet(`/leagues/${id}/fixtures`, params, { ttl: CACHE_TTL.MEDIUM, ...options });

export const getLeagueTopPlayers = (id, params = {}, options) =>
  cachedGet(`/leagues/${id}/top-players`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getLeagueTopPerformances = (id, params = {}, options) =>
  cachedGet(`/leagues/${id}/top-performances`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getLeagueRecentPerformances = (id, params = {}, options) =>
  cachedGet(`/leagues/${id}/top-performances/recent`, params, { ttl: CACHE_TTL.MEDIUM, ...options });

export const getLeagueTopTeams = (id, params = {}, options) =>
  cachedGet(`/leagues/${id}/top-teams`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getLeagueDraft = (id, params = {}, options) =>
  cachedGet(`/leagues/${id}/draft`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getLeagueTransfers = (id, params = {}, options) =>
  cachedGet(`/leagues/${id}/transfers`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getLeagueOdds = (id, params = {}, options) =>
  cachedGet(`/leagues/${id}/odds`, params, { ttl: CACHE_TTL.MEDIUM, ...options });

export const getLeagueSeasonChampions = (id, params = {}, options) =>
  cachedGet(`/leagues/${id}/season-champions`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getLeagueChampions = (id, options) =>
  cachedGet(`/leagues/${id}/champions`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getLeagueAwards = (id, params = {}, options) =>
  cachedGet(`/leagues/${id}/awards`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getLeagueAwardTeams = (id, params = {}, options) =>
  cachedGet(`/leagues/${id}/award-teams`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getLeagueAwardTeam = (id, teamId, options) =>
  cachedGet(`/leagues/${id}/award-teams/${teamId}`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getLeagueGroups = (id, params = {}, options) =>
  cachedGet(`/leagues/${id}/groups`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getLeagueGroupFixtures = (id, groupId, params = {}, options) =>
  cachedGet(`/leagues/${id}/groups/${groupId}/fixtures`, params, { ttl: CACHE_TTL.MEDIUM, ...options });

export const getLeagueVenueFixtures = (id, venueId, params = {}, options) =>
  cachedGet(`/leagues/${id}/venues/${venueId}/fixtures`, params, { ttl: CACHE_TTL.MEDIUM, ...options });

export const getLeagueInjuries = (id, options) =>
  cachedGet(`/leagues/${id}/injuries`, {}, { ttl: CACHE_TTL.MEDIUM, ...options });

export const getLeagueTeamOfTheWeekPeriods = (id, params = {}, options) =>
  cachedGet(`/leagues/${id}/team-of-the-week/periods`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getLeagueTeamOfTheWeek = (id, params = {}, options) =>
  cachedGet(`/leagues/${id}/team-of-the-week`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getLeagueVenues = (id, params = {}, options) =>
  cachedGet(`/leagues/${id}/venues`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getLeagueCalendar = (id, params = {}, options) =>
  cachedGet(`/leagues/${id}/calendar`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getLeaguePlayerOfTheSeasonHistory = (id, options) =>
  cachedGet(`/leagues/${id}/player-of-the-season/history`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getLeaguePlayerOfTheSeason = (id, params = {}, options) =>
  cachedGet(`/leagues/${id}/player-of-the-season`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getLeaguePlayerOfTheSeasonRace = (id, params = {}, options) =>
  cachedGet(`/leagues/${id}/player-of-the-season/race`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getLeagueTeams = (id, params = {}, options) =>
  cachedGet(`/leagues/${id}/teams`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getLeagueFeaturedFixtures = (id, options) =>
  cachedGet(`/leagues/${id}/featured-fixtures`, {}, { ttl: CACHE_TTL.MEDIUM, ...options });

export const getLeaguePlayerStatistics = (id, params = {}, options) =>
  cachedGet(`/leagues/${id}/player-statistics`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getLeagueShootingZones = (id, params = {}, options) =>
  cachedGet(`/leagues/${id}/shooting-zones`, params, { ttl: CACHE_TTL.LONG, ...options });

// ============================================================================
// 9. RANKINGS
// ============================================================================
export const getRankingsList = (params = {}, options) =>
  cachedGet('/rankings', params, { ttl: CACHE_TTL.LONG, ...options });

export const getRankingByType = (type, options) =>
  cachedGet(`/rankings/${type}`, {}, { ttl: CACHE_TTL.LONG, ...options });

// ============================================================================
// 10. RACE SPORTS & SERIES
// ============================================================================
export const getRacesCalendar = (params = {}, options) =>
  cachedGet('/races/calendar', params, { ttl: CACHE_TTL.LONG, ...options });

export const getRaces = (params = {}, options) =>
  cachedGet('/races', params, { ttl: CACHE_TTL.MEDIUM, ...options });

export const getRaceById = (id, options) =>
  cachedGet(`/races/${id}`, {}, { ttl: CACHE_TTL.MEDIUM, ...options });

export const getRaceSessions = (id, options) =>
  cachedGet(`/races/${id}/sessions`, {}, { ttl: CACHE_TTL.MEDIUM, ...options });

export const getRaceResults = (id, params = {}, options) =>
  cachedGet(`/races/${id}/results`, params, { ttl: CACHE_TTL.MEDIUM, ...options });

export const getRaceLaps = (id, params = {}, options) =>
  cachedGet(`/races/${id}/laps`, params, { ttl: CACHE_TTL.MEDIUM, ...options });

export const getRaceOdds = (id, options) =>
  cachedGet(`/races/${id}/odds`, {}, { ttl: CACHE_TTL.MEDIUM, ...options });

export const getSeriesList = (params = {}, options) =>
  cachedGet('/series', params, { ttl: CACHE_TTL.LONG, ...options });

export const getSeriesById = (id, options) =>
  cachedGet(`/series/${id}`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getSeriesSeasons = (id, options) =>
  cachedGet(`/series/${id}/seasons`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getSeriesRaces = (id, params = {}, options) =>
  cachedGet(`/series/${id}/races`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getSeriesRaceStandings = (id, params = {}, options) =>
  cachedGet(`/series/${id}/standings/races`, params, { ttl: CACHE_TTL.LONG, ...options });

export const getSeriesStandings = (id, params = {}, options) =>
  cachedGet(`/series/${id}/standings`, params, { ttl: CACHE_TTL.LONG, ...options });

// ============================================================================
// 11. REFEREES, MANAGERS, VENUES
// ============================================================================
export const getRefereeById = (id, options) =>
  cachedGet(`/referees/${id}`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getRefereeFixtures = (id, params = {}, options) =>
  cachedGet(`/referees/${id}/fixtures`, params, { ttl: CACHE_TTL.MEDIUM, ...options });

export const getManagerById = (id, options) =>
  cachedGet(`/managers/${id}`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getManagerFixtures = (id, params = {}, options) =>
  cachedGet(`/managers/${id}/fixtures`, params, { ttl: CACHE_TTL.MEDIUM, ...options });

export const getVenueById = (id, options) =>
  cachedGet(`/venues/${id}`, {}, { ttl: CACHE_TTL.LONG, ...options });

export const getVenueFixtures = (id, params = {}, options) =>
  cachedGet(`/venues/${id}/fixtures`, params, { ttl: CACHE_TTL.MEDIUM, ...options });

// ============================================================================
// 12. SEARCH
// ============================================================================
export const searchSportsApi = (params = {}, options) =>
  cachedGet('/search', params, { ttl: CACHE_TTL.MEDIUM, ...options });

// ============================================================================
// 13. BULK EXPORTS & STREAM TICKET
// ============================================================================
export const getExports = (options) =>
  cachedGet('/exports', {}, { ttl: CACHE_TTL.SHORT, ...options });

export const createExport = (payload = {}) => apiPost('/exports', payload);

export const getExportById = (id, options) =>
  cachedGet(`/exports/${id}`, {}, { ttl: CACHE_TTL.SHORT, ...options });

export const createStreamTicket = (payload = {}) => apiPost('/stream/ticket', payload);

const sportsApi = {
  getSports,
  getCoverage,
  getCategories,
  getLiveScores,
  getLiveScoreWire,
  getFixtures,
  getFixtureCounts,
  getMainEvents,
  getFixtureById,
  getFixtureLineups,
  getFixtureStatistics,
  getFixtureEvents,
  getFixturePlayByPlay,
  getFixtureH2H,
  getFixtureH2HFixtures,
  getFixtureManagers,
  getFixtureBestPlayers,
  getFixtureMomentum,
  getFixtureShotmap,
  getFixtureForm,
  getFixtureTeamForm,
  getFixtureStreaks,
  getFixtureTeamHeatmap,
  getFixturePlayerHeatmap,
  getFixturePlayerActions,
  getFixtureSeries,
  getFixtureAveragePositions,
  getFixturePoints,
  getFixturePointSequence,
  getFixtureUmpires,
  getFixtureWeather,
  getFixtureScorecard,
  getFixturePlayerOfTheMatch,
  getFixtureCurrentMeeting,
  getFixtureHighlights,
  getFixtureAtBatPitches,
  getFixtureGames,
  getFixtureGameLineups,
  getFixtureGameBans,
  getFixtureGameStatistics,
  getFixtureGameRounds,
  getOdds,
  getFixtureOdds,
  getFixtureWinningOdds,
  getFixtureStreakOdds,
  getFixtureTracking,
  getFixtureTrackingBall,
  getFixtureTrackingEvents,
  getFixtureTrackingTimeline,
  getFixtureTrackingPlayers,
  getTeamById,
  getTeamFixtures,
  getTeamSquad,
  getTeamDepthChart,
  getTeamTransfers,
  getTeamStatistics,
  getTeamStatisticRanks,
  getTeamLeagues,
  getTeamTrophies,
  getTeamPositionHistory,
  getTeamGoalDistribution,
  getTeamYearStatistics,
  getTeamGrandSlams,
  getTeamRaceCareer,
  getTeamRaceSeasons,
  getTeamRaces,
  getTeamStatisticsSeasons,
  getTeamTopPlayersSeasons,
  getTeamStandingsSeasons,
  getTeamRankings,
  getTeamTopPlayers,
  getTeamFeaturedFixture,
  getTeamVideos,
  getTeamPerformance,
  getTeamFeaturedPlayers,
  getTeamRecentLeagues,
  getTeamCareerStatistics,
  getPlayerById,
  getPlayerSeasons,
  getPlayerFixtures,
  getPlayerStatistics,
  getPlayerTransfers,
  getPlayerShotChart,
  getPlayerAttributes,
  getPlayerCharacteristics,
  getPlayerNationalTeam,
  getPlayerStatisticsRankings,
  getPlayerPenalties,
  getPlayerHeatmap,
  getPlayerRatings,
  getPlayerCareer,
  getPlayerLastYear,
  getPlayerVideos,
  getTransfers,
  getLeagues,
  getPopularLeagues,
  getLeagueById,
  getLeagueSeasons,
  getLeagueSeasonById,
  getLeagueStandings,
  getLeagueCupTrees,
  getLeagueRounds,
  getLeagueFixtures,
  getLeagueTopPlayers,
  getLeagueTopPerformances,
  getLeagueRecentPerformances,
  getLeagueTopTeams,
  getLeagueDraft,
  getLeagueTransfers,
  getLeagueOdds,
  getLeagueSeasonChampions,
  getLeagueChampions,
  getLeagueAwards,
  getLeagueAwardTeams,
  getLeagueAwardTeam,
  getLeagueGroups,
  getLeagueGroupFixtures,
  getLeagueVenueFixtures,
  getLeagueInjuries,
  getLeagueTeamOfTheWeekPeriods,
  getLeagueTeamOfTheWeek,
  getLeagueVenues,
  getLeagueCalendar,
  getLeaguePlayerOfTheSeasonHistory,
  getLeaguePlayerOfTheSeason,
  getLeaguePlayerOfTheSeasonRace,
  getLeagueTeams,
  getLeagueFeaturedFixtures,
  getLeaguePlayerStatistics,
  getLeagueShootingZones,
  getRankingsList,
  getRankingByType,
  getRacesCalendar,
  getRaces,
  getRaceById,
  getRaceSessions,
  getRaceResults,
  getRaceLaps,
  getRaceOdds,
  getSeriesList,
  getSeriesById,
  getSeriesSeasons,
  getSeriesRaces,
  getSeriesRaceStandings,
  getSeriesStandings,
  getRefereeById,
  getRefereeFixtures,
  getManagerById,
  getManagerFixtures,
  getVenueById,
  getVenueFixtures,
  searchSportsApi,
  getExports,
  createExport,
  getExportById,
  createStreamTicket,
  clearApiCache,
  getCacheStats,
  getStoredQuota,
  getApiKey,
  setApiKeyOverride,
};

export default sportsApi;
