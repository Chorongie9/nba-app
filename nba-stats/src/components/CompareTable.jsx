import { useState, useEffect, useMemo } from 'react';
import PlayerStats from './PlayerStats';
import { Link } from 'react-router-dom';
import CareerAverages from './CareerAverages';

const computeCareer = (data) => {
  if (!data || data.length === 0) return null;
  const t = data.reduce(
    (acc, s) => {
      acc.games    += s.GP  || 0;
      acc.points   += s.PTS || 0;
      acc.assists  += s.AST || 0;
      acc.rebounds += s.REB || 0;
      acc.steals   += s.STL || 0;
      acc.blocks   += s.BLK || 0;
      acc.fgm      += s.FGM || 0;
      acc.fga      += s.FGA || 0;
      acc.ftm      += s.FTM || 0;
      acc.fta      += s.FTA || 0;
      return acc;
    },
    { games: 0, points: 0, assists: 0, rebounds: 0, steals: 0, blocks: 0, fgm: 0, fga: 0, ftm: 0, fta: 0 }
  );
  const g = t.games || 1;
  return {
    GP:    t.games,
    PPG:   t.points   / g,
    RPG:   t.rebounds / g,
    APG:   t.assists  / g,
    SPG:   t.steals   / g,
    BPG:   t.blocks   / g,
    "FG%": t.fga ? (t.fgm / t.fga) * 100 : 0,
    "FT%": t.fta ? (t.ftm / t.fta) * 100 : 0,
  };
};

const computeSeason = (data, seasonId) => {
  if (!data?.length || !seasonId) return null;
  const row = data.find(r => r.SEASON_ID === seasonId);
  if (!row) return null;
  const g = row.GP || 1;
  return {
    GP:    row.GP || 0,
    PPG:   (row.PTS || 0) / g,
    RPG:   (row.REB || 0) / g,
    APG:   (row.AST || 0) / g,
    SPG:   (row.STL || 0) / g,
    BPG:   (row.BLK || 0) / g,
    "FG%": row.FGA ? (row.FGM / row.FGA) * 100 : 0,
    "FT%": row.FTA ? (row.FTM / row.FTA) * 100 : 0,
  };
};

const SCOREBOARD_STATS = [
  { key: "GP",   label: "GP",   fmt: v => Math.round(v) },
  { key: "PPG",  label: "PPG",  fmt: v => v.toFixed(1) },
  { key: "RPG",  label: "RPG",  fmt: v => v.toFixed(1) },
  { key: "APG",  label: "APG",  fmt: v => v.toFixed(1) },
  { key: "SPG",  label: "SPG",  fmt: v => v.toFixed(1) },
  { key: "BPG",  label: "BPG",  fmt: v => v.toFixed(1) },
  { key: "FG%",  label: "FG%",  fmt: v => v.toFixed(1) + "%" },
  { key: "FT%",  label: "FT%",  fmt: v => v.toFixed(1) + "%" },
];

