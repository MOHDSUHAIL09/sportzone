import React from 'react';
import { FiAlertCircle, FiInbox, FiRefreshCw, FiInfo, FiLock } from 'react-icons/fi';

export function LoadingSkeletonGrid({ count = 6, colClass = 'col-md-6 col-xl-4', height = 148 }) {
  return (
    <div className="row g-3">
      {Array.from({ length: count }).map((_, idx) => (
        <div className={colClass} key={idx}>
          <div className="sz-card" style={{ minHeight: height }}>
            <div className="sz-skeleton mb-3" style={{ height: 14, width: '58%' }} />
            <div className="sz-skeleton mb-2" style={{ height: 22, width: '88%' }} />
            <div className="sz-skeleton mb-3" style={{ height: 22, width: '80%' }} />
            <div className="sz-skeleton" style={{ height: 14, width: '42%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LoadingTableSkeleton({ rows = 6 }) {
  return (
    <div className="sz-card">
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="d-flex align-items-center justify-content-between py-2"
          style={{ borderBottom: idx < rows - 1 ? '1px solid var(--sz-border)' : 'none' }}
        >
          <div className="sz-skeleton" style={{ height: 16, width: '44%' }} />
          <div className="sz-skeleton" style={{ height: 16, width: '24%' }} />
        </div>
      ))}
    </div>
  );
}

export function ApiErrorCard({ error, onRetry, title }) {
  const isPlan = error?.isPlanRestricted;
  const isRate = error?.isRateLimited;
  const heading =
    title ||
    (isPlan
      ? 'Endpoint Not Included in Current Plan'
      : isRate
      ? 'API Rate Limit Reached'
      : 'Unable to Load SportsAPI Data');

  return (
    <div className="sz-card d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
      <div className="d-flex align-items-start gap-3">
        <div className="mt-1" style={{ color: isPlan ? 'var(--sz-warning)' : 'var(--sz-danger)' }}>
          {isPlan ? <FiLock size={20} /> : <FiAlertCircle size={20} />}
        </div>
        <div>
          <div className="fw-semibold text-white mb-1">{heading}</div>
          <div className="sz-muted small">
            {error?.message || 'An unexpected error occurred while contacting SportsAPI.'}
            {error?.code ? ` (${error.code})` : ''}
          </div>
        </div>
      </div>
      {onRetry && !isPlan && (
        <button type="button" className="sz-btn sz-btn-outline sz-btn-sm" onClick={onRetry}>
          <FiRefreshCw size={14} />
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyStateCard({ title, message, actionLabel, onAction }) {
  return (
    <div className="sz-card text-center py-5">
      <div className="mb-3 sz-muted">
        <FiInbox size={28} />
      </div>
      <h3 className="h5 text-white fw-semibold mb-2">{title || 'No data available'}</h3>
      <p className="sz-muted mb-0 mx-auto" style={{ maxWidth: 460 }}>
        {message || 'There are no matching records returned by SportsAPI for this selection.'}
      </p>
      {actionLabel && onAction && (
        <div className="mt-3">
          <button type="button" className="sz-btn sz-btn-primary sz-btn-sm" onClick={onAction}>
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}

export function DemoWalletBanner({ compact = false }) {
  return (
    <div className={`sz-notice d-flex align-items-start gap-2 ${compact ? 'py-2 px-3' : ''}`}>
      <FiInfo size={16} className="sz-text-orange flex-shrink-0 mt-1" />
      <div>
        <strong className="text-white">Demo Virtual Coin Mode:</strong> Virtual coins, predictions, and
        profile stats are stored locally in your browser via <code className="text-white">localStorage</code> for
        demonstration purposes only — not a real-money or production wallet. Match results are verified
        against live SportsAPI data.
      </div>
    </div>
  );
}
