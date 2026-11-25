import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  MdSportsBaseball,
  MdSportsBasketball,
  MdSportsCricket,
  MdSportsEsports,
  MdSportsFootball,
  MdSportsHandball,
  MdSportsHockey,
  MdSportsMma,
  MdSportsRugby,
  MdSportsSoccer,
  MdSportsTennis,
  MdSportsVolleyball,
} from 'react-icons/md';
import { FaDog, FaHorse, FaTableTennis } from 'react-icons/fa';
import { GiShuttlecock } from 'react-icons/gi';
import { getLiveScores, getMainEvents } from '../services/sportsApi';
import { getDateString, getTeamDisplayName } from '../utils/formatters';

const SPORT_STRIP_TABS = [
  { label: 'Cricket', slug: 'cricket', to: '/sport/cricket' },
  { label: 'Football', slug: 'football', to: '/sport/football' },
  { label: 'Tennis', slug: 'tennis', to: '/sport/tennis' },
  { label: 'Table Tennis', slug: 'table-tennis', to: '/sport/table-tennis' },
  { label: 'Horse Racing', slug: 'horse-racing', to: '/sports' },
  { label: 'Greyhound Racing', slug: 'greyhound-racing', to: '/sports' },
  { label: 'Basketball', slug: 'basketball', to: '/sport/basketball' },
  { label: 'Wrestling', slug: 'wrestling', to: '/sport/mma' },
  { label: 'Volleyball', slug: 'volleyball', to: '/sport/volleyball' },
  { label: 'Badminton', slug: 'badminton', to: '/sport/badminton' },
  { label: 'E Games', slug: 'esports', to: '/sport/esports' },
  { label: 'Snooker', slug: 'snooker', to: '/sport/snooker' },
  { label: 'American Football', slug: 'american-football', to: '/sport/american-football' },
  { label: 'Boxing', slug: 'mma', to: '/sport/mma' },
  { label: 'Ice Hockey', slug: 'ice-hockey', to: '/sport/ice-hockey' },
  { label: 'Handball', slug: 'handball', to: '/sport/handball' },
  { label: 'Rugby', slug: 'rugby', to: '/sport/rugby' },
  { label: 'Baseball', slug: 'baseball', to: '/sport/baseball' },
];

function getSportIcon(sport) {
  switch (sport) {
    case 'cricket':
      return <MdSportsCricket size={16} />;
    case 'football':
    case 'futsal':
    case 'minifootball':
      return <MdSportsSoccer size={15} />;
    case 'tennis':
    case 'padel':
      return <MdSportsTennis size={15} />;
    case 'table-tennis':
      return <FaTableTennis size={14} />;
    case 'horse-racing':
      return <FaHorse size={15} />;
    case 'greyhound-racing':
      return <FaDog size={15} />;
    case 'basketball':
      return <MdSportsBasketball size={15} />;
    case 'volleyball':
      return <MdSportsVolleyball size={15} />;
    case 'badminton':
      return <GiShuttlecock size={15} />;
    case 'esports':
      return <MdSportsEsports size={16} />;
    case 'ice-hockey':
      return <MdSportsHockey size={15} />;
    case 'handball':
      return <MdSportsHandball size={15} />;
    case 'american-football':
      return <MdSportsFootball size={15} />;
    case 'baseball':
      return <MdSportsBaseball size={15} />;
    case 'rugby':
      return <MdSportsRugby size={15} />;
    case 'mma':
      return <MdSportsMma size={15} />;
    default:
      return <MdSportsSoccer size={15} />;
  }
}

