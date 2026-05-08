import { useState } from "react";

const computeAverages = (data) => {
  if (!data || data.length === 0) return null;
  const t = data.reduce(
    (acc, s) => {
      acc.games    += s.GP  || 0;
      acc.points   += s.PTS || 0;
      acc.assists  += s.AST || 0;
      acc.rebounds += s.REB || 0;
      acc.fgm      += s.FGM || 0;
      acc.fga      += s.FGA || 0;
      return acc;
    },
    { games: 0, points: 0, assists: 0, rebounds: 0, fgm: 0, fga: 0 }
  );
  return {
    ppg:   t.games ? (t.points   / t.games).toFixed(1) : "—",
    apg:   t.games ? (t.assists  / t.games).toFixed(1) : "—",
    rpg:   t.games ? (t.rebounds / t.games).toFixed(1) : "—",
    fgPct: t.fga   ? ((t.fgm / t.fga) * 100).toFixed(1) : "—",
  };
};

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

const CareerAverages = ({ regularData, playoffData }) => {
  const [showPlayoffs, setShowPlayoffs] = useState(false);
  const hasPlayoffs = playoffData && playoffData.length > 0;
  const stats = computeAverages(showPlayoffs ? playoffData : regularData);

  if (!regularData || regularData.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">Career Averages</h2>
        {hasPlayoffs && <Toggle showPlayoffs={showPlayoffs} setShowPlayoffs={setShowPlayoffs} />}
      </div>
      {stats ? (
        <div className="grid grid-cols-4 divide-x divide-zinc-800 text-center">
          {[
            { label: "PPG", value: stats.ppg,   suffix: "" },
            { label: "APG", value: stats.apg,   suffix: "" },
            { label: "RPG", value: stats.rpg,   suffix: "" },
            { label: "FG%", value: stats.fgPct, suffix: "%" },
          ].map(({ label, value, suffix }) => (
            <div key={label} className="flex flex-col items-center gap-1 px-4">
              <span className="font-display font-extrabold text-5xl text-zinc-50 leading-none">
                {value}{value !== "—" ? suffix : ""}
              </span>
              <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mt-2">{label}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-zinc-600 text-sm">No playoff data available</p>
      )}
    </div>
  );
};

export default CareerAverages;
