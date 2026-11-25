import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiRefreshCw,
  FiTarget,
} from 'react-icons/fi';
import { GiCoins } from 'react-icons/gi';
import { getFixtures, getOdds } from '../services/sportsApi';
import { useArena } from '../context/ArenaContext';
import EntityImage from '../components/EntityImage';
import {
  ApiErrorCard,
  DemoWalletBanner,
  EmptyStateCard,
  LoadingSkeletonGrid,
} from '../components/StateBlocks';
import {
  canPredictFixture,
  extractMatchOddsMultipliers,
  formatCoins,
  formatDateTimeShort,
  formatSportName,
  getDateString,
  getTeamDisplayName,
  sportSupportsDraw,
} from '../utils/formatters';

const ARENA_SPORTS = ['football', 'cricket', 'tennis', 'basketball', 'ice-hockey', 'table-tennis'];
const QUICK_STAKES = [50, 100, 250, 500];

export default function PredictionArenaPage() {
  const {
    state,
    stats,
    settling,
    hasPredictedFixture,
    placePrediction,
    settleAllPending,
  } = useArena();

  const [sport, setSport] = useState('football');
  const [date, setDate] = useState(getDateString(0));
  const [fixtures, setFixtures] = useState([]);
  const [oddsMap, setOddsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedFixture, setSelectedFixture] = useState(null);
  const [pick, setPick] = useState('home');
  const [stake, setStake] = useState(100);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [slipMsg, setSlipMsg] = useState(null);
  const [settleMsg, setSettleMsg] = useState(null);

  async function loadArenaMatches(forceRefresh = false) {
    setLoading(true);
    setError(null);
    try {
      const [fxRes, oddsRes] = await Promise.allSettled([
        getFixtures({ sport, date }, { forceRefresh }),
        getOdds({ sport, date }, { forceRefresh }),
      ]);

      if (fxRes.status === 'fulfilled') {
        const list = fxRes.value?.data || [];
        setFixtures(list);
        const upcoming = list.filter(canPredictFixture);
        if (upcoming.length > 0) {
          setSelectedFixture((prev) =>
            prev && upcoming.some((u) => u.id === prev.id) ? prev : upcoming[0]
          );
        } else {
          setSelectedFixture(null);
        }
      } else {
        setError(fxRes.reason);
      }

      if (oddsRes.status === 'fulfilled') {
        const map = {};
        (oddsRes.value?.data || []).forEach((item) => {
          if (item.fixtureId) map[item.fixtureId] = item;
        });
        setOddsMap(map);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadArenaMatches(false);
  }, [sport, date]);

  const upcomingMatches = useMemo(
    () => fixtures.filter(canPredictFixture),
    [fixtures]
  );

  const activeOdds = useMemo(
    () =>
      selectedFixture
        ? extractMatchOddsMultipliers(oddsMap[selectedFixture.id], selectedFixture.sport)
        : null,
    [selectedFixture, oddsMap]
  );

  function handleSelectMatch(fx) {
    setSelectedFixture(fx);
    setPick('home');
    setHomeScore('');
    setAwayScore('');
    setSlipMsg(null);
  }

  function handleSubmitSlip(e) {
    e.preventDefault();
    if (!selectedFixture) return;
    setSlipMsg(null);
    const mult =
      pick === 'home'
        ? activeOdds.home
        : pick === 'draw'
        ? activeOdds.draw || 3.1
        : activeOdds.away;
    const res = placePrediction(selectedFixture, {
      pick,
      stake,
      predictedHomeScore: homeScore,
      predictedAwayScore: awayScore,
      multiplier: mult,
    });
    if (!res.ok) {
      setSlipMsg({ type: 'error', text: res.error });
    } else {
      setSlipMsg({
        type: 'success',
        text: `Prediction locked! ${formatCoins(stake)} virtual coins staked on ${
          pick === 'home'
            ? getTeamDisplayName(selectedFixture.home)
            : pick === 'away'
            ? getTeamDisplayName(selectedFixture.away)
            : 'Draw'
        }.`,
      });
      setHomeScore('');
      setAwayScore('');
    }
  }

  async function handleSettleAll() {
    setSettleMsg(null);
    const res = await settleAllPending();
    setSettleMsg(res.message);
  }

  const alreadyPicked = selectedFixture ? hasPredictedFixture(selectedFixture.id) : false;
  const allowDraw = selectedFixture ? sportSupportsDraw(selectedFixture.sport) : true;
  const selectedMult =
    activeOdds &&
    (pick === 'home'
      ? activeOdds.home
      : pick === 'draw'
      ? activeOdds.draw || 3.1
      : activeOdds.away);
  const potentialWin = Math.round((Number(stake) || 0) * (selectedMult || 2));

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
        <div>
          <h1 className="sz-display display-6 fw-bold text-white mb-1">Prediction Arena</h1>
          <div className="small sz-muted">
            Pick real upcoming SportsAPI matches, predict winners &amp; exact scores, and settle against official results
          </div>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2">
          <button
            type="button"
            className="sz-btn sz-btn-green sz-btn-sm"
            onClick={handleSettleAll}
            disabled={settling || stats.pending === 0}
          >
            <FiRefreshCw size={14} />
            {settling ? 'Checking Results...' : `Settle Pending (${stats.pending})`}
          </button>
          <Link to="/history" className="sz-btn sz-btn-outline sz-btn-sm">
            <FiClock size={14} /> My Picks ({stats.total})
          </Link>
        </div>
      </div>

      <DemoWalletBanner compact />

      {settleMsg && (
        <div className="sz-card py-2 px-3 d-flex align-items-center justify-content-between gap-2 small">
          <span className="text-white">{settleMsg}</span>
          <button type="button" className="sz-btn sz-btn-ghost sz-btn-sm" onClick={() => setSettleMsg(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* Sport & Date Controls */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div className="sz-scroll-strip">
          {ARENA_SPORTS.map((sp) => (
            <button
              key={sp}
              type="button"
              className={`sz-tab-btn ${sport === sp ? 'active' : ''}`}
              onClick={() => setSport(sp)}
            >
              {formatSportName(sp)}
            </button>
          ))}
        </div>

        <div className="d-flex align-items-center gap-2">
          {[0, 1, 2].map((off) => {
            const val = getDateString(off);
            const lbl = off === 0 ? 'Today' : off === 1 ? 'Tomorrow' : val;
            return (
              <button
                key={off}
                type="button"
                className={`sz-tab-btn ${date === val ? 'active' : ''}`}
                onClick={() => setDate(val)}
              >
                {lbl}
              </button>
            );
          })}
        </div>
      </div>

      {error && <ApiErrorCard error={error} onRetry={() => loadArenaMatches(true)} />}

      <div className="row g-4 align-items-start">
        {/* Left: Real Upcoming Matches List */}
        <div className="col-lg-7 col-xl-8">
          {loading ? (
            <LoadingSkeletonGrid count={6} colClass="col-md-6" height={124} />
          ) : upcomingMatches.length === 0 ? (
            <EmptyStateCard
              title={`No open ${formatSportName(sport)} matches on ${date}`}
              message="Matches lock automatically at kickoff. Select Tomorrow or switch sports to find open fixtures for predictions."
              actionLabel="Check Tomorrow's Fixtures"
              onAction={() => setDate(getDateString(1))}
            />
          ) : (
            <div className="row g-3">
              {upcomingMatches.slice(0, 40).map((fx) => {
                const isSelected = selectedFixture?.id === fx.id;
                const picked = hasPredictedFixture(fx.id);
                const mults = extractMatchOddsMultipliers(oddsMap[fx.id], fx.sport);
                return (
                  <div className="col-md-6" key={fx.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectMatch(fx)}
                      className="sz-card w-100 text-start"
                      style={{
                        borderColor: isSelected
                          ? 'var(--sz-orange)'
                          : picked
                          ? 'rgba(32,217,139,0.4)'
                          : 'var(--sz-border)',
                        backgroundColor: isSelected ? '#171B24' : 'var(--sz-surface)',
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center small sz-muted mb-2">
                        <span className="text-truncate">{fx.league?.name || 'Tournament'}</span>
                        <span className="sz-mono flex-shrink-0 ms-2">
                          {formatDateTimeShort(fx.startTime)}
                        </span>
                      </div>

                      <div className="d-flex flex-column gap-2 mb-3">
                        <div className="d-flex align-items-center justify-content-between">
                          <div className="d-flex align-items-center gap-2 min-w-0">
                            <EntityImage src={fx.home?.image} name={fx.home?.name} size={22} />
                            <span className="fw-semibold text-white text-truncate">
                              {getTeamDisplayName(fx.home)}
                            </span>
                          </div>
                          <span className="sz-mono small sz-text-green">{mults.home.toFixed(2)}x</span>
                        </div>

                        <div className="d-flex align-items-center justify-content-between">
                          <div className="d-flex align-items-center gap-2 min-w-0">
                            <EntityImage src={fx.away?.image} name={fx.away?.name} size={22} />
                            <span className="fw-semibold text-white text-truncate">
                              {getTeamDisplayName(fx.away)}
                            </span>
                          </div>
                          <span className="sz-mono small sz-text-green">{mults.away.toFixed(2)}x</span>
                        </div>
                      </div>

                      <div className="d-flex justify-content-between align-items-center small pt-2" style={{ borderTop: '1px solid var(--sz-border)' }}>
                        <span className={picked ? 'sz-text-green fw-semibold' : 'sz-text-orange fw-semibold'}>
                          {picked ? 'Already Predicted' : isSelected ? 'Selected in Slip' : 'Select Match'}
                        </span>
                        <span className="sz-muted">
                          {mults.source === 'sportsapi' ? 'API Odds' : 'Arena Odds'}
                        </span>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Sticky Interactive Prediction Slip */}
        <div className="col-lg-5 col-xl-4">
          <div className="sz-card position-sticky" style={{ top: 150 }}>
            <div className="d-flex align-items-center justify-content-between mb-3 pb-2" style={{ borderBottom: '1px solid var(--sz-border)' }}>
              <h2 className="sz-display h4 text-white mb-0">Prediction Slip</h2>
              <span className="sz-mono small sz-text-orange d-inline-flex align-items-center gap-1 fw-bold">
                <GiCoins size={15} /> {formatCoins(state.coins)}
              </span>
            </div>

            {!selectedFixture ? (
              <div className="small sz-muted py-4 text-center">
                Select any upcoming match from the left to build your virtual coin prediction.
              </div>
            ) : (
              <form onSubmit={handleSubmitSlip} className="d-flex flex-column gap-3">
                <div className="p-3 rounded" style={{ backgroundColor: '#0B0D11', border: '1px solid var(--sz-border)' }}>
                  <div className="small sz-muted mb-1">
                    {selectedFixture.league?.name} · {formatDateTimeShort(selectedFixture.startTime)}
                  </div>
                  <div className="fw-bold text-white">
                    {getTeamDisplayName(selectedFixture.home)} vs {getTeamDisplayName(selectedFixture.away)}
                  </div>
                </div>

                {alreadyPicked ? (
                  <div className="p-3 rounded small" style={{ backgroundColor: 'var(--sz-green-soft)', border: '1px solid rgba(32,217,139,0.35)' }}>
                    <div className="fw-semibold text-white mb-1">
                      <FiCheckCircle className="me-1 sz-text-green" /> Duplicate Protection Active
                    </div>
                    <div className="sz-muted">
                      You already placed a prediction on this fixture. Track it in Prediction History or select another match.
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="small fw-semibold text-white d-block mb-2">Pick Winner</label>
                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          className={`sz-pick-btn ${pick === 'home' ? 'selected' : ''}`}
                          onClick={() => setPick('home')}
                        >
                          <div className="small text-truncate">{getTeamDisplayName(selectedFixture.home)}</div>
                          <div className="sz-mono fw-bold sz-text-green">{activeOdds.home.toFixed(2)}x</div>
                        </button>
                        {allowDraw && (
                          <button
                            type="button"
                            className={`sz-pick-btn ${pick === 'draw' ? 'selected' : ''}`}
                            onClick={() => setPick('draw')}
                          >
                            <div className="small">Draw</div>
                            <div className="sz-mono fw-bold sz-text-green">{(activeOdds.draw || 3.1).toFixed(2)}x</div>
                          </button>
                        )}
                        <button
                          type="button"
                          className={`sz-pick-btn ${pick === 'away' ? 'selected' : ''}`}
                          onClick={() => setPick('away')}
                        >
                          <div className="small text-truncate">{getTeamDisplayName(selectedFixture.away)}</div>
                          <div className="sz-mono fw-bold sz-text-green">{activeOdds.away.toFixed(2)}x</div>
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="d-flex justify-content-between small mb-2">
                        <label className="fw-semibold text-white">Exact Score (Optional)</label>
                        <span className="sz-text-orange">+1.5x exact bonus</span>
                      </div>
                      <div className="row g-2 align-items-center">
                        <div className="col">
                          <input
                            type="number"
                            min="0"
                            max="999"
                            placeholder="Home"
                            className="sz-input w-100 sz-mono"
                            value={homeScore}
                            onChange={(e) => setHomeScore(e.target.value)}
                          />
                        </div>
                        <div className="col-auto sz-muted">-</div>
                        <div className="col">
                          <input
                            type="number"
                            min="0"
                            max="999"
                            placeholder="Away"
                            className="sz-input w-100 sz-mono"
                            value={awayScore}
                            onChange={(e) => setAwayScore(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="arena-stake" className="small fw-semibold text-white d-block mb-2">
                        Virtual Coins Stake
                      </label>
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
                        id="arena-stake"
                        type="number"
                        min="10"
                        max={state.coins}
                        step="10"
                        className="sz-input w-100 sz-mono"
                        value={stake}
                        onChange={(e) => setStake(e.target.value)}
                      />
                    </div>

                    <div className="p-3 rounded d-flex justify-content-between align-items-center" style={{ backgroundColor: '#0B0D11', border: '1px solid var(--sz-border)' }}>
                      <span className="small sz-muted">Est. Payout</span>
                      <span className="sz-mono fw-bold fs-5 sz-text-green">
                        {formatCoins(potentialWin)} coins
                      </span>
                    </div>

                    {slipMsg && (
                      <div
                        className="p-2 px-3 rounded small d-flex align-items-start gap-2"
                        style={{
                          backgroundColor: slipMsg.type === 'success' ? 'var(--sz-green-soft)' : 'var(--sz-danger-soft)',
                          border: `1px solid ${slipMsg.type === 'success' ? 'rgba(32,217,139,0.35)' : 'rgba(239,68,68,0.35)'}`,
                        }}
                      >
                        {slipMsg.type === 'success' ? (
                          <FiCheckCircle className="sz-text-green flex-shrink-0 mt-1" />
                        ) : (
                          <FiAlertCircle style={{ color: 'var(--sz-danger)' }} className="flex-shrink-0 mt-1" />
                        )}
                        <span className="text-white">{slipMsg.text}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="sz-btn sz-btn-primary w-100"
                      disabled={Number(stake) < 10 || Number(stake) > state.coins}
                    >
                      <FiTarget size={16} /> Confirm Virtual Prediction
                    </button>
                  </>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
