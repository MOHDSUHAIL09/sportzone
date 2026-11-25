import React from 'react';
import { useSearchParams } from 'react-router-dom';
import ExchangeMatchBoard from '../components/ExchangeMatchBoard';
import CasinoGamesGrid from '../components/CasinoGamesGrid';

export default function HomePage() {
  const [searchParams] = useSearchParams();
  const sport = searchParams.get('sport') || 'cricket';

  return (
    <div className="ex-home-wrap">
      {/* 1. LIVE & UPCOMING EXCHANGE SPORTSBOARD (Real SportsAPI data + Back/Lay Odds columns) */}
      <ExchangeMatchBoard sport={sport} maxRows={24} includeTomorrow compactScroll />

      {/* 2. EXACT CASINO GAMES POSTER GRID (Immediately below 3-row match board, playable on click) */}
      <section className="ex-home-games-wrap">
        <CasinoGamesGrid initialCategory="all" showFilterBar={false} />
      </section>
    </div>
  );
}
