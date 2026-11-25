import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

const RACING_ITEMS = [
  { label: 'Horse Racing', to: '/sports' },
  { label: 'Greyhound Racing', to: '/sports' },
  { label: 'Motorsport', to: '/sport/motorsport' },
  { label: 'Cycling', to: '/sport/cycling' },
];

const OTHERS_ITEMS = [
  { label: 'Our Casino', to: '/casino?cat=all', subtle: true },
  { label: 'Our Virtual', to: '/casino?cat=sports', subtle: true },
  { label: 'Live Casino', to: '/casino?cat=teenpatti' },
  { label: 'Slot Game', to: '/casino?cat=roulette' },
  { label: 'Fantasy Game', to: '/arena' },
];

const ALL_SPORTS_ITEMS = [
  { label: 'Politics', slug: 'politics', to: '/sports' },
  { label: 'Cricket', slug: 'cricket', to: '/sport/cricket' },
  { label: 'Football', slug: 'football', to: '/sport/football' },
  { label: 'Tennis', slug: 'tennis', to: '/sport/tennis' },
  { label: 'Table Tennis', slug: 'table-tennis', to: '/sport/table-tennis' },
  { label: 'Badminton', slug: 'badminton', to: '/sport/badminton' },
  { label: 'Esoccer', slug: 'esoccer', to: '/sport/esports' },
  { label: 'Basketball', slug: 'basketball', to: '/sport/basketball' },
  { label: 'Volleyball', slug: 'volleyball', to: '/sport/volleyball' },
  { label: 'Snooker', slug: 'snooker', to: '/sport/snooker' },
  { label: 'Ice Hockey', slug: 'ice-hockey', to: '/sport/ice-hockey' },
  { label: 'E Games', slug: 'esports', to: '/sport/esports' },
  { label: 'Futsal', slug: 'futsal', to: '/sport/futsal' },
  { label: 'Handball', slug: 'handball', to: '/sport/handball' },
  { label: 'Kabaddi', slug: 'kabaddi', to: '/sports' },
  { label: 'Golf', slug: 'golf', to: '/sports' },
  { label: 'Rugby', slug: 'rugby', to: '/sport/rugby' },
  { label: 'Boxing / MMA', slug: 'mma', to: '/sport/mma' },
  { label: 'Baseball', slug: 'baseball', to: '/sport/baseball' },
  { label: 'American Football', slug: 'american-football', to: '/sport/american-football' },
  { label: 'Darts', slug: 'darts', to: '/sport/darts' },
  { label: 'Padel', slug: 'padel', to: '/sport/padel' },
  { label: 'Water Polo', slug: 'waterpolo', to: '/sport/waterpolo' },
  { label: 'Floorball', slug: 'floorball', to: '/sport/floorball' },
  { label: 'Aussie Rules', slug: 'aussie-rules', to: '/sport/aussie-rules' },
];

export default function ExchangeSidebar({ onNavigate }) {
  // Match exact initial state from reference screenshot:
  // Racing Sports collapsed, Others expanded, All Sports expanded
  const [racingOpen, setRacingOpen] = useState(false);
  const [othersOpen, setOthersOpen] = useState(true);
  const [allSportsOpen, setAllSportsOpen] = useState(true);
  const [expandedSports, setExpandedSports] = useState({});

  function toggleSportExpand(slug, e) {
    e.preventDefault();
    e.stopPropagation();
    setExpandedSports((prev) => ({
      ...prev,
      [slug]: !prev[slug],
    }));
  }

  return (
    <div className="ex-sidebar-inner">
      {/* Section 1: Racing Sports */}
      <div className="ex-side-section">
        <button
          type="button"
          className="ex-side-header"
          onClick={() => setRacingOpen((v) => !v)}
          aria-expanded={racingOpen}
        >
          <span>Racing Sports</span>
          {racingOpen ? (
            <FiChevronUp size={16} strokeWidth={2.6} />
          ) : (
            <FiChevronDown size={16} strokeWidth={2.6} />
          )}
        </button>

        {racingOpen && (
          <div className="ex-side-list">
            {RACING_ITEMS.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className="ex-side-row"
                onClick={onNavigate}
              >
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Others */}
      <div className="ex-side-section">
        <button
          type="button"
          className="ex-side-header"
          onClick={() => setOthersOpen((v) => !v)}
          aria-expanded={othersOpen}
        >
          <span>Others</span>
          {othersOpen ? (
            <FiChevronUp size={16} strokeWidth={2.6} />
          ) : (
            <FiChevronDown size={16} strokeWidth={2.6} />
          )}
        </button>

        {othersOpen && (
          <div className="ex-side-list">
            {OTHERS_ITEMS.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  `ex-side-row ${item.subtle ? 'ex-side-row-subtle' : ''} ${
                    isActive ? 'ex-side-row-active' : ''
                  }`
                }
                onClick={onNavigate}
              >
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>

      {/* Section 3: All Sports */}
      <div className="ex-side-section">
        <button
          type="button"
          className="ex-side-header"
          onClick={() => setAllSportsOpen((v) => !v)}
          aria-expanded={allSportsOpen}
        >
          <span>All Sports</span>
          {allSportsOpen ? (
            <FiChevronUp size={16} strokeWidth={2.6} />
          ) : (
            <FiChevronDown size={16} strokeWidth={2.6} />
          )}
        </button>

        {allSportsOpen && (
          <div className="ex-side-list">
            {ALL_SPORTS_ITEMS.map((item) => {
              const isExpanded = Boolean(expandedSports[item.slug]);
              return (
                <div key={item.label} className="ex-sport-tree-item">
                  <div className="ex-side-row ex-side-row-sport">
                    <button
                      type="button"
                      className="ex-plus-box"
                      onClick={(e) => toggleSportExpand(item.slug, e)}
                      aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${item.label}`}
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? '−' : '+'}
                    </button>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        `ex-sport-row-link ${isActive ? 'fw-bold' : ''}`
                      }
                      onClick={onNavigate}
                    >
                      {item.label}
                    </NavLink>
                  </div>

                  {isExpanded && (
                    <div className="ex-side-sublist">
                      <Link to={item.to} className="ex-side-subrow" onClick={onNavigate}>
                        Live &amp; Hub
                      </Link>
                      <Link to="/fixtures" className="ex-side-subrow" onClick={onNavigate}>
                        Fixtures
                      </Link>
                      <Link to="/results" className="ex-side-subrow" onClick={onNavigate}>
                        Results
                      </Link>
                      <Link to="/leagues" className="ex-side-subrow" onClick={onNavigate}>
                        Leagues
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
