import React from 'react';
import { useParams } from 'react-router-dom';
import ExchangeMatchBoard from '../components/ExchangeMatchBoard';

export default function SportHubPage({ defaultSport }) {
  const { sportSlug } = useParams();
  const sport = sportSlug || defaultSport || 'cricket';

  return (
    <div className="ex-home-wrap">
      <ExchangeMatchBoard sport={sport} maxRows={50} includeTomorrow />
    </div>
  );
}
