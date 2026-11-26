import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiX } from 'react-icons/fi';
import TopHeader from './TopHeader';
import SecondaryNavBar from './SecondaryNavBar';
import ExchangeSidebar from './ExchangeSidebar';
import LiveSubHeader from './LiveSubHeader';

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const contentScrollRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  const isMatchDetailRoute =
    location.pathname.startsWith('/match/') ||
    location.pathname.startsWith('/game-details/');

  const isExchangeSurface =
    location.pathname === '/' ||
    location.pathname === '/home' ||
    location.pathname === '/casino' ||
    location.pathname === '/cricket' ||
    location.pathname === '/football' ||
    location.pathname === '/tennis' ||
    location.pathname === '/basketball' ||
    location.pathname === '/account-statement' ||
    location.pathname === '/current-bet' ||
    location.pathname === '/casino-results' ||
    location.pathname === '/set-button-values' ||
    location.pathname === '/fund-transfer' ||
    location.pathname === '/transfer-history' ||
    location.pathname === '/change-password' ||
    location.pathname.startsWith('/sport/') ||
    isMatchDetailRoute;

  return (
    <div className={`sz-shell ex-shell ${isExchangeSurface ? 'ex-shell-light' : ''}`}>
      {/* Full-width 2-Level Header (spans above both sidebar and main content) */}
      <header className="ex-header-stack">
        <TopHeader onToggleMobileSidebar={() => setMobileOpen((v) => !v)} />
        <SecondaryNavBar />
      </header>

      {/* Body Wrapper: Left Sidebar immediately below header + Right Content Column beside it */}
      <div className="ex-workspace">
        <aside className="ex-sidebar" aria-label="Sports navigation sidebar">
          <ExchangeSidebar />
        </aside>

        <div className="ex-content-col" ref={contentScrollRef}>
          {/* Sub-Header directly beside Racing Sports / Others (hidden on Match Details page to match reference) */}
          {!isMatchDetailRoute && <LiveSubHeader />}

          <main className={`sz-main ex-main ${isExchangeSurface ? 'ex-main-exchange' : ''}`}>
            {children}

            {/* Clean Minimal Footer */}
            <footer
              className={`mt-4 pt-3 pb-2 px-2 d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3 small ${
                isExchangeSurface ? 'ex-footer-light' : 'sz-muted'
              }`}
              style={{
                borderTop: isExchangeSurface ? '1px solid #d9d9d9' : '1px solid var(--sz-border)',
              }}
            >
              <div>
                <strong className={isExchangeSurface ? 'text-dark' : 'text-white'}>SPORTZONE</strong> · Powered by live SportsAPI v2 data · Demo
                virtual coins stored locally in browser storage.
              </div>
              <div className="d-flex flex-wrap gap-3">
                <Link to="/sports" className={`text-decoration-none ${isExchangeSurface ? 'ex-footer-light-link' : 'sz-muted'}`}>All Sports</Link>
                <Link to="/leagues" className={`text-decoration-none ${isExchangeSurface ? 'ex-footer-light-link' : 'sz-muted'}`}>Leagues</Link>
                <Link to="/arena" className={`text-decoration-none ${isExchangeSurface ? 'ex-footer-light-link' : 'sz-muted'}`}>Arena</Link>
                <Link to="/dashboard" className={`text-decoration-none ${isExchangeSurface ? 'ex-footer-light-link' : 'sz-muted'}`}>Dashboard</Link>
              </div>
            </footer>
          </main>
        </div>
      </div>

      {/* Mobile Collapsible Sidebar Drawer */}
      {mobileOpen && (
        <>
          <div
            className="sz-mobile-drawer-backdrop d-lg-none"
            onClick={() => setMobileOpen(false)}
          />
          <div className="ex-mobile-drawer d-lg-none" role="dialog" aria-label="Mobile sports sidebar">
            <div className="ex-mobile-drawer-top">
              <span className="fw-bold text-white">Navigation</span>
              <button
                type="button"
                className="ex-header-icon-btn"
                onClick={() => setMobileOpen(false)}
                aria-label="Close sidebar"
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="ex-mobile-drawer-scroll">
              <ExchangeSidebar onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
