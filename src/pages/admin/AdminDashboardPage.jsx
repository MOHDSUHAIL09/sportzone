import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiActivity,
  FiChevronRight,
  FiClock,
  FiCreditCard,
  FiDatabase,
  FiLayers,
  FiPlus,
  FiRefreshCw,
  FiRepeat,
  FiShield,
  FiSlash,
  FiUser,
  FiUserCheck,
  FiUserPlus,
  FiUsers,
  FiZap,
} from 'react-icons/fi';
import apiClient, { getApiErrorMessage } from '../../services/apiClient';
import { formatDateTimeShort } from '../../utils/formatters';

function formatNum(n) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatAxisTick(n) {
  const num = Number(n || 0);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(Math.round(num));
}

function getActivityIconMeta(action = '') {
  const up = String(action).toUpperCase();
  if (up.includes('BLOCKED') && !up.includes('UNBLOCKED')) {
    return { Icon: FiSlash, tone: 'danger' };
  }
  if (up.includes('UNBLOCKED')) {
    return { Icon: FiUserCheck, tone: 'blue' };
  }
  if (up.includes('ADMIN') || up.includes('USER')) {
    return { Icon: FiUsers, tone: 'indigo' };
  }
  if (up.includes('SYSTEM') || up.includes('INIT') || up.includes('FUND') || up.includes('TRANSFER')) {
    return { Icon: FiDatabase, tone: 'cyan' };
  }
  return { Icon: FiActivity, tone: 'blue' };
}

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hoveredRegIdx, setHoveredRegIdx] = useState(null);
  const [hoveredVolIdx, setHoveredVolIdx] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/admin/dashboard');
      if (res.data?.ok) {
        setData(res.data);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load dashboard metrics.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const metrics = data?.metrics || {};
  const chartSeries = data?.chartSeries || [];
  const maxReg = Math.max(1, ...chartSeries.map((c) => c.registrations));
  const maxVol = Math.max(1, ...chartSeries.map((c) => c.creditsIssued + c.transfersVolume));

  const regScaleMax = maxReg <= 4 ? 4 : Math.ceil(maxReg / 2) * 2;
  const volScaleMax = maxVol <= 10 ? 10 : Math.ceil(maxVol / 200) * 200;

  const kpiCards = [
    {
      label: 'Total Users',
      value: formatNum(metrics.totalUsers),
      cardTone: 'blue',
      valueTone: 'dark',
      icon: FiUsers,
      to: '/admin/users',
    },
    {
      label: 'Active Users',
      value: formatNum(metrics.activeUsers),
      cardTone: 'green',
      valueTone: 'dark',
      icon: FiUser,
      to: '/admin/active-users',
    },
    {
      label: 'Blocked Users',
      value: formatNum(metrics.blockedUsers),
      cardTone: 'rose',
      valueTone: 'negative',
      icon: FiSlash,
      to: '/admin/blocked-users',
    },
    {
      label: "Today's Registrations",
      value: formatNum(metrics.todaysRegistrations),
      cardTone: 'sky',
      valueTone: 'dark',
      icon: FiUserPlus,
      to: '/admin/users',
    },
    {
      label: 'Total Virtual Wallet Balance',
      value: formatNum(metrics.totalVirtualWalletBalance),
      cardTone: 'indigo',
      valueTone: 'dark',
      icon: FiDatabase,
      to: '/admin/fund-management',
    },
    {
      label: 'Virtual Credits Issued',
      value: formatNum(metrics.totalVirtualCreditsIssued),
      cardTone: 'teal',
      valueTone: 'positive',
      icon: FiDatabase,
      to: '/admin/transactions',
    },
    {
      label: 'Virtual Credits Deducted',
      value: formatNum(metrics.totalVirtualCreditsDeducted),
      cardTone: 'rose',
      valueTone: 'negative',
      icon: FiCreditCard,
      to: '/admin/transactions',
    },
    {
      label: 'Total Virtual Transfers',
      value: formatNum(metrics.totalVirtualTransfers),
      cardTone: 'sky',
      valueTone: 'dark',
      icon: FiRepeat,
      to: '/admin/transfer-history',
    },
    {
      label: 'Pending Sim. Withdrawals',
      value: formatNum(metrics.pendingSimulatedWithdrawals),
      cardTone: 'amber',
      valueTone: 'warning',
      icon: FiClock,
      to: '/admin/withdrawal-settings',
    },
    {
      label: 'Completed Sim. Withdrawals',
      value: formatNum(metrics.completedSimulatedWithdrawals),
      cardTone: 'green',
      valueTone: 'positive',
      icon: FiShield,
      to: '/admin/withdrawal-settings',
    },
  ];

  return (
    <div className="sz-adm-page">
      {/* Page Header Matching Reference */}
      <div className="sz-adm-page-head">
        <div className="sz-adm-hero-title-wrap">
          <span className="sz-adm-hero-icon" aria-hidden="true">
            <FiLayers size={22} />
          </span>
          <div>
            <h1 className="sz-adm-page-title">
              Administration <span className="sz-adm-title-accent">Overview</span>
            </h1>
            <p className="sz-adm-page-sub">
              Live server-side summary of registered accounts, virtual credit ledgers, and simulated operations.
            </p>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            type="button"
            className="sz-adm-btn sz-adm-btn-outline sz-adm-btn-sm"
            onClick={loadDashboard}
            disabled={loading}
          >
            <FiRefreshCw size={14} className={loading ? 'sz-spin' : ''} />
            <span>Refresh</span>
          </button>
          <Link to="/admin/create-user" className="sz-adm-btn sz-adm-btn-primary sz-adm-btn-sm text-decoration-none">
            <FiPlus size={15} />
            <span>Create User</span>
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 px-3 small mb-3">{error}</div>}

      {/* 10 Horizontal Icon-Left Summary KPI Cards (5 x 2) */}
      <div className="sz-adm-kpi-grid">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              to={card.to}
              className={`sz-adm-kpi-card is-tone-${card.cardTone} text-decoration-none`}
            >
              <span className={`sz-adm-kpi-icon is-tone-${card.cardTone}`} aria-hidden="true">
                <Icon size={20} />
              </span>
              <div className="sz-adm-kpi-body">
                <span className="sz-adm-kpi-label">{card.label}</span>
                <div className={`sz-adm-kpi-value is-${card.valueTone}`}>
                  {loading ? '—' : card.value}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Registration & Virtual Volume Charts */}
      <div className="row g-3 mt-1">
        <div className="col-lg-6">
          <div className="sz-adm-panel sz-adm-chart-panel h-100">
            <div className="sz-adm-panel-head">
              <div className="sz-adm-panel-title-group">
                <span className="sz-adm-panel-ico" aria-hidden="true">
                  <FiUserPlus size={18} />
                </span>
                <div>
                  <h2 className="sz-adm-panel-title">User Registrations (Last 7 Days)</h2>
                  <div className="sz-adm-meta">Daily new account count</div>
                </div>
              </div>
              <div className="sz-adm-chart-legend">
                <span className="sz-adm-legend-item">
                  <span className="sz-adm-legend-swatch is-primary" />
                  <span>Registrations</span>
                </span>
              </div>
            </div>
            <div className="sz-adm-panel-body">
              {loading ? (
                <div className="sz-adm-skeleton" style={{ height: 180 }} />
              ) : (
                <div className="sz-adm-chart-shell">
                  <div className="sz-adm-chart-yaxis" aria-hidden="true">
                    <span>{formatAxisTick(regScaleMax)}</span>
                    <span>{formatAxisTick(regScaleMax / 2)}</span>
                    <span>0</span>
                  </div>
                  <div className="sz-adm-chart-plot">
                    <div className="sz-adm-chart-gridlines" aria-hidden="true">
                      <div className="sz-adm-gridline" />
                      <div className="sz-adm-gridline" />
                      <div className="sz-adm-gridline is-base" />
                    </div>
                    <div className="sz-adm-bar-chart">
                      {chartSeries.map((pt, idx) => {
                        const pct = pt.registrations > 0
                          ? Math.max(10, Math.round((pt.registrations / regScaleMax) * 100))
                          : 0;
                        const isHovered = hoveredRegIdx === idx;
                        return (
                          <div
                            className={`sz-adm-bar-col ${isHovered ? 'is-hovered' : ''}`}
                            key={pt.date}
                            onMouseEnter={() => setHoveredRegIdx(idx)}
                            onMouseLeave={() => setHoveredRegIdx(null)}
                          >
                            {isHovered && (
                              <div className="sz-adm-chart-tooltip" role="tooltip">
                                <div className="sz-adm-tt-date">{pt.label}</div>
                                <div className="sz-adm-tt-val">{pt.registrations} registration(s)</div>
                              </div>
                            )}
                            <div className="sz-adm-bar-area">
                              <div
                                className="sz-adm-bar-fill"
                                style={{ height: `${pct}%` }}
                              />
                            </div>
                            <div className="sz-adm-bar-lbl">{pt.label}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="sz-adm-panel sz-adm-chart-panel h-100">
            <div className="sz-adm-panel-head">
              <div className="sz-adm-panel-title-group">
                <span className="sz-adm-panel-ico" aria-hidden="true">
                  <FiCreditCard size={18} />
                </span>
                <div>
                  <h2 className="sz-adm-panel-title">Virtual Credits &amp; Transfers (Last 7 Days)</h2>
                  <div className="sz-adm-meta">Daily simulated transfer volume</div>
                </div>
              </div>
              <div className="sz-adm-chart-legend">
                <span className="sz-adm-legend-item">
                  <span className="sz-adm-legend-swatch is-primary" />
                  <span>Credits</span>
                </span>
                <span className="sz-adm-legend-item">
                  <span className="sz-adm-legend-swatch is-dark" />
                  <span>Transfers</span>
                </span>
              </div>
            </div>
            <div className="sz-adm-panel-body">
              {loading ? (
                <div className="sz-adm-skeleton" style={{ height: 180 }} />
              ) : (
                <div className="sz-adm-chart-shell">
                  <div className="sz-adm-chart-yaxis" aria-hidden="true">
                    <span>{formatAxisTick(volScaleMax)}</span>
                    <span>{formatAxisTick(volScaleMax / 2)}</span>
                    <span>0</span>
                  </div>
                  <div className="sz-adm-chart-plot">
                    <div className="sz-adm-chart-gridlines" aria-hidden="true">
                      <div className="sz-adm-gridline" />
                      <div className="sz-adm-gridline" />
                      <div className="sz-adm-gridline is-base" />
                    </div>
                    <div className="sz-adm-bar-chart">
                      {chartSeries.map((pt, idx) => {
                        const totalVal = pt.creditsIssued + pt.transfersVolume;
                        const totalPct = totalVal > 0
                          ? Math.max(10, Math.round((totalVal / volScaleMax) * 100))
                          : 0;
                        const creditsShare = totalVal > 0 ? (pt.creditsIssued / totalVal) * totalPct : 0;
                        const transfersShare = totalVal > 0 ? Math.max(0, totalPct - creditsShare) : 0;
                        const isHovered = hoveredVolIdx === idx;
                        return (
                          <div
                            className={`sz-adm-bar-col ${isHovered ? 'is-hovered' : ''}`}
                            key={pt.date}
                            onMouseEnter={() => setHoveredVolIdx(idx)}
                            onMouseLeave={() => setHoveredVolIdx(null)}
                          >
                            {isHovered && (
                              <div className="sz-adm-chart-tooltip" role="tooltip">
                                <div className="sz-adm-tt-date">{pt.label}</div>
                                <div className="sz-adm-tt-val">Credits: {formatNum(pt.creditsIssued)}</div>
                                <div className="sz-adm-tt-val">Transfers: {formatNum(pt.transfersVolume)}</div>
                              </div>
                            )}
                            <div className="sz-adm-bar-area">
                              <div className="sz-adm-bar-stack" style={{ height: `${totalPct}%` }}>
                                {transfersShare > 0 && (
                                  <div
                                    className="sz-adm-bar-seg is-dark"
                                    style={{ height: `${(transfersShare / totalPct) * 100}%` }}
                                  />
                                )}
                                {creditsShare > 0 && (
                                  <div
                                    className="sz-adm-bar-seg is-primary"
                                    style={{ height: `${(creditsShare / totalPct) * 100}%` }}
                                  />
                                )}
                              </div>
                            </div>
                            <div className="sz-adm-bar-lbl">{pt.label}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Users & Administrative Activity */}
      <div className="row g-3 mt-1">
        <div className="col-lg-7">
          <div className="sz-adm-panel h-100">
            <div className="sz-adm-panel-head">
              <div className="sz-adm-panel-title-group">
                <span className="sz-adm-panel-ico" aria-hidden="true">
                  <FiUsers size={18} />
                </span>
                <h2 className="sz-adm-panel-title">Recent Users</h2>
              </div>
              <Link to="/admin/users" className="sz-adm-link-sm">
                <span>View All Users</span>
                <FiChevronRight size={14} />
              </Link>
            </div>
            <div className="table-responsive">
              <table className="sz-adm-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Full Name</th>
                    <th className="text-end">Virtual Balance</th>
                    <th className="text-center">Status</th>
                    <th>Registered On</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-secondary">
                        Loading users...
                      </td>
                    </tr>
                  ) : (data?.recentUsers || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-secondary">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    (data?.recentUsers || []).map((u) => (
                      <tr key={u.id}>
                        <td className="fw-bold sz-adm-cell-strong">{u.username}</td>
                        <td>{u.fullName}</td>
                        <td className="text-end sz-adm-num fw-bold">{formatNum(u.virtualBalance)}</td>
                        <td className="text-center">
                          <span className={`sz-adm-status is-${u.status}`}>
                            {u.status === 'active' ? 'Active' : 'Blocked'}
                          </span>
                        </td>
                        <td className="text-nowrap text-secondary small">{formatDateTimeShort(u.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="sz-adm-panel h-100">
            <div className="sz-adm-panel-head">
              <div className="sz-adm-panel-title-group">
                <span className="sz-adm-panel-ico" aria-hidden="true">
                  <FiZap size={18} />
                </span>
                <h2 className="sz-adm-panel-title">Administrative Activity</h2>
              </div>
              <Link to="/admin/activity-logs" className="sz-adm-link-sm">
                <span>Full Audit Log</span>
                <FiChevronRight size={14} />
              </Link>
            </div>
            <div className="sz-adm-activity-list">
              {loading ? (
                <div className="p-4 text-center text-secondary small">Loading logs...</div>
              ) : (data?.recentActivity || []).length === 0 ? (
                <div className="p-4 text-center text-secondary small">No administrative activity yet.</div>
              ) : (
                (data?.recentActivity || []).map((log) => {
                  const { Icon: LogIcon, tone } = getActivityIconMeta(log.action);
                  return (
                    <div className="sz-adm-activity-item" key={log.id}>
                      <span className={`sz-adm-activity-ico is-${tone}`} aria-hidden="true">
                        <LogIcon size={16} />
                      </span>
                      <div className="sz-adm-activity-content">
                        <div className="d-flex justify-content-between align-items-start gap-2">
                          <span className="sz-adm-activity-action">{log.action.replace(/_/g, ' ')}</span>
                          <span className="sz-adm-activity-time">
                            {formatDateTimeShort(log.createdAt)}
                          </span>
                        </div>
                        <div className="sz-adm-activity-detail">{log.details}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Virtual Ledger Transactions */}
      <div className="sz-adm-panel mt-3">
        <div className="sz-adm-panel-head">
          <div className="sz-adm-panel-title-group">
            <span className="sz-adm-panel-ico" aria-hidden="true">
              <FiRepeat size={18} />
            </span>
            <h2 className="sz-adm-panel-title">Recent Virtual Ledger Transactions</h2>
          </div>
          <Link to="/admin/transactions" className="sz-adm-link-sm">
            <span>View All Transactions</span>
            <FiChevronRight size={14} />
          </Link>
        </div>
        <div className="table-responsive">
          <table className="sz-adm-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>User</th>
                <th>Type</th>
                <th className="text-end">Credit</th>
                <th className="text-end">Debit</th>
                <th className="text-end">Closing Balance</th>
                <th>Remarks</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-4 text-secondary">
                    Loading transactions...
                  </td>
                </tr>
              ) : (data?.recentTransactions || []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-4 text-secondary">
                    No transactions recorded yet.
                  </td>
                </tr>
              ) : (
                (data?.recentTransactions || []).map((tx) => (
                  <tr key={tx.id}>
                    <td className="sz-adm-tx-id">{tx.id}</td>
                    <td className="fw-bold sz-adm-cell-strong">{tx.username}</td>
                    <td className="sz-adm-tx-type">{tx.type.replace(/_/g, ' ')}</td>
                    <td className="text-end sz-adm-num sz-adm-val-pos fw-bold">
                      {tx.credit > 0 ? `+${formatNum(tx.credit)}` : '—'}
                    </td>
                    <td className="text-end sz-adm-num sz-adm-val-neg fw-bold">
                      {tx.debit > 0 ? `-${formatNum(tx.debit)}` : '—'}
                    </td>
                    <td className="text-end sz-adm-num fw-bold">{formatNum(tx.closingBalance)}</td>
                    <td className="sz-adm-tx-remarks">{tx.remarks}</td>
                    <td className="text-nowrap small text-secondary">{formatDateTimeShort(tx.createdAt)}</td>
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
