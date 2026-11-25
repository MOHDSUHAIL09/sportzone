import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FiActivity, FiRefreshCw, FiSearch, FiZap } from 'react-icons/fi';
import { getLiveScores, getLiveScoreWire, getSports } from '../services/sportsApi';
import MatchCard from '../components/MatchCard';
import PredictionModal from '../components/PredictionModal';
import { ApiErrorCard, EmptyStateCard, LoadingSkeletonGrid } from '../components/StateBlocks';
import { formatDateTimeShort, formatSportName } from '../utils/formatters';

export default function LiveScoresPage() {
  const [sports, setSports] = useState([]);
  const [selectedSport, setSelectedSport] = useState('all');
  const [viewMode, setViewMode] = useState('matches'); // 'matches' | 'wire'
  const [matches, setMatches] = useState([]);
  const [wire, setWire] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [predictFixture, setPredictFixture] = useState(null);

  useEffect(() => {
    getSports()
      .then((res) => setSports(res?.data || []))
      .catch(() => {});
  }, []);

  async function fetchLive(forceRefresh = false) {
    setLoading(true);
    setError(null);
    const params = selectedSport !== 'all' ? { sport: selectedSport } : {};
    try {
      if (viewMode === 'matches') {
        const res = await getLiveScores(params, { forceRefresh });
        setMatches(res?.data || []);
      } else {
        const res = await getLiveScoreWire({ ...params, limit: 40 }, { forceRefresh });
        setWire(res?.data || []);
      }
      setLastUpdated(new Date());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLive(false);
  }, [selectedSport, viewMode]);

  const sportTabs = useMemo(() => {
    const liveFirst = [...sports].sort((a, b) => (b.live || 0) - (a.live || 0));
    return liveFirst;
  }, [sports]);

  const filteredMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return matches;
    return matches.filter((m) => {
      const text = `${m.home?.name || ''} ${m.away?.name || ''} ${m.league?.name || ''} ${m.league?.category || ''}`.toLowerCase();
      return text.includes(q);
    });
  }, [matches, query]);

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
        <div>
          <h1 className="sz-display display-6 fw-bold text-white mb-1">Live Scores</h1>
          <div className="small sz-muted">
            Real-time in-progress matches &amp; score wire from SportsAPI
            {lastUpdated ? ` · Updated ${lastUpdated.toLocaleTimeString()}` : ''}
          </div>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="sz-segment-bar">
            <button
              type="button"
              className={`sz-segment-btn ${viewMode === 'matches' ? 'active' : ''}`}
              onClick={() => setViewMode('matches')}
            >
              <FiActivity className="me-1" size={14} /> Live Matches
            </button>
            <button
              type="button"
              className={`sz-segment-btn ${viewMode === 'wire' ? 'active' : ''}`}
              onClick={() => setViewMode('wire')}
            >
              <FiZap className="me-1" size={14} /> Live Score Wire
            </button>
          </div>
          <button
            type="button"
            className="sz-btn sz-btn-outline sz-btn-sm"
            onClick={() => fetchLive(true)}
            disabled={loading}
          >
            <FiRefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Sport Filter Tabs */}
      <div className="sz-scroll-strip">
        <button
          type="button"
          className={`sz-tab-btn ${selectedSport === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedSport('all')}
        >
          All Sports
        </button>
        {sportTabs.map((sp) => (
          <button
            key={sp.slug}
            type="button"
            className={`sz-tab-btn ${selectedSport === sp.slug ? 'active' : ''}`}
            onClick={() => setSelectedSport(sp.slug)}
          >
            <span>{sp.name}</span>
            {sp.live > 0 && (
              <span className="sz-mono small" style={{ color: selectedSport === sp.slug ? '#fff' : 'var(--sz-green)' }}>
                {sp.live}
              </span>
            )}
          </button>
        ))}
      </div>

      {viewMode === 'matches' && (
        <div className="position-relative" style={{ maxWidth: 420 }}>
          <FiSearch
            size={16}
            className="position-absolute top-50 translate-middle-y sz-muted"
            style={{ left: 12 }}
          />
          <input
            type="text"
            className="sz-input w-100"
            style={{ paddingLeft: 38 }}
            placeholder="Filter live matches by team or league..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      {error && <ApiErrorCard error={error} onRetry={() => fetchLive(true)} />}

      {loading ? (
        <LoadingSkeletonGrid count={6} />
      ) : viewMode === 'matches' ? (
        filteredMatches.length === 0 ? (
          <EmptyStateCard
            title="No live matches found"
            message={
              selectedSport === 'all'
                ? 'There are currently no in-progress matches matching your filter.'
                : `No live ${formatSportName(selectedSport)} matches right now. Try selecting All Sports or check today's upcoming fixtures.`
            }
            actionLabel={selectedSport !== 'all' ? 'Show All Sports' : undefined}
            onAction={selectedSport !== 'all' ? () => setSelectedSport('all') : undefined}
          />
        ) : (
          <div className="row g-3">
            {filteredMatches.map((fx) => (
              <div className="col-md-6 col-xl-4" key={fx.id}>
                <MatchCard
                  fixture={fx}
                  showSport={selectedSport === 'all'}
                  onPredict={setPredictFixture}
                />
              </div>
            ))}
          </div>
        )
      ) : wire.length === 0 ? (
        <EmptyStateCard
          title="No Live Score Wire updates"
          message="No recent score-change events were returned by /v2/livescores/wire for this filter."
        />
      ) : (
        <div className="sz-table-wrap">
          <table className="sz-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Sport</th>
                <th>Match</th>
                <th>Event</th>
                <th className="num">Score</th>
                <th className="text-end">Details</th>
              </tr>
            </thead>
            <tbody>
              {wire.map((ev, idx) => (
                <tr key={`${ev.fixtureId}-${ev.at}-${idx}`}>
                  <td className="sz-mono small">{formatDateTimeShort(ev.at)}</td>
                  <td className="text-white fw-semibold">{formatSportName(ev.sport)}</td>
                  <td className="text-white">
                    {ev.home?.name || 'Home'} vs {ev.away?.name || 'Away'}
                  </td>
                  <td>{ev.kind || ev.status?.description || 'Score Update'}</td>
                  <td className="num sz-text-green fw-bold">
                    {ev.homeScore ?? '—'} - {ev.awayScore ?? '—'}
                  </td>
                  <td className="text-end">
                    <Link to={`/match/${ev.fixtureId}`} className="sz-text-orange fw-semibold small">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {predictFixture && (
        <PredictionModal fixture={predictFixture} onClose={() => setPredictFixture(null)} />
      )}
    </div>
  );
}
