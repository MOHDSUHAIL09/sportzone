import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiUserPlus } from 'react-icons/fi';
import apiClient, { getApiErrorMessage } from '../../services/apiClient';

export default function AdminCreateUserPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    mobile: '',
    email: '',
    password: '',
    confirmPassword: '',
    transactionPassword: '',
    initialBalance: '2500',
    status: 'active',
    fundTransferEnabled: true,
    withdrawalEnabled: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdUser, setCreatedUser] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setCreatedUser(null);

    if (form.password !== form.confirmPassword) {
      setError('Password and Confirm Password must match.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await apiClient.post('/admin/users', {
        ...form,
        initialBalance: Number(form.initialBalance || 0),
      });
      if (data?.ok) {
        setCreatedUser(data.user);
        setForm({
          fullName: '',
          username: '',
          mobile: '',
          email: '',
          password: '',
          confirmPassword: '',
          transactionPassword: '',
          initialBalance: '2500',
          status: 'active',
          fundTransferEnabled: true,
          withdrawalEnabled: true,
        });
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to create user account.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="sz-adm-page">
      <div className="sz-adm-page-head">
        <div>
          <h1 className="sz-adm-page-title">Create User Account</h1>
          <p className="sz-adm-page-sub">
            Register a new SportZone demo user with hashed server credentials, initial virtual balance, and permissions.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 px-3 small mb-3">{error}</div>}
      {createdUser && (
        <div className="alert alert-success py-2 px-3 small mb-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <span className="d-inline-flex align-items-center gap-2">
            <FiCheckCircle size={16} />
            Created <strong>{createdUser.username}</strong> ({createdUser.id}) with virtual balance{' '}
            <strong>{Number(createdUser.virtualBalance).toLocaleString()}</strong>.
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline-success"
            onClick={() => navigate('/admin/users')}
          >
            View in All Users
          </button>
        </div>
      )}

      <div className="sz-adm-panel" style={{ maxWidth: 820 }}>
        <div className="sz-adm-panel-head">
          <h2 className="sz-adm-panel-title">Account Details &amp; Permissions</h2>
        </div>
        <div className="sz-adm-panel-body">
          <form onSubmit={handleSubmit} className="row g-3">
            <div className="col-md-6">
              <label className="sz-adm-label">Full Name *</label>
              <input
                type="text"
                className="form-control form-control-sm sz-adm-input"
                value={form.fullName}
                onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="sz-adm-label">Username *</label>
              <input
                type="text"
                className="form-control form-control-sm sz-adm-input"
                value={form.username}
                onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                placeholder="letters, numbers, _, ., -"
                required
              />
            </div>
            <div className="col-md-6">
              <label className="sz-adm-label">Mobile Number *</label>
              <input
                type="text"
                className="form-control form-control-sm sz-adm-input"
                value={form.mobile}
                onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))}
                placeholder="+91 98000 00000"
                required
              />
            </div>
            <div className="col-md-6">
              <label className="sz-adm-label">Email Address *</label>
              <input
                type="email"
                className="form-control form-control-sm sz-adm-input"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="sz-adm-label">Password (min 6 chars) *</label>
              <input
                type="password"
                className="form-control form-control-sm sz-adm-input"
                minLength={6}
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="sz-adm-label">Confirm Password *</label>
              <input
                type="password"
                className="form-control form-control-sm sz-adm-input"
                minLength={6}
                value={form.confirmPassword}
                onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                required
              />
            </div>
            <div className="col-md-4">
              <label className="sz-adm-label">Transaction Password (optional)</label>
              <input
                type="password"
                className="form-control form-control-sm sz-adm-input"
                value={form.transactionPassword}
                onChange={(e) => setForm((p) => ({ ...p, transactionPassword: e.target.value }))}
                placeholder="Min 4 chars"
              />
            </div>
            <div className="col-md-4">
              <label className="sz-adm-label">Initial Virtual Balance</label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="form-control form-control-sm sz-adm-input"
                value={form.initialBalance}
                onChange={(e) => setForm((p) => ({ ...p, initialBalance: e.target.value }))}
                required
              />
            </div>
            <div className="col-md-4">
              <label className="sz-adm-label">Account Status</label>
              <select
                className="form-select form-select-sm sz-adm-input"
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              >
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

            <div className="col-12 d-flex flex-wrap gap-4 pt-1">
              <label className="form-check small">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={form.fundTransferEnabled}
                  onChange={(e) => setForm((p) => ({ ...p, fundTransferEnabled: e.target.checked }))}
                />
                <span className="form-check-label fw-semibold text-dark">Allow Virtual Fund Transfers</span>
              </label>

              <label className="form-check small">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={form.withdrawalEnabled}
                  onChange={(e) => setForm((p) => ({ ...p, withdrawalEnabled: e.target.checked }))}
                />
                <span className="form-check-label fw-semibold text-dark">Allow Simulated Withdrawals</span>
              </label>
            </div>

            <div className="col-12 pt-2 d-flex gap-2">
              <button type="submit" className="sz-adm-btn sz-adm-btn-primary" disabled={submitting}>
                <FiUserPlus size={15} />
                <span>{submitting ? 'Creating Account...' : 'Create User Account'}</span>
              </button>
              <button
                type="button"
                className="sz-adm-btn sz-adm-btn-outline"
                onClick={() => navigate('/admin/users')}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
