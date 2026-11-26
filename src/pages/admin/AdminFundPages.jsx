import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiCheckCircle, FiDollarSign, FiRefreshCw, FiSend, FiUserCheck } from 'react-icons/fi';
import apiClient, { generateIdempotencyKey, getApiErrorMessage } from '../../services/apiClient';
import AdminConfirmDialog from '../../components/admin/AdminConfirmDialog';
import { useAuth } from '../../context/AuthContext';

/* ============================================================================
   1. ADMIN FUND MANAGEMENT (/admin/fund-management)
   ============================================================================ */
export function AdminFundManagementPage() {
  const { refreshMe } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [operation, setOperation] = useState('credit'); // 'credit' | 'debit'
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [idemKey, setIdemKey] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/admin/users', { params: { limit: 100 } });
      if (data?.ok) {
        setUsers(data.items || []);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load users.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) || null,
    [users, selectedUserId]
  );

  function handleReview(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!selectedUser) {
      setError('Select a user account first.');
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Enter a valid positive virtual amount.');
      return;
    }
    if (operation === 'debit' && amt > selectedUser.virtualBalance) {
      setError(`Cannot deduct more than available balance (${selectedUser.virtualBalance.toLocaleString()}).`);
      return;
    }
    setIdemKey(generateIdempotencyKey('adm-fund'));
    setConfirmOpen(true);
  }

  async function handleConfirm() {
    setSubmitting(true);
    setError('');
    try {
      const { data } = await apiClient.post('/admin/funds/adjust', {
        userId: selectedUser.id,
        operation,
        amount: Number(amount),
        remarks: remarks.trim(),
        idempotencyKey: idemKey,
      });
      if (data?.ok) {
        setConfirmOpen(false);
        setSuccess(
          `${operation === 'credit' ? 'Credited' : 'Deducted'} ${Number(amount).toLocaleString()} virtual credits for ${selectedUser.username}. Updated balance: ${Number(data.user.virtualBalance).toLocaleString()}.`
        );
        setAmount('');
        setRemarks('');
        await Promise.all([loadUsers(), refreshMe({ silent: true })]);
      }
    } catch (err) {
      setConfirmOpen(false);
      setError(getApiErrorMessage(err, 'Fund adjustment failed.'));
    } finally {
      setSubmitting(false);
    }
  }

  const projectedBalance = selectedUser
    ? operation === 'credit'
      ? selectedUser.virtualBalance + (Number(amount) || 0)
      : Math.max(0, selectedUser.virtualBalance - (Number(amount) || 0))
    : 0;

  return (
    <div className="sz-adm-page">
      <div className="sz-adm-page-head">
        <div>
          <h1 className="sz-adm-page-title">Fund Management</h1>
          <p className="sz-adm-page-sub">
            Add or deduct non-redeemable virtual demo credits with atomic ledger updates and audit logging.
          </p>
        </div>
        <button type="button" className="sz-adm-btn sz-adm-btn-outline sz-adm-btn-sm" onClick={loadUsers}>
          <FiRefreshCw size={14} />
          <span>Refresh Balances</span>
        </button>
      </div>

      {error && <div className="alert alert-danger py-2 px-3 small mb-3">{error}</div>}
      {success && (
        <div className="alert alert-success py-2 px-3 small mb-3 d-flex align-items-center gap-2">
          <FiCheckCircle size={15} />
          <span>{success}</span>
        </div>
      )}

      <div className="row g-3">
        <div className="col-lg-7">
          <div className="sz-adm-panel">
            <div className="sz-adm-panel-head">
              <h2 className="sz-adm-panel-title">Adjust User Virtual Wallet</h2>
            </div>
            <div className="sz-adm-panel-body">
              <form onSubmit={handleReview} className="d-flex flex-column gap-3">
                <div>
                  <label className="sz-adm-label">Filter Users</label>
                  <input
                    type="text"
                    className="form-control form-control-sm sz-adm-input mb-2"
                    placeholder="Type username, name, or User ID..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                  <label className="sz-adm-label">Select User Account *</label>
                  <select
                    className="form-select form-select-sm sz-adm-input"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    disabled={loading}
                    required
                  >
                    <option value="">-- Choose registered user --</option>
                    {filteredUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username} — {u.fullName} ({u.id}) · Bal: {Number(u.virtualBalance).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedUser && (
                  <div className="sz-adm-summary-list">
                    <div className="sz-adm-summary-row">
                      <span className="sz-adm-summary-k">Account</span>
                      <strong className="sz-adm-summary-v">
                        {selectedUser.fullName} ({selectedUser.username})
                      </strong>
                    </div>
                    <div className="sz-adm-summary-row">
                      <span className="sz-adm-summary-k">Current Virtual Balance</span>
                      <strong className="sz-adm-summary-v sz-adm-num">
                        {Number(selectedUser.virtualBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </strong>
                    </div>
                    <div className="sz-adm-summary-row">
                      <span className="sz-adm-summary-k">Account Status</span>
                      <span className={`sz-adm-status is-${selectedUser.status}`}>{selectedUser.status}</span>
                    </div>
                  </div>
                )}

                <div className="row g-3">
                  <div className="col-sm-6">
                    <label className="sz-adm-label">Transaction Type *</label>
                    <div className="sz-adm-segmented">
                      <button
                        type="button"
                        className={operation === 'credit' ? 'is-active' : ''}
                        onClick={() => setOperation('credit')}
                      >
                        Add Virtual Credits
                      </button>
                      <button
                        type="button"
                        className={operation === 'debit' ? 'is-active is-danger' : ''}
                        onClick={() => setOperation('debit')}
                      >
                        Deduct Virtual Credits
                      </button>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <label className="sz-adm-label">Virtual Credit Amount *</label>
                    <input
                      type="number"
                      min={1}
                      step="0.01"
                      className="form-control form-control-sm sz-adm-input"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="sz-adm-label">Remarks (recorded on account statement) *</label>
                  <input
                    type="text"
                    className="form-control form-control-sm sz-adm-input"
                    maxLength={180}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Reason for virtual credit adjustment"
                    required
                  />
                </div>

                <div>
                  <button type="submit" className="sz-adm-btn sz-adm-btn-primary">
                    <FiDollarSign size={15} />
                    <span>Review &amp; Confirm Adjustment</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="sz-adm-panel">
            <div className="sz-adm-panel-head">
              <h2 className="sz-adm-panel-title">Virtual Wallet Guardrails</h2>
            </div>
            <div className="sz-adm-panel-body small text-secondary d-flex flex-column gap-2">
              <div>• All credits are non-redeemable virtual demo currency with zero real-money value.</div>
              <div>• Deductions strictly reject any operation that would result in a negative balance.</div>
              <div>• Every request carries an idempotency token to prevent duplicate credit/debit execution.</div>
              <div>• Account statements, transaction history, dashboard metrics, and user notifications update atomically.</div>
            </div>
          </div>
        </div>
      </div>

      <AdminConfirmDialog
        open={confirmOpen}
        title={operation === 'credit' ? 'Confirm Virtual Credit Addition' : 'Confirm Virtual Credit Deduction'}
        message="This operation executes atomically on the server and records an immutable ledger entry."
        confirmLabel={operation === 'credit' ? 'Add Credits' : 'Deduct Credits'}
        variant={operation === 'debit' ? 'danger' : 'primary'}
        loading={submitting}
        details={
          selectedUser
            ? [
                { label: 'Target User', value: `${selectedUser.fullName} (${selectedUser.username})` },
                { label: 'Operation', value: operation === 'credit' ? 'Credit (+)' : 'Debit (-)' },
                { label: 'Amount', value: Number(amount || 0).toLocaleString() },
                { label: 'Current Balance', value: Number(selectedUser.virtualBalance).toLocaleString() },
                { label: 'Projected Balance', value: Number(projectedBalance).toLocaleString() },
                { label: 'Remarks', value: remarks },
              ]
            : []
        }
        onConfirm={handleConfirm}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}

/* ============================================================================
   2. ADMIN FUND TRANSFER (/admin/fund-transfer)
   ============================================================================ */
export function AdminFundTransferPage() {
  const { user: adminUser, refreshMe } = useAuth();
  const [searchParams] = useSearchParams();
  const prefillReceiver = searchParams.get('receiver') || '';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [senderId, setSenderId] = useState('');
  const [receiverQuery, setReceiverQuery] = useState(prefillReceiver);
  const [verifiedReceiver, setVerifiedReceiver] = useState(null);
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [lastTransfer, setLastTransfer] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [idemKey, setIdemKey] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/admin/users', { params: { limit: 100 } });
      if (data?.ok) {
        const list = data.items || [];
        setUsers(list);
        if (!senderId && adminUser?.id) {
          setSenderId(adminUser.id);
        }
        if (prefillReceiver) {
          const found = list.find(
            (u) => u.id === prefillReceiver || u.username.toLowerCase() === prefillReceiver.toLowerCase()
          );
          if (found) setVerifiedReceiver(found);
        }
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load accounts.'));
    } finally {
      setLoading(false);
    }
  }, [adminUser?.id, prefillReceiver, senderId]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const senderUser = useMemo(() => users.find((u) => u.id === senderId) || null, [users, senderId]);

  function handleVerifyReceiver() {
    setError('');
    setVerifiedReceiver(null);
    const q = receiverQuery.trim().toLowerCase();
    if (!q) {
      setError('Enter a receiver username or User ID.');
      return;
    }
    const found = users.find((u) => u.id.toLowerCase() === q || u.username.toLowerCase() === q);
    if (!found) {
      setError('No registered user matches that Username or User ID.');
      return;
    }
    if (senderUser && found.id === senderUser.id) {
      setError('Sender and receiver cannot be the same account.');
      return;
    }
    if (found.status === 'blocked') {
      setError('Receiver account is blocked and cannot receive transfers.');
      return;
    }
    setVerifiedReceiver(found);
  }

  function handleReview(e) {
    e.preventDefault();
    setError('');
    setLastTransfer(null);
    if (!senderUser) {
      setError('Select a sender account.');
      return;
    }
    if (!verifiedReceiver) {
      setError('Verify the receiver account first.');
      return;
    }
    if (senderUser.id === verifiedReceiver.id) {
      setError('Self-transfers are not permitted.');
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Enter a valid positive virtual amount.');
      return;
    }
    if (amt > senderUser.virtualBalance) {
      setError(`Sender available virtual balance is only ${senderUser.virtualBalance.toLocaleString()}.`);
      return;
    }
    setIdemKey(generateIdempotencyKey('adm-trf'));
    setConfirmOpen(true);
  }

  async function handleConfirmTransfer() {
    setSubmitting(true);
    setError('');
    try {
      const { data } = await apiClient.post('/admin/funds/transfer', {
        senderId: senderUser.id,
        receiverId: verifiedReceiver.id,
        amount: Number(amount),
        remarks: remarks.trim() || 'Admin virtual transfer',
        idempotencyKey: idemKey,
      });
      if (data?.ok) {
        setConfirmOpen(false);
        setLastTransfer(data.transfer);
        setAmount('');
        setRemarks('');
        await Promise.all([loadUsers(), refreshMe({ silent: true })]);
        if (data.receiver) setVerifiedReceiver(data.receiver);
      }
    } catch (err) {
      setConfirmOpen(false);
      setError(getApiErrorMessage(err, 'Transfer failed.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="sz-adm-page">
      <div className="sz-adm-page-head">
        <div>
          <h1 className="sz-adm-page-title">Admin Virtual Fund Transfer</h1>
          <p className="sz-adm-page-sub">
            Transfer virtual credits between registered accounts with receiver verification and complete ledger auditing.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 px-3 small mb-3">{error}</div>}
      {lastTransfer && (
        <div className="alert alert-success py-2 px-3 small mb-3">
          <div className="fw-semibold d-flex align-items-center gap-2">
            <FiCheckCircle size={15} />
            Transfer Completed · {lastTransfer.id}
          </div>
          <div className="mt-1">
            Transferred <strong>{Number(lastTransfer.amount).toLocaleString()}</strong> virtual credits from{' '}
            <strong>{lastTransfer.senderUsername}</strong> to <strong>{lastTransfer.receiverUsername}</strong>. Status:{' '}
            <span className="text-uppercase fw-semibold">{lastTransfer.status}</span>
          </div>
        </div>
      )}

      <div className="sz-adm-panel" style={{ maxWidth: 760 }}>
        <div className="sz-adm-panel-head">
          <h2 className="sz-adm-panel-title">Initiate Virtual Transfer</h2>
        </div>
        <div className="sz-adm-panel-body">
          <form onSubmit={handleReview} className="d-flex flex-column gap-3">
            <div>
              <label className="sz-adm-label">Sender Account *</label>
              <select
                className="form-select form-select-sm sz-adm-input"
                value={senderId}
                onChange={(e) => setSenderId(e.target.value)}
                disabled={loading}
                required
              >
                <option value="">-- Select sender account --</option>
                {users
                  .filter((u) => u.status === 'active')
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username} ({u.fullName}) · Available: {Number(u.virtualBalance).toLocaleString()}
                    </option>
                  ))}
              </select>
              {senderUser && (
                <div className="small text-secondary mt-1">
                  Available Virtual Balance:{' '}
                  <strong className="text-dark sz-adm-num">
                    {Number(senderUser.virtualBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </strong>
                </div>
              )}
            </div>

            <div>
              <label className="sz-adm-label">Receiver Account (Username or User ID) *</label>
              <div className="input-group input-group-sm">
                <input
                  type="text"
                  className="form-control sz-adm-input"
                  placeholder="Enter username or USR-xxxx"
                  value={receiverQuery}
                  onChange={(e) => {
                    setReceiverQuery(e.target.value);
                    setVerifiedReceiver(null);
                  }}
                  required
                />
                <button
                  type="button"
                  className="sz-adm-btn sz-adm-btn-outline sz-adm-btn-sm"
                  onClick={handleVerifyReceiver}
                >
                  <FiUserCheck size={14} />
                  <span>Verify Receiver</span>
                </button>
              </div>
              {verifiedReceiver && (
                <div className="sz-adm-summary-list mt-2">
                  <div className="sz-adm-summary-row">
                    <span className="sz-adm-summary-k">Verified Receiver</span>
                    <strong className="sz-adm-summary-v">
                      {verifiedReceiver.fullName} ({verifiedReceiver.username} · {verifiedReceiver.id})
                    </strong>
                  </div>
                  <div className="sz-adm-summary-row">
                    <span className="sz-adm-summary-k">Receiver Current Balance</span>
                    <strong className="sz-adm-summary-v sz-adm-num">
                      {Number(verifiedReceiver.virtualBalance).toLocaleString()}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            <div className="row g-3">
              <div className="col-sm-6">
                <label className="sz-adm-label">Transfer Amount *</label>
                <input
                  type="number"
                  min={1}
                  step="0.01"
                  className="form-control form-control-sm sz-adm-input"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Virtual credits amount"
                  required
                />
              </div>
              <div className="col-sm-6">
                <label className="sz-adm-label">Remarks *</label>
                <input
                  type="text"
                  className="form-control form-control-sm sz-adm-input"
                  maxLength={180}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Audit note / transfer reason"
                  required
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="sz-adm-btn sz-adm-btn-primary"
                disabled={!senderUser || !verifiedReceiver}
              >
                <FiSend size={15} />
                <span>Review &amp; Confirm Transfer</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <AdminConfirmDialog
        open={confirmOpen}
        title="Confirm Admin Virtual Transfer"
        message="Both sender and receiver balances will update atomically and both users will be notified."
        confirmLabel="Execute Transfer"
        loading={submitting}
        details={
          senderUser && verifiedReceiver
            ? [
                { label: 'Sender', value: `${senderUser.username} (${senderUser.id})` },
                { label: 'Receiver', value: `${verifiedReceiver.username} (${verifiedReceiver.id})` },
                { label: 'Virtual Amount', value: Number(amount || 0).toLocaleString() },
                { label: 'Sender Balance After', value: Math.max(0, senderUser.virtualBalance - Number(amount || 0)).toLocaleString() },
                { label: 'Receiver Balance After', value: (verifiedReceiver.virtualBalance + Number(amount || 0)).toLocaleString() },
                { label: 'Remarks', value: remarks || 'Admin virtual transfer' },
              ]
            : []
        }
        onConfirm={handleConfirmTransfer}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}
