import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft, FiSearch } from 'react-icons/fi';
import {
  getPlayerAttributes,
  getPlayerById,
  getPlayerCareer,
  getPlayerFixtures,
  getPlayerNationalTeam,
  getPlayerTransfers,
  searchSportsApi,
} from '../services/sportsApi';
import EntityImage from '../components/EntityImage';
import MatchCard from '../components/MatchCard';
import {
  ApiErrorCard,
  EmptyStateCard,
  LoadingSkeletonGrid,
  LoadingTableSkeleton,
} from '../components/StateBlocks';
import { formatDateTimeShort, formatNumber, formatSportName } from '../utils/formatters';

const QUICK_PLAYERS = ['Mbappe', 'Kohli', 'Alcaraz', 'LeBron', 'Haaland', 'Sinner'];

export function PlayersDirectoryPage() {
  const [query, setQuery] = useState('Haaland');
  const [inputVal, setInputVal] = useState('Haaland');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!query.trim()) return;
    let active = true;
    setLoading(true);
    setError(null);
    searchSportsApi({ q: query.trim(), type: 'player' })
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
        <h1 className="sz-display display-6 fw-bold text-white mb-1">Players Directory</h1>
        <div className="small sz-muted">
          Search athletes across global football, cricket, tennis, basketball and more
        </div>
      </div>

      <form onSubmit={handleSearch} className="d-flex flex-wrap gap-2">
        <div className="position-relative flex-grow-1" style={{ maxWidth: 460 }}>
          <FiSearch size={16} className="position-absolute top-50 translate-middle-y sz-muted" style={{ left: 12 }} />
          <input
            type="text"
            className="sz-input w-100"
            style={{ paddingLeft: 38 }}
            placeholder="Search any player by name..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
          />
        </div>
        <button type="submit" className="sz-btn sz-btn-primary">Search Players</button>
      </form>

      <div className="sz-scroll-strip">
        {QUICK_PLAYERS.map((q) => (
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
        <EmptyStateCard title="No players found" message="Try searching with another athlete's surname." />
      ) : (
        <div className="row g-3">
          {results.map((item) => (
            <div className="col-md-6 col-xl-4" key={item.id}>
              <Link
                to={`/player/${item.id}`}
                className="sz-card sz-card-interactive d-flex align-items-center gap-3 text-decoration-none h-100"
              >
                <EntityImage src={item.image} name={item.name} size={46} />
                <div className="min-w-0">
                  <div className="fw-bold text-white text-truncate">{item.name}</div>
                  <div className="small sz-muted text-truncate">
                    {formatSportName(item.sport)}
                    {item.team?.name ? ` · ${item.team.name}` : ''}
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

export function PlayerDetailPage() {
  const { id } = useParams();
  const [player, setPlayer] = useState(null);
  const [tab, setTab] = useState('career'); // career | attributes | fixtures | transfers
  const [tabData, setTabData] = useState({});
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tabError, setTabError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setTabData({});
    getPlayerById(id)
      .then((res) => {
        if (active) setPlayer(res?.data || null);
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
        if (tab === 'career') {
          const [carRes, natRes] = await Promise.allSettled([
            getPlayerCareer(id),
            getPlayerNationalTeam(id),
          ]);
          if (active) {
            setTabData((p) => ({
              ...p,
              career: {
                seasons: carRes.status === 'fulfilled' ? carRes.value?.data || [] : [],
                national: natRes.status === 'fulfilled' ? natRes.value?.data : null,
              },
            }));
          }
        } else if (tab === 'attributes') {
          const res = await getPlayerAttributes(id);
          if (active) setTabData((p) => ({ ...p, attributes: res?.data || null }));
        } else if (tab === 'fixtures') {
          const res = await getPlayerFixtures(id);
          if (active) setTabData((p) => ({ ...p, fixtures: res?.data || [] }));
        } else if (tab === 'transfers') {
          const res = await getPlayerTransfers(id);
          if (active) setTabData((p) => ({ ...p, transfers: res?.data || [] }));
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
  if (!player) return <EmptyStateCard title="Player not found" />;

  const activeData = tabData[tab];

  return (
    <div className="d-flex flex-column gap-4">
      <Link to="/players" className="small sz-muted d-inline-flex align-items-center gap-1">
        <FiArrowLeft size={14} /> Back to Players
      </Link>

      <div className="sz-hero d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
        <div className="d-flex align-items-center gap-3">
          <EntityImage src={player.image} name={player.name} size={74} />
          <div>
            <div className="small sz-muted">
              {player.position || 'Athlete'} · {player.country?.name || 'International'}
              {player.jerseyNumber ? ` · #${player.jerseyNumber}` : ''}
            </div>
            <h1 className="sz-display display-6 fw-bold text-white mb-1">{player.name}</h1>
            <div className="d-flex flex-wrap gap-3 small sz-muted">
              {player.team?.id && (
                <Link to={`/team/${player.team.id}`} className="sz-text-orange fw-semibold">
                  {player.team.name}
                </Link>
              )}
              {player.heightCm && <span>Height: <strong className="text-white">{player.heightCm} cm</strong></span>}
              {player.preferredFoot && <span>Foot: <strong className="text-white">{player.preferredFoot}</strong></span>}
              {player.dateOfBirth && <span>DOB: <strong className="sz-mono text-white">{player.dateOfBirth}</strong></span>}
            </div>
          </div>
        </div>

        {player.marketValue && (
          <div className="text-md-end">
            <div className="small sz-muted">Market Value</div>
            <div className="sz-mono fw-bold fs-4 sz-text-green">
              {typeof player.marketValue === 'object'
                ? `${formatNumber(player.marketValue.value)} ${player.marketValue.currency || 'EUR'}`
                : formatNumber(player.marketValue)}
            </div>
          </div>
        )}
      </div>

      <div className="sz-segment-bar align-self-start">
        {[
          { k: 'career', l: 'Career Stats' },
          { k: 'attributes', l: 'Attributes' },
          { k: 'fixtures', l: 'Recent Matches' },
          { k: 'transfers', l: 'Transfers' },
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
          {tab === 'career' && activeData && (
            <div className="d-flex flex-column gap-3">
              {activeData.national && (
                <div className="sz-card">
                  <h2 className="sz-display h5 text-white mb-2">National Team Record</h2>
                  <div className="small sz-mono sz-muted">
                    Team: <span className="text-white">{activeData.national.team?.name || '—'}</span> · Appearances:{' '}
                    <span className="text-white">{activeData.national.appearances ?? '—'}</span> · Goals:{' '}
                    <span className="sz-text-green">{activeData.national.goals ?? '—'}</span>
                  </div>
                </div>
              )}

              {activeData.seasons.length === 0 ? (
                <EmptyStateCard title="No career season statistics returned" />
              ) : (
                <div className="sz-table-wrap">
                  <table className="sz-table">
                    <thead>
                      <tr>
                        <th>Season</th>
                        <th>Competition</th>
                        <th>Team</th>
                        <th className="num">Apps</th>
                        <th className="num">Goals / Pts</th>
                        <th className="num">Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeData.seasons.slice(0, 25).map((s, idx) => (
                        <tr key={idx}>
                          <td className="sz-mono text-white">{s.season?.year || s.season?.name || '—'}</td>
                          <td>{s.league?.name || '—'}</td>
                          <td>{s.team?.name || '—'}</td>
                          <td className="num">{s.statistics?.appearances ?? s.statistics?.matches ?? '—'}</td>
                          <td className="num text-white fw-semibold">{s.statistics?.goals ?? s.statistics?.points ?? '—'}</td>
                          <td className="num sz-text-green fw-bold">
                            {s.statistics?.rating ? Number(s.statistics.rating).toFixed(2) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'attributes' && (
            activeData && typeof activeData === 'object' ? (
              <div className="sz-card">
                <h2 className="sz-display h5 text-white mb-3">Attribute Overview</h2>
                <div className="row g-3">
                  {Object.entries(activeData.average || activeData.latest || activeData)
                    .filter(([, v]) => typeof v === 'number')
                    .map(([k, v]) => (
                      <div className="col-6 col-md-4" key={k}>
                        <div className="d-flex justify-content-between small mb-1">
                          <span className="text-capitalize text-white">{k.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="sz-mono fw-bold sz-text-orange">{v}</span>
                        </div>
                        <div className="sz-stat-track">
                          <div className="sz-stat-home" style={{ width: `${Math.min(100, v)}%` }} />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <EmptyStateCard title="No player attributes available" />
            )
          )}

          {tab === 'fixtures' && (
            Array.isArray(activeData) && activeData.length > 0 ? (
              <div className="row g-3">
                {activeData.slice(0, 12).map((fx) => (
                  <div className="col-md-6 col-xl-4" key={fx.id}>
                    <MatchCard fixture={fx} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyStateCard title="No recent matches returned for this player" />
            )
          )}

          {tab === 'transfers' && (
            Array.isArray(activeData) && activeData.length > 0 ? (
              <div className="sz-table-wrap">
                <table className="sz-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Type / Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeData.map((tr, i) => (
                      <tr key={i}>
                        <td className="sz-mono small">{formatDateTimeShort(tr.date || tr.transferDate)}</td>
                        <td>{tr.fromTeam?.name || tr.from?.name || '—'}</td>
                        <td className="text-white fw-semibold">{tr.toTeam?.name || tr.to?.name || '—'}</td>
                        <td className="sz-mono small sz-text-orange">{tr.fee?.display || tr.type || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyStateCard title="No transfer history recorded" />
            )
          )}
        </>
      )}
    </div>
  );
}
