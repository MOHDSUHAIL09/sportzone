import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiMoreVertical,
  FiRefreshCw,
  FiSearch,
  FiUserPlus,
} from 'react-icons/fi';
import apiClient, { generateIdempotencyKey, getApiErrorMessage } from '../../services/apiClient';
import AdminConfirmDialog from '../../components/admin/AdminConfirmDialog';
import { formatDateTimeShort } from '../../utils/formatters';

export default function AdminUsersPage({ defaultStatus = 'all' }) {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(defaultStatus);
  const [transferFilter, setTransferFilter] = useState('all');
  const [withdrawalFilter, setWithdrawalFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [openMenuId, setOpenMenuId] = useState(null);
  const menuContainerRef = useRef(null);

  // Active modals / sheets
  const [profileModal, setProfileModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [fundModal, setFundModal] = useState(null); // { user, operation: 'credit'|'debit', amount, remarks }
  const [resetPwdModal, setResetPwdModal] = useState(null); // { user, newPassword, newTransactionPassword }
  const [confirmState, setConfirmState] = useState(null);
  const [blockReason, setBlockReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    setStatusFilter(defaultStatus);
    setPage(1);
  }, [defaultStatus]);

  useEffect(() => {
    function handleOutside(e) {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get('/admin/users', {
        params: {
          search,
          status: statusFilter,
          transfer: transferFilter,
          withdrawal: withdrawalFilter,
          sortBy,
          sortDir,
          page,
          limit: 12,
        },
      });
      if (data?.ok) {
        setUsers(data.items || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to fetch users.'));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, transferFilter, withdrawalFilter, sortBy, sortDir, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  function toggleSort(col) {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
    setPage(1);
  }

  async function openViewProfile(u) {
    setOpenMenuId(null);
    setProfileModal({ loading: true, user: u });
    try {
      const { data } = await apiClient.get(`/admin/users/${u.id}`);
      if (data?.ok) setProfileModal({ loading: false, ...data });
    } catch (err) {
      setProfileModal(null);
      setError(getApiErrorMessage(err, 'Failed to load profile.'));
    }
  }

  function openEditUser(u) {
    setOpenMenuId(null);
    setEditModal({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      email: u.email,
      mobile: u.mobile,
      status: u.status,
      fundTransferEnabled: u.fundTransferEnabled,
      withdrawalEnabled: u.withdrawalEnabled,
    });
  }

  async function submitEditUser() {
    if (!editModal) return;
    setActionBusy(true);
    setError('');
    try {
      const { data } = await apiClient.patch(`/admin/users/${editModal.id}`, {
        fullName: editModal.fullName,
        email: editModal.email,
        mobile: editModal.mobile,
        status: editModal.status,
        fundTransferEnabled: editModal.fundTransferEnabled,
        withdrawalEnabled: editModal.withdrawalEnabled,
      });
      if (data?.ok) {
        setFeedback(`Updated user ${editModal.username}.`);
        setEditModal(null);
        fetchUsers();
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to update user.'));
    } finally {
      setActionBusy(false);
    }
  }

  async function submitFundAdjust() {
    if (!fundModal) return;
    setActionBusy(true);
    setError('');
    try {
      const { data } = await apiClient.post('/admin/funds/adjust', {
        userId: fundModal.user.id,
        operation: fundModal.operation,
        amount: Number(fundModal.amount),
        remarks: fundModal.remarks,
        idempotencyKey: generateIdempotencyKey('adm-adj'),
      });
      if (data?.ok) {
        setFeedback(
          `${fundModal.operation === 'credit' ? 'Added' : 'Deducted'} ${Number(fundModal.amount).toLocaleString()} virtual credits for ${fundModal.user.username}.`
        );
        setFundModal(null);
        fetchUsers();
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Fund adjustment failed.'));
    } finally {
      setActionBusy(false);
    }
  }

  async function submitResetPassword() {
    if (!resetPwdModal) return;
    setActionBusy(true);
    setError('');
    try {
      const { data } = await apiClient.post(`/admin/users/${resetPwdModal.user.id}/reset-password`, {
        newPassword: resetPwdModal.newPassword || undefined,
        newTransactionPassword: resetPwdModal.newTransactionPassword || undefined,
      });
      if (data?.ok) {
        setFeedback(`Password updated for ${resetPwdModal.user.username} and existing sessions invalidated.`);
        setResetPwdModal(null);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Password reset failed.'));
    } finally {
      setActionBusy(false);
    }
  }

  async function executeConfirmAction() {
    if (!confirmState) return;
    setActionBusy(true);
    setError('');
    try {
      if (confirmState.type === 'block') {
        await apiClient.post(`/admin/users/${confirmState.user.id}/block`, {
          reason: blockReason.trim() || 'Restricted by administrator',
        });
        setFeedback(`Blocked ${confirmState.user.username} and invalidated active sessions.`);
      } else if (confirmState.type === 'unblock') {
        await apiClient.post(`/admin/users/${confirmState.user.id}/unblock`);
        setFeedback(`Unblocked ${confirmState.user.username}.`);
      } else if (confirmState.type === 'perm-transfer') {
        await apiClient.post(`/admin/users/${confirmState.user.id}/permissions`, {
          fundTransferEnabled: confirmState.nextValue,
        });
        setFeedback(
          `${confirmState.nextValue ? 'Enabled' : 'Disabled'} Fund Transfer for ${confirmState.user.username}.`
        );
      } else if (confirmState.type === 'perm-withdrawal') {
        await apiClient.post(`/admin/users/${confirmState.user.id}/permissions`, {
          withdrawalEnabled: confirmState.nextValue,
        });
        setFeedback(
          `${confirmState.nextValue ? 'Enabled' : 'Disabled'} Simulated Withdrawal for ${confirmState.user.username}.`
        );
      }
      setConfirmState(null);
      setBlockReason('');
      fetchUsers();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Administrative action failed.'));
      setConfirmState(null);
    } finally {
      setActionBusy(false);
    }
  }

  const headingTitle =
    defaultStatus === 'active'
      ? 'Active Users'
      : defaultStatus === 'blocked'
      ? 'Blocked Users'
      : 'All Users';

  return (
    <div className="sz-adm-page" ref={menuContainerRef}>
      <div className="sz-adm-page-head">
        <div>
          <h1 className="sz-adm-page-title">{headingTitle}</h1>
          <p className="sz-adm-page-sub">
            Manage registered demo accounts, virtual balances, transfer permissions, and access status ({total} total).
          </p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button type="button" className="sz-adm-btn sz-adm-btn-outline sz-adm-btn-sm" onClick={fetchUsers}>
            <FiRefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <Link to="/admin/create-user" className="sz-adm-btn sz-adm-btn-primary sz-adm-btn-sm text-decoration-none">
            <FiUserPlus size={14} />
            <span>Create User</span>
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 px-3 small mb-3">{error}</div>}
      {feedback && (
        <div className="alert alert-success py-2 px-3 small mb-3 d-flex justify-content-between align-items-center">
          <span>{feedback}</span>
          <button type="button" className="btn-close btn-sm" onClick={() => setFeedback('')} />
        </div>
      )}

      {/* Filter Bar */}
      <div className="sz-adm-panel mb-3">
        <div className="sz-adm-toolbar">
          <div className="sz-adm-search-box">
            <FiSearch size={14} className="text-secondary" />
            <input
              type="text"
              placeholder="Search ID, username, name, email, mobile..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="d-flex flex-wrap gap-2">
            {defaultStatus === 'all' && (
              <select
                className="form-select form-select-sm sz-adm-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="blocked">Blocked Only</option>
              </select>
            )}
            <select
              className="form-select form-select-sm sz-adm-select"
              value={transferFilter}
              onChange={(e) => {
                setTransferFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">Transfer: All</option>
              <option value="enabled">Transfer: Enabled</option>
              <option value="disabled">Transfer: Disabled</option>
            </select>
            <select
              className="form-select form-select-sm sz-adm-select"
              value={withdrawalFilter}
              onChange={(e) => {
                setWithdrawalFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">Withdrawal: All</option>
              <option value="enabled">Withdrawal: Enabled</option>
              <option value="disabled">Withdrawal: Disabled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="sz-adm-panel">
        <div className="table-responsive" style={{ overflowY: 'visible' }}>
          <table className="sz-adm-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th className="sz-adm-sortable" onClick={() => toggleSort('username')}>
                  Username {sortBy === 'username' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="sz-adm-sortable" onClick={() => toggleSort('fullName')}>
                  Full Name {sortBy === 'fullName' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th>Mobile</th>
                <th>Email</th>
                <th className="text-end sz-adm-sortable" onClick={() => toggleSort('virtualBalance')}>
                  Virtual Balance {sortBy === 'virtualBalance' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th>Status</th>
                <th>Fund Transfer</th>
                <th>Sim. Withdrawal</th>
                <th className="sz-adm-sortable" onClick={() => toggleSort('createdAt')}>
                  Registered {sortBy === 'createdAt' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="sz-adm-sortable" onClick={() => toggleSort('lastLoginAt')}>
                  Last Login {sortBy === 'lastLoginAt' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="text-center py-4 text-secondary">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-4 text-secondary">
                    No matching users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td className="font-monospace small text-nowrap">{u.id}</td>
                    <td className="fw-semibold text-dark text-nowrap">
                      {u.username}
                      {u.role === 'admin' && <span className="sz-adm-meta ms-1">· Admin</span>}
                    </td>
                    <td className="text-nowrap">{u.fullName}</td>
                    <td className="text-nowrap small">{u.mobile}</td>
                    <td className="small">{u.email}</td>
                    <td className="text-end sz-adm-num fw-semibold text-dark">
                      {Number(u.virtualBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className={`sz-adm-status is-${u.status}`}>
                        {u.status === 'active' ? 'Active' : 'Blocked'}
                      </span>
                    </td>
                    <td className="small">
                      <span className={u.fundTransferEnabled ? 'text-success fw-semibold' : 'text-secondary'}>
                        {u.fundTransferEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="small">
                      <span className={u.withdrawalEnabled ? 'text-success fw-semibold' : 'text-secondary'}>
                        {u.withdrawalEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="text-nowrap small text-secondary">{formatDateTimeShort(u.createdAt)}</td>
                    <td className="text-nowrap small text-secondary">
                      {u.lastLoginAt ? formatDateTimeShort(u.lastLoginAt) : 'Never'}
                    </td>
                    <td className="text-end position-relative">
                      <button
                        type="button"
                        className="sz-adm-icon-btn"
                        aria-label={`Actions for ${u.username}`}
                        onClick={() => setOpenMenuId((cur) => (cur === u.id ? null : u.id))}
                      >
                        <FiMoreVertical size={16} />
                      </button>

                      {openMenuId === u.id && (
                        <div className="sz-adm-action-menu" role="menu">
                          <button type="button" onClick={() => openViewProfile(u)}>View Profile</button>
                          <button type="button" onClick={() => openEditUser(u)}>Edit User</button>
                          {u.status === 'active' ? (
                            <button
                              type="button"
                              className="text-danger"
                              disabled={u.role === 'admin'}
                              onClick={() => {
                                setOpenMenuId(null);
                                setBlockReason('');
                                setConfirmState({ type: 'block', user: u });
                              }}
                            >
                              Block User
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="text-success"
                              onClick={() => {
                                setOpenMenuId(null);
                                setConfirmState({ type: 'unblock', user: u });
                              }}
                            >
                              Unblock User
                            </button>
                          )}
                          <div className="sz-adm-menu-sep" />
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              setFundModal({ user: u, operation: 'credit', amount: '', remarks: '' });
                            }}
                          >
                            Add Demo Funds
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              setFundModal({ user: u, operation: 'debit', amount: '', remarks: '' });
                            }}
                          >
                            Deduct Demo Funds
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              navigate(`/admin/fund-transfer?receiver=${encodeURIComponent(u.id)}`);
                            }}
                          >
                            Transfer Virtual Funds
                          </button>
                          <div className="sz-adm-menu-sep" />
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              setConfirmState({
                                type: 'perm-transfer',
                                user: u,
                                nextValue: !u.fundTransferEnabled,
                              });
                            }}
                          >
                            {u.fundTransferEnabled ? 'Disable Fund Transfer' : 'Enable Fund Transfer'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              setConfirmState({
                                type: 'perm-withdrawal',
                                user: u,
                                nextValue: !u.withdrawalEnabled,
                              });
                            }}
                          >
                            {u.withdrawalEnabled ? 'Disable Simulated Withdrawal' : 'Enable Simulated Withdrawal'}
                          </button>
                          <div className="sz-adm-menu-sep" />
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              navigate(`/admin/account-statement?userId=${encodeURIComponent(u.id)}`);
                            }}
                          >
                            View Account Statement
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              navigate(`/admin/transactions?userId=${encodeURIComponent(u.id)}`);
                            }}
                          >
                            View Transaction History
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              setResetPwdModal({ user: u, newPassword: '', newTransactionPassword: '' });
                            }}
                          >
                            Reset Password
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="sz-adm-pagination">
          <span className="small text-secondary">
            Showing page {page} of {totalPages} ({total} users)
          </span>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="sz-adm-btn sz-adm-btn-outline sz-adm-btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="sz-adm-btn sz-adm-btn-outline sz-adm-btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* View Profile Dialog */}
      <AdminConfirmDialog
        open={Boolean(profileModal)}
        title={profileModal?.user ? `Profile · ${profileModal.user.username}` : 'User Profile'}
        confirmLabel="Close"
        cancelLabel="Dismiss"
        onConfirm={() => setProfileModal(null)}
        onClose={() => setProfileModal(null)}
        details={
          profileModal?.user
            ? [
                { label: 'User ID', value: profileModal.user.id },
                { label: 'Full Name', value: profileModal.user.fullName },
                { label: 'Email', value: profileModal.user.email },
                { label: 'Mobile', value: profileModal.user.mobile },
                { label: 'Virtual Balance', value: Number(profileModal.user.virtualBalance).toLocaleString() },
                { label: 'Account Status', value: profileModal.user.status },
                { label: 'Total Credits', value: Number(profileModal.stats?.totalCredits || 0).toLocaleString() },
                { label: 'Total Debits', value: Number(profileModal.stats?.totalDebits || 0).toLocaleString() },
                { label: 'Virtual Transfers', value: String(profileModal.stats?.transferCount || 0) },
              ]
            : []
        }
      />

      {/* Edit User Dialog */}
      <AdminConfirmDialog
        open={Boolean(editModal)}
        title={editModal ? `Edit User · ${editModal.username}` : 'Edit User'}
        confirmLabel="Save Changes"
        loading={actionBusy}
        onConfirm={submitEditUser}
        onClose={() => setEditModal(null)}
      >
        {editModal && (
          <div className="d-flex flex-column gap-2">
            <div>
              <label className="sz-adm-label">Full Name</label>
              <input
                type="text"
                className="form-control form-control-sm sz-adm-input"
                value={editModal.fullName}
                onChange={(e) => setEditModal((p) => ({ ...p, fullName: e.target.value }))}
              />
            </div>
            <div>
              <label className="sz-adm-label">Email</label>
              <input
                type="email"
                className="form-control form-control-sm sz-adm-input"
                value={editModal.email}
                onChange={(e) => setEditModal((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="sz-adm-label">Mobile Number</label>
              <input
                type="text"
                className="form-control form-control-sm sz-adm-input"
                value={editModal.mobile}
                onChange={(e) => setEditModal((p) => ({ ...p, mobile: e.target.value }))}
              />
            </div>
            <div className="d-flex gap-3 pt-1">
              <label className="form-check small">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={editModal.fundTransferEnabled}
                  onChange={(e) => setEditModal((p) => ({ ...p, fundTransferEnabled: e.target.checked }))}
                />
                <span className="form-check-label">Fund Transfer Enabled</span>
              </label>
              <label className="form-check small">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={editModal.withdrawalEnabled}
                  onChange={(e) => setEditModal((p) => ({ ...p, withdrawalEnabled: e.target.checked }))}
                />
                <span className="form-check-label">Sim. Withdrawal Enabled</span>
              </label>
            </div>
          </div>
        )}
      </AdminConfirmDialog>

      {/* Quick Add / Deduct Demo Funds Dialog */}
      <AdminConfirmDialog
        open={Boolean(fundModal)}
        title={
          fundModal
            ? `${fundModal.operation === 'credit' ? 'Add Demo Funds' : 'Deduct Demo Funds'} · ${fundModal.user.username}`
            : ''
        }
        confirmLabel={fundModal?.operation === 'credit' ? 'Add Virtual Credits' : 'Deduct Virtual Credits'}
        variant={fundModal?.operation === 'debit' ? 'danger' : 'primary'}
        loading={actionBusy}
        details={
          fundModal
            ? [
                { label: 'User', value: `${fundModal.user.fullName} (${fundModal.user.username})` },
                { label: 'Current Virtual Balance', value: Number(fundModal.user.virtualBalance).toLocaleString() },
              ]
            : []
        }
        onConfirm={submitFundAdjust}
        onClose={() => setFundModal(null)}
      >
        {fundModal && (
          <div className="d-flex flex-column gap-2 mt-2">
            <div>
              <label className="sz-adm-label">Virtual Credit Amount</label>
              <input
                type="number"
                min={1}
                step="0.01"
                className="form-control form-control-sm sz-adm-input"
                value={fundModal.amount}
                onChange={(e) => setFundModal((p) => ({ ...p, amount: e.target.value }))}
                placeholder="Enter amount"
              />
            </div>
            <div>
              <label className="sz-adm-label">Remarks</label>
              <input
                type="text"
                className="form-control form-control-sm sz-adm-input"
                value={fundModal.remarks}
                onChange={(e) => setFundModal((p) => ({ ...p, remarks: e.target.value }))}
                placeholder="Audit reason / remark"
              />
            </div>
          </div>
        )}
      </AdminConfirmDialog>

      {/* Reset Password Dialog */}
      <AdminConfirmDialog
        open={Boolean(resetPwdModal)}
        title={resetPwdModal ? `Reset Password · ${resetPwdModal.user.username}` : 'Reset Password'}
        message="Updating the login password immediately invalidates active sessions for this user."
        confirmLabel="Reset Password"
        loading={actionBusy}
        onConfirm={submitResetPassword}
        onClose={() => setResetPwdModal(null)}
      >
        {resetPwdModal && (
          <div className="d-flex flex-column gap-2">
            <div>
              <label className="sz-adm-label">New Login Password (min 6 chars)</label>
              <input
                type="password"
                className="form-control form-control-sm sz-adm-input"
                value={resetPwdModal.newPassword}
                onChange={(e) => setResetPwdModal((p) => ({ ...p, newPassword: e.target.value }))}
                placeholder="Leave blank to keep existing"
              />
            </div>
            <div>
              <label className="sz-adm-label">New Transaction Password (min 4 chars)</label>
              <input
                type="password"
                className="form-control form-control-sm sz-adm-input"
                value={resetPwdModal.newTransactionPassword}
                onChange={(e) => setResetPwdModal((p) => ({ ...p, newTransactionPassword: e.target.value }))}
                placeholder="Leave blank to keep existing"
              />
            </div>
          </div>
        )}
      </AdminConfirmDialog>

      {/* Block / Unblock / Permission Confirmation Dialog */}
      <AdminConfirmDialog
        open={Boolean(confirmState)}
        title={
          confirmState?.type === 'block'
            ? `Block User · ${confirmState.user.username}`
            : confirmState?.type === 'unblock'
            ? `Unblock User · ${confirmState.user.username}`
            : confirmState?.type === 'perm-transfer'
            ? `${confirmState.nextValue ? 'Enable' : 'Disable'} Fund Transfer`
            : confirmState?.type === 'perm-withdrawal'
            ? `${confirmState.nextValue ? 'Enable' : 'Disable'} Simulated Withdrawal`
            : 'Confirm Action'
        }
        message={
          confirmState?.type === 'block'
            ? 'Blocking this account immediately revokes active sessions and prevents demo transfers and protected actions.'
            : confirmState?.type === 'unblock'
            ? 'Restore full account access for this user.'
            : confirmState
            ? `Update permission for ${confirmState.user.username} (${confirmState.user.fullName}) and send notification.`
            : ''
        }
        variant={confirmState?.type === 'block' ? 'danger' : 'primary'}
        confirmLabel="Confirm"
        loading={actionBusy}
        onConfirm={executeConfirmAction}
        onClose={() => setConfirmState(null)}
      >
        {confirmState?.type === 'block' && (
          <div className="mt-2">
            <label className="sz-adm-label">Restriction Reason (logged &amp; shown to user)</label>
            <input
              type="text"
              className="form-control form-control-sm sz-adm-input"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="e.g. Temporary review or policy restriction"
            />
          </div>
        )}
      </AdminConfirmDialog>
    </div>
  );
}
