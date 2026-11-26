import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  FiActivity,
  FiArrowLeft,
  FiBell,
  FiCheckCircle,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiCreditCard,
  FiDollarSign,
  FiFileText,
  FiHome,
  FiKey,
  FiList,
  FiLogOut,
  FiMenu,
  FiRepeat,
  FiSend,
  FiSettings,
  FiShield,
  FiSliders,
  FiTrendingUp,
  FiUser,
  FiUserCheck,
  FiUserPlus,
  FiUsers,
  FiUserX,
  FiX,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { formatDateTimeShort } from '../../utils/formatters';

const SIDEBAR_GROUPS = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', to: '/admin/dashboard', icon: FiHome },
    ],
  },
  {
    title: 'User Management',
    items: [
      { label: 'All Users', to: '/admin/users', icon: FiUsers },
      { label: 'Create User', to: '/admin/create-user', icon: FiUserPlus },
      { label: 'Active Users', to: '/admin/active-users', icon: FiUserCheck },
      { label: 'Blocked Users', to: '/admin/blocked-users', icon: FiUserX },
    ],
  },
  {
    title: 'Virtual Wallet',
    items: [
      { label: 'Fund Management', to: '/admin/fund-management', icon: FiDollarSign },
      { label: 'Fund Transfer', to: '/admin/fund-transfer', icon: FiSend },
      { label: 'Transfer History', to: '/admin/transfer-history', icon: FiRepeat },
      { label: 'Withdrawal Settings', to: '/admin/withdrawal-settings', icon: FiCreditCard },
    ],
  },
  {
    title: 'Statements & Records',
    items: [
      { label: 'Account Statement', to: '/admin/account-statement', icon: FiFileText },
      { label: 'Transaction History', to: '/admin/transactions', icon: FiList },
      { label: 'Current Bet', to: '/admin/current-bet', icon: FiTrendingUp },
      { label: 'Casino Results', to: '/admin/casino-results', icon: FiCheckCircle },
    ],
  },
  {
    title: 'Controls & Security',
    items: [
      { label: 'User Permissions', to: '/admin/permissions', icon: FiShield },
      { label: 'Set Button Values', to: '/admin/button-values', icon: FiSliders },
      { label: 'Activity Logs', to: '/admin/activity-logs', icon: FiActivity },
      { label: 'General Settings', to: '/admin/settings', icon: FiSettings },
      { label: 'Change Password', to: '/admin/change-password', icon: FiKey },
    ],
  },
];

const ROUTE_TITLES = {
  '/admin/dashboard': 'Dashboard',
  '/admin/users': 'All Users',
  '/admin/create-user': 'Create User',
  '/admin/active-users': 'Active Users',
  '/admin/blocked-users': 'Blocked Users',
  '/admin/fund-management': 'Fund Management',
  '/admin/fund-transfer': 'Fund Transfer',
  '/admin/transfer-history': 'Transfer History',
  '/admin/withdrawal-settings': 'Withdrawal Settings',
  '/admin/account-statement': 'Account Statement',
  '/admin/current-bet': 'Current Bet',
  '/admin/casino-results': 'Casino Results',
  '/admin/button-values': 'Set Button Values',
  '/admin/transactions': 'Transaction History',
  '/admin/permissions': 'User Permissions',
  '/admin/activity-logs': 'Activity Logs',
  '/admin/settings': 'General Settings',
  '/admin/change-password': 'Change Password',
};

