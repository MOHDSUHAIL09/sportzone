import React, { useState, useEffect } from 'react';
import { FiX, FiTarget, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { getFixtureOdds } from '../services/sportsApi';
import { useArena } from '../context/ArenaContext';
import EntityImage from './EntityImage';
import {
  canPredictFixture,
  extractMatchOddsMultipliers,
  formatCoins,
  formatDateTimeShort,
  formatSportName,
  getTeamDisplayName,
  sportSupportsDraw,
} from '../utils/formatters';

const QUICK_STAKES = [50, 100, 250, 500];

export default function PredictionModal({ fixture, onClose }) {
  const { state, placePrediction, hasPredictedFixture } = useArena();
  const [pick, setPick] = useState('home');
  const [stake, setStake] = useState(100);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [multipliers, setMultipliers] = useState(() =>
    extractMatchOddsMultipliers(null, fixture?.sport)
  );
  const [loadingOdds, setLoadingOdds] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!fixture?.id) return;
    let active = true;
    setLoadingOdds(true);
    setMultipliers(extractMatchOddsMultipliers(null, fixture.sport));
    getFixtureOdds(fixture.id)
      .then((res) => {
        if (!active) return;
        setMultipliers(extractMatchOddsMultipliers(res?.data, fixture.sport));
      })
      .catch(() => {
        // Fallback standard multipliers if odds endpoint unavailable for this sport/match
      })
      .finally(() => {
        if (active) setLoadingOdds(false);
      });
    return () => {
      active = false;
    };
  }, [fixture?.id, fixture?.sport]);

  if (!fixture) return null;

  const homeName = getTeamDisplayName(fixture.home, 'Home');
  const awayName = getTeamDisplayName(fixture.away, 'Away');
  const allowDraw = sportSupportsDraw(fixture.sport);
  const alreadyPicked = hasPredictedFixture(fixture.id);
  const canPick = canPredictFixture(fixture) && !alreadyPicked;

  const selectedMultiplier =
    pick === 'home'
      ? multipliers.home
      : pick === 'draw'
      ? multipliers.draw || 3.1
      : multipliers.away;

  const numericStake = Math.max(0, Number(stake) || 0);
  const potentialWin = Math.round(numericStake * selectedMultiplier);
  const exactBonus = homeScore !== '' && awayScore !== '' ? Math.round(numericStake * 1.5) : 0;

  function handleSubmit(e) {
    e.preventDefault();
    setFeedback(null);
    const result = placePrediction(fixture, {
      pick,
      stake: numericStake,
      predictedHomeScore: homeScore,
      predictedAwayScore: awayScore,
      multiplier: selectedMultiplier,
    });
    if (!result.ok) {
      setFeedback({ type: 'error', message: result.error });
    } else {
      setFeedback({
        type: 'success',
        message: `Prediction confirmed! ${formatCoins(numericStake)} virtual coins locked on ${
          pick === 'home' ? homeName : pick === 'away' ? awayName : 'Draw'
        }.`,
      });
    }
  }

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.78)', zIndex: 1080 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="predict-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="sz-card w-100"
        style={{ maxWidth: 520, backgroundColor: '#12141A', borderColor: 'var(--sz-border-strong)' }}
      >
        <div className="d-flex align-items-center justify-content-between mb-3 pb-3" style={{ borderBottom: '1px solid var(--sz-border)' }}>
          <div>
            <h2 id="predict-modal-title" className="sz-display h4 text-white mb-0">
              Match Prediction Slip
            </h2>
            <div className="small sz-muted">
              {formatSportName(fixture.sport)} · {fixture.league?.name || 'Tournament'} · {formatDateTimeShort(fixture.startTime)}
            </div>
          </div>
          <button type="button" className="sz-btn sz-btn-ghost sz-btn-sm" onClick={onClose} aria-label="Close modal">
            <FiX size={18} />
          </button>
        </div>

        {/* Match Header */}
        <div className="d-flex align-items-center justify-content-between gap-2 mb-4 py-2 px-3 rounded" style={{ backgroundColor: '#0B0D11', border: '1px solid var(--sz-border)' }}>
          <div className="d-flex align-items-center gap-2 min-w-0">
            <EntityImage src={fixture.home?.image} name={homeName} size={28} />
            <span className="fw-semibold text-white text-truncate">{homeName}</span>
          </div>
          <span className="sz-mono small sz-muted px-2">VS</span>
          <div className="d-flex align-items-center gap-2 min-w-0 justify-content-end">
            <span className="fw-semibold text-white text-truncate">{awayName}</span>
            <EntityImage src={fixture.away?.image} name={awayName} size={28} />
          </div>
        </div>

        {feedback ? (
          <div className="mb-3">
            <div
              className="p-3 rounded d-flex align-items-start gap-2"
              style={{
                backgroundColor: feedback.type === 'success' ? 'var(--sz-green-soft)' : 'var(--sz-danger-soft)',
                border: `1px solid ${feedback.type === 'success' ? 'rgba(32,217,139,0.35)' : 'rgba(239,68,68,0.35)'}`,
              }}
            >
              {feedback.type === 'success' ? (
                <FiCheckCircle size={18} className="sz-text-green flex-shrink-0 mt-1" />
              ) : (
                <FiAlertCircle size={18} style={{ color: 'var(--sz-danger)' }} className="flex-shrink-0 mt-1" />
              )}
              <div className="small text-white">{feedback.message}</div>
            </div>
            {feedback.type === 'success' && (
              <div className="d-flex justify-content-end mt-3">
                <button type="button" className="sz-btn sz-btn-primary" onClick={onClose}>
                  Done
                </button>
              </div>
            )}
          </div>
        ) : null}

        {feedback?.type !== 'success' && (
          <form onSubmit={handleSubmit}>
            {/* Step 1: Select Winner */}
            <div className="mb-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <label className="small fw-semibold text-white">1. Select Match Winner</label>
                <span className="small sz-muted">
                  {loadingOdds
                    ? 'Loading API odds...'
                    : multipliers.source === 'sportsapi'
                    ? 'Live SportsAPI odds'
                    : 'Standard Arena multipliers'}
                </span>
              </div>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className={`sz-pick-btn ${pick === 'home' ? 'selected' : ''}`}
                  onClick={() => setPick('home')}
                >
                  <div className="small text-truncate">{homeName}</div>
                  <div className="sz-mono fw-bold sz-text-green">{multipliers.home.toFixed(2)}x</div>
                </button>

                {allowDraw && (
                  <button
                    type="button"
                    className={`sz-pick-btn ${pick === 'draw' ? 'selected' : ''}`}
                    onClick={() => setPick('draw')}
                  >
                    <div className="small">Draw</div>
                    <div className="sz-mono fw-bold sz-text-green">{(multipliers.draw || 3.1).toFixed(2)}x</div>
                  </button>
                )}

                <button
                  type="button"
                  className={`sz-pick-btn ${pick === 'away' ? 'selected' : ''}`}
                  onClick={() => setPick('away')}
                >
                  <div className="small text-truncate">{awayName}</div>
                  <div className="sz-mono fw-bold sz-text-green">{multipliers.away.toFixed(2)}x</div>
                </button>
              </div>
            </div>

            {/* Step 2: Optional Exact Score */}
            <div className="mb-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <label className="small fw-semibold text-white">2. Exact Score Bonus (Optional)</label>
                <span className="small sz-text-orange">+1.5x bonus if exact</span>
              </div>
              <div className="row g-2 align-items-center">
                <div className="col">
                  <input
                    type="number"
                    min="0"
                    max="999"
                    placeholder={`${homeName} score`}
                    className="sz-input w-100 sz-mono"
                    value={homeScore}
                    onChange={(e) => setHomeScore(e.target.value)}
                  />
                </div>
                <div className="col-auto sz-mono sz-muted">-</div>
                <div className="col">
                  <input
                    type="number"
                    min="0"
                    max="999"
                    placeholder={`${awayName} score`}
                    className="sz-input w-100 sz-mono"
                    value={awayScore}
                    onChange={(e) => setAwayScore(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Virtual Coin Stake */}
            <div className="mb-4">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <label htmlFor="stake-input" className="small fw-semibold text-white">
                  3. Virtual Coin Stake (Demo)
                </label>
                <span className="small sz-mono sz-muted">
                  Balance: <strong className="text-white">{formatCoins(state.coins)}</strong> coins
                </span>
              </div>
              <div className="d-flex gap-2 mb-2">
                {QUICK_STAKES.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className={`sz-btn sz-btn-sm flex-fill ${
                      Number(stake) === amt ? 'sz-btn-primary' : 'sz-btn-outline'
                    }`}
                    onClick={() => setStake(amt)}
                    disabled={amt > state.coins}
                  >
                    {amt}
                  </button>
                ))}
              </div>
              <input
                id="stake-input"
                type="number"
                min="10"
                max={state.coins}
                step="10"
                className="sz-input w-100 sz-mono"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
              />
            </div>

            {/* Summary Row */}
            <div className="d-flex align-items-center justify-content-between py-2 px-3 rounded mb-3" style={{ backgroundColor: '#0B0D11', border: '1px solid var(--sz-border)' }}>
              <div>
                <div className="small sz-muted">Est. Virtual Payout</div>
                <div className="sz-mono fw-bold fs-5 sz-text-green">
                  {formatCoins(potentialWin)} coins
                  {exactBonus > 0 ? (
                    <span className="small sz-text-orange ms-2">(+{formatCoins(exactBonus)} exact)</span>
                  ) : null}
                </div>
              </div>
              <button
                type="submit"
                className="sz-btn sz-btn-primary"
                disabled={!canPick || numericStake < 10 || numericStake > state.coins}
              >
                <FiTarget size={16} />
                Confirm Prediction
              </button>
            </div>

            <div className="small sz-muted text-center">
              Demo localStorage wallet · Settled using official SportsAPI full-time results.
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
