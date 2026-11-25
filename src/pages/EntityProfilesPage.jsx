import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft, FiFlag, FiMapPin } from 'react-icons/fi';
import {
  getManagerById,
  getManagerFixtures,
  getRaceById,
  getRaceResults,
  getRaceSessions,
  getRefereeById,
  getRefereeFixtures,
  getVenueById,
  getVenueFixtures,
} from '../services/sportsApi';
import EntityImage from '../components/EntityImage';
import MatchCard from '../components/MatchCard';
import { ApiErrorCard, EmptyStateCard, LoadingTableSkeleton } from '../components/StateBlocks';
import { formatDateTimeShort, formatNumber, formatSportName } from '../utils/formatters';

export function VenueDetailPage() {
  const { id } = useParams();
  const [venue, setVenue] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.allSettled([getVenueById(id), getVenueFixtures(id)])
      .then(([vRes, fRes]) => {
        if (!active) return;
        if (vRes.status === 'fulfilled') setVenue(vRes.value?.data || null);
        else setError(vRes.reason);
        if (fRes.status === 'fulfilled') setFixtures(fRes.value?.data || []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <LoadingTableSkeleton rows={6} />;
  if (error) return <ApiErrorCard error={error} />;
  if (!venue) return <EmptyStateCard title="Venue not found" />;

  return (
    <div className="d-flex flex-column gap-4">
      <Link to="/search" className="small sz-muted d-inline-flex align-items-center gap-1">
        <FiArrowLeft size={14} /> Back to Search
      </Link>

      <div className="sz-hero d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
        <div>
          <div className="small sz-muted mb-1">
            <FiMapPin size={13} className="me-1" />
            {venue.city || 'City'}{venue.country?.name ? `, ${venue.country.name}` : ''}
          </div>
          <h1 className="sz-display display-6 fw-bold text-white mb-1">{venue.name}</h1>
          <div className="small sz-mono sz-muted">
            Capacity: <span className="text-white">{formatNumber(venue.capacity)}</span>
          </div>
        </div>
        {venue.image && <EntityImage src={venue.image} name={venue.name} size={72} />}
      </div>

      {fixtures.length > 0 && (
        <section>
          <h2 className="sz-section-title mb-3">Matches at {venue.name}</h2>
          <div className="row g-3">
            {fixtures.slice(0, 12).map((fx) => (
              <div className="col-md-6 col-xl-4" key={fx.id}>
                <MatchCard fixture={fx} showSport />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function RefereeDetailPage() {
  const { id } = useParams();
  const [referee, setReferee] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.allSettled([getRefereeById(id), getRefereeFixtures(id)])
      .then(([rRes, fRes]) => {
        if (!active) return;
        if (rRes.status === 'fulfilled') setReferee(rRes.value?.data || null);
        else setError(rRes.reason);
        if (fRes.status === 'fulfilled') setFixtures(fRes.value?.data || []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <LoadingTableSkeleton rows={6} />;
  if (error) return <ApiErrorCard error={error} />;
  if (!referee) return <EmptyStateCard title="Referee not found" />;

  return (
    <div className="d-flex flex-column gap-4">
      <Link to="/search" className="small sz-muted d-inline-flex align-items-center gap-1">
        <FiArrowLeft size={14} /> Back to Search
      </Link>

      <div className="sz-hero d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
        <div className="d-flex align-items-center gap-3">
          <EntityImage src={referee.image} name={referee.name} size={64} />
          <div>
            <div className="small sz-muted">
              Official Referee · {formatSportName(referee.sport)} · {referee.country?.name || 'International'}
            </div>
            <h1 className="sz-display display-6 fw-bold text-white mb-0">{referee.name}</h1>
          </div>
        </div>
        <div className="d-flex gap-4 sz-mono">
          <div>
            <div className="small sz-muted">Games</div>
            <div className="fw-bold fs-4 text-white">{formatNumber(referee.games)}</div>
          </div>
          <div>
            <div className="small sz-muted">Yellow</div>
            <div className="fw-bold fs-4" style={{ color: 'var(--sz-warning)' }}>
              {formatNumber(referee.yellowCards)}
            </div>
          </div>
          <div>
            <div className="small sz-muted">Red</div>
            <div className="fw-bold fs-4" style={{ color: 'var(--sz-danger)' }}>
              {formatNumber(referee.redCards)}
            </div>
          </div>
        </div>
      </div>

      {fixtures.length > 0 && (
        <section>
          <h2 className="sz-section-title mb-3">Officiated Matches</h2>
          <div className="row g-3">
            {fixtures.slice(0, 12).map((fx) => (
              <div className="col-md-6 col-xl-4" key={fx.id}>
                <MatchCard fixture={fx} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function ManagerDetailPage() {
  const { id } = useParams();
  const [manager, setManager] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.allSettled([getManagerById(id), getManagerFixtures(id)])
      .then(([mRes, fRes]) => {
        if (!active) return;
        if (mRes.status === 'fulfilled') setManager(mRes.value?.data || null);
        else setError(mRes.reason);
        if (fRes.status === 'fulfilled') setFixtures(fRes.value?.data || []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <LoadingTableSkeleton rows={6} />;
  if (error) return <ApiErrorCard error={error} />;
  if (!manager) return <EmptyStateCard title="Manager not found" />;

  return (
    <div className="d-flex flex-column gap-4">
      <Link to="/search" className="small sz-muted d-inline-flex align-items-center gap-1">
        <FiArrowLeft size={14} /> Back to Search
      </Link>

      <div className="sz-hero d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
        <div className="d-flex align-items-center gap-3">
          <EntityImage src={manager.image} name={manager.name} size={64} />
          <div>
            <div className="small sz-muted">
              Head Coach / Manager · {formatSportName(manager.sport)} · {manager.country?.name || 'International'}
            </div>
            <h1 className="sz-display display-6 fw-bold text-white mb-1">{manager.name}</h1>
            <div className="small sz-muted">
              {manager.team?.id && (
                <Link to={`/team/${manager.team.id}`} className="sz-text-orange fw-semibold me-3">
                  {manager.team.name}
                </Link>
              )}
              {manager.preferredFormation && (
                <span>Preferred Formation: <strong className="sz-mono text-white">{manager.preferredFormation}</strong></span>
              )}
            </div>
          </div>
        </div>
        {manager.career && (
          <div className="d-flex gap-3 sz-mono">
            <div><div className="small sz-muted">W</div><div className="fw-bold sz-text-green fs-5">{manager.career.wins ?? '—'}</div></div>
            <div><div className="small sz-muted">D</div><div className="fw-bold text-white fs-5">{manager.career.draws ?? '—'}</div></div>
            <div><div className="small sz-muted">L</div><div className="fw-bold sz-text-orange fs-5">{manager.career.losses ?? '—'}</div></div>
          </div>
        )}
      </div>

      {fixtures.length > 0 && (
        <section>
          <h2 className="sz-section-title mb-3">Recent Matches Managed</h2>
          <div className="row g-3">
            {fixtures.slice(0, 12).map((fx) => (
              <div className="col-md-6 col-xl-4" key={fx.id}>
                <MatchCard fixture={fx} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function RaceDetailPage() {
  const { id } = useParams();
  const [race, setRace] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.allSettled([getRaceById(id), getRaceSessions(id), getRaceResults(id)])
      .then(([rRes, sRes, resRes]) => {
        if (!active) return;
        if (rRes.status === 'fulfilled') setRace(rRes.value?.data || null);
        else setError(rRes.reason);
        if (sRes.status === 'fulfilled') setSessions(sRes.value?.data?.sessions || sRes.value?.data || []);
        if (resRes.status === 'fulfilled') setResults(resRes.value?.data || []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <LoadingTableSkeleton rows={6} />;
  if (error) return <ApiErrorCard error={error} />;
  if (!race) return <EmptyStateCard title="Race not found" />;

  return (
    <div className="d-flex flex-column gap-4">
      <Link to="/sports" className="small sz-muted d-inline-flex align-items-center gap-1">
        <FiArrowLeft size={14} /> Back to All Sports
      </Link>

      <div className="sz-hero">
        <div className="small sz-muted mb-1">
          <FiFlag size={13} className="me-1" />
          {formatSportName(race.sport)} · {race.series?.name || 'Race Series'} · {race.country?.name || ''}
        </div>
        <h1 className="sz-display display-6 fw-bold text-white mb-1">{race.name}</h1>
        <div className="small sz-mono sz-muted">
          {race.startDate || '—'} {race.circuit?.name ? `· ${race.circuit.name}` : ''}
        </div>
      </div>

      {Array.isArray(sessions) && sessions.length > 0 && (
        <section>
          <h2 className="sz-section-title mb-3">Race Sessions</h2>
          <div className="row g-2">
            {sessions.map((s) => (
              <div className="col-md-6 col-xl-4" key={s.id || s.name}>
                <div className="sz-card">
                  <div className="fw-semibold text-white">{s.name}</div>
                  <div className="small sz-mono sz-muted">
                    {s.type} · {formatDateTimeShort(s.startTime)} · {s.status?.description || s.status?.type || 'Scheduled'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {Array.isArray(results) && results.length > 0 && (
        <section>
          <h2 className="sz-section-title mb-3">Classification / Results</h2>
          <div className="sz-table-wrap">
            <table className="sz-table">
              <thead>
                <tr>
                  <th>Pos</th>
                  <th>Competitor</th>
                  <th>Team</th>
                  <th className="num">Laps</th>
                  <th className="num">Points</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i}>
                    <td className="sz-mono fw-bold text-white">{r.position ?? '—'}</td>
                    <td className="text-white fw-semibold">{r.competitor?.name || 'Competitor'}</td>
                    <td>{r.team?.name || '—'}</td>
                    <td className="num">{r.laps ?? '—'}</td>
                    <td className="num sz-text-green fw-bold">{r.points ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
