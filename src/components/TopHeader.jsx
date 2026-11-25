import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiChevronDown,
  FiMenu,
  FiSearch,
  FiX,
  FiZoomIn,
} from 'react-icons/fi';
import { useArena } from '../context/ArenaContext';
import { getLiveScores } from '../services/sportsApi';
import { CASINO_GAMES } from '../data/casinoGamesCatalog';
import { getTeamDisplayName } from '../utils/formatters';

const QUICK_SPORTS = [
  { name: 'Cricket', to: '/cricket' },
  { name: 'Football', to: '/football' },
  { name: 'Tennis', to: '/tennis' },
  { name: 'Table Tennis', to: '/sport/table-tennis' },
  { name: 'Basketball', to: '/basketball' },
  { name: 'Badminton', to: '/sport/badminton' },
  { name: 'Volleyball', to: '/sport/volleyball' },
  { name: 'Snooker', to: '/sport/snooker' },
  { name: 'Ice Hockey', to: '/sport/ice-hockey' },
  { name: 'E Games', to: '/sport/esports' },
  { name: 'Futsal', to: '/sport/futsal' },
  { name: 'Handball', to: '/sport/handball' },
  { name: 'Baseball', to: '/sport/baseball' },
  { name: 'Rugby', to: '/sport/rugby' },
];

