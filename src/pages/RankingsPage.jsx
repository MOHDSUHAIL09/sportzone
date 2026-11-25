import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowDown, FiArrowUp, FiMinus } from 'react-icons/fi';
import { getRankingsList, getRankingByType } from '../services/sportsApi';
import EntityImage from '../components/EntityImage';
import {
  ApiErrorCard,
  EmptyStateCard,
  LoadingTableSkeleton,
} from '../components/StateBlocks';
import { formatDateTimeShort, formatNumber, formatSportName } from '../utils/formatters';

export default function RankingsPage() {
  const [catalog, setCatalog] = useState([]);
  const [sportFilter, setSportFilter] = useState('all');
  const [selectedType, setSelectedType] = useState('');
  const [rankingData, setRankingData] = useState(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingTable, setLoadingTable] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoadingCatalog(true);
    getRankingsList()
      .then((res) => {
        if (!active) return;
        const list = res?.data || [];
        setCatalog(list);
        if (list.length > 0) setSelectedType(list[0].type);
      })
      .catch((err) => {
        if (active) setError(err);
      })
      .finally(() => {
        if (active) setLoadingCatalog(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedType) return;
    let active = true;
    setLoadingTable(true);
    setError(null);
    getRankingByType(selectedType)
      .then((res) => {
        if (active) setRankingData(res?.data || null);
      })
      .catch((err) => {
        if (active) setError(err);
      })
      .finally(() => {
        if (active) setLoadingTable(false);
      });
    return () => {
      active = false;
    };
  }, [selectedType]);

  const availableSports = useMemo(() => {
    const set = new Set(catalog.map((c) => c.sport).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [catalog]);

  const filteredCatalog = useMemo(() => {
    if (sportFilter === 'all') return catalog;
    return catalog.filter((c) => c.sport === sportFilter);
  }, [catalog, sportFilter]);

  const activeInfo = catalog.find((c) => c.type === selectedType);

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h1 className="sz-display display-6 fw-bold text-white mb-1">Official World Rankings</h1>
        <div className="small sz-muted">
          FIFA, UEFA, ATP, WTA, UFC, Rugby, and Padel official rankings from SportsAPI
        </div>
      </div>

      {/* Sport Filter */}
      <div className="sz-scroll-strip">
        {availableSports.map((sp) => (
          <button
            key={sp}
            type="button"
            className={`sz-tab-btn ${sportFilter === sp ? 'active' : ''}`}
            onClick={() => {
              setSportFilter(sp);
              const first = sp === 'all' ? catalog[0] : catalog.find((c) => c.sport === sp);
              if (first) setSelectedType(first.type);
            }}
          >
            {sp === 'all' ? 'All Sports' : formatSportName(sp)}
          </button>
        ))}
      </div>

      {/* Ranking Type Selector */}
      {!loadingCatalog && filteredCatalog.length > 0 && (
        <div className="row g-2 align-items-center">
          <div className="col-md-6">
            <select
              className="sz-select w-100"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              aria-label="Select ranking list"
            >
              {filteredCatalog.map((item) => (
                <option key={item.type} value={item.type}>
                  {item.name} ({formatSportName(item.sport)})
                </option>
              ))}
            </select>
          </div>
          {rankingData?.updatedAt && (
            <div className="col-md-6 text-md-end small sz-mono sz-muted">
              Updated: {formatDateTimeShort(rankingData.updatedAt)}
            </div>
          )}
        </div>
      )}

      {error && <ApiErrorCard error={error} />}

      {loadingCatalog || loadingTable ? (
        <LoadingTableSkeleton rows={10} />
      ) : !rankingData?.rows || rankingData.rows.length === 0 ? (
        <EmptyStateCard title="No ranking entries found" message="Select another ranking table above." />
      ) : (
        <div className="sz-table-wrap">
          <table className="sz-table">
            <thead>
              <tr>
                <th style={{ width: 64 }}>Rank</th>
                <th style={{ width: 70 }}>Move</th>
                <th>{activeInfo?.entry === 'country' ? 'Country' : 'Team / Competitor'}</th>
                <th>Country</th>
                <th className="num">Best</th>
                <th className="num">Points</th>
              </tr>
            </thead>
            <tbody>
              {rankingData.rows.slice(0, 100).map((row) => {
                const delta =
                  row.previousPosition && row.position
                    ? row.previousPosition - row.position
                    : 0;
                const entityName = row.team?.name || row.country?.name || row.league?.name || '—';
                const entityImg = row.team?.image || row.country?.flag || row.league?.image;
                return (
                  <tr key={`${row.position}-${entityName}`}>
                    <td className="sz-mono fw-bold text-white">{row.position}</td>
                    <td className="sz-mono small">
                      {delta > 0 ? (
                        <span className="sz-text-green d-inline-flex align-items-center gap-1">
                          <FiArrowUp size={12} /> {delta}
                        </span>
                      ) : delta < 0 ? (
                        <span style={{ color: 'var(--sz-danger)' }} className="d-inline-flex align-items-center gap-1">
                          <FiArrowDown size={12} /> {Math.abs(delta)}
                        </span>
                      ) : (
                        <span className="sz-muted">
                          <FiMinus size={12} />
                        </span>
                      )}
                    </td>
                    <td>
                      {row.team?.id ? (
                        <Link to={`/team/${row.team.id}`} className="d-flex align-items-center gap-2 text-white fw-semibold">
                          <EntityImage src={entityImg} name={entityName} size={24} />
                          <span>{entityName}</span>
                        </Link>
                      ) : (
                        <div className="d-flex align-items-center gap-2 text-white fw-semibold">
                          <EntityImage src={entityImg} name={entityName} size={24} />
                          <span>{entityName}</span>
                        </div>
                      )}
                    </td>
                    <td>{row.country?.name || '—'}</td>
                    <td className="num">{row.bestPosition ?? '—'}</td>
                    <td className="num sz-text-orange fw-bold">{formatNumber(row.points)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
