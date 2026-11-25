import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FiCheckCircle,
  FiDatabase,
  FiRefreshCw,
  FiSave,
  FiTarget,
  FiTrash2,
} from 'react-icons/fi';
import { useArena } from '../context/ArenaContext';
import { clearApiCache, getCacheStats, getStoredQuota } from '../services/sportsApi';
import EntityImage from '../components/EntityImage';
import { DemoWalletBanner, EmptyStateCard } from '../components/StateBlocks';
import {
  formatCoins,
  formatDateTimeShort,
  formatSportName,
} from '../utils/formatters';

export function UserDashboardPage() {
  const {
    state,
    stats,
    settling,
    updateProfile,
    settleAllPending,
  } = useArena();

  const [displayName, setDisplayName] = useState(state.profile.displayName || '');
  const [favoriteSport, setFavoriteSport] = useState(state.profile.favoriteSport || 'football');
  const [savedNotice, setSavedNotice] = useState(false);
  const [settleFeedback, setSettleFeedback] = useState('');
  const [quota, setQuota] = useState(getStoredQuota);
  const [cacheInfo, setCacheInfo] = useState(getCacheStats);

  useEffect(() => {
    const onQuota = (e) => setQuota(e.detail);
    window.addEventListener('sportzone:quota-updated', onQuota);
    return () => window.removeEventListener('sportzone:quota-updated', onQuota);
  }, []);

  function handleSaveProfile(e) {
    e.preventDefault();
    updateProfile({
      displayName: displayName.trim() || 'Arena Challenger',
      favoriteSport,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  }

  async function handleSettle() {
    const res = await settleAllPending();
    setSettleFeedback(res.message);
  }

  function handleClearCache() {
    clearApiCache();
    setCacheInfo(getCacheStats());
  }

  const pendingPicks = state.predictions.filter((p) => p.status === 'pending');

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
        <div>
          <h1 className="sz-display display-6 fw-bold text-white mb-1">User Dashboard</h1>
          <div className="small sz-muted">
            Welcome back, <strong className="text-white">{state.profile.displayName}</strong> · Manage
            your Arena profile, active predictions, favorites, and SportsAPI cache
          </div>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="sz-btn sz-btn-green sz-btn-sm"
            onClick={handleSettle}
            disabled={settling || pendingPicks.length === 0}
          >
            <FiRefreshCw size={14} /> {settling ? 'Settling...' : `Verify Pending (${pendingPicks.length})`}
          </button>
          <Link to="/arena" className="sz-btn sz-btn-primary sz-btn-sm">
            <FiTarget size={14} /> New Prediction
          </Link>
        </div>
      </div>

      <DemoWalletBanner compact />

      {settleFeedback && (
        <div className="sz-card py-2 px-3 small text-white">{settleFeedback}</div>
      )}

      {/* Player KPIs */}
      <div className="row g-3">
        <div className="col-6 col-md-3">
          <div className="sz-card">
            <div className="small sz-muted">Virtual Coins</div>
            <div className="sz-mono fw-bold fs-3 sz-text-orange">{formatCoins(state.coins)}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="sz-card">
            <div className="small sz-muted">Reward Points</div>
            <div className="sz-mono fw-bold fs-3 sz-text-green">{formatCoins(state.rewardPoints)}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="sz-card">
            <div className="small sz-muted">Win Rate</div>
            <div className="sz-mono fw-bold fs-3 text-white">{stats.winRate}%</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="sz-card">
            <div className="small sz-muted">Current / Best Streak</div>
            <div className="sz-mono fw-bold fs-3 text-white">
              {state.currentStreak} / {state.bestStreak}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Profile Settings */}
        <div className="col-lg-6">
          <div className="sz-card h-100">
            <h2 className="sz-display h5 text-white mb-3">Player Profile (Local Demo)</h2>
            <form onSubmit={handleSaveProfile} className="d-flex flex-column gap-3">
              <div>
                <label htmlFor="profile-name" className="small sz-muted d-block mb-1">
                  Display Name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  className="sz-input w-100"
                  maxLength={32}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="profile-sport" className="small sz-muted d-block mb-1">
                  Favorite Sport
                </label>
                <select
                  id="profile-sport"
                  className="sz-select w-100"
                  value={favoriteSport}
                  onChange={(e) => setFavoriteSport(e.target.value)}
                >
                  {['football', 'cricket', 'tennis', 'basketball', 'table-tennis', 'ice-hockey', 'mma'].map((s) => (
                    <option key={s} value={s}>
                      {formatSportName(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="d-flex align-items-center gap-3">
                <button type="submit" className="sz-btn sz-btn-primary sz-btn-sm">
                  <FiSave size={14} /> Save Profile
                </button>
                {savedNotice && (
                  <span className="small sz-text-green d-inline-flex align-items-center gap-1">
                    <FiCheckCircle size={14} /> Profile updated
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* SportsAPI Quota & Cache Panel */}
        <div className="col-lg-6">
          <div className="sz-card h-100 d-flex flex-column justify-content-between">
            <div>
              <h2 className="sz-display h5 text-white mb-3 d-flex align-items-center gap-2">
                <FiDatabase size={16} className="sz-text-orange" /> SportsAPI Quota &amp; Cache
              </h2>
              <div className="d-flex flex-column gap-2 small">
                <div className="d-flex justify-content-between py-2" style={{ borderBottom: '1px solid var(--sz-border)' }}>
                  <span className="sz-muted">Rate Limit Remaining</span>
                  <span className="sz-mono fw-bold sz-text-green">
                    {quota?.remaining !== null && quota?.remaining !== undefined
                      ? `${quota.remaining} / ${quota.limit || '—'}`
                      : 'Tracked on next live call'}
                  </span>
                </div>
                <div className="d-flex justify-content-between py-2" style={{ borderBottom: '1px solid var(--sz-border)' }}>
                  <span className="sz-muted">Memory Cache Entries</span>
                  <span className="sz-mono text-white">{cacheInfo.memoryEntries}</span>
                </div>
                <div className="d-flex justify-content-between py-2">
                  <span className="sz-muted">Persisted Local Cache Entries</span>
                  <span className="sz-mono text-white">{cacheInfo.persistentEntries}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 d-flex justify-content-between align-items-center" style={{ borderTop: '1px solid var(--sz-border)' }}>
              <span className="small sz-muted">Smart TTL caching reduces API quota usage.</span>
              <button type="button" className="sz-btn sz-btn-outline sz-btn-sm" onClick={handleClearCache}>
                <FiTrash2 size={14} /> Clear Cache
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Predictions */}
      <section>
        <div className="sz-section-head">
          <h2 className="sz-section-title">Pending Predictions ({pendingPicks.length})</h2>
          <Link to="/history" className="small sz-text-orange fw-semibold">
            View Full History
          </Link>
        </div>
        {pendingPicks.length === 0 ? (
          <EmptyStateCard
            title="No pending predictions"
            message="Head to the Prediction Arena or Fixtures page to stake demo virtual coins on upcoming matches."
          />
        ) : (
          <div className="row g-3">
            {pendingPicks.slice(0, 6).map((p) => (
              <div className="col-md-6 col-xl-4" key={p.id}>
                <div className="sz-card h-100">
                  <div className="small sz-muted mb-1">
                    {formatSportName(p.sport)} · {p.leagueName}
                  </div>
                  <Link to={`/match/${p.fixtureId}`} className="fw-bold text-white d-block mb-2">
                    {p.homeTeam.name} vs {p.awayTeam.name}
                  </Link>
                  <div className="small sz-mono sz-muted">
                    Pick: <strong className="sz-text-orange">{p.pick.toUpperCase()}</strong> ({p.multiplier}x)
                    {p.predictedHomeScore !== null && p.predictedAwayScore !== null
                      ? ` · Score ${p.predictedHomeScore}-${p.predictedAwayScore}`
                      : ''}
                  </div>
                  <div className="small sz-mono mt-1">
                    Stake: <span className="text-white">{formatCoins(p.stake)}</span> → Est.{' '}
                    <span className="sz-text-green">{formatCoins(p.potentialPayout)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Followed Teams & Leagues */}
      {(state.favorites.teams.length > 0 || state.favorites.leagues.length > 0 || state.favorites.fixtures.length > 0) && (
        <section>
          <h2 className="sz-section-title mb-3">Saved Bookmarks</h2>
          <div className="row g-3">
            {state.favorites.teams.map((t) => (
              <div className="col-6 col-md-4 col-xl-3" key={`t-${t.id}`}>
                <Link to={`/team/${t.id}`} className="sz-card sz-card-interactive d-flex align-items-center gap-2 text-decoration-none">
                  <EntityImage src={t.image} name={t.name} size={28} />
                  <span className="small fw-semibold text-white text-truncate">{t.name}</span>
                </Link>
              </div>
            ))}
            {state.favorites.leagues.map((l) => (
              <div className="col-6 col-md-4 col-xl-3" key={`l-${l.id}`}>
                <Link to={`/league/${l.id}`} className="sz-card sz-card-interactive d-flex align-items-center gap-2 text-decoration-none">
                  <EntityImage src={l.image} name={l.name} size={28} />
                  <span className="small fw-semibold text-white text-truncate">{l.name}</span>
                </Link>
              </div>
            ))}
            {state.favorites.fixtures.map((f) => (
              <div className="col-6 col-md-4 col-xl-3" key={`f-${f.id}`}>
                <Link to={`/match/${f.id}`} className="sz-card sz-card-interactive d-block text-decoration-none">
                  <div className="small fw-semibold text-white text-truncate">{f.name}</div>
                  <div className="sz-muted" style={{ fontSize: '0.72rem' }}>{f.league}</div>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function PredictionHistoryPage() {
  const { state, stats, settling, settleSinglePrediction, settleAllPending } = useArena();
  const [filter, setFilter] = useState('all'); // all | pending | won | lost | void
  const [rowMessage, setRowMessage] = useState({});
  const [checkingId, setCheckingId] = useState(null);

  const filtered =
    filter === 'all'
      ? state.predictions
      : state.predictions.filter((p) => p.status === filter);

  async function handleVerifyRow(predId) {
    setCheckingId(predId);
    try {
      const res = await settleSinglePrediction(predId);
      setRowMessage((prev) => ({ ...prev, [predId]: res.message }));
    } catch (err) {
      setRowMessage((prev) => ({
        ...prev,
        [predId]: err?.message || 'Unable to verify match from SportsAPI.',
      }));
    } finally {
      setCheckingId(null);
    }
  }

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
        <div>
          <h1 className="sz-display display-6 fw-bold text-white mb-1">Prediction History</h1>
          <div className="small sz-muted">
            Full record of your virtual predictions &amp; real SportsAPI match result settlements
          </div>
        </div>

        <div className="d-flex gap-2">
          <button
            type="button"
            className="sz-btn sz-btn-green sz-btn-sm"
            onClick={settleAllPending}
            disabled={settling || stats.pending === 0}
          >
            <FiRefreshCw size={14} /> {settling ? 'Settling...' : `Settle All Pending (${stats.pending})`}
          </button>
          <Link to="/arena" className="sz-btn sz-btn-primary sz-btn-sm">
            <FiTarget size={14} /> Arena
          </Link>
        </div>
      </div>

      <div className="sz-segment-bar align-self-start">
        {[
          { k: 'all', l: `All (${stats.total})` },
          { k: 'pending', l: `Pending (${stats.pending})` },
          { k: 'won', l: `Won (${stats.won})` },
          { k: 'lost', l: `Lost (${stats.lost})` },
          { k: 'void', l: 'Void' },
        ].map((t) => (
          <button
            key={t.k}
            type="button"
            className={`sz-segment-btn ${filter === t.k ? 'active' : ''}`}
            onClick={() => setFilter(t.k)}
          >
            {t.l}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyStateCard
          title="No predictions in this category"
          message="Place virtual coin predictions on upcoming matches in the Prediction Arena to see them tracked here."
        />
      ) : (
        <div className="sz-table-wrap">
          <table className="sz-table">
            <thead>
              <tr>
                <th>Match</th>
                <th>Your Pick</th>
                <th>Final API Score</th>
                <th className="num">Stake</th>
                <th className="num">Payout</th>
                <th>Status</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/match/${p.fixtureId}`} className="text-white fw-semibold d-block">
                      {p.homeTeam.name} vs {p.awayTeam.name}
                    </Link>
                    <div className="small sz-muted">
                      {formatSportName(p.sport)} · {p.leagueName} · {formatDateTimeShort(p.startTime)}
                    </div>
                    {rowMessage[p.id] && (
                      <div className="small sz-text-orange mt-1">{rowMessage[p.id]}</div>
                    )}
                  </td>
                  <td className="sz-mono small">
                    <span className="text-white fw-semibold">{p.pick.toUpperCase()}</span> ({p.multiplier}x)
                    {p.predictedHomeScore !== null && p.predictedAwayScore !== null && (
                      <div className="sz-muted">
                        Exact: {p.predictedHomeScore}-{p.predictedAwayScore}
                      </div>
                    )}
                  </td>
                  <td className="sz-mono">
                    {p.actualHomeScore !== null && p.actualAwayScore !== null ? (
                      <span className="text-white fw-semibold">
                        {p.actualHomeScore} - {p.actualAwayScore}
                      </span>
                    ) : (
                      <span className="sz-muted">Awaiting FT</span>
                    )}
                  </td>
                  <td className="num text-white">{formatCoins(p.stake)}</td>
                  <td className="num sz-text-green fw-bold">
                    {p.status === 'pending' ? `~${formatCoins(p.potentialPayout)}` : formatCoins(p.payout)}
                  </td>
                  <td className="text-capitalize fw-semibold">
                    <span
                      style={{
                        color:
                          p.status === 'won'
                            ? 'var(--sz-green)'
                            : p.status === 'lost'
                            ? 'var(--sz-danger)'
                            : 'var(--sz-orange)',
                      }}
                    >
                      {p.status}
                    </span>
                    {p.exactScoreHit && <div className="small sz-text-green">Exact Score!</div>}
                  </td>
                  <td className="text-end">
                    {p.status === 'pending' ? (
                      <button
                        type="button"
                        className="sz-btn sz-btn-outline sz-btn-sm"
                        onClick={() => handleVerifyRow(p.id)}
                        disabled={checkingId === p.id}
                      >
                        {checkingId === p.id ? 'Checking...' : 'Check Result'}
                      </button>
                    ) : (
                      <Link to={`/match/${p.fixtureId}`} className="small sz-text-orange fw-semibold">
                        Match Center
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
