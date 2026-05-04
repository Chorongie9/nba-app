import { useState } from "react";

const computeAverages = (data) => {
  const totals = data.reduce(
    (acc, season) => {
      acc.games += season.GP || 0;
      acc.points += season.PTS || 0;
      acc.assists += season.AST || 0;
      acc.rebounds += season.REB || 0;
      acc.fgm += season.FGM || 0;
      acc.fga += season.FGA || 0;
      return acc;
    },
    { games: 0, points: 0, assists: 0, rebounds: 0, fgm: 0, fga: 0 }
  );

  return {
    ppg: totals.games ? (totals.points / totals.games).toFixed(1) : "—",
    apg: totals.games ? (totals.assists / totals.games).toFixed(1) : "—",
    rpg: totals.games ? (totals.rebounds / totals.games).toFixed(1) : "—",
    fgPct: totals.fga ? ((totals.fgm / totals.fga) * 100).toFixed(1) : "—",
  };
};

const CareerAverages = ({ regularData, playoffData }) => {
  const [showPlayoffs, setShowPlayoffs] = useState(false);
  const hasPlayoffs = playoffData && playoffData.length > 0;
  const data = showPlayoffs ? playoffData : regularData;

  if (!regularData || regularData.length === 0) return null;

  const { ppg, apg, rpg, fgPct } = computeAverages(data);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-center gap-4 mb-3">
        <h2 className="text-xl font-semibold text-center">Career Averages</h2>
        {hasPlayoffs && (
          <div className="flex rounded-full overflow-hidden border border-gray-300 text-sm font-medium">
            <button
              onClick={() => setShowPlayoffs(false)}
              className={`px-3 py-1 transition ${!showPlayoffs ? "bg-gray-800 text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}
            >
              Regular
            </button>
            <button
              onClick={() => setShowPlayoffs(true)}
              className={`px-3 py-1 transition ${showPlayoffs ? "bg-yellow-500 text-black" : "bg-white text-gray-600 hover:bg-gray-100"}`}
            >
              Playoffs
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4 text-center">
        <div>
          <p className="text-gray-500">PPG</p>
          <p className="text-2xl font-bold">{ppg}</p>
        </div>
        <div>
          <p className="text-gray-500">APG</p>
          <p className="text-2xl font-bold">{apg}</p>
        </div>
        <div>
          <p className="text-gray-500">RPG</p>
          <p className="text-2xl font-bold">{rpg}</p>
        </div>
        <div>
          <p className="text-gray-500">FG%</p>
          <p className="text-2xl font-bold">{fgPct}{fgPct !== "—" ? "%" : ""}</p>
        </div>
      </div>
    </div>
  );
};

export default CareerAverages;
