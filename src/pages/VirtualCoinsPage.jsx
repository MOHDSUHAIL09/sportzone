import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiGift, FiRotateCcw, FiTarget } from 'react-icons/fi';
import { GiCoins } from 'react-icons/gi';
import { useArena } from '../context/ArenaContext';
import { DemoWalletBanner } from '../components/StateBlocks';
import { formatCoins, formatDateTimeShort } from '../utils/formatters';

export default function VirtualCoinsPage() {
  const { state, stats, canClaimDailyBonus, claimDailyBonus, resetDemoAccount } = useArena();
  const [notice, setNotice] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);

  function handleClaim() {
    const res = claimDailyBonus();
    if (res.ok) {
      setNotice({ type: 'success', text: `Claimed +${res.amount} demo virtual coins and +25 reward points!` });
    } else {
      setNotice({ type: 'error', text: res.error });
    }
  }

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
        <div>
          <h1 className="sz-display display-6 fw-bold text-white mb-1">Virtual Coins Wallet</h1>
          <div className="small sz-muted">
            Demo virtual currency for SPORTZONE Prediction Arena — zero real money involved
          </div>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="sz-btn sz-btn-green"
            onClick={handleClaim}
            disabled={!canClaimDailyBonus}
          >
            <FiGift size={16} />
            {canClaimDailyBonus ? 'Claim +500 Daily Demo Coins' : 'Daily Bonus Claimed'}
          </button>
          <Link to="/arena" className="sz-btn sz-btn-primary">
            <FiTarget size={16} /> Play Arena
          </Link>
        </div>
      </div>

      <DemoWalletBanner />

      {notice && (
        <div
          className="sz-card py-2 px-3 small text-white"
          style={{
            borderColor: notice.type === 'success' ? 'rgba(32,217,139,0.4)' : 'rgba(239,68,68,0.4)',
          }}
        >
          {notice.text}
        </div>
      )}

      {/* KPI Strip */}
      <div className="row g-3">
        <div className="col-6 col-xl-3">
          <div className="sz-card">
            <div className="small sz-muted mb-1">Available Balance</div>
            <div className="sz-mono fw-bold fs-2 sz-text-orange d-flex align-items-center gap-2">
              <GiCoins size={24} /> {formatCoins(state.coins)}
            </div>
          </div>
        </div>
        <div className="col-6 col-xl-3">
          <div className="sz-card">
            <div className="small sz-muted mb-1">Reward Points</div>
            <div className="sz-mono fw-bold fs-2 sz-text-green">{formatCoins(state.rewardPoints)}</div>
          </div>
        </div>
        <div className="col-6 col-xl-3">
          <div className="sz-card">
            <div className="small sz-muted mb-1">Total Staked</div>
            <div className="sz-mono fw-bold fs-2 text-white">{formatCoins(stats.totalStaked)}</div>
          </div>
        </div>
        <div className="col-6 col-xl-3">
          <div className="sz-card">
            <div className="small sz-muted mb-1">Settled Payouts</div>
            <div className="sz-mono fw-bold fs-2 text-white">{formatCoins(stats.totalWonCoins)}</div>
          </div>
        </div>
      </div>

      {/* Coin Ledger */}
      <section>
        <div className="sz-section-head">
          <h2 className="sz-section-title">Demo Coin Activity Ledger</h2>
          <span className="small sz-muted">{state.transactions.length} recorded entries</span>
        </div>
        <div className="sz-table-wrap">
          <table className="sz-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Activity</th>
                <th>Type</th>
                <th className="num">Change</th>
                <th className="num">Balance After</th>
              </tr>
            </thead>
            <tbody>
              {state.transactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="sz-mono small">{formatDateTimeShort(tx.createdAt)}</td>
                  <td className="text-white">{tx.label}</td>
                  <td className="text-capitalize">{tx.type}</td>
                  <td
                    className={`num fw-bold ${tx.amount >= 0 ? 'sz-text-green' : 'sz-text-orange'}`}
                  >
                    {tx.amount >= 0 ? `+${formatCoins(tx.amount)}` : formatCoins(tx.amount)}
                  </td>
                  <td className="num text-white">{formatCoins(tx.balanceAfter)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Reset Demo Account */}
      <div className="sz-card d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
        <div>
          <div className="fw-semibold text-white">Reset Demo LocalStorage Wallet</div>
          <div className="small sz-muted">
            Restores your virtual balance to 2,500 coins and clears local prediction history.
          </div>
        </div>
        {confirmReset ? (
          <div className="d-flex gap-2">
            <button
              type="button"
              className="sz-btn sz-btn-primary sz-btn-sm"
              onClick={() => {
                resetDemoAccount();
                setConfirmReset(false);
                setNotice({ type: 'success', text: 'Demo wallet reset to 2,500 virtual coins.' });
              }}
            >
              Confirm Reset
            </button>
            <button
              type="button"
              className="sz-btn sz-btn-outline sz-btn-sm"
              onClick={() => setConfirmReset(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="sz-btn sz-btn-outline sz-btn-sm"
            onClick={() => setConfirmReset(true)}
          >
            <FiRotateCcw size={14} /> Reset Demo Wallet
          </button>
        )}
      </div>
    </div>
  );
}
