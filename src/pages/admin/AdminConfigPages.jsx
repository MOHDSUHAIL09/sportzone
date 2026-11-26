import React, { useCallback, useEffect, useState } from 'react';
import {
  FiArrowDown,
  FiArrowUp,
  FiCheckCircle,
  FiKey,
  FiPlus,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiTrash2,
} from 'react-icons/fi';
import apiClient, { getApiErrorMessage } from '../../services/apiClient';
import AdminConfirmDialog from '../../components/admin/AdminConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { useArena } from '../../context/ArenaContext';
import { formatDateTimeShort } from '../../utils/formatters';

/* ============================================================================
   1. SIMULATED WITHDRAWAL SETTINGS (/admin/withdrawal-settings)
   ============================================================================ */
export function AdminWithdrawalSettingsPage() {
  const { refreshMe } = useAuth();
  const [settings, setSettings] = useState(null);
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reviewDialog, setReviewDialog] = useState(null);
  const [reviewRemarks, setReviewRemarks] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [wRes, uRes] = await Promise.all([
        apiClient.get('/admin/withdrawals', { params: { status: statusFilter, search } }),
        apiClient.get('/admin/users', { params: { limit: 100 } }),
      ]);
      if (wRes.data?.ok) {
        setRequests(wRes.data.items || []);
        setSettings(wRes.data.settings || null);
      }
      if (uRes.data?.ok) {
        setUsers(uRes.data.items || []);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load withdrawal settings.'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function saveGlobalSettings(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await apiClient.put('/admin/settings', {
        withdrawalGlobalEnabled: settings.withdrawalGlobalEnabled,
        minWithdrawalAmount: Number(settings.minWithdrawalAmount),
        maxWithdrawalAmount: Number(settings.maxWithdrawalAmount),
        dailyWithdrawalLimit: Number(settings.dailyWithdrawalLimit),
      });
      if (data?.ok) {
        setSuccess('Simulated withdrawal settings saved and logged.');
        await refreshMe({ silent: true });
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save withdrawal settings.'));
    } finally {
      setSaving(false);
    }
  }

  async function toggleUserWithdrawal(u) {
    setError('');
    try {
      await apiClient.post(`/admin/users/${u.id}/permissions`, {
        withdrawalEnabled: !u.withdrawalEnabled,
      });
      setUsers((prev) =>
        prev.map((row) =>
          row.id === u.id ? { ...row, withdrawalEnabled: !row.withdrawalEnabled } : row
        )
      );
      setSuccess(`Updated simulated withdrawal permission for ${u.username}.`);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to update user permission.'));
    }
  }

  async function executeReviewStatus() {
    if (!reviewDialog) return;
    setSaving(true);
    setError('');
    try {
      const { data } = await apiClient.patch(`/admin/withdrawals/${reviewDialog.item.id}/status`, {
        status: reviewDialog.nextStatus,
        adminRemarks: reviewRemarks.trim(),
      });
      if (data?.ok) {
        setSuccess(`Simulated request ${reviewDialog.item.id} marked as ${reviewDialog.nextStatus}.`);
        setReviewDialog(null);
        setReviewRemarks('');
        loadData();
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to update request status.'));
      setReviewDialog(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sz-adm-page">
      <div className="sz-adm-page-head">
        <div>
          <h1 className="sz-adm-page-title">Simulated Withdrawal Settings</h1>
          <p className="sz-adm-page-sub">
            Configure virtual-credit-only test withdrawal permissions, limits, and simulated request statuses. No real money or bank integrations.
          </p>
        </div>
        <button type="button" className="sz-adm-btn sz-adm-btn-outline sz-adm-btn-sm" onClick={loadData}>
          <FiRefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {error && <div className="alert alert-danger py-2 px-3 small mb-3">{error}</div>}
      {success && <div className="alert alert-success py-2 px-3 small mb-3">{success}</div>}

      {/* Global Simulated Withdrawal Rules */}
      {settings && (
        <div className="sz-adm-panel mb-3">
          <div className="sz-adm-panel-head">
            <h2 className="sz-adm-panel-title">Global Simulated Withdrawal Rules</h2>
          </div>
          <div className="sz-adm-panel-body">
            <form onSubmit={saveGlobalSettings} className="row g-3 align-items-end">
              <div className="col-md-3">
                <label className="form-check form-switch mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={Boolean(settings.withdrawalGlobalEnabled)}
                    onChange={(e) => setSettings((p) => ({ ...p, withdrawalGlobalEnabled: e.target.checked }))}
                  />
                  <span className="form-check-label fw-semibold small text-dark">
                    Global Sim. Withdrawal {settings.withdrawalGlobalEnabled ? 'ON' : 'OFF'}
                  </span>
                </label>
              </div>
              <div className="col-md-3">
                <label className="sz-adm-label">Minimum Virtual Amount</label>
                <input
                  type="number"
                  min={1}
                  className="form-control form-control-sm sz-adm-input"
                  value={settings.minWithdrawalAmount}
                  onChange={(e) => setSettings((p) => ({ ...p, minWithdrawalAmount: e.target.value }))}
                  required
                />
              </div>
              <div className="col-md-3">
                <label className="sz-adm-label">Maximum Virtual Amount</label>
                <input
                  type="number"
                  min={1}
                  className="form-control form-control-sm sz-adm-input"
                  value={settings.maxWithdrawalAmount}
                  onChange={(e) => setSettings((p) => ({ ...p, maxWithdrawalAmount: e.target.value }))}
                  required
                />
              </div>
              <div className="col-md-3">
                <label className="sz-adm-label">Daily Virtual Limit</label>
                <input
                  type="number"
                  min={1}
                  className="form-control form-control-sm sz-adm-input"
                  value={settings.dailyWithdrawalLimit}
                  onChange={(e) => setSettings((p) => ({ ...p, dailyWithdrawalLimit: e.target.value }))}
                  required
                />
              </div>
              <div className="col-12">
                <button type="submit" className="sz-adm-btn sz-adm-btn-primary sz-adm-btn-sm" disabled={saving}>
                  <FiSave size={14} />
                  <span>{saving ? 'Saving...' : 'Save Global Settings'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Simulated Request History */}
      <div className="sz-adm-panel mb-3">
        <div className="sz-adm-panel-head">
          <h2 className="sz-adm-panel-title">Simulated Request History ({requests.length})</h2>
          <div className="d-flex gap-2 flex-wrap">
            <input
              type="text"
              className="form-control form-control-sm sz-adm-input"
              style={{ width: 190 }}
              placeholder="Search request or user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="form-select form-select-sm sz-adm-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="sz-adm-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>User</th>
                <th className="text-end">Virtual Credits</th>
                <th>Status</th>
                <th>Remarks</th>
                <th>Date</th>
                <th className="text-end">Test Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-4 text-secondary">Loading requests...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-4 text-secondary">No simulated withdrawal requests found.</td></tr>
              ) : (
                requests.map((w) => (
                  <tr key={w.id}>
                    <td className="font-monospace small">{w.id}</td>
                    <td className="fw-semibold text-dark">{w.username}</td>
                    <td className="text-end sz-adm-num fw-bold">{Number(w.amount).toLocaleString()}</td>
                    <td>
                      <span
                        className={`sz-adm-status is-${
                          w.status === 'approved' ? 'active' : w.status === 'pending' ? 'pending' : 'blocked'
                        } text-capitalize`}
                      >
                        {w.status}
                      </span>
                    </td>
                    <td className="small">{w.adminRemarks || w.remarks}</td>
                    <td className="text-nowrap small text-secondary">{formatDateTimeShort(w.createdAt)}</td>
                    <td className="text-end text-nowrap">
                      {w.status === 'pending' ? (
                        <div className="d-inline-flex gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success py-0 px-2"
                            onClick={() => {
                              setReviewRemarks('');
                              setReviewDialog({ item: w, nextStatus: 'approved' });
                            }}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger py-0 px-2"
                            onClick={() => {
                              setReviewRemarks('');
                              setReviewDialog({ item: w, nextStatus: 'rejected' });
                            }}
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary py-0 px-2"
                            onClick={() => {
                              setReviewRemarks('');
                              setReviewDialog({ item: w, nextStatus: 'cancelled' });
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span className="small text-secondary">Reviewed by {w.reviewedBy || 'admin'}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Individual User Simulated Withdrawal Toggles */}
      <div className="sz-adm-panel">
        <div className="sz-adm-panel-head">
          <h2 className="sz-adm-panel-title">Individual User Simulated Withdrawal Permissions</h2>
        </div>
        <div className="table-responsive">
          <table className="sz-adm-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Full Name</th>
                <th>Account Status</th>
                <th>Simulated Withdrawal</th>
                <th className="text-end">Toggle</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="fw-semibold text-dark">{u.username}</td>
                  <td>{u.fullName}</td>
                  <td><span className={`sz-adm-status is-${u.status}`}>{u.status}</span></td>
                  <td className="small fw-semibold">
                    <span className={u.withdrawalEnabled ? 'text-success' : 'text-secondary'}>
                      {u.withdrawalEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="text-end">
                    <button
                      type="button"
                      className="sz-adm-btn sz-adm-btn-outline sz-adm-btn-sm"
                      onClick={() => toggleUserWithdrawal(u)}
                    >
                      {u.withdrawalEnabled ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AdminConfirmDialog
        open={Boolean(reviewDialog)}
        title={reviewDialog ? `Mark Simulated Request ${reviewDialog.nextStatus.toUpperCase()}` : ''}
        message={
          reviewDialog?.nextStatus === 'approved'
            ? 'Marks this simulated virtual withdrawal test request as approved in the ledger.'
            : 'Marks this simulated request as rejected/cancelled and refunds reserved virtual credits to the user.'
        }
        variant={reviewDialog?.nextStatus === 'approved' ? 'success' : 'danger'}
        confirmLabel={`Confirm ${reviewDialog?.nextStatus || ''}`}
        loading={saving}
        onConfirm={executeReviewStatus}
        onClose={() => setReviewDialog(null)}
      >
        <div className="mt-2">
          <label className="sz-adm-label">Admin Remarks</label>
          <input
            type="text"
            className="form-control form-control-sm sz-adm-input"
            value={reviewRemarks}
            onChange={(e) => setReviewRemarks(e.target.value)}
            placeholder="Optional review note"
          />
        </div>
      </AdminConfirmDialog>
    </div>
  );
}

/* ============================================================================
   2. USER & GLOBAL TRANSFER PERMISSIONS (/admin/permissions)
   ============================================================================ */
export function AdminPermissionsPage() {
  const { refreshMe } = useAuth();
  const [settings, setSettings] = useState(null);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sRes, uRes] = await Promise.all([
        apiClient.get('/admin/settings'),
        apiClient.get('/admin/users', { params: { search, limit: 100 } }),
      ]);
      if (sRes.data?.ok) setSettings(sRes.data.settings);
      if (uRes.data?.ok) setUsers(uRes.data.items || []);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load permissions.'));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function saveTransferControls(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await apiClient.put('/admin/settings', {
        fundTransferGlobalEnabled: settings.fundTransferGlobalEnabled,
        requireTransactionPassword: settings.requireTransactionPassword,
        minTransferAmount: Number(settings.minTransferAmount),
        maxTransferAmount: Number(settings.maxTransferAmount),
        dailyTransferLimit: Number(settings.dailyTransferLimit),
      });
      if (data?.ok) {
        setSettings(data.settings);
        setSuccess('Global virtual fund transfer permissions updated.');
        await refreshMe({ silent: true });
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to save transfer permissions.'));
    } finally {
      setSaving(false);
    }
  }

  async function toggleUserPerm(u, field) {
    setError('');
    try {
      const nextVal = !u[field];
      await apiClient.post(`/admin/users/${u.id}/permissions`, { [field]: nextVal });
      setUsers((prev) => prev.map((row) => (row.id === u.id ? { ...row, [field]: nextVal } : row)));
      setSuccess(`Updated ${field === 'fundTransferEnabled' ? 'Fund Transfer' : 'Simulated Withdrawal'} for ${u.username}.`);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to toggle permission.'));
    }
  }

  return (
    <div className="sz-adm-page">
      <div className="sz-adm-page-head">
        <div>
          <h1 className="sz-adm-page-title">User Permissions &amp; Transfer Controls</h1>
          <p className="sz-adm-page-sub">
            Manage global virtual fund transfer switches, transaction password policy, limits, and per-user privileges.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 px-3 small mb-3">{error}</div>}
      {success && <div className="alert alert-success py-2 px-3 small mb-3">{success}</div>}

      {settings && (
        <div className="sz-adm-panel mb-3">
          <div className="sz-adm-panel-head">
            <h2 className="sz-adm-panel-title">Global Fund Transfer Policy</h2>
          </div>
          <div className="sz-adm-panel-body">
            <form onSubmit={saveTransferControls} className="row g-3">
              <div className="col-md-6 d-flex flex-column gap-2">
                <label className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={Boolean(settings.fundTransferGlobalEnabled)}
                    onChange={(e) => setSettings((p) => ({ ...p, fundTransferGlobalEnabled: e.target.checked }))}
                  />
                  <span className="form-check-label fw-semibold small text-dark">
                    Global Virtual Fund Transfer ({settings.fundTransferGlobalEnabled ? 'ON' : 'OFF'})
                  </span>
                </label>
                <label className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={Boolean(settings.requireTransactionPassword)}
                    onChange={(e) => setSettings((p) => ({ ...p, requireTransactionPassword: e.target.checked }))}
                  />
                  <span className="form-check-label fw-semibold small text-dark">
                    Require Transaction Password for User Transfers
                  </span>
                </label>
              </div>
              <div className="col-md-2">
                <label className="sz-adm-label">Min Transfer</label>
                <input
                  type="number"
                  min={1}
                  className="form-control form-control-sm sz-adm-input"
                  value={settings.minTransferAmount}
                  onChange={(e) => setSettings((p) => ({ ...p, minTransferAmount: e.target.value }))}
                  required
                />
              </div>
              <div className="col-md-2">
                <label className="sz-adm-label">Max Transfer</label>
                <input
                  type="number"
                  min={1}
                  className="form-control form-control-sm sz-adm-input"
                  value={settings.maxTransferAmount}
                  onChange={(e) => setSettings((p) => ({ ...p, maxTransferAmount: e.target.value }))}
                  required
                />
              </div>
              <div className="col-md-2">
                <label className="sz-adm-label">Daily Limit</label>
                <input
                  type="number"
                  min={1}
                  className="form-control form-control-sm sz-adm-input"
                  value={settings.dailyTransferLimit}
                  onChange={(e) => setSettings((p) => ({ ...p, dailyTransferLimit: e.target.value }))}
                  required
                />
              </div>
              <div className="col-12">
                <button type="submit" className="sz-adm-btn sz-adm-btn-primary sz-adm-btn-sm" disabled={saving}>
                  <FiSave size={14} />
                  <span>{saving ? 'Saving...' : 'Save Global Policy'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="sz-adm-panel">
        <div className="sz-adm-panel-head">
          <h2 className="sz-adm-panel-title">Individual User Permissions</h2>
          <div className="sz-adm-search-box" style={{ maxWidth: 260 }}>
            <FiSearch size={14} className="text-secondary" />
            <input
              type="text"
              placeholder="Filter users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="table-responsive">
          <table className="sz-adm-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Username</th>
                <th>Full Name</th>
                <th>Account Status</th>
                <th>Fund Transfer</th>
                <th>Simulated Withdrawal</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-4 text-secondary">Loading user permissions...</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td className="font-monospace small">{u.id}</td>
                    <td className="fw-semibold text-dark">{u.username}</td>
                    <td>{u.fullName}</td>
                    <td><span className={`sz-adm-status is-${u.status}`}>{u.status}</span></td>
                    <td>
                      <button
                        type="button"
                        className={`btn btn-sm py-0 px-2 ${u.fundTransferEnabled ? 'btn-outline-success' : 'btn-outline-secondary'}`}
                        onClick={() => toggleUserPerm(u, 'fundTransferEnabled')}
                      >
                        {u.fundTransferEnabled ? 'Enabled (Click to Disable)' : 'Disabled (Click to Enable)'}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`btn btn-sm py-0 px-2 ${u.withdrawalEnabled ? 'btn-outline-success' : 'btn-outline-secondary'}`}
                        onClick={() => toggleUserPerm(u, 'withdrawalEnabled')}
                      >
                        {u.withdrawalEnabled ? 'Enabled (Click to Disable)' : 'Disabled (Click to Enable)'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   3. SET BUTTON VALUES (/admin/button-values)
   ============================================================================ */
export function AdminButtonValuesPage() {
  const { refreshMe } = useAuth();
  const { updateButtonValues } = useArena();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    apiClient
      .get('/admin/settings')
      .then((res) => {
        if (res.data?.ok) {
          setRows((res.data.settings.buttonValues || []).map((b) => ({ label: b.label, value: String(b.value) })));
        }
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Failed to load preset buttons.')))
      .finally(() => setLoading(false));
  }, []);

  function updateRow(idx, field, val) {
    setSuccess('');
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)));
  }

  function addRow() {
    if (rows.length >= 16) return;
    setRows((prev) => [...prev, { label: '10K', value: '10000' }]);
  }

  function removeRow(idx) {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function moveRow(idx, dir) {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= rows.length) return;
    setRows((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(idx, 1);
      copy.splice(nextIdx, 0, moved);
      return copy;
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const payload = rows.map((r) => ({ label: r.label.trim(), value: Number(r.value) }));
      const { data } = await apiClient.put('/admin/button-values', { buttonValues: payload });
      if (data?.ok) {
        updateButtonValues(data.buttonValues);
        await refreshMe({ silent: true });
        setSuccess('Virtual credit stake preset buttons updated and synchronized with the SportZone betting interface.');
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save preset button values.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sz-adm-page">
      <div className="sz-adm-page-head">
        <div>
          <h1 className="sz-adm-page-title">Set Button Values</h1>
          <p className="sz-adm-page-sub">
            Add, edit, remove, and reorder quick-stake virtual credit preset buttons synced across the demo betting slip.
          </p>
        </div>
        <button type="button" className="sz-adm-btn sz-adm-btn-outline sz-adm-btn-sm" onClick={addRow} disabled={rows.length >= 16}>
          <FiPlus size={14} />
          <span>Add Preset</span>
        </button>
      </div>

      {error && <div className="alert alert-danger py-2 px-3 small mb-3">{error}</div>}
      {success && (
        <div className="alert alert-success py-2 px-3 small mb-3 d-flex align-items-center gap-2">
          <FiCheckCircle size={15} />
          <span>{success}</span>
        </div>
      )}

      <div className="sz-adm-panel" style={{ maxWidth: 680 }}>
        <div className="sz-adm-panel-head">
          <h2 className="sz-adm-panel-title">Stake Preset Configuration ({rows.length}/16)</h2>
        </div>
        <div className="sz-adm-panel-body">
          {loading ? (
            <div className="py-4 text-center text-secondary small">Loading presets...</div>
          ) : (
            <form onSubmit={handleSave} className="d-flex flex-column gap-2">
              <div className="row g-2 small fw-semibold text-secondary px-1">
                <div className="col-4">Button Label</div>
                <div className="col-5">Virtual Credit Value</div>
                <div className="col-3 text-end">Order / Remove</div>
              </div>
              {rows.map((row, idx) => (
                <div className="row g-2 align-items-center" key={idx}>
                  <div className="col-4">
                    <input
                      type="text"
                      className="form-control form-control-sm sz-adm-input"
                      value={row.label}
                      maxLength={12}
                      onChange={(e) => updateRow(idx, 'label', e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-5">
                    <input
                      type="number"
                      min={10}
                      max={10000000}
                      className="form-control form-control-sm sz-adm-input sz-adm-num"
                      value={row.value}
                      onChange={(e) => updateRow(idx, 'value', e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-3 d-flex justify-content-end gap-1">
                    <button type="button" className="sz-adm-icon-btn" disabled={idx === 0} onClick={() => moveRow(idx, -1)} aria-label="Move up">
                      <FiArrowUp size={14} />
                    </button>
                    <button type="button" className="sz-adm-icon-btn" disabled={idx === rows.length - 1} onClick={() => moveRow(idx, 1)} aria-label="Move down">
                      <FiArrowDown size={14} />
                    </button>
                    <button type="button" className="sz-adm-icon-btn text-danger" disabled={rows.length <= 1} onClick={() => removeRow(idx)} aria-label="Remove preset">
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              <div className="pt-3">
                <button type="submit" className="sz-adm-btn sz-adm-btn-primary" disabled={saving}>
                  <FiSave size={15} />
                  <span>{saving ? 'Saving...' : 'Save & Sync Presets'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   4. GENERAL SETTINGS (/admin/settings)
   ============================================================================ */
export function AdminGeneralSettingsPage() {
  const { refreshMe } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    apiClient
      .get('/admin/settings')
      .then((res) => {
        if (res.data?.ok) setSettings(res.data.settings);
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Unable to load settings.')))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await apiClient.put('/admin/settings', {
        platformName: settings.platformName,
        announcementText: settings.announcementText,
        welcomeBonusCoins: Number(settings.welcomeBonusCoins),
        allowSelfRegistration: Boolean(settings.allowSelfRegistration),
      });
      if (data?.ok) {
        setSettings(data.settings);
        setSuccess('General settings saved and synchronized.');
        await refreshMe({ silent: true });
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save general settings.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sz-adm-page">
      <div className="sz-adm-page-head">
        <div>
          <h1 className="sz-adm-page-title">General Settings</h1>
          <p className="sz-adm-page-sub">
            Configure platform announcement ticker, default welcome virtual credits, and self-registration policy.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 px-3 small mb-3">{error}</div>}
      {success && <div className="alert alert-success py-2 px-3 small mb-3">{success}</div>}

      <div className="sz-adm-panel" style={{ maxWidth: 680 }}>
        <div className="sz-adm-panel-head">
          <h2 className="sz-adm-panel-title">Platform Configuration</h2>
        </div>
        <div className="sz-adm-panel-body">
          {loading || !settings ? (
            <div className="py-4 text-center text-secondary small">Loading settings...</div>
          ) : (
            <form onSubmit={handleSave} className="d-flex flex-column gap-3">
              <div>
                <label className="sz-adm-label">Platform Name</label>
                <input
                  type="text"
                  className="form-control form-control-sm sz-adm-input"
                  value={settings.platformName}
                  onChange={(e) => setSettings((p) => ({ ...p, platformName: e.target.value }))}
                  maxLength={40}
                  required
                />
              </div>
              <div>
                <label className="sz-adm-label">Header Announcement Banner Text</label>
                <input
                  type="text"
                  className="form-control form-control-sm sz-adm-input"
                  value={settings.announcementText}
                  onChange={(e) => setSettings((p) => ({ ...p, announcementText: e.target.value }))}
                  maxLength={180}
                  required
                />
              </div>
              <div>
                <label className="sz-adm-label">New Registration Welcome Virtual Balance</label>
                <input
                  type="number"
                  min={0}
                  max={1000000}
                  className="form-control form-control-sm sz-adm-input"
                  value={settings.welcomeBonusCoins}
                  onChange={(e) => setSettings((p) => ({ ...p, welcomeBonusCoins: e.target.value }))}
                  required
                />
              </div>
              <label className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={Boolean(settings.allowSelfRegistration)}
                  onChange={(e) => setSettings((p) => ({ ...p, allowSelfRegistration: e.target.checked }))}
                />
                <span className="form-check-label fw-semibold small text-dark">
                  Allow Public Demo User Self-Registration
                </span>
              </label>

              <div className="pt-2">
                <button type="submit" className="sz-adm-btn sz-adm-btn-primary" disabled={saving}>
                  <FiSave size={15} />
                  <span>{saving ? 'Saving...' : 'Save Settings'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   5. ADMIN CHANGE PASSWORD (/admin/change-password)
   ============================================================================ */
export function AdminChangePasswordPage() {
  const { user, envPasscodeActive, updateUserState } = useAuth();
  const [mode, setMode] = useState('login');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
        setSuccess(data.message || 'Password updated.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        if (data.user) updateUserState(data.user);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Password update failed.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sz-adm-page">
      <div className="sz-adm-page-head">
        <div>
          <h1 className="sz-adm-page-title">Change Administrator Password</h1>
          <p className="sz-adm-page-sub">
            Rotate administrator login or transaction credentials. Changing login password revokes all other active sessions.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 px-3 small mb-3">{error}</div>}
      {success && <div className="alert alert-success py-2 px-3 small mb-3">{success}</div>}

      <div className="sz-adm-panel" style={{ maxWidth: 520 }}>
        <div className="sz-adm-panel-head">
          <div className="sz-adm-segmented">
            <button type="button" className={mode === 'login' ? 'is-active' : ''} onClick={() => setMode('login')}>
              Login Password
            </button>
            <button type="button" className={mode === 'transaction' ? 'is-active' : ''} onClick={() => setMode('transaction')}>
              Transaction Password
            </button>
          </div>
        </div>
        <div className="sz-adm-panel-body">
          {mode === 'login' && envPasscodeActive ? (
            <div className="small text-secondary">
              Administrator login password is currently controlled by the server{' '}
              <code>ADMIN_PASSCODE</code> environment variable. Update it in Settings → Secrets.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
              <div>
                <label className="sz-adm-label">
                  Current {mode === 'login' ? 'Login Password' : user?.hasTransactionPassword ? 'Transaction or Login Password' : 'Login Password'}
                </label>
                <input
                  type="password"
                  className="form-control form-control-sm sz-adm-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="sz-adm-label">
                  New {mode === 'login' ? 'Login Password (min 6 chars)' : 'Transaction Password (min 4 chars)'}
                </label>
                <input
                  type="password"
                  minLength={mode === 'login' ? 6 : 4}
                  className="form-control form-control-sm sz-adm-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="sz-adm-label">Confirm New Password</label>
                <input
                  type="password"
                  minLength={mode === 'login' ? 6 : 4}
                  className="form-control form-control-sm sz-adm-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <button type="submit" className="sz-adm-btn sz-adm-btn-primary" disabled={saving}>
                  <FiKey size={14} />
                  <span>{saving ? 'Updating...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
