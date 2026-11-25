import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiAward, FiTarget } from 'react-icons/fi';
import { useArena } from '../context/ArenaContext';
import { DemoWalletBanner } from '../components/StateBlocks';
import { formatCoins, formatSportName } from '../utils/formatters';

export default function LeaderboardPage() {
  const { leaderboard } = useArena();
  const [sportFilter, setSportFilter] = useState('all');

  const currentUserEntry = leaderboard.find((r) => r.isCurrentUser);
  const filtered =
    sportFilter === 'all'
      ? leaderboard
      : leaderboard.filter((r) => r.favoriteSport === sportFilter || r.isCurrentUser);

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
        <div>
          <h1 className="sz-display display-6 fw-bold text-white mb-1">Arena Leaderboard</h1>
          <div className="small sz-muted">
            Demo Arena standings ranked by Reward Points &amp; Virtual Coins — your live browser score updates in real time
          </div>
        </div>
        <Link to="/arena" className="sz-btn sz-btn-primary">
          <FiTarget size={16} /> Climb the Ranks
        </Link>
      </div>

      <DemoWalletBanner compact />

      {/* Current User Highlight */}
      {currentUserEntry && (
        <div className="row g-3">
          <div className="col-6 col-md-3">
            <div className="sz-card">
              <div className="small sz-muted">Your Current Rank</div>
              <div className="sz-mono fw-bold fs-2 sz-text-orange">#{currentUserEntry.rank}</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="sz-card">
              <div className="small sz-muted">Reward Points</div>
              <div className="sz-mono fw-bold fs-2 sz-text-green">
                {formatCoins(currentUserEntry.rewardPoints)}
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="sz-card">
              <div className="small sz-muted">Virtual Coins</div>
              <div className="sz-mono fw-bold fs-2 text-white">
                {formatCoins(currentUserEntry.coins)}
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="sz-card">
              <div className="small sz-muted">Win Accuracy</div>
              <div className="sz-mono fw-bold fs-2 text-white">{currentUserEntry.accuracy}%</div>
            </div>
          </div>
        </div>
      )}

      <div className="sz-scroll-strip">
        {['all', 'football', 'cricket', 'tennis', 'basketball'].map((sp) => (
          <button
            key={sp}
            type="button"
            className={`sz-tab-btn ${sportFilter === sp ? 'active' : ''}`}
            onClick={() => setSportFilter(sp)}
          >
            {sp === 'all' ? 'All Predictors' : formatSportName(sp)}
          </button>
        ))}
      </div>

      <div className="sz-table-wrap">
        <table className="sz-table">
          <thead>
            <tr>
              <th style={{ width: 64 }}>Rank</th>
              <th>Player</th>
              <th>Specialty</th>
              <th className="num">Wins / Settled</th>
              <th className="num">Accuracy</th>
              <th className="num">Best Streak</th>
              <th className="num">Virtual Coins</th>
              <th className="num">Reward Pts</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr
                key={row.id}
                style={
                  row.isCurrentUser
                    ? { backgroundColor: 'rgba(255, 90, 31, 0.12)' }
                    : undefined
                }
              >
                <td className="sz-mono fw-bold text-white">
                  {row.rank <= 3 ? (
                    <span className="d-inline-flex align-items-center gap-1 sz-text-orange">
                      <FiAward size={14} /> #{row.rank}
                    </span>
                  ) : (
                    `#${row.rank}`
                  )}
                </td>
                <td className="text-white fw-semibold">
                  {row.name}{' '}
                  {row.isCurrentUser ? (
                    <span className="small sz-text-green ms-1">(You)</span>
                  ) : (
                    <span className="small sz-muted ms-1">· Demo Rival</span>
                  )}
                </td>
                <td>{formatSportName(row.favoriteSport)}</td>
                <td className="num">
                  {row.wins} / {row.total}
                </td>
                <td className="num text-white">{row.accuracy}%</td>
                <td className="num">{row.bestStreak}</td>
                <td className="num text-white">{formatCoins(row.coins)}</td>
                <td className="num sz-text-green fw-bold">{formatCoins(row.rewardPoints)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
