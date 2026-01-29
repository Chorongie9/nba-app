import React from "react";

const CareerAverages = ({ playerData }) => {
  if (!playerData || playerData.length === 0) return null;

  const totals = playerData.reduce(
    (acc, season) => {
      acc.games += season.GP;
      acc.points += season.PTS;
      acc.assists += season.AST;
      acc.rebounds += season.REB;
      acc.fgm += season.FGM;
      acc.fga += season.FGA;
      return acc;
    },
    {
      games: 0,
      points: 0,
      assists: 0,
      rebounds: 0,
      fgm: 0,
      fga: 0,
    }
  );

  const ppg = (totals.points / totals.games).toFixed(1);
  const apg = (totals.assists / totals.games).toFixed(1);
  const rpg = (totals.rebounds / totals.games).toFixed(1);
  const fgPct = ((totals.fgm / totals.fga) * 100).toFixed(1);

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-3 text-center">
        Career Averages
      </h2>

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
          <p className="text-2xl font-bold">{fgPct}%</p>
        </div>
      </div>
    </div>
  );
};

export default CareerAverages;
