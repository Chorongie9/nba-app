import { useState } from 'react';
import { Link } from 'react-router-dom';

const PlayerStats = ({ regularData, playoffData }) => {
  const [showPlayoffs, setShowPlayoffs] = useState(false);
  const hasPlayoffs = playoffData && playoffData.length > 0;
  const data = showPlayoffs ? playoffData : regularData;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Season Stats</h2>
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

      <table border="1" className="border-collapse w-full text-center">
        <thead>
          <tr className="bg-gray-200">
            <th>Season</th>
            <th>Team</th>
            <th>GP</th>
            <th>PPG</th>
            <th>APG</th>
            <th>RPG</th>
          </tr>
        </thead>
        <tbody>
          {data.map((season, i) => {
            if (season.TEAM_ABBREVIATION === "TOT") return null;
            return (
              <tr key={i} className="hover:bg-gray-100">
                <td>{season.SEASON_ID}</td>
                <td>
                  <Link
                    to={`/teams/${season.TEAM_ABBREVIATION}/${season.SEASON_ID}`}
                    className="text-blue-600 hover:underline"
                  >
                    {season.TEAM_ABBREVIATION}
                  </Link>
                </td>
                <td>{season.GP}</td>
                <td>{season.GP ? (season.PTS / season.GP).toFixed(1) : "—"}</td>
                <td>{season.GP ? (season.AST / season.GP).toFixed(1) : "—"}</td>
                <td>{season.GP ? (season.REB / season.GP).toFixed(1) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {data.length === 0 && (
        <p className="text-center text-gray-500 mt-4">No playoff data available</p>
      )}
    </div>
  );
};

export default PlayerStats;
