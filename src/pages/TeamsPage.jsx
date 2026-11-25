import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft, FiBookmark, FiMapPin, FiSearch } from 'react-icons/fi';
import {
  getTeamById,
  getTeamFixtures,
  getTeamPerformance,
  getTeamRankings,
  getTeamSquad,
  getTeamTrophies,
  searchSportsApi,
} from '../services/sportsApi';
import EntityImage from '../components/EntityImage';
import MatchCard from '../components/MatchCard';
import PredictionModal from '../components/PredictionModal';
import {
  ApiErrorCard,
  EmptyStateCard,
  LoadingSkeletonGrid,
  LoadingTableSkeleton,
} from '../components/StateBlocks';
import { useArena } from '../context/ArenaContext';
import { formatSportName } from '../utils/formatters';

const QUICK_TEAM_QUERIES = ['Arsenal', 'Real Madrid', 'India', 'Lakers', 'Barcelona', 'Manchester'];

export function TeamsDirectoryPage() {
  const [query, setQuery] = useState('Arsenal');
  const [inputVal, setInputVal] = useState('Arsenal');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!query.trim()) return;
    let active = true;
    setLoading(true);
    setError(null);
    searchSportsApi({ q: query.trim(), type: 'team' })
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
  }, [query]);

  function handleSearch(e) {
    e.preventDefault();
    if (inputVal.trim()) setQuery(inputVal.trim());
  }

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h1 className="sz-display display-6 fw-bold text-white mb-1">Teams Directory</h1>
        <div className="small sz-muted">
          Search clubs, national teams, and franchises across all 25 sports in SportsAPI
        </div>
      </div>

      <form onSubmit={handleSearch} className="d-flex flex-wrap gap-2">
        <div className="position-relative flex-grow-1" style={{ maxWidth: 460 }}>
          <FiSearch size={16} className="position-absolute top-50 translate-middle-y sz-muted" style={{ left: 12 }} />
          <input
            type="text"
            className="sz-input w-100"
            style={{ paddingLeft: 38 }}
            placeholder="Search any club or national team..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
          />
        </div>
        <button type="submit" className="sz-btn sz-btn-primary">Search Teams</button>
      </form>

      <div className="sz-scroll-strip">
        {QUICK_TEAM_QUERIES.map((q) => (
          <button
            key={q}
            type="button"
            className={`sz-tab-btn ${query === q ? 'active' : ''}`}
            onClick={() => {
              setInputVal(q);
              setQuery(q);
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {error && <ApiErrorCard error={error} />}

      {loading ? (
        <LoadingSkeletonGrid count={6} />
      ) : results.length === 0 ? (
        <EmptyStateCard title="No teams matched your query" message="Try a different club or national team name." />
      ) : (
        <div className="row g-3">
          {results.map((item) => (
            <div className="col-md-6 col-xl-4" key={item.id}>
              <Link
                to={`/team/${item.id}`}
                className="sz-card sz-card-interactive d-flex align-items-center gap-3 text-decoration-none h-100"
              >
                <EntityImage src={item.image} name={item.name} size={46} />
                <div className="min-w-0">
                  <div className="fw-bold text-white text-truncate">{item.name}</div>
                  <div className="small sz-muted">
                    {formatSportName(item.sport)} {item.gender ? `· ${item.gender}` : ''}
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TeamDetailPage() {
  const { id } = useParams();
  const { isFavorite, toggleFavorite } = useArena();

  const [team, setTeam] = useState(null);
  const [tab, setTab] = useState('fixtures'); // fixtures | squad | trophies | rankings
  const [tabData, setTabData] = useState({});
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tabError, setTabError] = useState(null);
  const [predictFixture, setPredictFixture] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setTabData({});
    getTeamById(id)
      .then((res) => {
        if (active) setTeam(res?.data || null);
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
  }, [id]);

  useEffect(() => {
    if (!id || tabData[tab]) {
      setTabError(null);
      return;
    }
    let active = true;
    async function loadTab() {
      setTabLoading(true);
      setTabError(null);
      try {
        if (tab === 'fixtures') {
          const [nextRes, lastRes] = await Promise.allSettled([
            getTeamFixtures(id, { type: 'next' }),
            getTeamFixtures(id, { type: 'last' }),
          ]);
          if (active) {
            setTabData((p) => ({
              ...p,
              fixtures: {
                next: nextRes.status === 'fulfilled' ? nextRes.value?.data || [] : [],
                last: lastRes.status === 'fulfilled' ? lastRes.value?.data || [] : [],
              },
            }));
          }
        } else if (tab === 'squad') {
          const res = await getTeamSquad(id);
          if (active) setTabData((p) => ({ ...p, squad: res?.data || [] }));
        } else if (tab === 'trophies') {
          const res = await getTeamTrophies(id);
          if (active) setTabData((p) => ({ ...p, trophies: res?.data || [] }));
        } else if (tab === 'rankings') {
          const [rkRes, perfRes] = await Promise.allSettled([
            getTeamRankings(id),
            getTeamPerformance(id),
          ]);
          if (active) {
            setTabData((p) => ({
              ...p,
              rankings: {
                rankings: rkRes.status === 'fulfilled' ? rkRes.value?.data || [] : [],
                performance: perfRes.status === 'fulfilled' ? perfRes.value?.data || [] : [],
              },
            }));
          }
        }
      } catch (err) {
        if (active) setTabError(err);
      } finally {
        if (active) setTabLoading(false);
      }
    }
    loadTab();
    return () => {
      active = false;
    };
  }, [id, tab]);

  if (loading) return <LoadingTableSkeleton rows={6} />;
  if (error) return <ApiErrorCard error={error} />;
  if (!team) return <EmptyStateCard title="Team not found" />;

  const saved = isFavorite('teams', team.id);
  const activeData = tabData[tab];

  return (
    <div className="d-flex flex-column gap-4">
      <Link to="/teams" className="small sz-muted d-inline-flex align-items-center gap-1">
        <FiArrowLeft size={14} /> Back to Teams
      </Link>

      <div className="sz-hero d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
        <div className="d-flex align-items-center gap-3">
          <EntityImage src={team.image} name={team.name} size={68} />
          <div>
            <div className="small sz-muted">
              {formatSportName(team.sport)} · {team.country?.name || 'International'}
              {team.code ? ` · ${team.code}` : ''}
            </div>
            <h1 className="sz-display display-6 fw-bold text-white mb-1">{team.name}</h1>
            <div className="d-flex flex-wrap gap-3 small sz-muted">
              {team.venue?.id && (
                <Link to={`/venue/${team.venue.id}`} className="sz-text-orange">
                  <FiMapPin size={13} className="me-1" /> {team.venue.name}
                </Link>
              )}
              {team.manager?.id && (
                <Link to={`/manager/${team.manager.id}`} className="text-white">
                  Manager: {team.manager.name}
                </Link>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          className={`sz-btn sz-btn-sm ${saved ? 'sz-btn-primary' : 'sz-btn-outline'}`}
          onClick={() =>
            toggleFavorite('teams', {
              id: team.id,
              name: team.name,
              sport: team.sport,
              image: team.image,
            })
          }
        >
          <FiBookmark size={14} /> {saved ? 'Following Team' : 'Follow Team'}
        </button>
      </div>

      <div className="sz-segment-bar align-self-start">
        {[
          { k: 'fixtures', l: 'Matches' },
          { k: 'squad', l: 'Squad' },
          { k: 'trophies', l: 'Trophies' },
          { k: 'rankings', l: 'Rankings & Form' },
        ].map((t) => (
          <button
            key={t.k}
            type="button"
            className={`sz-segment-btn ${tab === t.k ? 'active' : ''}`}
            onClick={() => setTab(t.k)}
          >
            {t.l}
          </button>
        ))}
      </div>

      {tabError && <ApiErrorCard error={tabError} />}
      {tabLoading ? (
        <LoadingTableSkeleton rows={6} />
      ) : !tabError && (
        <>
          {tab === 'fixtures' && activeData && (
            <div className="d-flex flex-column gap-4">
              {activeData.next.length > 0 && (
                <div>
                  <h2 className="sz-display h5 text-white mb-3">Upcoming Matches</h2>
                  <div className="row g-3">
                    {activeData.next.slice(0, 9).map((fx) => (
                      <div className="col-md-6 col-xl-4" key={fx.id}>
                        <MatchCard fixture={fx} onPredict={setPredictFixture} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeData.last.length > 0 && (
                <div>
                  <h2 className="sz-display h5 text-white mb-3">Recent Results</h2>
                  <div className="row g-3">
                    {activeData.last.slice(0, 9).map((fx) => (
                      <div className="col-md-6 col-xl-4" key={fx.id}>
                        <MatchCard fixture={fx} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeData.next.length === 0 && activeData.last.length === 0 && (
                <EmptyStateCard title="No team fixtures found" />
              )}
            </div>
          )}

          {tab === 'squad' && (
            (() => {
              const players = Array.isArray(activeData)
                ? activeData
                : activeData?.players || [];
              return players.length === 0 ? (
                <EmptyStateCard title="Squad roster unavailable" />
              ) : (
                <div className="sz-table-wrap">
                  <table className="sz-table">
                    <thead>
                      <tr>
                        <th style={{ width: 52 }}>#</th>
                        <th>Player</th>
                        <th>Position</th>
                        <th>Country</th>
                        <th className="num">Height</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.map((entry, idx) => {
                        const pl = entry.player || entry;
                        return (
                          <tr key={pl.id || idx}>
                            <td className="sz-mono">{pl.jerseyNumber ?? entry.jerseyNumber ?? '—'}</td>
                            <td>
                              <Link to={`/player/${pl.id}`} className="d-flex align-items-center gap-2 text-white fw-semibold">
                                <EntityImage src={pl.image} name={pl.name} size={26} />
                                <span>{pl.name}</span>
                              </Link>
                            </td>
                            <td>{pl.position || pl.positionCode || '—'}</td>
                            <td>{pl.country?.name || '—'}</td>
                            <td className="num">{pl.heightCm ? `${pl.heightCm} cm` : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()
          )}

          {tab === 'trophies' && (
            Array.isArray(activeData) && activeData.length > 0 ? (
              <div className="row g-3">
                {activeData.map((tr, i) => (
                  <div className="col-md-6 col-xl-4" key={i}>
                    <div className="sz-card h-100">
                      <div className="fw-bold text-white mb-1">{tr.league?.name || tr.name || 'Competition'}</div>
                      <div className="small sz-mono sz-text-orange">
                        Titles: {tr.count ?? tr.titles ?? (Array.isArray(tr.seasons) ? tr.seasons.length : '—')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyStateCard title="No trophy records returned for this team" />
            )
          )}

          {tab === 'rankings' && activeData && (
            <div className="row g-3">
              <div className="col-lg-6">
                <div className="sz-card h-100">
                  <h3 className="sz-display h5 text-white mb-3">World / Club Rankings</h3>
                  {activeData.rankings.length === 0 ? (
                    <div className="small sz-muted">No official ranking entries listed.</div>
                  ) : (
                    activeData.rankings.map((rk, i) => (
                      <div key={i} className="d-flex justify-content-between py-2 small" style={{ borderBottom: '1px solid var(--sz-border)' }}>
                        <span className="text-white">{rk.type}</span>
                        <span className="sz-mono fw-bold sz-text-green">#{rk.position} ({rk.points ?? '—'} pts)</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="col-lg-6">
                <div className="sz-card h-100">
                  <h3 className="sz-display h5 text-white mb-3">Recent Performance Index</h3>
                  {activeData.performance.length === 0 ? (
                    <div className="small sz-muted">No recent performance trend recorded.</div>
                  ) : (
                    activeData.performance.slice(0, 8).map((pf, i) => (
                      <div key={i} className="d-flex justify-content-between py-2 small" style={{ borderBottom: '1px solid var(--sz-border)' }}>
                        <span className="text-white">
                          {pf.fixture?.home?.name || 'Home'} vs {pf.fixture?.away?.name || 'Away'}
                        </span>
                        <span className="sz-mono sz-text-orange">{pf.score ?? '—'}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {predictFixture && (
        <PredictionModal fixture={predictFixture} onClose={() => setPredictFixture(null)} />
      )}
    </div>
  );
}
