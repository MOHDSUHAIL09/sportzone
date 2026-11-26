import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiLock } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import AuthPortalPage from '../../pages/AuthPortalPage';

export default function AdminRouteGuard({ children }) {
  const { loading, isAuthenticated, isAdmin, user, enterAdminSession } = useAuth();
  const [autoFailed, setAutoFailed] = useState(false);
  const enteredRef = useRef(false);

  useEffect(() => {
    if (loading || isAuthenticated || autoFailed || enteredRef.current) return;
    enteredRef.current = true;
    enterAdminSession()
      .then((res) => {
        if (!res?.ok) {
          setAutoFailed(true);
        }
      })
      .catch(() => {
        setAutoFailed(true);
      });
  }, [loading, isAuthenticated, autoFailed, enterAdminSession]);

  // Immediately render Admin Dashboard as soon as admin session is active
  if (isAuthenticated && isAdmin) {
    return children;
  }

  if (loading || (!isAuthenticated && !autoFailed)) {
    return (
      <div className="sz-adm-guard-screen">
        <div className="sz-adm-guard-card">
          <div className="spinner-border spinner-border-sm text-primary mb-3" role="status" />
          <div className="fw-semibold text-dark">Opening SportZone Admin Dashboard...</div>
          <div className="small text-secondary mt-1">Preparing administration workspace</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPortalPage adminMode />;
  }

  if (!isAdmin) {
    return (
      <div className="sz-adm-guard-screen">
        <div className="sz-adm-guard-card">
          <div className="sz-adm-guard-icon">
            <FiLock size={24} />
          </div>
          <h2 className="h5 fw-bold text-dark mb-2">Administrator Access Required</h2>
          <p className="small text-secondary mb-3">
            Signed in as <strong>{user?.username}</strong> (standard user). This administration console
            is restricted to authorized SportZone administrators only.
          </p>
          <div className="d-flex justify-content-center gap-2 flex-wrap">
            <Link to="/" className="sz-adm-btn sz-adm-btn-primary text-decoration-none">
              <FiArrowLeft size={15} />
              Back to Website
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
