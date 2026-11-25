import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft, FiAward, FiBookmark, FiUsers } from 'react-icons/fi';
import {
  getCategories,
  getLeagueById,
  getLeagueChampions,
  getLeagueFixtures,
  getLeagueOdds,
  getLeagueSeasons,
  getLeagueStandings,
  getLeagueTopPlayers,
  getLeagueTopTeams,
  getPopularLeagues,
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

const LEAGUE_SPORTS = [
  'football',
  'basketball',
  'cricket',
  'tennis',
  'ice-hockey',
  'baseball',
  'american-football',
  'handball',
  'volleyball',
  'rugby',
  'table-tennis',
  'esports',
];

export function LeaguesDirectoryPage() {
  const [sport, setSport] = useState('football');
  const [leagues, setLeagues] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [popRes, catRes] = await Promise.allSettled([
          getPopularLeagues({ sport }),
          getCategories(sport),
        ]);
        if (!active) return;
        if (popRes.status === 'fulfilled') setLeagues(popRes.value?.data || []);
        else setError(popRes.reason);
        if (catRes.status === 'fulfilled') setCategories(catRes.value?.data || []);
      } catch (err) {
        if (active) setError(err);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [sport]);

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h1 className="sz-display display-6 fw-bold text-white mb-1">Leagues &amp; Tournaments</h1>
        <div className="small sz-muted">
          Popular competitions, standings tables, fixtures, and top players from SportsAPI
        </div>
      </div>

      <div className="sz-scroll-strip">
        {LEAGUE_SPORTS.map((sp) => (
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

      {error && <ApiErrorCard error={error} />}

      {loading ? (
        <LoadingSkeletonGrid count={9} />
      ) : leagues.length === 0 ? (
        <EmptyStateCard title="No popular leagues found" message={`No featured competitions returned for ${formatSportName(sport)}.`} />
      ) : (
        <div className="row g-3">
          {leagues.map((lg) => (
            <div className="col-md-6 col-xl-4" key={lg.id}>
              <Link
                to={`/league/${lg.id}`}
                className="sz-card sz-card-interactive d-flex align-items-center gap-3 text-decoration-none h-100"
              >
                <EntityImage src={lg.image} name={lg.name} size={44} />
                <div className="min-w-0">
                  <div className="fw-bold text-white text-truncate">{lg.name}</div>
                  <div className="small sz-muted text-truncate">
                    {lg.category || lg.country?.name || formatSportName(lg.sport || sport)}
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {categories.length > 0 && (
        <section className="mt-2">
          <h2 className="sz-section-title mb-3">Regions &amp; Categories ({categories.length})</h2>
          <div className="row g-2">
            {categories.slice(0, 24).map((cat) => (
              <div className="col-6 col-md-4 col-xl-3" key={cat.id || cat.slug}>
                <div className="sz-card py-2 px-3 d-flex align-items-center gap-2">
                  {cat.flag && <EntityImage src={cat.flag} name={cat.name} size={20} />}
                  <span className="small text-white text-truncate">{cat.name}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function LeagueDetailPage() {
  const { id } = useParams();
  const { isFavorite, toggleFavorite } = useArena();

  const [league, setLeague] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [tab, setTab] = useState('standings'); // standings | fixtures | topPlayers | topTeams | champions | odds

  const [tabData, setTabData] = useState({});
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tabError, setTabError] = useState(null);
  const [predictFixture, setPredictFixture] = useState(null);

  useEffect(() => {
    let active = true;
    async function init() {
      setLoading(true);
      setError(null);
      setTabData({});
      try {
        const [lgRes, seaRes] = await Promise.all([getLeagueById(id), getLeagueSeasons(id)]);
        if (!active) return;
        setLeague(lgRes?.data || null);
        const list = seaRes?.data || [];
        setSeasons(list);
        setSelectedSeason(list[0]?.id ? String(list[0].id) : '');
      } catch (err) {
        if (active) setError(err);
      } finally {
        if (active) setLoading(false);
      }
    }
    init();
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id || (!selectedSeason && tab !== 'champions')) return;
    const key = `${tab}:${selectedSeason}`;
    if (tabData[key]) {
      setTabError(null);
      return;
    }

    let active = true;
    async function loadTab() {
      setTabLoading(true);
      setTabError(null);
      try {
        let res;
        if (tab === 'standings') {
          res = await getLeagueStandings(id, { season: selectedSeason });
        } else if (tab === 'fixtures') {
          res = await getLeagueFixtures(id, { season: selectedSeason, type: 'next' });
        } else if (tab === 'topPlayers') {
          res = await getLeagueTopPlayers(id, { season: selectedSeason });
        } else if (tab === 'topTeams') {
          res = await getLeagueTopTeams(id, { season: selectedSeason });
        } else if (tab === 'champions') {
          res = await getLeagueChampions(id);
        } else if (tab === 'odds') {
          res = await getLeagueOdds(id, { season: selectedSeason });
        }
        if (active) setTabData((p) => ({ ...p, [key]: res?.data }));
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
  }, [id, selectedSeason, tab]);

  if (loading) return <LoadingTableSkeleton rows={8} />;
  if (error) return <ApiErrorCard error={error} />;
  if (!league) return <EmptyStateCard title="League not found" />;

  const activeData = tabData[`${tab}:${selectedSeason}`];
  const saved = isFavorite('leagues', league.id);

  return (
    <div className="d-flex flex-column gap-4">
      <Link to="/leagues" className="small sz-muted d-inline-flex align-items-center gap-1">
        <FiArrowLeft size={14} /> Back to Leagues
      </Link>

      <div className="sz-hero d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
        <div className="d-flex align-items-center gap-3">
          <EntityImage src={league.image} name={league.name} size={64} />
          <div>
            <div className="small sz-muted">
              {formatSportName(league.sport)} · {league.category || league.country?.name || 'International'}
            </div>
            <h1 className="sz-display display-6 fw-bold text-white mb-0">{league.name}</h1>
            {league.titleHolder?.name && (
              <div className="small sz-muted mt-1">
                Defending Champion: <span className="text-white fw-semibold">{league.titleHolder.name}</span>
              </div>
            )}
          </div>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2">
          {seasons.length > 0 && (
            <select
              className="sz-select sz-mono"
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              aria-label="Select season"
            >
              {seasons.slice(0, 15).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || s.year}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            className={`sz-btn sz-btn-sm ${saved ? 'sz-btn-primary' : 'sz-btn-outline'}`}
            onClick={() =>
              toggleFavorite('leagues', {
                id: league.id,
                name: league.name,
                sport: league.sport,
                image: league.image,
              })
            }
          >
            <FiBookmark size={14} /> {saved ? 'Following' : 'Follow'}
          </button>
        </div>
      </div>

      <div className="sz-scroll-strip">
        {[
          { k: 'standings', l: 'Standings' },
          { k: 'fixtures', l: 'Upcoming Fixtures' },
          { k: 'topPlayers', l: 'Top Players' },
          { k: 'topTeams', l: 'Top Teams' },
          { k: 'champions', l: 'Champions History' },
          { k: 'odds', l: 'Outright Odds' },
        ].map((item) => (
          <button
            key={item.k}
            type="button"
            className={`sz-tab-btn ${tab === item.k ? 'active' : ''}`}
            onClick={() => setTab(item.k)}
          >
            {item.l}
          </button>
        ))}
      </div>

      {tabError && <ApiErrorCard error={tabError} />}

      {tabLoading ? (
        <LoadingTableSkeleton rows={8} />
      ) : !tabError && (
        <>
          {tab === 'standings' && (
            Array.isArray(activeData) && activeData.length > 0 ? (
              <div className="d-flex flex-column gap-4">
                {activeData.map((group, gi) => (
                  <div key={group.name || gi}>
                    {group.name && <h2 className="sz-display h5 text-white mb-2">{group.name}</h2>}
                    <div className="sz-table-wrap">
                      <table className="sz-table">
                        <thead>
                          <tr>
                            <th style={{ width: 42 }}>#</th>
                            <th>Team</th>
                            <th className="num">P</th>
                            <th className="num">W</th>
                            <th className="num">D</th>
                            <th className="num">L</th>
                            <th className="num">Diff</th>
                            <th className="num">Pts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(group.rows || []).map((r) => (
                            <tr key={r.team?.id || r.position}>
                              <td className="sz-mono fw-bold text-white">{r.position}</td>
                              <td>
                                <Link to={`/team/${r.team?.id}`} className="d-flex align-items-center gap-2 text-white fw-semibold">
                                  <EntityImage src={r.team?.image} name={r.team?.name} size={22} />
                                  <span>{r.team?.name}</span>
                                </Link>
                              </td>
                              <td className="num">{r.played ?? '—'}</td>
                              <td className="num">{r.wins ?? '—'}</td>
                              <td className="num">{r.draws ?? '—'}</td>
                              <td className="num">{r.losses ?? '—'}</td>
                              <td className="num">{r.scoreDifference ?? '—'}</td>
                              <td className="num sz-text-green fw-bold">{r.points ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyStateCard title="No standings table available" message="This competition or season may use a knockout bracket without group standings." />
            )
          )}

          {tab === 'fixtures' && (
            Array.isArray(activeData) && activeData.length > 0 ? (
              <div className="row g-3">
                {activeData.slice(0, 36).map((fx) => (
                  <div className="col-md-6 col-xl-4" key={fx.id}>
                    <MatchCard fixture={fx} onPredict={setPredictFixture} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyStateCard title="No upcoming fixtures listed for this season" />
            )
          )}

          {tab === 'topPlayers' && (
            (() => {
              const rows = Array.isArray(activeData)
                ? activeData
                : activeData && typeof activeData === 'object'
                ? Object.values(activeData).flat().filter(Boolean)
                : [];
              return rows.length === 0 ? (
                <EmptyStateCard title="No top players leaderboard available for this season" />
              ) : (
                <div className="sz-table-wrap">
                  <table className="sz-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Player</th>
                        <th>Team</th>
                        <th className="num">Value / Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 30).map((row, idx) => (
                        <tr key={`${row.player?.id || idx}-${idx}`}>
                          <td className="sz-mono">{idx + 1}</td>
                          <td>
                            {row.player?.id ? (
                              <Link to={`/player/${row.player.id}`} className="text-white fw-semibold">
                                {row.player.name}
                              </Link>
                            ) : (
                              <span className="text-white">{row.player?.name || 'Player'}</span>
                            )}
                          </td>
                          <td>{row.team?.name || '—'}</td>
                          <td className="num sz-text-orange fw-bold">
                            {row.statistics?.rating ?? row.statistics?.goals ?? row.value ?? row.rating ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()
          )}

          {tab === 'topTeams' && (
            (() => {
              const rows = Array.isArray(activeData)
                ? activeData
                : activeData && typeof activeData === 'object'
                ? Object.values(activeData).flat().filter(Boolean)
                : [];
              return rows.length === 0 ? (
                <EmptyStateCard title="No top teams statistics available" />
              ) : (
                <div className="sz-table-wrap">
                  <table className="sz-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Team</th>
                        <th className="num">Metric</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 25).map((row, idx) => (
                        <tr key={`${row.team?.id || idx}-${idx}`}>
                          <td className="sz-mono">{idx + 1}</td>
                          <td>
                            <Link to={`/team/${row.team?.id}`} className="d-flex align-items-center gap-2 text-white fw-semibold">
                              <EntityImage src={row.team?.image} name={row.team?.name} size={22} />
                              <span>{row.team?.name || 'Team'}</span>
                            </Link>
                          </td>
                          <td className="num sz-text-green fw-bold">
                            {row.statistics?.avgRating ?? row.value ?? row.rating ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()
          )}

          {tab === 'champions' && (
            Array.isArray(activeData) && activeData.length > 0 ? (
              <div className="sz-table-wrap">
                <table className="sz-table">
                  <thead>
                    <tr>
                      <th>Season</th>
                      <th>Champion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeData.slice(0, 30).map((c, idx) => (
                      <tr key={c.seasonId || idx}>
                        <td className="sz-mono text-white">{c.year || c.seasonId}</td>
                        <td>
                          {c.team?.id ? (
                            <Link to={`/team/${c.team.id}`} className="d-flex align-items-center gap-2 text-white fw-semibold">
                              <EntityImage src={c.team.image} name={c.team.name} size={22} />
                              <span>{c.team.name}</span>
                            </Link>
                          ) : (
                            <span className="text-white">{c.team?.name || '—'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyStateCard title="No historical champions listed" />
            )
          )}

          {tab === 'odds' && (
            activeData?.markets && activeData.markets.length > 0 ? (
              <div className="row g-3">
                {activeData.markets.map((m, idx) => (
                  <div className="col-12" key={m.key || idx}>
                    <div className="sz-card">
                      <h3 className="sz-display h5 text-white mb-3">{m.name || m.kind}</h3>
                      <div className="row g-2">
                        {(m.choices || []).slice(0, 16).map((c, ci) => (
                          <div className="col-6 col-md-4 col-xl-3" key={ci}>
                            <div className="p-2 rounded d-flex justify-content-between align-items-center" style={{ backgroundColor: '#0B0D11', border: '1px solid var(--sz-border)' }}>
                              <span className="small text-white text-truncate">{c.team?.name || c.name}</span>
                              <span className="sz-mono fw-bold sz-text-green ms-2">{c.decimal ?? c.fractional ?? '—'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyStateCard title="No outright odds available for this league season" />
            )
          )}
        </>
      )}

      {predictFixture && (
        <PredictionModal fixture={predictFixture} onClose={() => setPredictFixture(null)} />
      )}
    </div>
  );
}
