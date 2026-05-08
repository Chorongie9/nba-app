import { useState } from 'react';
import { Link } from 'react-router-dom';

const Toggle = ({ showPlayoffs, setShowPlayoffs }) => (
  <div className="flex items-center gap-3 text-xs">
    <button
      onClick={() => setShowPlayoffs(false)}
      className={`pb-0.5 transition-colors ${!showPlayoffs ? "text-zinc-100 border-b border-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
    >
      Regular
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

const PlayerStats = ({ regularData, playoffData }) => {
  const [showPlayoffs, setShowPlayoffs] = useState(false);
  const hasPlayoffs = playoffData && playoffData.length > 0;
  const data = showPlayoffs ? playoffData : regularData;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">Season Stats</h2>
        {hasPlayoffs && <Toggle showPlayoffs={showPlayoffs} setShowPlayoffs={setShowPlayoffs} />}
      </div>
      {data.length === 0 ? (
        <p className="text-center text-zinc-600 text-sm py-4">No playoff data available</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {["Season", "Team", "GP", "PPG", "APG", "RPG"].map(h => (
                  <th key={h} className="text-[10px] font-semibold text-zinc-600 uppercase tracking-[0.12em] pb-3 text-center first:text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {data.map((season, i) => {
                if (season.TEAM_ABBREVIATION === "TOT") return null;
                return (
                  <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 text-zinc-500 text-xs font-medium">{season.SEASON_ID}</td>
                    <td className="py-3 text-center">
                      <Link
                        to={`/teams/${season.TEAM_ABBREVIATION}/${season.SEASON_ID}`}
                        className="text-zinc-300 hover:text-amber-400 font-medium text-xs transition-colors"
                      >
                        {season.TEAM_ABBREVIATION}
                      </Link>
                    </td>
                    <td className="py-3 text-center text-zinc-500 text-xs">{season.GP}</td>
                    <td className="py-3 text-center font-semibold text-zinc-100 text-xs">{season.GP ? (season.PTS / season.GP).toFixed(1) : "—"}</td>
                    <td className="py-3 text-center text-zinc-400 text-xs">{season.GP ? (season.AST / season.GP).toFixed(1) : "—"}</td>
                    <td className="py-3 text-center text-zinc-400 text-xs">{season.GP ? (season.REB / season.GP).toFixed(1) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PlayerStats;