export default function AdminLayout() {
  const { user, notifications, unreadCount, markNotificationsRead, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    setMobileDrawerOpen(false);
    setNotifOpen(false);
    setProfileOpen(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentTitle = useMemo(
    () => ROUTE_TITLES[location.pathname] || 'Administration',
    [location.pathname]
  );

  async function handleSignOut() {
    await logout();
    navigate('/login', { replace: true });
  }

  function renderSidebarNav(isMobile = false) {
    return (
      <nav className="sz-adm-nav" aria-label="Admin navigation">
        {SIDEBAR_GROUPS.map((group) => (
          <div className="sz-adm-nav-group" key={group.title}>
            {(!collapsed || isMobile) && (
              <div className="sz-adm-nav-group-title">{group.title}</div>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={collapsed && !isMobile ? item.label : undefined}
                  className={({ isActive }) =>
                    `sz-adm-nav-link ${isActive ? 'is-active' : ''}`
                  }
                >
                  <Icon size={16} className="sz-adm-nav-ico flex-shrink-0" />
                  {(!collapsed || isMobile) && (
                    <span className="sz-adm-nav-label">{item.label}</span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
    );
  }

  function renderSidebarFooter(isMobile = false) {
    return (
      <div className="sz-adm-sidebar-footer">
        <Link
          to="/home"
          title={collapsed && !isMobile ? 'Back to Website' : undefined}
          className="sz-adm-nav-link"
        >
          <FiArrowLeft size={16} className="sz-adm-nav-ico flex-shrink-0" />
          {(!collapsed || isMobile) && (
            <span className="sz-adm-nav-label">Back to Website</span>
          )}
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          title={collapsed && !isMobile ? 'Sign Out' : undefined}
          className="sz-adm-nav-link sz-adm-nav-signout mb-0"
        >
          <FiLogOut size={16} className="sz-adm-nav-ico flex-shrink-0" />
          {(!collapsed || isMobile) && (
            <span className="sz-adm-nav-label">Sign Out</span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={`sz-adm-shell ${collapsed ? 'is-collapsed' : ''}`} data-bs-theme="light">
      {/* Dedicated Desktop Collapsible Sidebar */}
      <aside className="sz-adm-sidebar d-none d-lg-flex">
        <div className="sz-adm-sidebar-brand">
          <Link to="/admin/dashboard" className="sz-adm-brand-link" aria-label="SportZone Admin Dashboard">
            <img
              src="/assets/aistudio/image_9f2c9e43.png"
              alt="SPORTZONE"
              className="sz-adm-logo-img"
            />
          </Link>
          <button
            type="button"
            className="sz-adm-collapse-btn"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <FiChevronRight size={14} /> : <FiChevronLeft size={14} />}
          </button>
        </div>

        <div className="sz-adm-sidebar-scroll">{renderSidebarNav(false)}</div>

        {renderSidebarFooter(false)}

        {/* Subtle blue wave accent at bottom of dark navy sidebar matching reference */}
        <div className="sz-adm-sidebar-wave" aria-hidden="true" />
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileDrawerOpen && (
        <div
          className="sz-adm-drawer-backdrop d-lg-none"
          onClick={() => setMobileDrawerOpen(false)}
        >
          <aside
            className="sz-adm-mobile-drawer"
            onClick={(e) => e.stopPropagation()}
            aria-label="Mobile admin navigation"
          >
            <div className="sz-adm-sidebar-brand">
              <Link to="/admin/dashboard" className="sz-adm-brand-link">
                <img
                  src="/assets/aistudio/image_9f2c9e43.png"
                  alt="SPORTZONE"
                  className="sz-adm-logo-img"
                />
              </Link>
              <button
                type="button"
                className="sz-adm-collapse-btn"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close navigation menu"
              >
                <FiX size={16} />
              </button>
            </div>
            <div className="sz-adm-sidebar-scroll">{renderSidebarNav(true)}</div>
            {renderSidebarFooter(true)}
            <div className="sz-adm-sidebar-wave" aria-hidden="true" />
          </aside>
        </div>
      )}

      {/* Main Column: Independent Admin Header + Content Viewport */}
      <div className="sz-adm-main-col">
        <header className="sz-adm-header">
          <div className="sz-adm-header-left">
            <button
              type="button"
              className="sz-adm-mobile-toggle d-lg-none"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open admin menu"
            >
              <FiMenu size={19} />
            </button>

            <nav aria-label="Breadcrumb" className="sz-adm-breadcrumb">
              <Link to="/admin/dashboard" className="sz-adm-crumb-home" aria-label="Admin Home">
                <FiHome size={14} />
              </Link>
              <FiChevronRight size={13} className="sz-adm-crumb-sep" aria-hidden="true" />
              <Link to="/admin/dashboard" className="sz-adm-crumb-root">
                Admin
              </Link>
              <FiChevronRight size={13} className="sz-adm-crumb-sep" aria-hidden="true" />
              <span className="sz-adm-crumb-current">{currentTitle}</span>
            </nav>
          </div>

          <div className="sz-adm-header-right">
            <Link to="/home" className="sz-adm-back-site-btn d-none d-sm-inline-flex">
              <FiArrowLeft size={14} />
              <span>Back to Website</span>
            </Link>

            {/* Notifications Popover */}
            <div className="position-relative" ref={notifRef}>
              <button
                type="button"
                className="sz-adm-header-icon-btn"
                onClick={() => setNotifOpen((v) => !v)}
                aria-label="Notifications"
                aria-expanded={notifOpen}
              >
                <FiBell size={17} />
                {unreadCount > 0 && (
                  <span className="sz-adm-notif-count">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="sz-adm-popover sz-adm-notif-popover">
                  <div className="sz-adm-popover-head">
                    <span className="sz-adm-popover-title">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        className="sz-adm-text-btn"
                        onClick={() => markNotificationsRead()}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="sz-adm-notif-list">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-secondary small">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div
                          key={n.id}
                          className={`sz-adm-notif-item ${!n.read ? 'is-unread' : ''}`}
                          onClick={() => !n.read && markNotificationsRead(n.id)}
                        >
                          <div className="d-flex justify-content-between align-items-start gap-2">
                            <strong className="sz-adm-notif-title">{n.title}</strong>
                            <span className="sz-adm-notif-time">
                              {formatDateTimeShort(n.createdAt)}
                            </span>
                          </div>
                          <div className="sz-adm-notif-msg">{n.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Admin Profile Dropdown */}
            <div className="position-relative" ref={profileRef}>
              <button
                type="button"
                className="sz-adm-profile-btn"
                onClick={() => setProfileOpen((v) => !v)}
                aria-expanded={profileOpen}
              >
                <span className="sz-adm-avatar" aria-hidden="true">
                  <FiUser size={15} />
                </span>
                <span className="d-none d-md-flex flex-column align-items-start lh-1">
                  <span className="sz-adm-profile-name">{user?.username || 'Admin'}</span>
                  <span className="sz-adm-profile-role">Administrator</span>
                </span>
                <FiChevronDown size={14} className="sz-adm-profile-caret" />
              </button>

              {profileOpen && (
                <div className="sz-adm-popover sz-adm-profile-popover">
                  <div className="sz-adm-profile-pop-head">
                    <div className="sz-adm-profile-pop-name">{user?.fullName || 'SportZone Admin'}</div>
                    <div className="sz-adm-profile-pop-email">{user?.email || 'admin@sportzone.local'}</div>
                  </div>
                  <div className="sz-adm-pop-list">
                    <Link
                      to="/admin/change-password"
                      className="sz-adm-pop-item"
                      onClick={() => setProfileOpen(false)}
                    >
                      <FiKey size={14} />
                      <span>Change Password</span>
                    </Link>
                    <Link
                      to="/home"
                      className="sz-adm-pop-item"
                      onClick={() => setProfileOpen(false)}
                    >
                      <FiArrowLeft size={14} />
                      <span>Back to Website</span>
                    </Link>
                  </div>
                  <div className="sz-adm-pop-sep" />
                  <div className="sz-adm-pop-list">
                    <button
                      type="button"
                      className="sz-adm-pop-item is-danger w-100 border-0 bg-transparent text-start"
                      onClick={handleSignOut}
                    >
                      <FiLogOut size={14} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="sz-adm-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
