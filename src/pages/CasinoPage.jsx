import React from 'react';
import { useSearchParams } from 'react-router-dom';
import CasinoGamesGrid from '../components/CasinoGamesGrid';

export default function CasinoPage({ defaultCategory = 'all' }) {
  const [searchParams] = useSearchParams();
  const cat = searchParams.get('cat') || defaultCategory || 'all';

  return (
    <div className="d-flex flex-column gap-2">
      <CasinoGamesGrid initialCategory={cat} showFilterBar />
    </div>
  );
}
