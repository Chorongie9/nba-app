import React from 'react';
import { Link } from 'react-router-dom';
import { getTeamLogo, COLS } from '../utils/gameUtils';

const SectionLabel = ({ label, colSpan }) => (
  <tr>
    <td colSpan={colSpan} className="py-1 pl-9 text-[9px] uppercase tracking-widest text-zinc-600 bg-zinc-800/20">
      {label}
    </td>
  </tr>
);

const PlayerRow = ({ p }) => {
  const isDNP = Boolean(p.COMMENT);
  return (
    <tr className="border-b border-zinc-800/40 hover:bg-zinc-800/20 transition-colors">
      <td className="py-2.5 pl-4 pr-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-zinc-600 w-3 shrink-0">{p.START_POSITION || ''}</span>
          {isDNP ? (
            <span className="text-xs text-zinc-600">{p.PLAYER_NAME}</span>
          ) : (
            <Link
              to={`/player/${p.PLAYER_ID}?name=${encodeURIComponent(p.PLAYER_NAME)}`}
              className="text-xs text-zinc-200 hover:text-white hover:underline transition-colors"
            >
              {p.PLAYER_NAME}
            </Link>
          )}
        </div>
      </td>
      {isDNP ? (
        <td colSpan={COLS.length} className="py-2.5 text-[10px] text-zinc-600 uppercase tracking-wider pl-2">
          {p.COMMENT}
        </td>
      ) : (
        COLS.map(col => (
          <td key={col.label} className={`text-center py-2.5 px-2 text-xs tabular-nums ${col.cls(p)}`}>
            {col.render(p)}
          </td>
        ))
      )}
    </tr>
  );
};

const BoxScoreTable = ({ team }) => {
  if (!team?.players) return null;
  const { team_id, full_name, score, players, totals } = team;
  const totalCols = COLS.length + 1;

  const starters = players.filter(p => p.START_POSITION);
  const bench    = players.filter(p => !p.START_POSITION && !p.COMMENT);
  const dnp      = players.filter(p => p.COMMENT);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800">
        <img
          src={getTeamLogo(team_id)}
          alt={full_name}
          className="w-4 h-4 object-contain"
          onError={e => { e.target.style.display = 'none'; }}
        />
        <span className="font-display font-extrabold text-base text-zinc-50 uppercase tracking-wide">{full_name}</span>
        <span className="ml-auto font-display font-extrabold text-2xl text-zinc-50">{score}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px]">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="py-2 pl-4 pr-4 text-left text-[10px] uppercase tracking-widest text-zinc-600 font-semibold min-w-[160px]">
                Player
              </th>
              {COLS.map(col => (
                <th
                  key={col.label}
                  className={`py-2 px-2 text-center text-[10px] uppercase tracking-widest font-semibold ${col.label === 'PTS' ? 'text-zinc-400' : 'text-zinc-600'}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {starters.map(p => <PlayerRow key={p.PLAYER_ID} p={p} />)}
            {bench.length > 0 && <SectionLabel label="Bench" colSpan={totalCols} />}
            {bench.map(p => <PlayerRow key={p.PLAYER_ID} p={p} />)}
            {dnp.length > 0 && <SectionLabel label="Did Not Play" colSpan={totalCols} />}
            {dnp.map(p => <PlayerRow key={p.PLAYER_ID} p={p} />)}
            {totals && Object.keys(totals).length > 0 && (
              <tr className="border-t border-zinc-700 bg-zinc-800/20">
                <td className="py-2.5 pl-9 pr-4 text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
                  Totals
                </td>
                {COLS.map(col => (
                  <td
                    key={col.label}
                    className={`text-center py-2.5 px-2 text-xs tabular-nums font-semibold ${col.label === 'PTS' ? 'text-zinc-100' : 'text-zinc-400'}`}
                  >
                    {col.render(totals)}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BoxScoreTable;
