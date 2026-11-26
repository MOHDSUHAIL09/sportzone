import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FiBell, FiCheckCircle, FiGift, FiRefreshCw } from 'react-icons/fi';
import { useArena } from '../context/ArenaContext';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import { formatDateTimeShort } from '../utils/formatters';

/* ============================================================================
   1. ACCOUNT STATEMENT (/account-statement)
   ============================================================================ */
export function AccountStatementPage() {
  const { state, canClaimDailyBonus, claimDailyBonus, resetDemoAccount } = useArena();
  const { user, isAuthenticated, notifications, unreadCount, markNotificationsRead } = useAuth();
  const [typeFilter, setTypeFilter] = useState('all');
  const [notice, setNotice] = useState(null);
  const [serverRows, setServerRows] = useState([]);
  const [loadingServer, setLoadingServer] = useState(false);

  const loadServerStatement = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingServer(true);
    try {
      const { data } = await apiClient.get('/wallet/statement', {
        params: { type: typeFilter, limit: 50 },
      });
      if (data?.ok) {
        setServerRows(data.items || []);
      }
    } catch {
      // keep existing rows on transient failure
    } finally {
      setLoadingServer(false);
    }
  }, [isAuthenticated, typeFilter]);

  useEffect(() => {
    loadServerStatement();
  }, [loadServerStatement]);

  const filteredTx = useMemo(() => {
    if (isAuthenticated) {
      return serverRows.map((tx) => ({
        id: tx.id,
        createdAt: tx.createdAt,
        credit: Number(tx.credit) || 0,
        debit: Number(tx.debit) || 0,
        balanceAfter: Number(tx.closingBalance) || 0,
        label: tx.remarks || tx.type,
      }));
    }
    const list = state.transactions || [];
    const scoped =
      typeFilter === 'credit'
        ? list.filter((t) => Number(t.amount) > 0)
        : typeFilter === 'debit'
        ? list.filter((t) => Number(t.amount) < 0)
        : list;
    return scoped.map((tx) => {
      const amt = Number(tx.amount) || 0;
      return {
        id: tx.id,
        createdAt: tx.createdAt,
        credit: amt > 0 ? amt : 0,
        debit: amt < 0 ? Math.abs(amt) : 0,
        balanceAfter: Number(tx.balanceAfter) || 0,
        label: tx.label,
      };
    });
  }, [isAuthenticated, serverRows, state.transactions, typeFilter]);

  function handleClaim() {
    const res = claimDailyBonus();
    setNotice(res.ok ? `Added +${res.amount} demo virtual coins.` : res.error);
  }

  function handleReset() {
    resetDemoAccount();
    setNotice('Demo virtual balance reset to 2,500 coins.');
  }

  const displayBalance = isAuthenticated ? Number(user?.virtualBalance ?? 0) : Number(state.coins ?? 0);

  return (
    <div className="ex-acc-wrap">
      <div className="ex-md-section-bar">Account Statement</div>

      <div className="ex-acc-toolbar">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <select
            className="form-select form-select-sm"
            style={{ width: 170 }}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter statement type"
          >
            <option value="all">All Entries</option>
            <option value="credit">Credit Only</option>
            <option value="debit">Debit Only</option>
          </select>
          <span className="small fw-semibold" style={{ color: '#334155' }}>
            Current Virtual Balance: <strong>{Math.round(displayBalance).toLocaleString()}</strong>
          </span>
        </div>

        <div className="d-flex flex-wrap gap-2">
          {isAuthenticated ? (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary fw-semibold"
              onClick={loadServerStatement}
              disabled={loadingServer}
            >
              <FiRefreshCw className="me-1" size={13} />
              Refresh Statement
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-sm btn-success fw-semibold"
                disabled={!canClaimDailyBonus}
                onClick={handleClaim}
              >
                <FiGift className="me-1" size={13} />
                {canClaimDailyBonus ? '+500 Daily Demo Bonus' : 'Daily Bonus Claimed'}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary fw-semibold"
                onClick={handleReset}
              >
                <FiRefreshCw className="me-1" size={13} />
                Reset Demo Coins
              </button>
            </>
          )}
        </div>
      </div>

      {isAuthenticated && notifications.length > 0 && (
        <div className="bg-white border border-top-0 px-3 py-2">
          <div className="d-flex align-items-center justify-content-between mb-1">
            <span className="small fw-bold text-dark d-inline-flex align-items-center gap-1">
              <FiBell size={13} /> Recent Account Notifications {unreadCount > 0 ? `(${unreadCount} unread)` : ''}
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                className="btn btn-link btn-sm p-0 text-decoration-none"
                style={{ fontSize: 12, color: '#12618c' }}
                onClick={() => markNotificationsRead()}
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="d-flex flex-column gap-1">
            {notifications.slice(0, 3).map((n) => (
              <div key={n.id} className="small text-secondary d-flex justify-content-between gap-2">
                <span>
                  <strong className="text-dark">{n.title}:</strong> {n.message}
                </span>
                <span className="text-nowrap" style={{ fontSize: 11 }}>
                  {formatDateTimeShort(n.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {notice && (
        <div className="alert alert-info py-2 px-3 small mb-2 rounded-0">{notice}</div>
      )}

      <div className="table-responsive">
        <table className="ex-acc-table">
          <thead>
            <tr>
              <th>Date</th>
              <th className="text-center">Sr No</th>
              <th className="text-end">Credit</th>
              <th className="text-end">Debit</th>
              <th className="text-end">Pts</th>
              <th>Remark</th>
            </tr>
          </thead>
          <tbody>
            {loadingServer ? (
              <tr>
                <td colSpan={6} className="text-center py-4 text-secondary">
                  Loading server account statement...
                </td>
              </tr>
            ) : filteredTx.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-4 text-secondary">
                  No statement entries found.
                </td>
              </tr>
            ) : (
              filteredTx.map((tx, idx) => (
                <tr key={tx.id || idx}>
                  <td className="text-nowrap">{formatDateTimeShort(tx.createdAt)}</td>
                  <td className="text-center">{idx + 1}</td>
                  <td className="text-end fw-semibold text-success">
                    {tx.credit > 0 ? tx.credit.toFixed(2) : '0.00'}
                  </td>
                  <td className="text-end fw-semibold text-danger">
                    {tx.debit > 0 ? tx.debit.toFixed(2) : '0.00'}
                  </td>
                  <td className="text-end fw-bold">{tx.balanceAfter.toFixed(2)}</td>
                  <td>{tx.label}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================================
   2. CURRENT BET (/current-bet)
   ============================================================================ */
export function CurrentBetPage() {
  const { state, settleAllPending, settleAllExchangeBets, settling } = useArena();
  const [sideFilter, setSideFilter] = useState('all');
  const [settleMsg, setSettleMsg] = useState(null);

  const combinedBets = useMemo(() => {
    const exRows = (state.exchangeBets || []).map((b) => ({
      id: b.id,
      fixtureId: b.fixtureId,
      eventName: b.matchTitle,
      nation: b.runner,
      market: b.market,
      side: b.side,
      odds: b.odds,
      stake: b.stake,
      status: b.status || 'matched',
      placedAt: b.placedAt,
    }));
    const predRows = (state.predictions || [])
      .filter((p) => p.status === 'pending')
      .map((p) => ({
        id: p.id,
        fixtureId: p.fixtureId,
        eventName: `${p.homeTeam?.name || 'Home'} v ${p.awayTeam?.name || 'Away'}`,
        nation: `${p.pick.toUpperCase()} Win`,
        market: 'PREDICTION_ARENA',
        side: 'back',
        odds: p.multiplier,
        stake: p.stake,
        status: p.status || 'pending',
        placedAt: p.placedAt,
      }));
    const all = [...exRows, ...predRows];
    if (sideFilter === 'back') return all.filter((r) => r.side === 'back' || r.side === 'yes');
    if (sideFilter === 'lay') return all.filter((r) => r.side === 'lay' || r.side === 'no');
    return all;
  }, [state.exchangeBets, state.predictions, sideFilter]);

  async function handleCheckResults() {
    const [exRes, predRes] = await Promise.all([
      settleAllExchangeBets(),
      settleAllPending(),
    ]);
    const totalSettled = (exRes?.settled || 0) + (predRes?.settled || 0);
    setSettleMsg(
      totalSettled > 0
        ? `Verified via SportsAPI and settled ${totalSettled} bet(s).`
        : exRes?.message || predRes?.message
    );
  }

  return (
    <div className="ex-acc-wrap">
      <div className="ex-md-section-bar">Current Bet</div>

      <div className="ex-acc-toolbar">
        <div className="d-flex align-items-center gap-3 small fw-semibold text-dark">
          {['all', 'back', 'lay'].map((opt) => (
            <label key={opt} className="d-inline-flex align-items-center gap-1" style={{ cursor: 'pointer' }}>
              <input
                type="radio"
                name="betSide"
                checked={sideFilter === opt}
                onChange={() => setSideFilter(opt)}
              />
              <span className="text-capitalize">{opt}</span>
            </label>
          ))}
        </div>

        <button
          type="button"
          className="btn btn-sm btn-primary fw-semibold"
          style={{ backgroundColor: '#12618c', borderColor: '#12618c' }}
          disabled={settling}
          onClick={handleCheckResults}
        >
          <FiRefreshCw className="me-1" size={13} />
          {settling ? 'Checking SportsAPI...' : 'Verify Finished Matches'}
        </button>
      </div>

      {settleMsg && (
        <div className="alert alert-info py-2 px-3 small mb-2 rounded-0">{settleMsg}</div>
      )}

      <div className="table-responsive">
        <table className="ex-acc-table">
          <thead>
            <tr>
              <th>Event Name</th>
              <th>Market</th>
              <th>Selection</th>
              <th className="text-center">Side</th>
              <th className="text-center">Odds</th>
              <th className="text-end">Amount</th>
              <th className="text-center">Status</th>
              <th>Place Date</th>
            </tr>
          </thead>
          <tbody>
            {combinedBets.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-4 text-secondary">
                  No active matched bets yet. Open any live or upcoming match to place a bet.
                </td>
              </tr>
            ) : (
              combinedBets.map((row) => {
                const isLay = row.side === 'lay' || row.side === 'no';
                const st = String(row.status || 'matched').toLowerCase();
                const statusLabel =
                  st === 'won'
                    ? 'Win'
                    : st === 'lost'
                    ? 'Loss'
                    : st === 'void'
                    ? 'Void'
                    : st === 'unmatched'
                    ? 'Unmatched'
                    : st === 'pending'
                    ? 'Pending'
                    : 'Matched';
                return (
                  <tr key={row.id} className={isLay ? 'ex-mybet-lay' : 'ex-mybet-back'}>
                    <td>
                      {row.fixtureId ? (
                        <Link to={`/match/${row.fixtureId}`} className="fw-semibold text-dark text-decoration-underline">
                          {row.eventName}
                        </Link>
                      ) : (
                        row.eventName
                      )}
                    </td>
                    <td>{row.market}</td>
                    <td className="fw-semibold">{row.nation}</td>
                    <td className="text-center text-uppercase fw-bold">{row.side}</td>
                    <td className="text-center fw-bold">{row.odds}</td>
                    <td className="text-end fw-bold">{row.stake}</td>
                    <td className="text-center">
                      <span className={`ex-bet-st-badge is-${st}`}>{statusLabel}</span>
                    </td>
                    <td className="text-nowrap">{formatDateTimeShort(row.placedAt)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================================
   3. CASINO RESULTS (/casino-results)
   ============================================================================ */
export function CasinoResultsPage() {
  const { state } = useArena();

  const gameRounds = useMemo(
    () =>
      (state.transactions || []).filter((tx) => String(tx.id || '').startsWith('tx-game-')),
    [state.transactions]
  );

  return (
    <div className="ex-acc-wrap">
      <div className="ex-md-section-bar">Casino Results</div>

      <div className="ex-acc-toolbar">
        <span className="small fw-semibold text-dark">
          Demo Instant Games History ({gameRounds.length} rounds)
        </span>
        <Link
          to="/casino"
          className="btn btn-sm btn-primary fw-semibold"
          style={{ backgroundColor: '#12618c', borderColor: '#12618c' }}
        >
          Open All 77 Casino Games
        </Link>
      </div>

      <div className="table-responsive">
        <table className="ex-acc-table">
          <thead>
            <tr>
              <th>Round Time</th>
              <th>Game &amp; Result</th>
              <th className="text-center">Outcome</th>
              <th className="text-end">Net Coins</th>
              <th className="text-end">Balance After</th>
            </tr>
          </thead>
          <tbody>
            {gameRounds.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-4 text-secondary">
                  No casino rounds played yet. Click any game poster on the Home or Casino page to play demo rounds.
                </td>
              </tr>
            ) : (
              gameRounds.map((r) => {
                const won = r.type === 'win' || Number(r.amount) > 0;
                return (
                  <tr key={r.id}>
                    <td className="text-nowrap">{formatDateTimeShort(r.createdAt)}</td>
                    <td className="fw-semibold">{r.label}</td>
                    <td className="text-center">
                      <span className={`badge ${won ? 'bg-success' : 'bg-danger'}`}>
                        {won ? 'WIN' : 'LOSS'}
                      </span>
                    </td>
                    <td className={`text-end fw-bold ${Number(r.amount) >= 0 ? 'text-success' : 'text-danger'}`}>
                      {Number(r.amount) >= 0 ? `+${r.amount}` : r.amount}
                    </td>
                    <td className="text-end fw-semibold">{r.balanceAfter}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================================
   4. SET BUTTON VALUES (/set-button-values)
   ============================================================================ */
export function SetButtonValuesPage() {
  const { state, updateButtonValues } = useArena();
  const [rows, setRows] = useState(() =>
    (state.buttonValues || []).map((b) => ({ label: b.label, value: String(b.value) }))
  );
  const [saved, setSaved] = useState(false);

  function handleChange(idx, field, val) {
    setSaved(false);
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)));
  }

  function handleSave(e) {
    e.preventDefault();
    updateButtonValues(rows);
    setSaved(true);
  }

  return (
    <div className="ex-acc-wrap">
      <div className="ex-md-section-bar">Set Button Values</div>

      <form onSubmit={handleSave} className="p-3 bg-white border border-top-0">
        <div className="row g-2 mb-2 fw-bold small text-dark" style={{ maxWidth: 520 }}>
          <div className="col-6">Price Label</div>
          <div className="col-6">Price Value</div>
        </div>

        <div className="d-flex flex-column gap-2 mb-3" style={{ maxWidth: 520 }}>
          {rows.map((row, idx) => (
            <div className="row g-2" key={idx}>
              <div className="col-6">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={row.label}
                  onChange={(e) => handleChange(idx, 'label', e.target.value)}
                  maxLength={10}
                  required
                />
              </div>
              <div className="col-6">
                <input
                  type="number"
                  min={10}
                  className="form-control form-control-sm"
                  value={row.value}
                  onChange={(e) => handleChange(idx, 'value', e.target.value)}
                  required
                />
              </div>
            </div>
          ))}
        </div>

        <div className="d-flex align-items-center gap-3">
          <button
            type="submit"
            className="btn btn-sm btn-primary fw-bold px-4"
            style={{ backgroundColor: '#12618c', borderColor: '#12618c' }}
          >
            Update
          </button>
          {saved && (
            <span className="small fw-semibold text-success d-inline-flex align-items-center gap-1">
              <FiCheckCircle size={14} /> Quick-stake button values saved!
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
