import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiCheckCircle,
  FiDownload,
  FiKey,
  FiLock,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiUserCheck,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import apiClient, { generateIdempotencyKey, getApiErrorMessage } from '../services/apiClient';
import AdminConfirmDialog from '../components/admin/AdminConfirmDialog';
import { formatDateTimeShort } from '../utils/formatters';
import { downloadCsv } from '../utils/csvExport';

function SignInRequiredCard({ title }) {
  return (
    <div className="ex-acc-wrap">
      <div className="ex-md-section-bar">{title}</div>
      <div className="bg-white border border-top-0 p-4 text-center">
        <FiLock size={28} className="text-secondary mb-2" />
        <h3 className="h6 fw-bold text-dark mb-1">Sign In Required</h3>
        <p className="small text-secondary mb-3">
          Please sign in with your registered SportZone account to access {title.toLowerCase()}.
        </p>
        <Link to="/login" className="btn btn-sm btn-primary fw-semibold px-4" style={{ backgroundColor: '#12618c', borderColor: '#12618c' }}>
          Sign In / Register
        </Link>
      </div>
    </div>
  );
}

/* ============================================================================
   1. NORMAL USER VIRTUAL FUND TRANSFER (/fund-transfer)
   ============================================================================ */
export function UserFundTransferPage() {
  const { user, isAuthenticated, refreshMe, updateUserState } = useAuth();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [receiverInput, setReceiverInput] = useState('');
  const [verifiedReceiver, setVerifiedReceiver] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [amount, setAmount] = useState('');
  const [transactionPassword, setTransactionPassword] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [idemKey, setIdemKey] = useState('');

  const loadSummary = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await apiClient.get('/wallet/summary');
      if (data?.ok) {
        setSummary(data);
        if (data.user) updateUserState(data.user);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load virtual wallet details.'));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, updateUserState]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  if (!isAuthenticated) {
    return <SignInRequiredCard title="Fund Transfer" />;
  }

  const limits = summary?.limits || {};
  const availableBalance = Number(summary?.user?.virtualBalance ?? user?.virtualBalance ?? 0);
  const dailyTransferred = Number(summary?.dailyTransferred ?? 0);
  const dailyRemaining = Math.max(0, (limits.dailyTransferLimit || 0) - dailyTransferred);
  const transferAllowed =
    limits.fundTransferGlobalEnabled !== false && summary?.user?.fundTransferEnabled !== false;

  async function handleVerifyReceiver() {
    setError('');
    setVerifiedReceiver(null);
    if (!receiverInput.trim()) {
      setError('Please enter a receiver Username or User ID.');
      return;
    }
    setVerifying(true);
    try {
      const { data } = await apiClient.post('/wallet/verify-receiver', {
        receiver: receiverInput.trim(),
      });
      if (data?.ok) {
        setVerifiedReceiver(data.receiver);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Receiver verification failed.'));
    } finally {
      setVerifying(false);
    }
  }

  function handleOpenConfirm(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!transferAllowed) {
      setError('Virtual fund transfers are currently disabled for your account or platform.');
      return;
    }
    if (!verifiedReceiver) {
      setError('Please verify the receiver account before transferring.');
      return;
    }
    const numAmt = Number(amount);
    if (!Number.isFinite(numAmt) || numAmt <= 0) {
      setError('Enter a valid positive virtual amount.');
      return;
    }
    if (limits.minTransferAmount && numAmt < limits.minTransferAmount) {
      setError(`Minimum transfer amount is ${limits.minTransferAmount.toLocaleString()}.`);
      return;
    }
    if (limits.maxTransferAmount && numAmt > limits.maxTransferAmount) {
      setError(`Maximum single transfer amount is ${limits.maxTransferAmount.toLocaleString()}.`);
      return;
    }
    if (numAmt > dailyRemaining) {
      setError(`Exceeds remaining daily transfer limit (${dailyRemaining.toLocaleString()}).`);
      return;
    }
    if (numAmt > availableBalance) {
      setError('Insufficient virtual balance.');
      return;
    }
    if (limits.requireTransactionPassword && !transactionPassword.trim()) {
      setError('Transaction password is required.');
      return;
    }

    setIdemKey(generateIdempotencyKey('usr-trf'));
    setConfirmOpen(true);
  }

  async function handleExecuteTransfer() {
    setSubmitting(true);
    setError('');
    try {
      const { data } = await apiClient.post('/wallet/transfer', {
        receiver: verifiedReceiver.id,
        amount: Number(amount),
        transactionPassword,
        remarks: remarks.trim() || 'Virtual credit transfer',
        idempotencyKey: idemKey,
      });
      if (data?.ok) {
        setConfirmOpen(false);
        setSuccess(
          `Transferred ${Number(amount).toLocaleString()} virtual credits to ${verifiedReceiver.username} (${data.transfer.id}).`
        );
        setAmount('');
        setTransactionPassword('');
        setRemarks('');
        setReceiverInput('');
        setVerifiedReceiver(null);
        if (data.user) updateUserState(data.user);
        await Promise.all([loadSummary(), refreshMe({ silent: true })]);
      }
    } catch (err) {
      setConfirmOpen(false);
      setError(getApiErrorMessage(err, 'Transfer failed.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ex-acc-wrap">
      <div className="ex-md-section-bar d-flex align-items-center justify-content-between">
        <span>Virtual Fund Transfer</span>
        <Link to="/transfer-history" className="text-white small text-decoration-underline">
          View Transfer History
        </Link>
      </div>

      <div className="bg-white border border-top-0 p-3 p-md-4">
        {loading ? (
          <div className="py-4 text-center text-secondary small">Loading virtual wallet limits...</div>
        ) : (
          <>
            <div className="row g-3 mb-3">
              <div className="col-sm-4">
                <div className="border p-3 bg-light">
                  <div className="text-secondary small">Available Virtual Balance</div>
                  <div className="h5 fw-bold text-dark mb-0 mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
              <div className="col-sm-4">
                <div className="border p-3 bg-light">
                  <div className="text-secondary small">Single Transfer Limits</div>
                  <div className="fw-semibold text-dark mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {(limits.minTransferAmount || 0).toLocaleString()} – {(limits.maxTransferAmount || 0).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="col-sm-4">
                <div className="border p-3 bg-light">
                  <div className="text-secondary small">Remaining Daily Limit</div>
                  <div className="fw-semibold text-dark mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {dailyRemaining.toLocaleString()} / {(limits.dailyTransferLimit || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {!transferAllowed && (
              <div className="alert alert-warning py-2 px-3 small">
                Virtual credit transfers are currently disabled by administrator settings.
              </div>
            )}

            {limits.requireTransactionPassword && !summary?.user?.hasTransactionPassword && (
              <div className="alert alert-info py-2 px-3 small">
                Transaction password is required for transfers.{' '}
                <Link to="/change-password" className="fw-semibold">
                  Set your Transaction Password here
                </Link>
                .
              </div>
            )}

            {error && <div className="alert alert-danger py-2 px-3 small">{error}</div>}
            {success && (
              <div className="alert alert-success py-2 px-3 small d-flex align-items-center gap-2">
                <FiCheckCircle size={15} />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleOpenConfirm} style={{ maxWidth: 620 }}>
              <div className="mb-3">
                <label className="form-label small fw-semibold text-dark">
                  Receiver Username or User ID
                </label>
                <div className="input-group input-group-sm">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. ananya_s or USR-1002"
                    value={receiverInput}
                    onChange={(e) => {
                      setReceiverInput(e.target.value);
                      setVerifiedReceiver(null);
                    }}
                    disabled={!transferAllowed}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-outline-primary fw-semibold"
                    style={{ borderColor: '#12618c', color: '#12618c' }}
                    disabled={verifying || !transferAllowed}
                    onClick={handleVerifyReceiver}
                  >
                    <FiUserCheck size={14} className="me-1" />
                    {verifying ? 'Checking...' : 'Verify Receiver'}
                  </button>
                </div>
                {verifiedReceiver && (
                  <div className="mt-2 p-2 border bg-light small text-dark d-flex justify-content-between flex-wrap gap-2">
                    <span>
                      Verified Receiver: <strong>{verifiedReceiver.fullName}</strong> ({verifiedReceiver.username})
                    </span>
                    <span className="text-success fw-semibold">ID: {verifiedReceiver.id} · Active</span>
                  </div>
                )}
              </div>

              <div className="row g-3 mb-3">
                <div className="col-sm-6">
                  <label className="form-label small fw-semibold text-dark">Transfer Amount (Virtual Credits)</label>
                  <input
                    type="number"
                    min={limits.minTransferAmount || 1}
                    max={limits.maxTransferAmount || 1000000}
                    step="0.01"
                    className="form-control form-control-sm"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={!transferAllowed}
                    required
                  />
                </div>
                {limits.requireTransactionPassword && (
                  <div className="col-sm-6">
                    <label className="form-label small fw-semibold text-dark">Transaction Password</label>
                    <input
                      type="password"
                      className="form-control form-control-sm"
                      value={transactionPassword}
                      onChange={(e) => setTransactionPassword(e.target.value)}
                      disabled={!transferAllowed}
                      required
                    />
                  </div>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-dark">Remarks</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  maxLength={160}
                  placeholder="Optional note for statement ledger"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  disabled={!transferAllowed}
                />
              </div>

              <button
                type="submit"
                className="btn btn-sm btn-primary fw-semibold px-4"
                style={{ backgroundColor: '#12618c', borderColor: '#12618c' }}
                disabled={!transferAllowed || !verifiedReceiver}
              >
                <FiSend size={14} className="me-1" />
                Review &amp; Confirm Transfer
              </button>
            </form>
          </>
        )}
      </div>

      <AdminConfirmDialog
        open={confirmOpen}
        title="Confirm Virtual Credit Transfer"
        message="Virtual credits will be transferred immediately and both account statements will update."
        confirmLabel="Transfer Now"
        loading={submitting}
        details={
          verifiedReceiver
            ? [
                { label: 'Sender', value: `${user?.username} (${user?.id})` },
                { label: 'Receiver', value: `${verifiedReceiver.fullName} (${verifiedReceiver.username})` },
                { label: 'Virtual Amount', value: Number(amount || 0).toLocaleString() },
                { label: 'Remaining Balance After', value: Math.max(0, availableBalance - Number(amount || 0)).toLocaleString() },
                { label: 'Remarks', value: remarks.trim() || 'Virtual credit transfer' },
              ]
            : []
        }
        onConfirm={handleExecuteTransfer}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}

/* ============================================================================
   2. NORMAL USER TRANSFER HISTORY (/transfer-history)
   ============================================================================ */
export function UserTransferHistoryPage() {
  const { user, isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [direction, setDirection] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchHistory = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get('/wallet/transfers', {
        params: { search, direction, dateFrom, dateTo, page, limit: 15 },
      });
      if (data?.ok) {
        setItems(data.items || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load transfer history.'));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, search, direction, dateFrom, dateTo, page]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (!isAuthenticated) {
    return <SignInRequiredCard title="Transfer History" />;
  }

  function handleExportCsv() {
    downloadCsv(
      `sportzone-transfers-${user.username}`,
      ['Transfer ID', 'Date', 'Sender', 'Receiver', 'Direction', 'Virtual Amount', 'Status', 'Remarks'],
      items.map((t) => [
        t.id,
        formatDateTimeShort(t.createdAt),
        t.senderUsername,
        t.receiverUsername,
        t.senderId === user.id ? 'Sent' : 'Received',
        t.amount,
        t.status,
        t.remarks,
      ])
    );
  }

  return (
    <div className="ex-acc-wrap">
      <div className="ex-md-section-bar d-flex align-items-center justify-content-between">
        <span>My Transfer History ({total})</span>
        <Link to="/fund-transfer" className="text-white small text-decoration-underline">
          New Transfer
        </Link>
      </div>

      <div className="ex-acc-toolbar">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="input-group input-group-sm" style={{ width: 220 }}>
            <span className="input-group-text bg-white">
              <FiSearch size={13} />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search ID, user, remark..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            className="form-select form-select-sm"
            style={{ width: 135 }}
            value={direction}
            onChange={(e) => {
              setDirection(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Transfers</option>
            <option value="sent">Sent</option>
            <option value="received">Received</option>
          </select>
          <input
            type="date"
            className="form-control form-control-sm"
            style={{ width: 140 }}
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
          />
          <input
            type="date"
            className="form-control form-control-sm"
            style={{ width: 140 }}
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="d-flex gap-2">
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={fetchHistory}>
            <FiRefreshCw size={13} />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary fw-semibold"
            style={{ borderColor: '#12618c', color: '#12618c' }}
            disabled={items.length === 0}
            onClick={handleExportCsv}
          >
            <FiDownload size={13} className="me-1" />
            Export CSV
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 px-3 small mb-2 rounded-0">{error}</div>}

      <div className="table-responsive">
        <table className="ex-acc-table">
          <thead>
            <tr>
              <th>Transfer ID</th>
              <th>Date &amp; Time</th>
              <th>Sender</th>
              <th>Receiver</th>
              <th className="text-center">Type</th>
              <th className="text-end">Amount</th>
              <th className="text-end">Updated Balance</th>
              <th className="text-center">Status</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="text-center py-4 text-secondary">
                  Loading transfer history...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-4 text-secondary">
                  No virtual credit transfers recorded for your account yet.
                </td>
              </tr>
            ) : (
              items.map((t) => {
                const isSent = t.senderId === user.id;
                const updatedBal = isSent ? t.senderClosingBalance : t.receiverClosingBalance;
                return (
                  <tr key={t.id}>
                    <td className="font-monospace small">{t.id}</td>
                    <td className="text-nowrap">{formatDateTimeShort(t.createdAt)}</td>
                    <td>{t.senderUsername}</td>
                    <td>{t.receiverUsername}</td>
                    <td className="text-center fw-semibold">
                      <span className={isSent ? 'text-danger' : 'text-success'}>
                        {isSent ? 'Sent' : 'Received'}
                      </span>
                    </td>
                    <td className={`text-end fw-bold ${isSent ? 'text-danger' : 'text-success'}`}>
                      {isSent ? `-${t.amount.toLocaleString()}` : `+${t.amount.toLocaleString()}`}
                    </td>
                    <td className="text-end fw-semibold">{Number(updatedBal).toLocaleString()}</td>
                    <td className="text-center text-capitalize">{t.status}</td>
                    <td>{t.remarks}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center p-2 bg-white border border-top-0 small">
          <span className="text-secondary">
            Page {page} of {totalPages}
          </span>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   3. NORMAL USER CHANGE PASSWORD (/change-password)
   ============================================================================ */
export function UserChangePasswordPage() {
  const { user, isAuthenticated, updateUserState } = useAuth();
  const [mode, setMode] = useState('login');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isAuthenticated) {
    return <SignInRequiredCard title="Change Password" />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await apiClient.post('/auth/change-password', {
        mode,
        currentPassword,
        newPassword,
        confirmPassword,
      });
      if (data?.ok) {
        setSuccess(data.message || 'Password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        if (data.user) updateUserState(data.user);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to update password.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ex-acc-wrap">
      <div className="ex-md-section-bar">Change Password</div>
      <div className="bg-white border border-top-0 p-3 p-md-4">
        <div className="d-flex gap-2 mb-3">
          <button
            type="button"
            className={`btn btn-sm fw-semibold ${mode === 'login' ? 'btn-primary' : 'btn-outline-secondary'}`}
            style={mode === 'login' ? { backgroundColor: '#12618c', borderColor: '#12618c' } : undefined}
            onClick={() => {
              setMode('login');
              setError('');
              setSuccess('');
            }}
          >
            Login Password
          </button>
          <button
            type="button"
            className={`btn btn-sm fw-semibold ${mode === 'transaction' ? 'btn-primary' : 'btn-outline-secondary'}`}
            style={mode === 'transaction' ? { backgroundColor: '#12618c', borderColor: '#12618c' } : undefined}
            onClick={() => {
              setMode('transaction');
              setError('');
              setSuccess('');
            }}
          >
            Transaction Password {user?.hasTransactionPassword ? '(Active)' : '(Not Set)'}
          </button>
        </div>

        {error && <div className="alert alert-danger py-2 px-3 small">{error}</div>}
        {success && <div className="alert alert-success py-2 px-3 small">{success}</div>}

        <form onSubmit={handleSubmit} style={{ maxWidth: 460 }} className="d-flex flex-column gap-3">
          <div>
            <label className="form-label small fw-semibold text-dark">
              {mode === 'transaction' && !user?.hasTransactionPassword
                ? 'Current Login Password (to authorize)'
                : mode === 'transaction'
                ? 'Current Transaction or Login Password'
                : 'Current Login Password'}
            </label>
            <input
              type="password"
              className="form-control form-control-sm"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="form-label small fw-semibold text-dark">
              New {mode === 'transaction' ? 'Transaction Password (min 4 chars)' : 'Login Password (min 6 chars)'}
            </label>
            <input
              type="password"
              className="form-control form-control-sm"
              minLength={mode === 'transaction' ? 4 : 6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="form-label small fw-semibold text-dark">Confirm New Password</label>
            <input
              type="password"
              className="form-control form-control-sm"
              minLength={mode === 'transaction' ? 4 : 6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <button
              type="submit"
              className="btn btn-sm btn-primary fw-semibold px-4"
              style={{ backgroundColor: '#12618c', borderColor: '#12618c' }}
              disabled={saving}
            >
              <FiKey size={14} className="me-1" />
              {saving ? 'Updating...' : 'Save Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
