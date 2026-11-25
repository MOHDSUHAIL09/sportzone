import React from 'react';
import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { label: 'HOME', to: '/', end: true },
  { label: 'LOTTERY', to: '/casino?cat=matka' },
  { label: 'CRICKET', to: '/sport/cricket' },
  { label: 'TENNIS', to: '/sport/tennis' },
  { label: 'FOOTBALL', to: '/sport/football' },
  { label: 'TABLE TENNIS', to: '/sport/table-tennis' },
  { label: 'BACCARAT', to: '/casino?cat=baccarat' },
  { label: '32 CARDS', to: '/casino?cat=32cards' },
  { label: 'TEENPATTI', to: '/casino?cat=teenpatti' },
  { label: 'POKER', to: '/casino?cat=poker' },
  { label: 'LUCKY 7', to: '/casino?cat=lucky7' },
  { label: 'CRASH', to: '/casino?cat=all', isCrash: true },
];

export default function SecondaryNavBar() {
  return (
    <nav className="ex-blue-navbar d-none d-lg-flex" aria-label="Primary sports navigation">
      <div className="ex-blue-nav-list">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `ex-blue-nav-item ${isActive && !item.to.includes('?') ? 'active' : ''} ${
                item.isCrash ? 'ex-nav-crash' : ''
              }`
            }
          >
            {item.isCrash && (
              <span className="ex-crash-streak" aria-hidden="true" />
            )}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