export default function TopHeader({ onToggleMobileSidebar }) {
  const { state, resetDemoAccount } = useArena();
  const navigate = useNavigate();

  const [demoOpen, setDemoOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [cachedLive, setCachedLive] = useState([]);

  const demoRef = useRef(null);
  const searchRef = useRef(null);

  // Real pending exposure calculated from active virtual-coin predictions + matched exchange bets
  const pendingExposure =
    state.predictions
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + (Number(p.stake) || 0), 0) +
    (state.exchangeBets || [])
      .filter((b) => b.status === 'matched')
      .reduce((sum, b) => sum + (Number(b.liability || b.stake) || 0), 0);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (demoRef.current && !demoRef.current.contains(e.target)) {
        setDemoOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!searchOpen || cachedLive.length > 0) return;
    let active = true;
    getLiveScores()
      .then((res) => {
        if (active) setCachedLive(res?.data || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [searchOpen, cachedLive.length]);

  const inlineResults = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return { matches: [], sports: [], games: [] };
    const matches = cachedLive
      .filter((fx) => {
        const home = getTeamDisplayName(fx.home, '').toLowerCase();
        const away = getTeamDisplayName(fx.away, '').toLowerCase();
        const league = String(fx.league?.name || '').toLowerCase();
        return home.includes(q) || away.includes(q) || league.includes(q);
      })
      .slice(0, 5);
    const sports = QUICK_SPORTS.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 4);
    const games = CASINO_GAMES.filter((g) => g.title.toLowerCase().includes(q)).slice(0, 5);
    return { matches, sports, games };
  }, [searchTerm, cachedLive]);

  function handleQuickSearch(e) {
    e.preventDefault();
    if (inlineResults.matches[0]) {
      navigate(`/match/${inlineResults.matches[0].id}`);
      setSearchOpen(false);
      setSearchTerm('');
    } else if (inlineResults.sports[0]) {
      navigate(inlineResults.sports[0].to);
      setSearchOpen(false);
      setSearchTerm('');
    } else if (inlineResults.games[0]) {
      navigate(`/casino?cat=${inlineResults.games[0].category}`);
      setSearchOpen(false);
      setSearchTerm('');
    }
  }

  return (
    <>
      <div className="ex-top-header">
        {/* Left Logo Area (~280px wide, extreme top-left) */}
        <div className="ex-logo-zone">
          <button
            type="button"
            className="ex-mobile-menu-btn d-lg-none"
            onClick={onToggleMobileSidebar}
            aria-label="Toggle sidebar navigation"
          >
            <FiMenu size={22} />
          </button>

          <Link to="/" className="ex-brand-lockup" aria-label="SPORTZONE Home">
            <img
              src="/assets/aistudio/image_9f2c9e43.png"
              alt="SPORTZONE"
              className="ex-brand-logo-img"
            />
          </Link>
        </div>

        {/* Right Controls: Search/Zoom icon, Rules, Balance/Exp, Demo dropdown */}
        <div className="ex-header-right">
          {/* Desktop Search / Zoom Icon (hidden on mobile because mobile shows it in Row 2) */}
          <div className="position-relative d-none d-lg-block" ref={searchRef}>
            <button
              type="button"
              className="ex-header-icon-btn"
              onClick={() => setSearchOpen((prev) => !prev)}
              aria-label="Search matches, teams, and games"
              title="Search"
            >
              <FiZoomIn size={23} strokeWidth={2.4} />
            </button>

            {searchOpen && (
              <div className="ex-search-popover">
                <form onSubmit={handleQuickSearch} className="ex-search-form-row">
                  <FiSearch size={15} className="ex-search-ico flex-shrink-0" />
                  <input
                    type="text"
                    className="ex-search-input"
                    placeholder="Search live matches, sports, games..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      className="ex-search-clear"
                      onClick={() => setSearchTerm('')}
                      aria-label="Clear search"
                    >
                      <FiX size={14} />
                    </button>
                  )}
                </form>

                {searchTerm.trim() && (
                  <div className="ex-search-results">
                    {inlineResults.matches.map((fx) => (
                      <Link
                        key={`m-${fx.id}`}
                        to={`/match/${fx.id}`}
                        className="ex-search-res-item"
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchTerm('');
                        }}
                      >
                        <span className="ex-search-res-tag">MATCH</span>
                        <span className="ex-search-res-label">
                          {getTeamDisplayName(fx.home)} v {getTeamDisplayName(fx.away)}
                        </span>
                      </Link>
                    ))}
                    {inlineResults.sports.map((sp) => (
                      <Link
                        key={`s-${sp.to}`}
                        to={sp.to}
                        className="ex-search-res-item"
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchTerm('');
                        }}
                      >
                        <span className="ex-search-res-tag">SPORT</span>
                        <span className="ex-search-res-label">{sp.name}</span>
                      </Link>
                    ))}
                    {inlineResults.games.map((g) => (
                      <Link
                        key={`g-${g.id}`}
                        to={`/casino?cat=${g.category}`}
                        className="ex-search-res-item"
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchTerm('');
                        }}
                      >
                        <span className="ex-search-res-tag">GAME</span>
                        <span className="ex-search-res-label">{g.title}</span>
                      </Link>
                    ))}
                    {inlineResults.matches.length === 0 &&
                      inlineResults.sports.length === 0 &&
                      inlineResults.games.length === 0 && (
                        <div className="ex-search-empty">No matching live games or sports found.</div>
                      )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop Rules Button */}
          <button
            type="button"
            className="ex-header-rules-btn d-none d-lg-inline-flex"
            onClick={() => setRulesOpen(true)}
          >
            Rules
          </button>

          {/* Balance & Exposure + Demo Dropdown (Desktop: Balance/Exp left of Demo; Mobile: Balance top, Exp + Demo below) */}
          <div className="ex-header-bal-demo">
            <div className="ex-balance-line ex-bal-line-top">
              <span className="ex-balance-label">Balance:</span>
              <strong className="ex-balance-value">{Math.round(state.coins)}</strong>
            </div>

            <div className="ex-bal-line-bottom">
              <div className="ex-balance-line ex-exp-inline-wrap">
                <span className="ex-balance-label">Exp:</span>
                <strong className="ex-balance-value">
                  {pendingExposure > 0 ? `-${Math.round(pendingExposure)}` : '0'}
                </strong>
              </div>

              {/* Demo Dropdown (Exact White Menu from Screenshot) */}
              <div className="position-relative ex-demo-wrap" ref={demoRef}>
                <button
                  type="button"
                  className="ex-demo-btn"
                  onClick={() => setDemoOpen((prev) => !prev)}
                  aria-expanded={demoOpen}
                  aria-haspopup="menu"
                >
                  <span>Demo</span>
                  <FiChevronDown
                    size={15}
                    strokeWidth={2.5}
                    style={{
                      transform: demoOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 150ms ease',
                    }}
                  />
                </button>

                {demoOpen && (
                  <div className="ex-demo-menu" role="menu">
                    <Link
                      to="/account-statement"
                      className="ex-demo-menu-item"
                      role="menuitem"
                      onClick={() => setDemoOpen(false)}
                    >
                      Account Statement
                    </Link>
                    <Link
                      to="/current-bet"
                      className="ex-demo-menu-item"
                      role="menuitem"
                      onClick={() => setDemoOpen(false)}
                    >
                      Current Bet
                    </Link>
                    <Link
                      to="/casino-results"
                      className="ex-demo-menu-item"
                      role="menuitem"
                      onClick={() => setDemoOpen(false)}
                    >
                      Casino Results
                    </Link>
                    <Link
                      to="/set-button-values"
                      className="ex-demo-menu-item"
                      role="menuitem"
                      onClick={() => setDemoOpen(false)}
                    >
                      Set Button Values
                    </Link>
                    <div className="ex-demo-menu-sep" />
                    <button
                      type="button"
                      className="ex-demo-menu-item ex-demo-menu-btn"
                      role="menuitem"
                      onClick={() => {
                        resetDemoAccount();
                        setDemoOpen(false);
                        navigate('/');
                      }}
                    >
                      SignOut
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Row 2 inside Black Header: Zoom Search Icon + Dark Grey Announcement Marquee */}
      <div className="ex-mob-ticker-bar d-lg-none">
        <button
          type="button"
          className="ex-mob-zoom-btn"
          onClick={() => setSearchOpen((prev) => !prev)}
          aria-label="Search matches and games"
        >
          <FiZoomIn size={20} strokeWidth={2.5} />
        </button>

        {searchOpen ? (
          <div className="ex-mob-search-inline">
            <form onSubmit={handleQuickSearch} className="ex-mob-search-form">
              <input
                type="text"
                className="ex-mob-search-input"
                placeholder="Search matches, sports, games..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                className="ex-mob-search-close"
                onClick={() => {
                  setSearchOpen(false);
                  setSearchTerm('');
                }}
                aria-label="Close search"
              >
                <FiX size={16} />
              </button>
            </form>
            {searchTerm.trim() && (
              <div className="ex-mob-search-dropdown">
                {inlineResults.matches.map((fx) => (
                  <Link
                    key={`mm-${fx.id}`}
                    to={`/match/${fx.id}`}
                    className="ex-search-res-item"
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchTerm('');
                    }}
                  >
                    <span className="ex-search-res-tag">MATCH</span>
                    <span className="ex-search-res-label">
                      {getTeamDisplayName(fx.home)} v {getTeamDisplayName(fx.away)}
                    </span>
                  </Link>
                ))}
                {inlineResults.sports.map((sp) => (
                  <Link
                    key={`ms-${sp.to}`}
                    to={sp.to}
                    className="ex-search-res-item"
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchTerm('');
                    }}
                  >
                    <span className="ex-search-res-tag">SPORT</span>
                    <span className="ex-search-res-label">{sp.name}</span>
                  </Link>
                ))}
                {inlineResults.games.map((g) => (
                  <Link
                    key={`mg-${g.id}`}
                    to={`/casino?cat=${g.category}`}
                    className="ex-search-res-item"
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchTerm('');
                    }}
                  >
                    <span className="ex-search-res-tag">GAME</span>
                    <span className="ex-search-res-label">{g.title}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="ex-mob-marquee-box">
            <span className="ex-mob-marquee-text">
              Newly Launched Matka Market In Our Exchange
            </span>
          </div>
        )}
      </div>

      {/* Rules Modal */}
      {rulesOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ backgroundColor: 'rgba(0,0,0,0.78)', zIndex: 1090 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ex-rules-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRulesOpen(false);
          }}
        >
          <div className="sz-card w-100" style={{ maxWidth: 520, backgroundColor: '#12141A' }}>
            <div className="d-flex align-items-center justify-content-between pb-3 mb-3" style={{ borderBottom: '1px solid var(--sz-border)' }}>
              <h2 id="ex-rules-title" className="sz-display h4 text-white mb-0">
                SPORTZONE Arena Rules
              </h2>
              <button
                type="button"
                className="sz-btn sz-btn-ghost sz-btn-sm"
                onClick={() => setRulesOpen(false)}
                aria-label="Close rules"
              >
                <FiX size={18} />
              </button>
            </div>
            <ul className="small sz-muted ps-3 mb-4 d-flex flex-column gap-2">
              <li>
                <strong className="text-white">Demo Virtual Coins:</strong> All Balance and Exposure figures use demo virtual coins stored locally in browser <code className="text-white">localStorage</code> — no real money is wagered.
              </li>
              <li>
                <strong className="text-white">Pre-Match Lock:</strong> Predictions can only be placed on upcoming SportsAPI matches before kickoff (<code className="text-white">notstarted</code>).
              </li>
              <li>
                <strong className="text-white">No Duplicates:</strong> Only one active prediction per fixture is allowed.
              </li>
              <li>
                <strong className="text-white">Official Settlement:</strong> Results and payouts settle directly against official full-time SportsAPI match outcomes, including a +1.5x Exact Score bonus.
              </li>
              <li>
                <strong className="text-white">Void Matches:</strong> Postponed or canceled fixtures automatically refund your staked virtual coins upon verification.
              </li>
            </ul>
            <div className="d-flex justify-content-end gap-2">
              <Link
                to="/arena"
                className="sz-btn sz-btn-primary sz-btn-sm"
                onClick={() => setRulesOpen(false)}
              >
                Go to Prediction Arena
              </Link>
              <button
                type="button"
                className="sz-btn sz-btn-outline sz-btn-sm"
                onClick={() => setRulesOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
