import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiArrowRight, FiSearch } from 'react-icons/fi';
import { searchSportsApi } from '../services/sportsApi';
import EntityImage from '../components/EntityImage';
import { ApiErrorCard, EmptyStateCard, LoadingSkeletonGrid } from '../components/StateBlocks';
import { formatSportName } from '../utils/formatters';

const SEARCH_TYPES = [
  { key: 'all', label: 'All' },
  { key: 'team', label: 'Teams' },
  { key: 'player', label: 'Players' },
  { key: 'league', label: 'Leagues' },
  { key: 'fixture', label: 'Fixtures' },
  { key: 'venue', label: 'Venues' },
  { key: 'manager', label: 'Managers' },
  { key: 'referee', label: 'Referees' },
  { key: 'race', label: 'Races' },
];

function getEntityRoute(item) {
  switch (item.type) {
    case 'team':
      return `/team/${item.id}`;
    case 'player':
      return `/player/${item.id}`;
    case 'league':
      return `/league/${item.id}`;
    case 'fixture':
      return `/match/${item.id}`;
    case 'venue':
      return `/venue/${item.id}`;
    case 'manager':
      return `/manager/${item.id}`;
    case 'referee':
      return `/referee/${item.id}`;
    case 'race':
      return `/race/${item.id}`;
    default:
      return '/';
  }
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || 'Premier';
  const initialType = searchParams.get('type') || 'all';

  const [inputVal, setInputVal] = useState(initialQ);
  const [query, setQuery] = useState(initialQ);
  const [type, setType] = useState(initialType);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    const params = { q: query.trim() };
    if (type !== 'all') params.type = type;
    searchSportsApi(params)
      .then((res) => {
        if (active) setResults(res?.data || []);
      })
      .catch((err) => {
        if (active) setError(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query, type]);

  function handleSubmit(e) {
    e.preventDefault();
    const cleaned = inputVal.trim();
    if (!cleaned) return;
    setQuery(cleaned);
    setSearchParams({ q: cleaned, ...(type !== 'all' ? { type } : {}) });
  }

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h1 className="sz-display display-6 fw-bold text-white mb-1">Global Sports Search</h1>
        <div className="small sz-muted">
          Search across teams, players, leagues, fixtures, venues, managers, referees, and races
        </div>
      </div>

      <form onSubmit={handleSubmit} className="d-flex flex-wrap gap-2">
        <div className="position-relative flex-grow-1" style={{ maxWidth: 520 }}>
          <FiSearch size={16} className="position-absolute top-50 translate-middle-y sz-muted" style={{ left: 12 }} />
          <input
            type="text"
            className="sz-input w-100"
            style={{ paddingLeft: 38 }}
            placeholder="Search Premier League, Kohli, Lakers, Wembley..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
          />
        </div>
        <button type="submit" className="sz-btn sz-btn-primary">
          Search
        </button>
      </form>

      <div className="sz-scroll-strip">
        {SEARCH_TYPES.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`sz-tab-btn ${type === t.key ? 'active' : ''}`}
            onClick={() => setType(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <ApiErrorCard error={error} />}

      {loading ? (
        <LoadingSkeletonGrid count={6} />
      ) : results.length === 0 ? (
        <EmptyStateCard
          title={`No matches for "${query}"`}
          message="Try searching with a broader term or switching the entity type filter to All."
        />
      ) : (
        <div className="row g-3">
          {results.map((item, idx) => (
            <div className="col-md-6 col-xl-4" key={`${item.type}-${item.id}-${idx}`}>
              <Link
                to={getEntityRoute(item)}
                className="sz-card sz-card-interactive d-flex align-items-center justify-content-between gap-3 text-decoration-none h-100"
              >
                <div className="d-flex align-items-center gap-3 min-w-0">
                  <EntityImage src={item.image} name={item.name} size={42} />
                  <div className="min-w-0">
                    <div className="fw-bold text-white text-truncate">{item.name}</div>
                    <div className="small sz-muted text-truncate">
                      <span className="text-capitalize sz-text-orange">{item.type}</span>
                      {item.sport ? ` · ${formatSportName(item.sport)}` : ''}
                      {item.team?.name ? ` · ${item.team.name}` : ''}
                    </div>
                  </div>
                </div>
                <FiArrowRight size={15} className="sz-muted flex-shrink-0" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