export default function LiveSubHeader() {
  const location = useLocation();
  const [featuredMatches, setFeaturedMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadFeatured() {
      try {
        const liveRes = await getLiveScores();
        const liveData = liveRes?.data || [];
        if (liveData.length >= 5) {
          // Prioritize cricket/football/tennis/basketball + table-tennis for diverse top 5
          const priority = { cricket: 1, football: 2, tennis: 3, basketball: 4, 'table-tennis': 5 };
          const sorted = [...liveData].sort(
            (a, b) => (priority[a.sport] || 9) - (priority[b.sport] || 9)
          );
          if (active) setFeaturedMatches(sorted.slice(0, 5));
        } else {
          // Supplement with today's main events from SportsAPI if fewer than 5 live matches
          const mainRes = await getMainEvents({ date: getDateString(0) }).catch(() => ({ data: [] }));
          const combined = [...liveData];
          const seen = new Set(combined.map((m) => m.id));
          for (const m of mainRes?.data || []) {
            if (!seen.has(m.id)) {
              combined.push(m);
              seen.add(m.id);
            }
            if (combined.length >= 5) break;
          }
          if (active) setFeaturedMatches(combined.slice(0, 5));
        }
      } catch {
        // Keep clean empty state if API unreachable
      } finally {
        if (active) setLoading(false);
      }
    }
    loadFeatured();
    return () => {
      active = false;
    };
  }, []);

  const searchParams = new URLSearchParams(location.search);
  const homeSportParam = location.pathname === '/' ? searchParams.get('sport') || 'cricket' : null;

  // Determine which sport tab should show active blue highlight
  function isTabActive(tab) {
    if (location.pathname === '/') {
      return homeSportParam === tab.slug;
    }
    if (location.pathname === `/sport/${tab.slug}` || location.pathname === `/${tab.slug}`) {
      return true;
    }
    // On non-sport pages, highlight Cricket as default active tab just like reference
    const onAnySportTab = SPORT_STRIP_TABS.some(
      (t) => location.pathname === `/sport/${t.slug}` || location.pathname === `/${t.slug}`
    );
    if (!onAnySportTab && tab.slug === 'cricket') {
      return true;
    }
    return false;
  }

  function getTabDestination(tab) {
    if (location.pathname === '/' && tab.to.startsWith('/sport/')) {
      const apiSport = tab.to.replace('/sport/', '');
      return `/?sport=${apiSport}`;
    }
    return tab.to;
  }

  return (
    <div className="ex-subheader-wrap">
      {/* Row 1: Blinking Featured Live Matches Bar (aligned with Racing Sports) */}
      <div className="ex-live-ticker-bar" aria-label="Featured live matches">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="ex-live-pill ex-live-pill-loading">
              <span className="ex-live-blink-content">Loading live match...</span>
            </div>
          ))
        ) : featuredMatches.length > 0 ? (
          featuredMatches.map((fx) => {
            const home = getTeamDisplayName(fx.home, 'Home');
            const away = getTeamDisplayName(fx.away, 'Away');
            const sep = fx.sport === 'cricket' || fx.sport === 'football' ? ' v ' : ' - ';
            return (
              <Link
                key={fx.id}
                to={`/match/${fx.id}`}
                className="ex-live-pill"
                title={`${home}${sep}${away}`}
              >
                <span className="ex-live-blink-content">
                  <span className="ex-live-pill-icon">{getSportIcon(fx.sport)}</span>
                  <span className="ex-live-pill-text">
                    {home}
                    {sep}
                    {away}
                  </span>
                </span>
              </Link>
            );
          })
        ) : (
          <Link to="/live" className="ex-live-pill">
            <span className="ex-live-blink-content">
              <span className="ex-live-pill-icon"><MdSportsCricket size={16} /></span>
              <span className="ex-live-pill-text">View Live Scores on SportsAPI</span>
            </span>
          </Link>
        )}
      </div>

      {/* Desktop Row 2: Grey Horizontal Sports Category Tabs Strip (aligned with Others) */}
      <div className="ex-sport-tabs-strip d-none d-lg-flex" role="tablist" aria-label="Sports category tabs">
        {SPORT_STRIP_TABS.map((tab) => {
          const active = isTabActive(tab);
          return (
            <Link
              key={tab.label}
              to={getTabDestination(tab)}
              role="tab"
              aria-selected={active}
              className={`ex-sport-strip-tab ${active ? 'active' : ''}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Mobile Row 2: Black Vertical-Divider Category Strip (CRASH | LOTTERY | SPORTS | OUR CASINO | LIVE CASINO | SLOTS | FANTASY) */}
      <nav className="ex-mob-black-strip d-lg-none" aria-label="Mobile quick sections">
        {[
          { label: 'CRASH', to: '/casino?cat=all', isCrash: true },
          { label: 'LOTTERY', to: '/casino?cat=matka' },
          { label: 'SPORTS', to: '/' },
          { label: 'OUR CASINO', to: '/casino?cat=teenpatti' },
          { label: 'LIVE CASINO', to: '/casino?cat=baccarat' },
          { label: 'SLOTS', to: '/casino?cat=roulette' },
          { label: 'FANTASY', to: '/arena' },
        ].map((item) => (
          <Link key={item.label} to={item.to} className="ex-mob-black-item">
            {item.isCrash && <span className="ex-mob-crash-icon" aria-hidden="true" />}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Mobile Row 3: Blue Icon-Above-Label Sports Strip (CRICKET | FOOTBALL | TENNIS | TABLE TENNIS | HORSE RACING ...) */}
      <div className="ex-mob-blue-sports d-lg-none" role="tablist" aria-label="Mobile sports categories">
        {SPORT_STRIP_TABS.map((tab) => {
          const active = isTabActive(tab);
          return (
            <Link
              key={`mob-${tab.label}`}
              to={getTabDestination(tab)}
              role="tab"
              aria-selected={active}
              className={`ex-mob-sport-tab ${active ? 'active' : ''}`}
            >
              <span className="ex-mob-sport-ico">{getSportIcon(tab.slug)}</span>
              <span className="ex-mob-sport-lbl">{tab.label.toUpperCase()}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
