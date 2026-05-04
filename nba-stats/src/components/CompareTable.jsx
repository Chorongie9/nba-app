import { useState } from 'react';
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

const Scoreboard = ({ player1Regular, player1Playoffs, player2Regular, player2Playoffs, firstPlayerName, secondPlayerName, player1Id, player2Id }) => {
  const [showPlayoffs, setShowPlayoffs] = useState(false);

  const hasPlayoffs = player1Playoffs?.length > 0 && player2Playoffs?.length > 0;
  const d1 = showPlayoffs ? player1Playoffs : player1Regular;
  const d2 = showPlayoffs ? player2Playoffs : player2Regular;

  const s1 = computeCareer(d1);
  const s2 = computeCareer(d2);

  if (!s1 || !s2) return <p className="text-center text-gray-500 mt-6">Select a second player to see the scoreboard.</p>;

  return (
    <div className="mt-4 max-w-2xl mx-auto">
      {/* Season type toggle */}
      {hasPlayoffs && (
        <div className="flex justify-center mb-4">
          <div className="flex rounded-full overflow-hidden border border-gray-300 text-sm font-medium">
            <button
              onClick={() => setShowPlayoffs(false)}
              className={`px-4 py-1.5 transition ${!showPlayoffs ? "bg-gray-800 text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}
            >
              Regular Season
            </button>
            <button
              onClick={() => setShowPlayoffs(true)}
              className={`px-4 py-1.5 transition ${showPlayoffs ? "bg-yellow-500 text-black" : "bg-white text-gray-600 hover:bg-gray-100"}`}
            >
              Playoffs
            </button>
          </div>
        </div>
      )}

      {/* Player headers */}
      <div className="grid grid-cols-3 items-center mb-6 gap-2">
        <div className="flex flex-col items-center">
          <img
            src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player1Id}.png`}
            alt={firstPlayerName}
            className="w-24 h-24 rounded-full object-cover shadow border border-gray-200 mb-1"
            onError={e => { e.target.src = 'https://via.placeholder.com/96x96?text=?'; }}
          />
          <Link to={`/player/${player1Id}?name=${encodeURIComponent(firstPlayerName)}`} className="font-semibold text-sm text-center hover:underline text-blue-700">
            {firstPlayerName}
          </Link>
        </div>

        <p className="text-center text-xs uppercase tracking-widest text-gray-400 font-semibold">Career Averages</p>

        <div className="flex flex-col items-center">
          <img
            src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player2Id}.png`}
            alt={secondPlayerName}
            className="w-24 h-24 rounded-full object-cover shadow border border-gray-200 mb-1"
            onError={e => { e.target.src = 'https://via.placeholder.com/96x96?text=?'; }}
          />
          <Link to={`/player/${player2Id}?name=${encodeURIComponent(secondPlayerName)}`} className="font-semibold text-sm text-center hover:underline text-blue-700">
            {secondPlayerName}
          </Link>
        </div>
      </div>

      {/* Stat rows */}
      <div className="divide-y divide-gray-100 border rounded-xl overflow-hidden">
        {SCOREBOARD_STATS.map(({ key, label, fmt }) => {
          const v1 = s1[key];
          const v2 = s2[key];
          const p1wins = v1 > v2;
          const p2wins = v2 > v1;

          return (
            <div key={key} className="grid grid-cols-3 items-center py-3 px-4 bg-white hover:bg-gray-50 transition">
              <span className={`text-xl font-bold text-right pr-4 ${p1wins ? "text-green-600" : "text-gray-400"}`}>
                {fmt(v1)}
              </span>
              <span className="text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                {label}
              </span>
              <span className={`text-xl font-bold text-left pl-4 ${p2wins ? "text-green-600" : "text-gray-400"}`}>
                {fmt(v2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CompareTable = ({ player1Regular, player1Playoffs, player2Regular, player2Playoffs, firstPlayerName, secondPlayerName, player1Id, player2Id }) => {
  const [view, setView] = useState("cards");
  const hasSecondPlayer = player2Regular && player2Regular.length > 0;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-center">Player Comparison</h2>
        {hasSecondPlayer && (
          <div className="flex rounded-full overflow-hidden border border-gray-300 text-sm font-medium">
            <button
              onClick={() => setView("cards")}
              className={`px-4 py-1.5 transition ${view === "cards" ? "bg-gray-800 text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}
            >
              Cards
            </button>
            <button
              onClick={() => setView("scoreboard")}
              className={`px-4 py-1.5 transition ${view === "scoreboard" ? "bg-gray-800 text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}
            >
              Scoreboard
            </button>
          </div>
        )}
      </div>

      {view === "scoreboard" ? (
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Player 1 Card */}
          <div className="border rounded-lg shadow-lg bg-white p-4 flex flex-col items-center">
            <h3 className="text-xl font-semibold mb-2">
              <Link to={`/player/${player1Id}?name=${encodeURIComponent(firstPlayerName)}`} className="hover:underline">
                {firstPlayerName}
              </Link>
            </h3>
            <img
              src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player1Id}.png`}
              alt={firstPlayerName}
              className="w-40 h-40 rounded-full object-cover shadow-md mb-4"
              onError={(e) => { e.target.src = 'https://via.placeholder.com/160x160?text=No+Photo'; }}
            />
            <div className="w-full">
              <CareerAverages regularData={player1Regular} playoffData={player1Playoffs} />
            </div>
            <div className="w-full mt-4">
              <PlayerStats regularData={player1Regular} playoffData={player1Playoffs} />
            </div>
          </div>

          {/* Player 2 Card */}
          <div className="border rounded-lg shadow-lg bg-white p-4 flex flex-col items-center">
            <h3 className="text-xl font-semibold mb-2">
              <Link to={`/player/${player2Id}?name=${encodeURIComponent(secondPlayerName)}`} className="hover:underline">
                {secondPlayerName}
              </Link>
            </h3>
            <img
              src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player2Id}.png`}
              alt={secondPlayerName}
              className="w-40 h-40 rounded-full object-cover shadow-md mb-4"
              onError={(e) => { e.target.src = 'https://via.placeholder.com/160x160?text=No+Photo'; }}
            />
            <div className="w-full">
              <CareerAverages regularData={player2Regular} playoffData={player2Playoffs} />
            </div>
            <div className="w-full mt-4">
              <PlayerStats regularData={player2Regular} playoffData={player2Playoffs} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompareTable;
