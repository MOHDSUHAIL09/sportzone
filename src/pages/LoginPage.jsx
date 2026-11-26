import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiKey, FiLogIn, FiUser } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { hasWebsiteSession, isAdmin, enterDemoSession, login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (hasWebsiteSession) {
      navigate(isAdmin ? '/admin/dashboard' : '/home', { replace: true });
    }
  }, [hasWebsiteSession, isAdmin, navigate]);

  function handleDemoLogin() {
    enterDemoSession();
    navigate('/home', { replace: true });
  }

  async function handleStandardLogin(e) {
    e.preventDefault();
    setNotice('');

    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setNotice('Please enter your username and password, or continue with Demo ID.');
      return;
    }

    // Preserve existing secure owner/registered login if valid credentials are entered,
    // while leaving general public auth integration pending cleanly.
    setSubmitting(true);
    const res = await login({ identifier: trimmedUser, password });
    setSubmitting(false);

    if (res?.ok) {
      if (res.user?.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
      return;
    }

    setNotice('Standard login is pending activation. Please use Login with Demo ID.');
  }

  return (
    <main className="sz-login-screen">
      <div className="sz-login-wrap">
        <div className="sz-login-logo-box">
          <img
            src="/assets/aistudio/image_9f2c9e43.png"
            alt="SPORTZONE"
            className="sz-login-logo"
          />
        </div>

        <section className="sz-login-card" aria-label="Login">
          <h1 className="sz-login-heading">
            <span>Login</span>
            <FiUser size={18} strokeWidth={2.3} aria-hidden="true" />
          </h1>

          <form onSubmit={handleStandardLogin} className="sz-login-form" noValidate>
            <div className="sz-login-field">
              <input
                type="text"
                className="sz-login-input"
                placeholder="Username"
                aria-label="Username"
                autoComplete="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (notice) setNotice('');
                }}
              />
              <span className="sz-login-input-ico" aria-hidden="true">
                <FiUser size={16} />
              </span>
            </div>

            <div className="sz-login-field">
              <input
                type="password"
                className="sz-login-input"
                placeholder="Password"
                aria-label="Password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (notice) setNotice('');
                }}
              />
              <span className="sz-login-input-ico" aria-hidden="true">
                <FiKey size={16} />
              </span>
            </div>

            {notice && (
              <div className="sz-login-notice" role="status">
                {notice}
              </div>
            )}

            <button
              type="submit"
              className="sz-login-btn"
              disabled={submitting}
            >
              <span>{submitting ? 'Logging in...' : 'Login'}</span>
              <FiLogIn size={16} aria-hidden="true" />
            </button>

            <button
              type="button"
              className="sz-login-btn"
              onClick={handleDemoLogin}
            >
              <span>Login with Demo ID</span>
              <FiLogIn size={16} aria-hidden="true" />
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
