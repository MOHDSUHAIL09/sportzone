import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiLock, FiTv } from 'react-icons/fi';
import {
  getFixtures,
  getLiveScores,
  getOdds,
  getRaces,
} from '../services/sportsApi';
import { ApiErrorCard } from './StateBlocks';
import {
  computeLiveExchangeOdds,
  formatSportName,
  getDateString,
  getScoreText,
  getTeamDisplayName,
  isFinishedFixture,
  isLiveFixture,
} from '../utils/formatters';

function formatBoardDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatOddPrice(val) {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return '-';
  const num = Number(val);
  if (num >= 20) return String(Math.round(num));
  if (num >= 10) return Number(num.toFixed(1)).toString();
  return Number(num.toFixed(2)).toString();
}

function computeLayOdd(backVal) {
  if (!backVal || Number.isNaN(Number(backVal))) return '-';
  const b = Number(backVal);
  const step = b < 1.5 ? 0.01 : b < 2.2 ? 0.02 : b < 4 ? 0.05 : b < 10 ? 0.2 : b < 20 ? 1 : 2;
  return formatOddPrice(b + step);
}

export default function ExchangeMatchBoard({
  sport = 'cricket',
  maxRows = 40,
  includeTomorrow = true,
  compactScroll = false,
}) {
  const navigate = useNavigate();
  const isRaceSport = sport === 'motorsport' || sport === 'cycling';

  const [liveMatches, setLiveMatches] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [races, setRaces] = useState([]);
  const [oddsMap, setOddsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const today = getDateString(0);
  const tomorrow = getDateString(1);

  async function loadBoard(targetSport = sport, forceRefresh = false) {
    setLoading(true);
    setError(null);
    try {
      if (targetSport === 'motorsport' || targetSport === 'cycling') {
        const res = await getRaces({ sport: targetSport, date: today }, { forceRefresh });
        setRaces(res?.data || []);
        setLiveMatches([]);
        setFixtures([]);
        setOddsMap({});
        return;
      }

      const calls = [
        getLiveScores({ sport: targetSport }, { forceRefresh }),
        getFixtures({ sport: targetSport, date: today }, { forceRefresh }),
        getOdds({ sport: targetSport, date: today }, { forceRefresh }),
      ];
      if (includeTomorrow) {
        calls.push(getFixtures({ sport: targetSport, date: tomorrow }, { forceRefresh }));
      }

      const results = await Promise.allSettled(calls);
      const [liveRes, fxTodayRes, oddsRes, fxTomorrowRes] = results;

      setLiveMatches(liveRes.status === 'fulfilled' ? liveRes.value?.data || [] : []);

      const combinedFixtures = [
        ...(fxTodayRes.status === 'fulfilled' ? fxTodayRes.value?.data || [] : []),
        ...(fxTomorrowRes && fxTomorrowRes.status === 'fulfilled'
          ? fxTomorrowRes.value?.data || []
          : []),
      ];
      setFixtures(combinedFixtures);

      if (oddsRes.status === 'fulfilled') {
        const map = {};
        (oddsRes.value?.data || []).forEach((item) => {
          if (item.fixtureId) map[item.fixtureId] = item;
        });
        setOddsMap(map);
      } else {
        setOddsMap({});
      }

      if (liveRes.status === 'rejected' && fxTodayRes.status === 'rejected') {
        setError(liveRes.reason || fxTodayRes.reason);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBoard(sport, false);
  }, [sport, includeTomorrow]);

  const boardRows = useMemo(() => {
    const seen = new Set();
    const liveList = [];
    const upcomingList = [];
    const finishedList = [];

    for (const fx of liveMatches) {
      if (!seen.has(fx.id)) {
        seen.add(fx.id);
        liveList.push(fx);
      }
    }
    for (const fx of fixtures) {
      if (!seen.has(fx.id)) {
        seen.add(fx.id);
        if (isLiveFixture(fx)) {
          liveList.push(fx);
        } else if (isFinishedFixture(fx)) {
          finishedList.push(fx);
        } else {
          upcomingList.push(fx);
        }
      }
    }

    upcomingList.sort((a, b) => new Date(a.startTime || 0) - new Date(b.startTime || 0));
    return [...liveList, ...upcomingList, ...finishedList].slice(0, maxRows);
  }, [liveMatches, fixtures, maxRows]);

  if (isRaceSport) {
    return (
      <section className={`ex-market-board${compactScroll ? ' ex-market-board-compact' : ''}`}>
        <div className="ex-market-head-row">
          <div className="ex-market-head-left">
            <span className="fw-bold">Game</span>
          </div>
          <div className="ex-market-head-odds">
            <span>1</span>
            <span>X</span>
            <span>2</span>
          </div>
        </div>
        {error && (
          <div className="p-2">
            <ApiErrorCard error={error} onRetry={() => loadBoard(sport, true)} />
          </div>
        )}
        {loading ? (
          <div className="p-3 text-center small" style={{ color: '#444' }}>
            Loading real {formatSportName(sport)} events from SportsAPI...
          </div>
        ) : races.length === 0 ? (
          <div className="p-3 text-center small" style={{ color: '#444' }}>
            No {formatSportName(sport)} races scheduled for {today}.
          </div>
        ) : (
          <div className="ex-market-rows">
            {races.map((r) => (
              <div className="ex-market-row" key={r.id}>
                <div className="ex-market-match-col">
                  <Link to={`/race/${r.id}`} className="ex-market-match-link">
                    <span className="ex-market-match-name">{r.name || 'Race Event'}</span>
                    {r.startTime && (
                      <span className="ex-market-match-time">
                        {' / '}
                        {formatBoardDateTime(r.startTime)}
                      </span>
                    )}
                  </Link>
                </div>
                <div className="ex-mob-odds-head">
                  <span>1</span>
                  <span>X</span>
                  <span>2</span>
                </div>
                <div className="ex-market-odds-col">
                  <button type="button" className="ex-odd-cell ex-odd-back" onClick={() => navigate(`/race/${r.id}`)}>-</button>
                  <button type="button" className="ex-odd-cell ex-odd-lay" onClick={() => navigate(`/race/${r.id}`)}>-</button>
                  <button type="button" className="ex-odd-cell ex-odd-back" onClick={() => navigate(`/race/${r.id}`)}>-</button>
                  <button type="button" className="ex-odd-cell ex-odd-lay" onClick={() => navigate(`/race/${r.id}`)}>-</button>
                  <button type="button" className="ex-odd-cell ex-odd-back" onClick={() => navigate(`/race/${r.id}`)}>-</button>
                  <button type="button" className="ex-odd-cell ex-odd-lay" onClick={() => navigate(`/race/${r.id}`)}>-</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className={`ex-market-board${compactScroll ? ' ex-market-board-compact' : ''}`}>
      {/* Desktop Table Header (hidden on mobile where each match card has its own 1 | X | 2 bar) */}
      <div className="ex-market-head-row">
        <div className="ex-market-head-left">
          <span className="fw-bold">Game</span>
        </div>
        <div className="ex-market-head-odds">
          <span>1</span>
          <span>X</span>
          <span>2</span>
        </div>
      </div>

      {error && (
        <div className="p-2">
          <ApiErrorCard error={error} onRetry={() => loadBoard(sport, true)} />
        </div>
      )}

      {loading ? (
        <div className="p-3 text-center small" style={{ color: '#444' }}>
          Loading real {formatSportName(sport)} matches &amp; odds from SportsAPI...
        </div>
      ) : boardRows.length === 0 ? (
        <div className="p-3 text-center small" style={{ color: '#444' }}>
          No live or scheduled {formatSportName(sport)} matches returned for {today}.
        </div>
      ) : (
        <div className="ex-market-rows">
          {boardRows.map((fx) => {
            const live = isLiveFixture(fx);
            const finished = isFinishedFixture(fx);
            const home = getTeamDisplayName(fx.home, 'Home');
            const away = getTeamDisplayName(fx.away, 'Away');
            const mults = computeLiveExchangeOdds(fx, oddsMap[fx.id]);

            const back1 = mults?.home ? formatOddPrice(mults.home) : '-';
            const lay1 = mults?.home ? computeLayOdd(mults.home) : '-';
            const backX = mults?.draw ? formatOddPrice(mults.draw) : '-';
            const layX = mults?.draw ? computeLayOdd(mults.draw) : '-';
            const back2 = mults?.away ? formatOddPrice(mults.away) : '-';
            const lay2 = mults?.away ? computeLayOdd(mults.away) : '-';

            const dateStr = formatBoardDateTime(fx.startTime);
            const showFancy = fx.sport === 'cricket';
            const showBM = !finished;

            return (
              <div className="ex-market-row" key={fx.id}>
                <div className="ex-market-match-col">
                  <Link to={`/match/${fx.id}`} className="ex-market-match-link">
                    <span className="ex-market-match-name">
                      {home} v {away}
                    </span>
                    {dateStr && (
                      <span className="ex-market-match-time">
                        <span className="ex-desk-slash"> / </span>
                        {dateStr}
                      </span>
                    )}
                    {live && (
                      <span className="ex-market-live-score">
                        {' '}
                        ({getScoreText(fx, 'home')} - {getScoreText(fx, 'away')})
                      </span>
                    )}
                  </Link>

                  <div className="ex-market-indicators">
                    <span className="ex-ind-slot">
                      {live && <span className="ex-green-live-dot" title="Live In-Play" />}
                    </span>
                    <span className="ex-ind-slot">
                      {(live || !finished) && (
                        <Link to={`/match/${fx.id}`} className="ex-ind-icon" title="Open Match Exchange">
                          <FiTv size={13} />
                        </Link>
                      )}
                    </span>
                    <span className="ex-ind-slot">
                      {showFancy && <span className="ex-ind-fancy">f</span>}
                    </span>
                    <span className="ex-ind-slot ex-ind-slot-bm">
                      {showBM && <span className="ex-ind-tag">BM</span>}
                    </span>
                  </div>
                </div>

                {/* Mobile 1 | X | 2 Header Row inside each Match Card */}
                <div className="ex-mob-odds-head" aria-hidden="true">
                  <span>1</span>
                  <span>X</span>
                  <span>2</span>
                </div>

                <div className="ex-market-odds-col">
                  {finished ? (
                    <>
                      <button
                        type="button"
                        className="ex-odd-locked-pair"
                        onClick={() => navigate(`/match/${fx.id}`)}
                        title="Match finished — click for details"
                      >
                        <FiLock size={13} />
                      </button>
                      <button
                        type="button"
                        className="ex-odd-cell ex-odd-back"
                        onClick={() => navigate(`/match/${fx.id}`)}
                      >
                        -
                      </button>
                      <button
                        type="button"
                        className="ex-odd-cell ex-odd-lay"
                        onClick={() => navigate(`/match/${fx.id}`)}
                      >
                        -
                      </button>
                      <button
                        type="button"
                        className="ex-odd-locked-pair"
                        onClick={() => navigate(`/match/${fx.id}`)}
                        title="Match finished — click for details"
                      >
                        <FiLock size={13} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="ex-odd-cell ex-odd-back"
                        onClick={() => navigate(`/match/${fx.id}`)}
                        title={`Back ${home}`}
                      >
                        {back1}
                      </button>
                      <button
                        type="button"
                        className="ex-odd-cell ex-odd-lay"
                        onClick={() => navigate(`/match/${fx.id}`)}
                        title={`Lay ${home}`}
                      >
                        {lay1}
                      </button>
                      <button
                        type="button"
                        className="ex-odd-cell ex-odd-back"
                        onClick={() => navigate(`/match/${fx.id}`)}
                        title="Back Draw"
                      >
                        {backX}
                      </button>
                      <button
                        type="button"
                        className="ex-odd-cell ex-odd-lay"
                        onClick={() => navigate(`/match/${fx.id}`)}
                        title="Lay Draw"
                      >
                        {layX}
                      </button>
                      <button
                        type="button"
                        className="ex-odd-cell ex-odd-back"
                        onClick={() => navigate(`/match/${fx.id}`)}
                        title={`Back ${away}`}
                      >
                        {back2}
                      </button>
                      <button
                        type="button"
                        className="ex-odd-cell ex-odd-lay"
                        onClick={() => navigate(`/match/${fx.id}`)}
                        title={`Lay ${away}`}
                      >
                        {lay2}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
