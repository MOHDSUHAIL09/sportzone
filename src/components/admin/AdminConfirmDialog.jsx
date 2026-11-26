import React, { useEffect } from 'react';
import { FiAlertTriangle, FiCheckCircle, FiX } from 'react-icons/fi';

/**
 * Responsive confirmation dialog:
 * - Desktop (> 768px): crisp centered modal
 * - Mobile (<= 768px): smooth bottom-sliding sheet with backdrop and safe-area padding
 */
export default function AdminConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary', // 'primary' | 'danger' | 'success'
  loading = false,
  details = [],
  children,
  onConfirm,
  onClose,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(e) {
      if (e.key === 'Escape' && !loading) onClose?.();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, loading, onClose]);

  if (!open) return null;

  const btnClass =
    variant === 'danger'
      ? 'sz-adm-btn sz-adm-btn-danger'
      : variant === 'success'
      ? 'sz-adm-btn sz-adm-btn-success'
      : 'sz-adm-btn sz-adm-btn-primary';

  return (
    <div
      className="sz-adm-dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sz-adm-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose?.();
      }}
    >
      <div className="sz-adm-dialog-panel">
        <div className="sz-adm-dialog-handle d-md-none" aria-hidden="true" />
        <div className="sz-adm-dialog-head">
          <div className="d-flex align-items-center gap-2">
            <span className={`sz-adm-dialog-ico ${variant === 'danger' ? 'is-danger' : 'is-primary'}`}>
              {variant === 'danger' ? (
                <FiAlertTriangle size={17} />
              ) : (
                <FiCheckCircle size={17} />
              )}
            </span>
            <h3 id="sz-adm-dialog-title" className="sz-adm-dialog-title mb-0">
              {title}
            </h3>
          </div>
          <button
            type="button"
            className="sz-adm-icon-btn"
            disabled={loading}
            onClick={onClose}
            aria-label="Close dialog"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="sz-adm-dialog-body">
          {message && <p className="sz-adm-dialog-msg">{message}</p>}

          {Array.isArray(details) && details.length > 0 && (
            <div className="sz-adm-summary-list">
              {details.map((item, idx) => (
                <div className="sz-adm-summary-row" key={idx}>
                  <span className="sz-adm-summary-k">{item.label}</span>
                  <strong className="sz-adm-summary-v">{item.value}</strong>
                </div>
              ))}
            </div>
          )}

          {children}
        </div>

        <div className="sz-adm-dialog-foot">
          <button
            type="button"
            className="sz-adm-btn sz-adm-btn-outline"
            disabled={loading}
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={btnClass}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