const Toggle = ({ showPlayoffs, setShowPlayoffs }) => (
  <div className="flex items-center gap-3 text-xs">
    <button
      onClick={() => setShowPlayoffs(false)}
      className={`pb-0.5 transition-colors ${!showPlayoffs ? "text-zinc-100 border-b border-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
    >
      Regular Season
    </button>
    <span className="text-zinc-700">/</span>
    <button
      onClick={() => setShowPlayoffs(true)}
      className={`pb-0.5 transition-colors ${showPlayoffs ? "text-amber-400 border-b border-amber-400" : "text-zinc-500 hover:text-zinc-300"}`}
    >
      Playoffs
    </button>
  </div>
);

const SeasonSelect = ({ seasons, value, onChange }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    className="bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px] uppercase tracking-widest rounded px-2 py-1 focus:outline-none focus:border-zinc-500 cursor-pointer"
  >
    {seasons.map(s => <option key={s} value={s}>{s}</option>)}
  </select>
);

const Scoreboard = ({ player1Regular, player1Playoffs, player2Regular, player2Playoffs, firstPlayerName, secondPlayerName, player1Id, player2Id }) => {
  const [showPlayoffs, setShowPlayoffs] = useState(false);
  const hasPlayoffs = player1Playoffs?.length > 0 && player2Playoffs?.length > 0;

  const p1Seasons = useMemo(() => {
    const data = player1Regular || [];
    const seen = new Set();
    return [...data].reverse().map(r => r.SEASON_ID).filter(s => s && !seen.has(s) && seen.add(s));
  }, [player1Regular]);

  const p2Seasons = useMemo(() => {
    const data = player2Regular || [];
    const seen = new Set();
    return [...data].reverse().map(r => r.SEASON_ID).filter(s => s && !seen.has(s) && seen.add(s));
  }, [player2Regular]);

  const [season1, setSeason1] = useState(p1Seasons[0] || '');
  const [season2, setSeason2] = useState(p2Seasons[0] || '');

  const p1Data = showPlayoffs ? player1Playoffs : player1Regular;
  const p2Data = showPlayoffs ? player2Playoffs : player2Regular;
  const s1 = computeSeason(p1Data, season1);
  const s2 = computeSeason(p2Data, season2);

  const [similarity, setSimilarity] = useState(null);
  const [simLoading, setSimLoading] = useState(false);
  const [basicStats, setBasicStats] = useState(false);

  useEffect(() => { if (p1Seasons[0]) setSeason1(p1Seasons[0]); }, [p1Seasons]);
  useEffect(() => { if (p2Seasons[0]) setSeason2(p2Seasons[0]); }, [p2Seasons]);

  useEffect(() => {
    if (!player1Id || !player2Id || !season1 || !season2) return;
    setSimilarity(null);
    setSimLoading(true);
    const controller = new AbortController();
    const params = new URLSearchParams({ season1, season2 });
    fetch(`http://localhost:8000/compare/${player1Id}/${player2Id}/similarity?${params}`, { signal: controller.signal })
      .then(r => r.json())
      .then(d => { setSimilarity(d.similarity); setBasicStats(!!d.basic_stats); })
      .catch(() => setSimilarity(null))
      .finally(() => setSimLoading(false));
    return () => controller.abort();
  }, [player1Id, player2Id, season1, season2]);

  const needsSecondPlayer = !player2Regular?.length;
  if (needsSecondPlayer) return (
    <p className="text-center text-zinc-600 py-12 text-sm">Select a second player to see the scoreboard.</p>
  );

  if (!s1 || !s2) return (
    <p className="text-center text-zinc-600 py-12 text-sm">
      {showPlayoffs ? 'No playoff data for the selected season(s).' : 'No data for the selected season(s).'}
    </p>
  );

  return (
    <div className="max-w-2xl mx-auto">
      {hasPlayoffs && (
        <div className="flex justify-center mb-8">
          <Toggle showPlayoffs={showPlayoffs} setShowPlayoffs={setShowPlayoffs} />
        </div>
      )}

      <div className="grid grid-cols-3 items-center mb-10 gap-4">
        <div className="flex flex-col items-center gap-3">
          <img
            src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player1Id}.png`}
            alt={firstPlayerName}
            className="w-20 h-20 rounded-full object-cover object-top border border-zinc-800"
            onError={e => { e.target.style.display = 'none'; }}
          />
          <Link
            to={`/player/${player1Id}?name=${encodeURIComponent(firstPlayerName)}`}
            className="font-medium text-xs text-center text-zinc-200 hover:text-amber-400 transition-colors leading-snug"
          >
            {firstPlayerName}
          </Link>
          {p1Seasons.length > 1 && (
            <SeasonSelect seasons={p1Seasons} value={season1} onChange={setSeason1} />
          )}
        </div>
        <div className="flex flex-col items-center gap-1">
          {simLoading && (
            <span className="text-zinc-600 text-xs animate-pulse">Calculating…</span>
          )}
          {!simLoading && similarity != null && (
            <>
              <span className="font-display font-extrabold text-3xl text-amber-400">{similarity}%</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 font-semibold">Similarity</span>
              {basicStats && (
                <span className="text-[9px] text-zinc-700 tracking-wider">Per-game stats</span>
              )}
            </>
          )}
          {!simLoading && similarity == null && season1 && season2 && (
            <span className="text-zinc-700 text-[10px] uppercase tracking-wider">Unavailable</span>
          )}
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 font-semibold mt-1">
            Season Averages
          </p>
        </div>
        <div className="flex flex-col items-center gap-3">
          <img
            src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player2Id}.png`}
            alt={secondPlayerName}
            className="w-20 h-20 rounded-full object-cover object-top border border-zinc-800"
            onError={e => { e.target.style.display = 'none'; }}
          />
          <Link
            to={`/player/${player2Id}?name=${encodeURIComponent(secondPlayerName)}`}
            className="font-medium text-xs text-center text-zinc-200 hover:text-amber-400 transition-colors leading-snug"
          >
            {secondPlayerName}
          </Link>
          {p2Seasons.length > 1 && (
            <SeasonSelect seasons={p2Seasons} value={season2} onChange={setSeason2} />
          )}
        </div>
      </div>

      <div className="divide-y divide-zinc-800/50 border border-zinc-800 rounded-xl overflow-hidden">
        {SCOREBOARD_STATS.map(({ key, label, fmt }) => {
          const v1 = s1[key];
          const v2 = s2[key];
          const p1wins = v1 > v2;
          const p2wins = v2 > v1;
          return (
            <div key={key} className="grid grid-cols-3 items-center py-4 px-6 hover:bg-zinc-800/20 transition-colors">
              <span className={`font-display font-extrabold text-3xl text-right pr-6 ${p1wins ? "text-zinc-50" : "text-zinc-700"}`}>
                {fmt(v1)}
              </span>
              <span className="text-center text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600">
                {label}
              </span>
              <span className={`font-display font-extrabold text-3xl text-left pl-6 ${p2wins ? "text-zinc-50" : "text-zinc-700"}`}>
                {fmt(v2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PlayerCard = ({ regular, playoffs, name, playerId }) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col items-center gap-5">
    <img
      src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`}
      alt={name}
      className="w-28 h-28 rounded-full object-cover object-top border border-zinc-800"
      onError={e => { e.target.style.display = 'none'; }}
    />
    <h3 className="font-display font-bold text-xl text-zinc-50 text-center uppercase tracking-wide">
      <Link to={`/player/${playerId}?name=${encodeURIComponent(name)}`} className="hover:text-amber-400 transition-colors">
        {name}
      </Link>
    </h3>
    <div className="w-full border-t border-zinc-800 pt-5">
      <CareerAverages regularData={regular} playoffData={playoffs} />
    </div>
    <div className="w-full border-t border-zinc-800 pt-5">
      <PlayerStats regularData={regular} playoffData={playoffs} />
    </div>
  </div>
);

const CompareTable = ({ player1Regular, player1Playoffs, player2Regular, player2Playoffs, firstPlayerName, secondPlayerName, player1Id, player2Id }) => {
  const [view, setView] = useState("cards");
  const hasSecondPlayer = player2Regular && player2Regular.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">Player Comparison</h2>
        {hasSecondPlayer && (
          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={() => setView("cards")}
              className={`pb-0.5 transition-colors ${view === "cards" ? "text-zinc-100 border-b border-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              Cards
            </button>
            <span className="text-zinc-700">/</span>
            <button
              onClick={() => setView("scoreboard")}
              className={`pb-0.5 transition-colors ${view === "scoreboard" ? "text-zinc-100 border-b border-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              Scoreboard
            </button>
          </div>
        )}
      </div>

      {view === "scoreboard" ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <Scoreboard
            player1Regular={player1Regular}
            player1Playoffs={player1Playoffs}
            player2Regular={player2Regular}
            player2Playoffs={player2Playoffs}
            firstPlayerName={firstPlayerName}
            secondPlayerName={secondPlayerName}
            player1Id={player1Id}
            player2Id={player2Id}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PlayerCard regular={player1Regular} playoffs={player1Playoffs} name={firstPlayerName} playerId={player1Id} />
          {hasSecondPlayer
            ? <PlayerCard regular={player2Regular} playoffs={player2Playoffs} name={secondPlayerName} playerId={player2Id} />
            : (
              <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-xl flex items-center justify-center h-48">
                <p className="text-zinc-600 text-sm">Search for a player above to compare</p>
              </div>
            )
          }
        </div>
      )}
    </div>
  );
};

export default CompareTable;
