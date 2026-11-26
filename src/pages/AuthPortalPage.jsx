import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiKey, FiShield, FiUserPlus } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

export default function AuthPortalPage({ adminMode = false }) {
  const {
    user,
    isAdmin,
    bootstrapRequired,
    envPasscodeActive,
    settings,
    blockedNotice,
    clearBlockedNotice,
    login,
    register,
    bootstrapAdmin,
  } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState(bootstrapRequired ? 'claim' : 'signin');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Sign in state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Register state
  const [regForm, setRegForm] = useState({
    fullName: '',
    username: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    transactionPassword: '',
  });

  // First-run admin claim state
  const [claimForm, setClaimForm] = useState({
    username: 'admin',
    fullName: 'SportZone Administrator',
    email: 'admin@sportzone.local',
    mobile: '+91 90000 00001',
    password: '',
    confirmPassword: '',
    transactionPassword: '',
  });

  useEffect(() => {
    if (bootstrapRequired) {
      setTab('claim');
    } else if (tab === 'claim') {
      setTab('signin');
    }
  }, [bootstrapRequired, tab]);

  useEffect(() => {
    if (user && !adminMode) {
      navigate(isAdmin ? '/admin/dashboard' : '/', { replace: true });
    }
  }, [user, isAdmin, adminMode, navigate]);

  async function handleSignIn(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    clearBlockedNotice();
    setSubmitting(true);
    const res = await login({ identifier, password });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error || 'Sign in failed.');
      return;
    }
    if (res.user?.role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    const res = await register(regForm);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error || 'Registration failed.');
      return;
    }
    navigate('/', { replace: true });
  }

  async function handleBootstrapAdmin(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    const res = await bootstrapAdmin(claimForm);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error || 'Admin setup failed.');
      return;
    }
    setSuccess('Administrator account claimed and secured. Redirecting...');
    navigate('/admin/dashboard', { replace: true });
  }

  return (
    <div className="sz-adm-auth-page">
      <div className="sz-adm-auth-card">
        <div className="sz-adm-auth-brand">
          <img
            src="/assets/aistudio/image_9f2c9e43.png"
            alt="SPORTZONE"
            className="sz-adm-auth-logo"
          />
          <Link to="/" className="sz-adm-auth-back">
            <FiArrowLeft size={14} />
            <span>Back to Website</span>
          </Link>
        </div>

        <div className="sz-adm-auth-head">
          <h1 className="sz-adm-auth-title">
            {tab === 'claim'
              ? 'First-Run Administrator Setup'
              : tab === 'register'
              ? 'Create Demo Account'
              : adminMode
              ? 'Administrator Sign In'
              : 'Sign In to SportZone'}
          </h1>
          <p className="sz-adm-auth-sub">
            {tab === 'claim'
              ? 'Set your initial administrator credentials. Passwords are hashed on the server and this one-time setup locks immediately after claiming.'
              : tab === 'register'
              ? 'Register a virtual-credit demo member account to place predictions and transfer virtual credits.'
              : envPasscodeActive
              ? 'Sign in with your account credentials. Admin login verifies against your configured server passcode.'
              : 'Sign in with your registered SportZone username or email.'}
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="sz-adm-auth-tabs" role="tablist">
          {bootstrapRequired && (
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'claim'}
              className={`sz-adm-auth-tab ${tab === 'claim' ? 'is-active' : ''}`}
              onClick={() => {
                setTab('claim');
                setError('');
              }}
            >
              <FiShield size={14} />
              <span>Claim Admin</span>
            </button>
          )}
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'signin'}
            className={`sz-adm-auth-tab ${tab === 'signin' ? 'is-active' : ''}`}
            onClick={() => {
              setTab('signin');
              setError('');
            }}
          >
            <FiKey size={14} />
            <span>Sign In</span>
          </button>
          {!adminMode && settings?.allowSelfRegistration !== false && (
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'register'}
              className={`sz-adm-auth-tab ${tab === 'register' ? 'is-active' : ''}`}
              onClick={() => {
                setTab('register');
                setError('');
              }}
            >
              <FiUserPlus size={14} />
              <span>Register User</span>
            </button>
          )}
        </div>

        {(error || blockedNotice) && (
          <div className="alert alert-danger py-2 px-3 small mb-3" role="alert">
            {error || blockedNotice}
          </div>
        )}
        {success && (
          <div className="alert alert-success py-2 px-3 small mb-3" role="status">
            {success}
          </div>
        )}

        {tab === 'claim' && bootstrapRequired && (
          <form onSubmit={handleBootstrapAdmin} className="d-flex flex-column gap-3">
            <div className="row g-2">
              <div className="col-sm-6">
                <label className="sz-adm-label">Admin Username</label>
                <input
                  type="text"
                  className="form-control form-control-sm sz-adm-input"
                  value={claimForm.username}
                  onChange={(e) => setClaimForm((p) => ({ ...p, username: e.target.value }))}
                  required
                />
              </div>
              <div className="col-sm-6">
                <label className="sz-adm-label">Full Name</label>
                <input
                  type="text"
                  className="form-control form-control-sm sz-adm-input"
                  value={claimForm.fullName}
                  onChange={(e) => setClaimForm((p) => ({ ...p, fullName: e.target.value }))}
                  required
                />
              </div>
              <div className="col-sm-6">
                <label className="sz-adm-label">Email Address</label>
                <input
                  type="email"
                  className="form-control form-control-sm sz-adm-input"
                  value={claimForm.email}
                  onChange={(e) => setClaimForm((p) => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>
              <div className="col-sm-6">
                <label className="sz-adm-label">Mobile Number</label>
                <input
                  type="text"
                  className="form-control form-control-sm sz-adm-input"
                  value={claimForm.mobile}
                  onChange={(e) => setClaimForm((p) => ({ ...p, mobile: e.target.value }))}
                  required
                />
              </div>
              <div className="col-sm-6">
                <label className="sz-adm-label">Admin Password (min 6 chars)</label>
                <input
                  type="password"
                  className="form-control form-control-sm sz-adm-input"
                  value={claimForm.password}
                  onChange={(e) => setClaimForm((p) => ({ ...p, password: e.target.value }))}
                  minLength={6}
                  required
                />
              </div>
              <div className="col-sm-6">
                <label className="sz-adm-label">Confirm Password</label>
                <input
                  type="password"
                  className="form-control form-control-sm sz-adm-input"
                  value={claimForm.confirmPassword}
                  onChange={(e) => setClaimForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  minLength={6}
                  required
                />
              </div>
              <div className="col-12">
                <label className="sz-adm-label">Transaction Password (optional, defaults to login password)</label>
                <input
                  type="password"
                  className="form-control form-control-sm sz-adm-input"
                  value={claimForm.transactionPassword}
                  onChange={(e) => setClaimForm((p) => ({ ...p, transactionPassword: e.target.value }))}
                  placeholder="Min 4 characters"
                />
              </div>
            </div>
            <button type="submit" className="sz-adm-btn sz-adm-btn-primary w-100" disabled={submitting}>
              {submitting ? 'Securing Admin Account...' : 'Claim Administrator Access'}
            </button>
          </form>
        )}

        {tab === 'signin' && (
          <form onSubmit={handleSignIn} className="d-flex flex-column gap-3">
            <div>
              <label className="sz-adm-label">Username or Email</label>
              <input
                type="text"
                className="form-control form-control-sm sz-adm-input"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. admin or username"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="sz-adm-label">Password</label>
              <input
                type="password"
                className="form-control form-control-sm sz-adm-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                required
              />
            </div>
            <button type="submit" className="sz-adm-btn sz-adm-btn-primary w-100" disabled={submitting}>
              {submitting ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        )}

        {tab === 'register' && (
          <form onSubmit={handleRegister} className="d-flex flex-column gap-3">
            <div className="row g-2">
              <div className="col-sm-6">
                <label className="sz-adm-label">Full Name</label>
                <input
                  type="text"
                  className="form-control form-control-sm sz-adm-input"
                  value={regForm.fullName}
                  onChange={(e) => setRegForm((p) => ({ ...p, fullName: e.target.value }))}
                  required
                />
              </div>
              <div className="col-sm-6">
                <label className="sz-adm-label">Username</label>
                <input
                  type="text"
                  className="form-control form-control-sm sz-adm-input"
                  value={regForm.username}
                  onChange={(e) => setRegForm((p) => ({ ...p, username: e.target.value }))}
                  placeholder="3-32 chars"
                  required
                />
              </div>
              <div className="col-sm-6">
                <label className="sz-adm-label">Email Address</label>
                <input
                  type="email"
                  className="form-control form-control-sm sz-adm-input"
                  value={regForm.email}
                  onChange={(e) => setRegForm((p) => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>
              <div className="col-sm-6">
                <label className="sz-adm-label">Mobile Number</label>
                <input
                  type="text"
                  className="form-control form-control-sm sz-adm-input"
                  value={regForm.mobile}
                  onChange={(e) => setRegForm((p) => ({ ...p, mobile: e.target.value }))}
                  required
                />
              </div>
              <div className="col-sm-6">
                <label className="sz-adm-label">Password</label>
                <input
                  type="password"
                  className="form-control form-control-sm sz-adm-input"
                  value={regForm.password}
                  onChange={(e) => setRegForm((p) => ({ ...p, password: e.target.value }))}
                  minLength={6}
                  required
                />
              </div>
              <div className="col-sm-6">
                <label className="sz-adm-label">Confirm Password</label>
                <input
                  type="password"
                  className="form-control form-control-sm sz-adm-input"
                  value={regForm.confirmPassword}
                  onChange={(e) => setRegForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  minLength={6}
                  required
                />
              </div>
              <div className="col-12">
                <label className="sz-adm-label">Transaction Password (for Virtual Transfers)</label>
                <input
                  type="password"
                  className="form-control form-control-sm sz-adm-input"
                  value={regForm.transactionPassword}
                  onChange={(e) => setRegForm((p) => ({ ...p, transactionPassword: e.target.value }))}
                  placeholder="Min 4 characters"
                  minLength={4}
                  required
                />
              </div>
            </div>
            <button type="submit" className="sz-adm-btn sz-adm-btn-primary w-100" disabled={submitting}>
              {submitting ? 'Creating Account...' : 'Create Demo User Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
