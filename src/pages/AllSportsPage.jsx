import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiDatabase, FiDownload, FiFlag, FiGrid } from 'react-icons/fi';
import {
  getSports,
  getCoverage,
  getRaces,
  getExports,
} from '../services/sportsApi';
import {
  ApiErrorCard,
  EmptyStateCard,
  LoadingSkeletonGrid,
  LoadingTableSkeleton,
} from '../components/StateBlocks';
import { formatDateTimeShort, formatNumber, getDateString } from '../utils/formatters';

export default function AllSportsPage() {
  const [activeTab, setActiveTab] = useState('sports'); // 'sports' | 'coverage' | 'races' | 'exports'
  const [sports, setSports] = useState([]);
  const [coverage, setCoverage] = useState(null);
  const [races, setRaces] = useState([]);
  const [raceSport, setRaceSport] = useState('motorsport');
  const [raceDate, setRaceDate] = useState(getDateString(0));
  const [exportsList, setExportsList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    async function loadTab() {
      setLoading(true);
      setError(null);
      try {
        if (activeTab === 'sports') {
          const res = await getSports();
          if (active) setSports(res?.data || []);
        } else if (activeTab === 'coverage') {
          const res = await getCoverage();
          if (active) setCoverage(res?.data || null);
        } else if (activeTab === 'races') {
          const res = await getRaces({ sport: raceSport, date: raceDate });
          if (active) setRaces(res?.data || []);
        } else if (activeTab === 'exports') {
          const res = await getExports();
          if (active) setExportsList(res?.data || []);
        }
      } catch (err) {
        if (active) setError(err);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadTab();
    return () => {
      active = false;
    };
  }, [activeTab, raceSport, raceDate]);

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
        <div>
          <h1 className="sz-display display-6 fw-bold text-white mb-1">All Sports &amp; Coverage</h1>
          <div className="small sz-muted">
            Full SportsAPI v2 catalog · 25 sports, historical coverage, race sports, and bulk exports
          </div>
        </div>

        <div className="sz-segment-bar">
          <button
            type="button"
            className={`sz-segment-btn ${activeTab === 'sports' ? 'active' : ''}`}
            onClick={() => setActiveTab('sports')}
          >
            <FiGrid className="me-1" size={14} /> Sports ({sports.length || 25})
          </button>
          <button
            type="button"
            className={`sz-segment-btn ${activeTab === 'coverage' ? 'active' : ''}`}
            onClick={() => setActiveTab('coverage')}
          >
            <FiDatabase className="me-1" size={14} /> Coverage
          </button>
          <button
            type="button"
            className={`sz-segment-btn ${activeTab === 'races' ? 'active' : ''}`}
            onClick={() => setActiveTab('races')}
          >
            <FiFlag className="me-1" size={14} /> Race Sports
          </button>
          <button
            type="button"
            className={`sz-segment-btn ${activeTab === 'exports' ? 'active' : ''}`}
            onClick={() => setActiveTab('exports')}
          >
            <FiDownload className="me-1" size={14} /> Bulk Exports
          </button>
        </div>
      </div>

      {error && <ApiErrorCard error={error} />}

      {activeTab === 'sports' && (
        loading ? (
          <LoadingSkeletonGrid count={12} colClass="col-6 col-md-4 col-xl-3" height={105} />
        ) : (
          <div className="row g-3">
            {sports.map((sp) => (
              <div className="col-6 col-md-4 col-xl-3" key={sp.slug}>
                <Link
                  to={`/sport/${sp.slug}`}
                  className="sz-card sz-card-interactive d-flex flex-column justify-content-between h-100 text-decoration-none"
                >
                  <div className="d-flex align-items-start justify-content-between gap-2 mb-3">
                    <div>
                      <div className="fw-bold text-white fs-6">{sp.name}</div>
                      <div className="small sz-muted">
                        {sp.kind === 'races' ? 'Race Series' : 'Head-to-Head Fixtures'}
                      </div>
                    </div>
                    <div className="text-end">
                      <span className={`sz-mono fw-bold ${sp.live > 0 ? 'sz-text-green' : 'sz-muted'}`}>
                        {sp.live}
                      </span>
                      <div className="sz-muted" style={{ fontSize: '0.7rem' }}>live</div>
                    </div>
                  </div>
                  <div className="small sz-text-orange d-inline-flex align-items-center gap-1 fw-semibold">
                    Open Hub <FiArrowRight size={13} />
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'coverage' && !error && (
        loading ? (
          <LoadingTableSkeleton rows={8} />
        ) : coverage ? (
          <div className="d-flex flex-column gap-4">
            {coverage.totals && (
              <div className="row g-3">
                {[
                  { label: 'Leagues', value: coverage.totals.leagues },
                  { label: 'Seasons', value: coverage.totals.seasons },
                  { label: 'Teams', value: coverage.totals.teams },
                  { label: 'Players', value: coverage.totals.players },
                  { label: 'Fixtures', value: coverage.totals.fixtures },
                  { label: 'Venues', value: coverage.totals.venues },
                  { label: 'Managers', value: coverage.totals.managers },
                  { label: 'Referees', value: coverage.totals.referees },
                ].map((stat) => (
                  <div className="col-6 col-md-3" key={stat.label}>
                    <div className="sz-card">
                      <div className="small sz-muted mb-1">{stat.label}</div>
                      <div className="sz-mono fw-bold fs-4 text-white">
                        {formatNumber(stat.value)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {Array.isArray(coverage.bySport) && coverage.bySport.length > 0 && (
              <div className="sz-table-wrap">
                <table className="sz-table">
                  <thead>
                    <tr>
                      <th>Sport</th>
                      <th>Type</th>
                      <th className="num">Categories</th>
                      <th className="num">Leagues</th>
                      <th>History From</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coverage.bySport.map((row) => (
                      <tr key={row.sport}>
                        <td>
                          <Link to={`/sport/${row.sport}`} className="text-white fw-semibold">
                            {row.sport}
                          </Link>
                        </td>
                        <td>{row.kind || 'fixtures'}</td>
                        <td className="num">{formatNumber(row.categories)}</td>
                        <td className="num text-white fw-semibold">{formatNumber(row.leagues)}</td>
                        <td className="sz-mono small">{row.historyFrom || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <EmptyStateCard title="Coverage summary unavailable" />
        )
      )}

      {activeTab === 'races' && (
        <div className="d-flex flex-column gap-3">
          <div className="d-flex flex-wrap align-items-center gap-3">
            <div className="sz-segment-bar">
              <button
                type="button"
                className={`sz-segment-btn ${raceSport === 'motorsport' ? 'active' : ''}`}
                onClick={() => setRaceSport('motorsport')}
              >
                Motorsport
              </button>
              <button
                type="button"
                className={`sz-segment-btn ${raceSport === 'cycling' ? 'active' : ''}`}
                onClick={() => setRaceSport('cycling')}
              >
                Cycling
              </button>
            </div>
            <input
              type="date"
              className="sz-input sz-mono"
              value={raceDate}
              onChange={(e) => setRaceDate(e.target.value)}
            />
          </div>

          {!error && (
            loading ? (
              <LoadingSkeletonGrid count={4} />
            ) : races.length === 0 ? (
              <EmptyStateCard
                title={`No ${raceSport} races scheduled on ${raceDate}`}
                message="Try selecting another date to view motorsport or cycling race weekends."
              />
            ) : (
              <div className="row g-3">
                {races.map((race) => (
                  <div className="col-md-6 col-xl-4" key={race.id}>
                    <Link
                      to={`/race/${race.id}`}
                      className="sz-card sz-card-interactive d-block h-100 text-decoration-none"
                    >
                      <div className="small sz-muted mb-1">
                        {race.series?.name || race.sport} · {race.country?.name || 'International'}
                      </div>
                      <div className="fw-bold text-white fs-5 mb-2">{race.name}</div>
                      <div className="small sz-mono sz-muted">
                        {race.startDate || raceDate} · Status: <span className="text-white">{race.status?.description || race.status?.type || 'Scheduled'}</span>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {activeTab === 'exports' && !error && (
        loading ? (
          <LoadingTableSkeleton rows={4} />
        ) : exportsList.length === 0 ? (
          <EmptyStateCard
            title="No bulk exports found"
            message="Your SportsAPI account currently has no queued or completed bulk export jobs (/v2/exports)."
          />
        ) : (
          <div className="sz-table-wrap">
            <table className="sz-table">
              <thead>
                <tr>
                  <th>Export ID</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {exportsList.map((ex) => (
                  <tr key={ex.id}>
                    <td className="sz-mono text-white">{ex.id}</td>
                    <td>{ex.status || 'Ready'}</td>
                    <td className="sz-mono small">{formatDateTimeShort(ex.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
