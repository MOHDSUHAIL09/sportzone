import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiCheckCircle, FiTarget } from 'react-icons/fi';
import EntityImage from './EntityImage';
import {
  canPredictFixture,
  formatClock,
  formatMatchTime,
  formatSportName,
  getPeriodPairs,
  getScoreText,
  getTeamDisplayName,
  isFinishedFixture,
  isLiveFixture,
} from '../utils/formatters';
import { useArena } from '../context/ArenaContext';

export default function MatchCard({ fixture, onPredict, showSport = false }) {
  const { getPredictionForFixture } = useArena();
  if (!fixture) return null;

  const live = isLiveFixture(fixture);
  const finished = isFinishedFixture(fixture);
  const predictable = canPredictFixture(fixture);
  const existingPick = getPredictionForFixture(fixture.id);

  const homeName = getTeamDisplayName(fixture.home, 'Home');
  const awayName = getTeamDisplayName(fixture.away, 'Away');
  const homeScore = getScoreText(fixture, 'home');
  const awayScore = getScoreText(fixture, 'away');
  const periods = getPeriodPairs(fixture);

  return (
    <div className="sz-match-card h-100">
      {/* Unboxed Metadata Header */}
      <div className="sz-match-meta">
        <div className="sz-match-meta-left">
          {fixture.league?.image && (
            <EntityImage src={fixture.league.image} name={fixture.league.name} size={18} />
          )}
          <span className="text-truncate">
            {showSport && (
              <>
                <span className="text-white fw-semibold">{formatSportName(fixture.sport)}</span>
                <span className="mx-1" aria-hidden="true">·</span>
              </>
            )}
            {fixture.league?.id ? (
              <Link
                to={`/league/${fixture.league.id}`}
                className="text-decoration-none"
                style={{ color: 'var(--sz-text-secondary)' }}
              >
                {fixture.league.name}
              </Link>
            ) : (
              <span>{fixture.league?.name || 'Tournament'}</span>
            )}
            {fixture.league?.category ? (
              <>
                <span className="mx-1" aria-hidden="true">·</span>
                <span>{fixture.league.category}</span>
              </>
            ) : null}
          </span>
        </div>

        <div className="flex-shrink-0">
          {live ? (
            <span className="sz-live-text">
              <span className="sz-live-dot" aria-hidden="true" />
              LIVE {formatClock(fixture) ? `· ${formatClock(fixture)}` : ''}
            </span>
          ) : finished ? (
            <span className="sz-mono small" style={{ color: 'var(--sz-text-muted)' }}>
              FT
            </span>
          ) : (
            <span className="sz-mono small" style={{ color: 'var(--sz-text-secondary)' }}>
              {formatMatchTime(fixture.startTime)}
            </span>
          )}
        </div>
      </div>

      {/* Teams & Scores */}
      <Link to={`/match/${fixture.id}`} className="d-flex flex-column gap-2 text-decoration-none">
        <div className="sz-team-row">
          <div className="sz-team-identity">
            <EntityImage src={fixture.home?.image} name={homeName} size={26} />
            <span className={`sz-team-name ${fixture.winner === 'home' ? 'winner' : ''}`}>
              {homeName}
            </span>
          </div>
          <span className={`sz-score-num ${live ? 'live' : ''}`}>{homeScore}</span>
        </div>

        <div className="sz-team-row">
          <div className="sz-team-identity">
            <EntityImage src={fixture.away?.image} name={awayName} size={26} />
            <span className={`sz-team-name ${fixture.winner === 'away' ? 'winner' : ''}`}>
              {awayName}
            </span>
          </div>
          <span className={`sz-score-num ${live ? 'live' : ''}`}>{awayScore}</span>
        </div>
      </Link>

      {/* Period Breakdown (compact unboxed text if present) */}
      {periods.length > 0 && (
        <div className="sz-mono d-flex flex-wrap gap-3" style={{ fontSize: '0.73rem', color: 'var(--sz-text-muted)' }}>
          {periods.slice(0, 5).map((p) => (
            <span key={p.key}>
              {p.label}: <span className="text-white">{p.home}-{p.away}</span>
            </span>
          ))}
        </div>
      )}

      {/* Action Footer */}
      <div className="sz-match-footer mt-auto">
        <Link to={`/match/${fixture.id}`} className="sz-btn sz-btn-ghost sz-btn-sm px-0">
          Match Center
          <FiArrowRight size={14} />
        </Link>

        {existingPick ? (
          <Link to="/history" className="sz-mono small d-inline-flex align-items-center gap-1 sz-text-green">
            <FiCheckCircle size={14} />
            Picked ({existingPick.pick.toUpperCase()})
          </Link>
        ) : predictable && onPredict ? (
          <button
            type="button"
            className="sz-btn sz-btn-primary sz-btn-sm"
            onClick={() => onPredict(fixture)}
          >
            <FiTarget size={14} />
            Predict
          </button>
        ) : (
          <span className="small sz-muted">
            {live ? 'In Progress' : finished ? 'Final' : fixture.status?.description || 'Scheduled'}
          </span>
        )}
      </div>
    </div>
  );
}
