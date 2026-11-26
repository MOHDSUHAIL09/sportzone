import React, { useCallback, useEffect, useState } from 'react';
import { FiEye, FiRefreshCw, FiSearch } from 'react-icons/fi';
import apiClient, { getApiErrorMessage } from '../../services/apiClient';
import { formatDateTimeShort } from '../../utils/formatters';

/* ============================================================================
   1. READ-ONLY CURRENT BET (/admin/current-bet)
   ============================================================================ */
export function AdminCurrentBetPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [side, setSide] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadBets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get('/admin/bets', {
        params: { search, status, side, page, limit: 20 },
      });
      if (data?.ok) {
        setItems(data.items || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load simulated bet records.'));
    } finally {
      setLoading(false);
    }
  }, [search, status, side, page]);

  useEffect(() => {
    loadBets();
  }, [loadBets]);

  return (
    <div className="sz-adm-page">
      <div className="sz-adm-page-head">
        <div>
          <h1 className="sz-adm-page-title">Current Bet (Read-Only)</h1>
          <p className="sz-adm-page-sub">
            Read-only inspection of recorded simulated sports bet entries ({total} records). Outcomes are settled strictly by SportsAPI data.
          </p>
        </div>
        <button type="button" className="sz-adm-btn sz-adm-btn-outline sz-adm-btn-sm" onClick={loadBets}>
          <FiRefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {error && <div className="alert alert-danger py-2 px-3 small mb-3">{error}</div>}

      <div className="sz-adm-panel mb-3">
        <div className="sz-adm-toolbar">
          <div className="sz-adm-search-box">
            <FiSearch size={14} className="text-secondary" />
            <input
              type="text"
              placeholder="Search user, event, market, selection..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <select className="form-select form-select-sm sz-adm-select" value={side} onChange={(e) => { setSide(e.target.value); setPage(1); }}>
              <option value="all">All Sides</option>
              <option value="back">Back</option>
              <option value="lay">Lay</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
            <select className="form-select form-select-sm sz-adm-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="all">All Statuses</option>
              <option value="matched">Matched</option>
              <option value="pending">Pending</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="void">Void</option>
            </select>
            <span className="sz-adm-meta d-inline-flex align-items-center gap-1">
              <FiEye size={13} /> Read-Only Ledger
            </span>
          </div>
        </div>
      </div>

      <div className="sz-adm-panel">
        <div className="table-responsive">
          <table className="sz-adm-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Event Name</th>
                <th>Market Name</th>
                <th>Selection</th>
                <th>Side</th>
                <th className="text-end">Virtual Stake</th>
                <th className="text-end">Recorded Odds</th>
                <th>Date &amp; Time</th>
                <th>Record Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-4 text-secondary">Loading bet records...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-4 text-secondary">No simulated bet records found.</td></tr>
              ) : (
                items.map((b) => (
                  <tr key={b.id}>
                    <td className="fw-semibold text-dark">{b.username}</td>
                    <td>{b.eventName}</td>
                    <td className="small text-secondary">{b.marketName}</td>
                    <td className="fw-semibold">{b.selection}</td>
                    <td className="text-uppercase small fw-semibold">{b.side}</td>
                    <td className="text-end sz-adm-num fw-semibold">{Number(b.stake).toLocaleString()}</td>
                    <td className="text-end sz-adm-num">{Number(b.odds).toFixed(2)}</td>
                    <td className="text-nowrap small text-secondary">{formatDateTimeShort(b.placedAt)}</td>
                    <td>
                      <span className={`sz-adm-status is-${b.status === 'won' || b.status === 'matched' ? 'active' : b.status === 'lost' ? 'blocked' : 'pending'} text-capitalize`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="sz-adm-pagination">
          <span className="small text-secondary">Page {page} of {totalPages}</span>
          <div className="d-flex gap-2">
            <button type="button" className="sz-adm-btn sz-adm-btn-outline sz-adm-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <button type="button" className="sz-adm-btn sz-adm-btn-outline sz-adm-btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   2. READ-ONLY CASINO RESULTS (/admin/casino-results)
   ============================================================================ */
export function AdminCasinoResultsPage() {
  const [items, setItems] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [game, setGame] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadResults = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get('/admin/casino-results', {
        params: { search, game, dateFrom, dateTo, page, limit: 20 },
      });
      if (data?.ok) {
        setItems(data.items || []);
        setGames(data.games || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load demo casino results.'));
    } finally {
      setLoading(false);
    }
  }, [search, game, dateFrom, dateTo, page]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  return (
    <div className="sz-adm-page">
      <div className="sz-adm-page-head">
        <div>
          <h1 className="sz-adm-page-title">Casino Results (Read-Only)</h1>
          <p className="sz-adm-page-sub">
            Audit existing demo instant-game rounds and outcomes ({total} recorded rounds). Manual outcome edits are disabled.
          </p>
        </div>
        <button type="button" className="sz-adm-btn sz-adm-btn-outline sz-adm-btn-sm" onClick={loadResults}>
          <FiRefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {error && <div className="alert alert-danger py-2 px-3 small mb-3">{error}</div>}

      <div className="sz-adm-panel mb-3">
        <div className="sz-adm-toolbar">
          <div className="sz-adm-search-box">
            <FiSearch size={14} className="text-secondary" />
            <input
              type="text"
              placeholder="Search round ID, game, user, result..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="d-flex flex-wrap gap-2">
            <select className="form-select form-select-sm sz-adm-select" value={game} onChange={(e) => { setGame(e.target.value); setPage(1); }}>
              <option value="all">All Games</option>
              {games.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <input type="date" className="form-control form-control-sm sz-adm-input" style={{ width: 138 }} value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
            <input type="date" className="form-control form-control-sm sz-adm-input" style={{ width: 138 }} value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
          </div>
        </div>
      </div>

      <div className="sz-adm-panel">
        <div className="table-responsive">
          <table className="sz-adm-table">
            <thead>
              <tr>
                <th>Game Name</th>
                <th>Round ID</th>
                <th>User</th>
                <th>Recorded Result</th>
                <th className="text-end">Net Virtual Coins</th>
                <th>Date &amp; Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-4 text-secondary">Loading demo casino results...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-4 text-secondary">No casino rounds match filters.</td></tr>
              ) : (
                items.map((c) => (
                  <tr key={c.id}>
                    <td className="fw-semibold text-dark">{c.gameName}</td>
                    <td className="font-monospace small text-nowrap">{c.roundId}</td>
                    <td className="small">{c.username}</td>
                    <td className="small">{c.recordedResult}</td>
                    <td className={`text-end sz-adm-num fw-semibold ${c.netCoins >= 0 ? 'text-success' : 'text-danger'}`}>
                      {c.netCoins >= 0 ? `+${Number(c.netCoins).toLocaleString()}` : Number(c.netCoins).toLocaleString()}
                    </td>
                    <td className="text-nowrap small text-secondary">{formatDateTimeShort(c.playedAt)}</td>
                    <td>
                      <span className={`sz-adm-status is-${c.status === 'win' ? 'active' : 'blocked'} text-uppercase`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="sz-adm-pagination">
          <span className="small text-secondary">Page {page} of {totalPages}</span>
          <div className="d-flex gap-2">
            <button type="button" className="sz-adm-btn sz-adm-btn-outline sz-adm-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <button type="button" className="sz-adm-btn sz-adm-btn-outline sz-adm-btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
