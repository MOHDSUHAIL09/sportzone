import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiDownload, FiRefreshCw, FiSearch } from 'react-icons/fi';
import apiClient, { getApiErrorMessage } from '../../services/apiClient';
import { formatDateTimeShort } from '../../utils/formatters';
import { downloadCsv } from '../../utils/csvExport';

function fmt(n) {
  return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ============================================================================
   1. ADMIN ACCOUNT STATEMENT (/admin/account-statement)
   ============================================================================ */
export function AdminAccountStatementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState(searchParams.get('userId') || 'all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient
      .get('/admin/users', { params: { limit: 100 } })
      .then((res) => {
        if (res.data?.ok) setUsers(res.data.items || []);
      })
      .catch(() => {});
  }, []);

  const loadStatement = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get('/admin/account-statement', {
        params: { userId, search, dateFrom, dateTo, page, limit: 20 },
      });
      if (data?.ok) {
        setItems(data.items || []);
        setSelectedUser(data.selectedUser || null);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load account statement.'));
    } finally {
      setLoading(false);
    }
  }, [userId, search, dateFrom, dateTo, page]);

  useEffect(() => {
    loadStatement();
  }, [loadStatement]);

  function handleUserChange(val) {
    setUserId(val);
    setPage(1);
    if (val === 'all') {
      searchParams.delete('userId');
    } else {
      searchParams.set('userId', val);
    }
    setSearchParams(searchParams, { replace: true });
  }

  function handleExport() {
    downloadCsv(
      `sportzone-account-statement-${selectedUser?.username || 'all'}`,
      ['Transaction ID', 'Transaction Date', 'Username', 'Transaction Type', 'Opening Balance', 'Credit', 'Debit', 'Closing Balance', 'Remarks'],
      items.map((tx) => [
        tx.id,
        formatDateTimeShort(tx.createdAt),
        tx.username,
        tx.type,
        tx.openingBalance,
        tx.credit,
        tx.debit,
        tx.closingBalance,
        tx.remarks,
      ])
    );
  }

  return (
    <div className="sz-adm-page">
      <div className="sz-adm-page-head">
        <div>
          <h1 className="sz-adm-page-title">Account Statement</h1>
          <p className="sz-adm-page-sub">
            Inspect virtual wallet opening, credit, debit, and closing balances per user ({total} entries).
          </p>
        </div>
        <div className="d-flex gap-2">
          <button type="button" className="sz-adm-btn sz-adm-btn-outline sz-adm-btn-sm" onClick={loadStatement}>
            <FiRefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="sz-adm-btn sz-adm-btn-primary sz-adm-btn-sm"
            disabled={items.length === 0}
            onClick={handleExport}
          >
            <FiDownload size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 px-3 small mb-3">{error}</div>}

      <div className="sz-adm-panel mb-3">
        <div className="sz-adm-toolbar">
          <select
            className="form-select form-select-sm sz-adm-select"
            style={{ minWidth: 210 }}
            value={userId}
            onChange={(e) => handleUserChange(e.target.value)}
          >
            <option value="all">All Registered Users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username} — {u.fullName} ({u.id})
              </option>
            ))}
          </select>

          <div className="sz-adm-search-box">
            <FiSearch size={14} className="text-secondary" />
            <input
              type="text"
              placeholder="Search ID, user, type, remarks..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="d-flex gap-2 flex-wrap">
            <input
              type="date"
              className="form-control form-control-sm sz-adm-input"
              style={{ width: 140 }}
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
            />
            <input
              type="date"
              className="form-control form-control-sm sz-adm-input"
              style={{ width: 140 }}
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {selectedUser && (
        <div className="sz-adm-panel mb-3 p-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>
            <strong className="text-dark">{selectedUser.fullName}</strong>{' '}
            <span className="sz-adm-meta">
              · {selectedUser.username} · {selectedUser.id}
            </span>
          </div>
          <div className="small text-secondary">
            Current Virtual Balance:{' '}
            <strong className="text-dark sz-adm-num">{fmt(selectedUser.virtualBalance)}</strong>
          </div>
        </div>
      )}

      <div className="sz-adm-panel">
        <div className="table-responsive">
          <table className="sz-adm-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Transaction Date</th>
                <th>Username</th>
                <th>Transaction Type</th>
                <th className="text-end">Opening Balance</th>
                <th className="text-end">Credit</th>
                <th className="text-end">Debit</th>
                <th className="text-end">Closing Balance</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-4 text-secondary">Loading statement...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-4 text-secondary">No statement records match your filters.</td>
                </tr>
              ) : (
                items.map((tx) => (
                  <tr key={tx.id}>
                    <td className="font-monospace small text-nowrap">{tx.id}</td>
                    <td className="text-nowrap small text-secondary">{formatDateTimeShort(tx.createdAt)}</td>
                    <td className="fw-semibold text-dark">{tx.username}</td>
                    <td className="small text-secondary">{tx.type.replace(/_/g, ' ')}</td>
                    <td className="text-end sz-adm-num">{fmt(tx.openingBalance)}</td>
                    <td className="text-end sz-adm-num text-success fw-semibold">
                      {tx.credit > 0 ? `+${fmt(tx.credit)}` : '0.00'}
                    </td>
                    <td className="text-end sz-adm-num text-danger fw-semibold">
                      {tx.debit > 0 ? `-${fmt(tx.debit)}` : '0.00'}
                    </td>
                    <td className="text-end sz-adm-num fw-bold text-dark">{fmt(tx.closingBalance)}</td>
                    <td className="small">{tx.remarks}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="sz-adm-pagination">
          <span className="small text-secondary">Page {page} of {totalPages}</span>
          <div className="d-flex gap-2">
            <button type="button" className="sz-adm-btn sz-adm-btn-outline sz-adm-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <button type="button" className="sz-adm-btn sz-adm-btn-outline sz-adm-btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   2. ADMIN TRANSFER HISTORY (/admin/transfer-history)
   ============================================================================ */
export function AdminTransferHistoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [initiatedBy, setInitiatedBy] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadTransfers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get('/admin/transfers', {
        params: { search, initiatedBy, dateFrom, dateTo, page, limit: 15 },
      });
      if (data?.ok) {
        setItems(data.items || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load transfer history.'));
    } finally {
      setLoading(false);
    }
  }, [search, initiatedBy, dateFrom, dateTo, page]);

  useEffect(() => {
    loadTransfers();
  }, [loadTransfers]);

  function handleExport() {
    downloadCsv(
      'sportzone-admin-transfer-history',
      ['Transaction ID', 'Sender', 'Receiver', 'Initiated By', 'Virtual Amount', 'Sender Prev Bal', 'Sender Updated Bal', 'Receiver Updated Bal', 'Date & Time', 'Status', 'Remarks'],
      items.map((t) => [
        t.id,
        t.senderUsername,
        t.receiverUsername,
        `${t.initiatedBy} (${t.initiatedByUsername})`,
        t.amount,
        t.senderOpeningBalance,
        t.senderClosingBalance,
        t.receiverClosingBalance,
        formatDateTimeShort(t.createdAt),
        t.status,
        t.remarks,
      ])
    );
  }

  return (
    <div className="sz-adm-page">
      <div className="sz-adm-page-head">
        <div>
          <h1 className="sz-adm-page-title">Transfer History</h1>
          <p className="sz-adm-page-sub">
            Auditable record of all user-to-user and admin-initiated virtual credit transfers ({total} records).
          </p>
        </div>
        <div className="d-flex gap-2">
          <button type="button" className="sz-adm-btn sz-adm-btn-outline sz-adm-btn-sm" onClick={loadTransfers}>
            <FiRefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button type="button" className="sz-adm-btn sz-adm-btn-primary sz-adm-btn-sm" disabled={items.length === 0} onClick={handleExport}>
            <FiDownload size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 px-3 small mb-3">{error}</div>}

      <div className="sz-adm-panel mb-3">
        <div className="sz-adm-toolbar">
          <div className="sz-adm-search-box">
            <FiSearch size={14} className="text-secondary" />
            <input
              type="text"
              placeholder="Search transfer ID, sender, receiver, remark..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="d-flex flex-wrap gap-2">
            <select
              className="form-select form-select-sm sz-adm-select"
              value={initiatedBy}
              onChange={(e) => {
                setInitiatedBy(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Initiators</option>
              <option value="user">User Transfers</option>
              <option value="admin">Admin Transfers</option>
            </select>
            <input type="date" className="form-control form-control-sm sz-adm-input" style={{ width: 140 }} value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
            <input type="date" className="form-control form-control-sm sz-adm-input" style={{ width: 140 }} value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
          </div>
        </div>
      </div>

      <div className="sz-adm-panel">
        <div className="table-responsive">
          <table className="sz-adm-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Sender</th>
                <th>Receiver</th>
                <th>Type</th>
                <th className="text-end">Virtual Amount</th>
                <th className="text-end">Previous Balance</th>
                <th className="text-end">Updated Balance</th>
                <th>Date &amp; Time</th>
                <th>Status</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-4 text-secondary">Loading transfers...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-4 text-secondary">No transfer records found.</td></tr>
              ) : (
                items.map((t) => (
                  <tr key={t.id}>
                    <td className="font-monospace small text-nowrap">{t.id}</td>
                    <td className="fw-semibold text-dark">{t.senderUsername}</td>
                    <td className="fw-semibold text-dark">{t.receiverUsername}</td>
                    <td className="small text-secondary text-capitalize">{t.initiatedBy} transfer</td>
                    <td className="text-end sz-adm-num fw-bold text-dark">{fmt(t.amount)}</td>
                    <td className="text-end sz-adm-num text-secondary">{fmt(t.senderOpeningBalance)}</td>
                    <td className="text-end sz-adm-num">{fmt(t.senderClosingBalance)}</td>
                    <td className="text-nowrap small text-secondary">{formatDateTimeShort(t.createdAt)}</td>
                    <td><span className="sz-adm-status is-active text-capitalize">{t.status}</span></td>
                    <td className="small">{t.remarks}</td>
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
   3. ADMIN TRANSACTION HISTORY (/admin/transactions)
   ============================================================================ */
export function AdminTransactionsPage() {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState(searchParams.get('userId') || 'all');
  const [type, setType] = useState('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient.get('/admin/users', { params: { limit: 100 } }).then((res) => {
      if (res.data?.ok) setUsers(res.data.items || []);
    }).catch(() => {});
  }, []);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get('/admin/transactions', {
        params: { userId, type, search, dateFrom, dateTo, page, limit: 15 },
      });
      if (data?.ok) {
        setItems(data.items || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load transactions.'));
    } finally {
      setLoading(false);
    }
  }, [userId, type, search, dateFrom, dateTo, page]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  function handleExport() {
    downloadCsv(
      'sportzone-transactions',
      ['Transaction ID', 'Sender', 'Receiver', 'Transaction Type', 'Virtual Amount', 'Previous Balance', 'Updated Balance', 'Date & Time', 'Status', 'Remarks'],
      items.map((tx) => [
        tx.id,
        tx.senderUsername || tx.username,
        tx.receiverUsername || tx.username,
        tx.type,
        tx.amount,
        tx.openingBalance,
        tx.closingBalance,
        formatDateTimeShort(tx.createdAt),
        tx.status,
        tx.remarks,
      ])
    );
  }

  return (
    <div className="sz-adm-page">
      <div className="sz-adm-page-head">
        <div>
          <h1 className="sz-adm-page-title">Transaction History</h1>
          <p className="sz-adm-page-sub">
            Complete platform ledger of credits, debits, virtual transfers, bets, and simulated requests ({total} records).
          </p>
        </div>
        <div className="d-flex gap-2">
          <button type="button" className="sz-adm-btn sz-adm-btn-outline sz-adm-btn-sm" onClick={loadTransactions}>
            <FiRefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button type="button" className="sz-adm-btn sz-adm-btn-primary sz-adm-btn-sm" disabled={items.length === 0} onClick={handleExport}>
            <FiDownload size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 px-3 small mb-3">{error}</div>}

      <div className="sz-adm-panel mb-3">
        <div className="sz-adm-toolbar">
          <div className="sz-adm-search-box">
            <FiSearch size={14} className="text-secondary" />
            <input
              type="text"
              placeholder="Search ID, sender, receiver, remark..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="d-flex flex-wrap gap-2">
            <select className="form-select form-select-sm sz-adm-select" value={userId} onChange={(e) => { setUserId(e.target.value); setPage(1); }}>
              <option value="all">All Users</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
            </select>
            <select className="form-select form-select-sm sz-adm-select" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
              <option value="all">All Types</option>
              <option value="admin_credit">Admin Credit</option>
              <option value="admin_debit">Admin Debit</option>
              <option value="transfer_out">Transfer Out</option>
              <option value="transfer_in">Transfer In</option>
              <option value="admin_transfer_out">Admin Transfer Out</option>
              <option value="admin_transfer_in">Admin Transfer In</option>
              <option value="bet_stake">Bet Stake</option>
              <option value="casino_round">Casino Round</option>
              <option value="withdrawal_request">Sim. Withdrawal</option>
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
                <th>Transaction ID</th>
                <th>Sender</th>
                <th>Receiver</th>
                <th>Transaction Type</th>
                <th className="text-end">Virtual Amount</th>
                <th className="text-end">Previous Balance</th>
                <th className="text-end">Updated Balance</th>
                <th>Date &amp; Time</th>
                <th>Status</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-4 text-secondary">Loading transactions...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-4 text-secondary">No transactions match filters.</td></tr>
              ) : (
                items.map((tx) => (
                  <tr key={tx.id}>
                    <td className="font-monospace small text-nowrap">{tx.id}</td>
                    <td className="small fw-semibold text-dark">{tx.senderUsername || tx.username}</td>
                    <td className="small fw-semibold text-dark">{tx.receiverUsername || tx.username}</td>
                    <td className="small text-secondary">{tx.type.replace(/_/g, ' ')}</td>
                    <td className={`text-end sz-adm-num fw-bold ${tx.credit > 0 ? 'text-success' : 'text-danger'}`}>
                      {tx.credit > 0 ? `+${fmt(tx.amount)}` : `-${fmt(tx.amount)}`}
                    </td>
                    <td className="text-end sz-adm-num text-secondary">{fmt(tx.openingBalance)}</td>
                    <td className="text-end sz-adm-num fw-semibold">{fmt(tx.closingBalance)}</td>
                    <td className="text-nowrap small text-secondary">{formatDateTimeShort(tx.createdAt)}</td>
                    <td className="small text-capitalize">{tx.status}</td>
                    <td className="small">{tx.remarks}</td>
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
   4. ADMIN ACTIVITY LOGS (/admin/activity-logs)
   ============================================================================ */
export function AdminActivityLogsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get('/admin/activity-logs', {
        params: { search, targetType, dateFrom, dateTo, page, limit: 20 },
      });
      if (data?.ok) {
        setItems(data.items || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load activity logs.'));
    } finally {
      setLoading(false);
    }
  }, [search, targetType, dateFrom, dateTo, page]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  function handleExport() {
    downloadCsv(
      'sportzone-activity-logs',
      ['Log ID', 'Date & Time', 'Actor', 'Role', 'Action', 'Target Type', 'Target', 'Details', 'IP'],
      items.map((l) => [
        l.id,
        formatDateTimeShort(l.createdAt),
        l.actorUsername,
        l.actorRole,
        l.action,
        l.targetType,
        l.targetLabel,
        l.details,
        l.ip,
      ])
    );
  }

  return (
    <div className="sz-adm-page">
      <div className="sz-adm-page-head">
        <div>
          <h1 className="sz-adm-page-title">Administrative Activity Logs</h1>
          <p className="sz-adm-page-sub">
            Immutable audit trail of account actions, fund adjustments, permission toggles, and security events ({total} entries).
          </p>
        </div>
        <div className="d-flex gap-2">
          <button type="button" className="sz-adm-btn sz-adm-btn-outline sz-adm-btn-sm" onClick={loadLogs}>
            <FiRefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button type="button" className="sz-adm-btn sz-adm-btn-primary sz-adm-btn-sm" disabled={items.length === 0} onClick={handleExport}>
            <FiDownload size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 px-3 small mb-3">{error}</div>}

      <div className="sz-adm-panel mb-3">
        <div className="sz-adm-toolbar">
          <div className="sz-adm-search-box">
            <FiSearch size={14} className="text-secondary" />
            <input
              type="text"
              placeholder="Search action, actor, target, details..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="d-flex flex-wrap gap-2">
            <select className="form-select form-select-sm sz-adm-select" value={targetType} onChange={(e) => { setTargetType(e.target.value); setPage(1); }}>
              <option value="all">All Categories</option>
              <option value="user">Users</option>
              <option value="wallet">Wallet</option>
              <option value="transfer">Transfers</option>
              <option value="withdrawal">Sim. Withdrawals</option>
              <option value="settings">Settings</option>
              <option value="security">Security</option>
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
                <th>Date &amp; Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Category</th>
                <th>Target</th>
                <th>Details</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-4 text-secondary">Loading audit logs...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-4 text-secondary">No activity logs found.</td></tr>
              ) : (
                items.map((l) => (
                  <tr key={l.id}>
                    <td className="text-nowrap small text-secondary">{formatDateTimeShort(l.createdAt)}</td>
                    <td className="fw-semibold text-dark">{l.actorUsername}</td>
                    <td className="font-monospace small text-dark">{l.action}</td>
                    <td className="small text-capitalize text-secondary">{l.targetType}</td>
                    <td className="small fw-semibold">{l.targetLabel}</td>
                    <td className="small">{l.details}</td>
                    <td className="font-monospace small text-secondary">{l.ip}</td>
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
