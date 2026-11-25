import React, { useState, useEffect, useMemo } from 'react';
import { FiRefreshCw, FiSearch, FiStar } from 'react-icons/fi';
import { getFixtures, getFixtureCounts, getMainEvents } from '../services/sportsApi';
import MatchCard from '../components/MatchCard';
import PredictionModal from '../components/PredictionModal';
import { ApiErrorCard, EmptyStateCard, LoadingSkeletonGrid } from '../components/StateBlocks';
import {
  formatNumber,
  formatSportName,
  getDateString,
  isFinishedFixture,
} from '../utils/formatters';

const FEATURED_SPORTS = [
  'football',
  'cricket',
  'tennis',
  'basketball',
  'table-tennis',
  'ice-hockey',
  'handball',
  'volleyball',
  'baseball',
  'american-football',
  'rugby',
  'esports',
  'mma',
];

export default function FixturesPage({ mode = 'fixtures' }) {
  const isResults = mode === 'results';
  const [sport, setSport] = useState('football');
  const [date, setDate] = useState(getDateString(isResults ? -1 : 0));
  const [mainOnly, setMainOnly] = useState(false);
  const [fixtures, setFixtures] = useState([]);
  const [counts, setCounts] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [predictFixture, setPredictFixture] = useState(null);

  useEffect(() => {
    setDate(getDateString(isResults ? -1 : 0));
    setMainOnly(false);
  }, [isResults]);

  async function loadSchedule(forceRefresh = false) {
    setLoading(true);
    setError(null);
    try {
      const [listRes, countRes] = await Promise.allSettled([
        mainOnly
          ? getMainEvents({ date, sport }, { forceRefresh })
          : getFixtures({ date, sport }, { forceRefresh }),
        getFixtureCounts({ date, sport }, { forceRefresh }),
      ]);

      if (listRes.status === 'fulfilled') {
        setFixtures(listRes.value?.data || []);
      } else {
        setError(listRes.reason);
      }
      if (countRes.status === 'fulfilled') {
        setCounts(countRes.value?.data || null);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSchedule(false);
  }, [sport, date, mainOnly]);

  const filtered = useMemo(() => {
    let list = fixtures;
    if (isResults) {
      list = list.filter(isFinishedFixture);
    }
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((fx) => {
      const str = `${fx.home?.name || ''} ${fx.away?.name || ''} ${fx.league?.name || ''} ${fx.league?.category || ''}`.toLowerCase();
      return str.includes(q);
    });
  }, [fixtures, isResults, query]);

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
        <div>
          <h1 className="sz-display display-6 fw-bold text-white mb-1">
            {isResults ? 'Match Results' : 'Fixtures Schedule'}
          </h1>
          <div className="small sz-muted">
            {isResults
              ? 'Official finished scores & full-time results from SportsAPI'
              : 'Upcoming & scheduled matches · Click Predict on any upcoming fixture'}
            {counts?.fixtureCount !== undefined
              ? ` · ${formatNumber(counts.fixtureCount)} fixtures (${formatNumber(counts.liveCount || 0)} live)`
              : ''}
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          {!isResults && (
            <button
              type="button"
              className={`sz-btn sz-btn-sm ${mainOnly ? 'sz-btn-primary' : 'sz-btn-outline'}`}
              onClick={() => setMainOnly((prev) => !prev)}
            >
              <FiStar size={14} /> Main Events Only
            </button>
          )}
          <button
            type="button"
            className="sz-btn sz-btn-outline sz-btn-sm"
            onClick={() => loadSchedule(true)}
            disabled={loading}
          >
            <FiRefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Sport Tabs */}
      <div className="sz-scroll-strip">
        {FEATURED_SPORTS.map((sp) => (
          <button
            key={sp}
            type="button"
            className={`sz-tab-btn ${sport === sp ? 'active' : ''}`}
            onClick={() => setSport(sp)}
          >
            {formatSportName(sp)}
          </button>
        ))}
      </div>

      {/* Date & Search Controls */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div className="d-flex flex-wrap align-items-center gap-2">
          {(isResults ? [-3, -2, -1, 0] : [-1, 0, 1, 2, 3]).map((offset) => {
            const val = getDateString(offset);
            const label =
              offset === -1
                ? 'Yesterday'
                : offset === 0
                ? 'Today'
                : offset === 1
                ? 'Tomorrow'
                : val;
            return (
              <button
                key={offset}
                type="button"
                className={`sz-tab-btn ${date === val ? 'active' : ''}`}
                onClick={() => setDate(val)}
              >
                {label}
              </button>
            );
          })}
          <input
            type="date"
            className="sz-input sz-mono"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="position-relative" style={{ minWidth: 260, flex: '0 1 320px' }}>
          <FiSearch
            size={15}
            className="position-absolute top-50 translate-middle-y sz-muted"
            style={{ left: 12 }}
          />
          <input
            type="text"
            className="sz-input w-100"
            style={{ paddingLeft: 36 }}
            placeholder="Filter by team or league..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {error && <ApiErrorCard error={error} onRetry={() => loadSchedule(true)} />}

      {loading ? (
        <LoadingSkeletonGrid count={9} />
      ) : filtered.length === 0 ? (
        <EmptyStateCard
          title={isResults ? 'No finished matches found' : 'No fixtures found'}
          message={`No ${formatSportName(sport)} ${isResults ? 'results' : 'fixtures'} matched ${date}. Try another date or sport.`}
        />
      ) : (
        <div className="row g-3">
          {filtered.slice(0, 60).map((fx) => (
            <div className="col-md-6 col-xl-4" key={fx.id}>
              <MatchCard fixture={fx} onPredict={setPredictFixture} />
            </div>
          ))}
        </div>
      )}

      {predictFixture && (
        <PredictionModal fixture={predictFixture} onClose={() => setPredictFixture(null)} />
      )}
    </div>
  );
}
