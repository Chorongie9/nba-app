import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

const getTeamLogo = (teamId) => {
  if (!teamId) return null;
  return `https://cdn.nba.com/logos/nba/${teamId}/global/L/logo.svg`;
};

const formatMin = (min) => {
  if (!min) return '—';
  const s = String(min);
  const iso = s.match(/PT(\d+)M([\d.]+)S/);
  if (iso) return `${iso[1]}:${String(Math.round(Number(iso[2]))).padStart(2, '0')}`;
  return s.includes('.') ? s.split('.')[0] : s;
};

const fmtFrac = (made, att) => {
  if (made == null && att == null) return '—';
  return `${made ?? 0}-${att ?? 0}`;
};

const fmtPlusMinus = (v) => {
  if (v == null) return '—';
  return v > 0 ? `+${v}` : String(v);
};

const plusMinusClass = (v) => {
  if (v == null || v === 0) return 'text-zinc-500';
  return v > 0 ? 'text-emerald-400' : 'text-rose-400';
};

const COLS = [
  { label: 'MIN', render: (p) => formatMin(p.MIN), cls: () => 'text-zinc-400' },
  { label: 'FG',  render: (p) => fmtFrac(p.FGM, p.FGA), cls: () => 'text-zinc-400' },
  { label: '3PT', render: (p) => fmtFrac(p.FG3M, p.FG3A), cls: () => 'text-zinc-400' },
  { label: 'FT',  render: (p) => fmtFrac(p.FTM, p.FTA), cls: () => 'text-zinc-400' },
  { label: 'REB', render: (p) => p.REB ?? '—', cls: () => 'text-zinc-400' },
  { label: 'AST', render: (p) => p.AST ?? '—', cls: () => 'text-zinc-400' },
  { label: 'STL', render: (p) => p.STL ?? '—', cls: () => 'text-zinc-400' },
  { label: 'BLK', render: (p) => p.BLK ?? '—', cls: () => 'text-zinc-400' },
  { label: 'TO',  render: (p) => p.TO  ?? '—', cls: () => 'text-zinc-400' },
  { label: 'PF',  render: (p) => p.PF  ?? '—', cls: () => 'text-zinc-400' },
  { label: 'PTS', render: (p) => p.PTS ?? '—', cls: () => 'text-zinc-100 font-bold' },
  { label: '+/-', render: (p) => fmtPlusMinus(p.PLUS_MINUS), cls: () => 'text-zinc-400' },
];

const SectionLabel = ({ label, colSpan }) => (
  <tr>
    <td colSpan={colSpan} className="py-1 pl-9 text-[9px] uppercase tracking-widest text-zinc-600 bg-zinc-800/20">
      {label}
    </td>
  </tr>
);

const BoxScoreTable = ({ team }) => {
  if (!team?.players) return null;
  const { team_id, full_name, score, players, totals } = team;
  const totalCols = COLS.length + 1;

  const starters = players.filter(p => p.START_POSITION);
  const bench    = players.filter(p => !p.START_POSITION && !p.COMMENT);
  const dnp      = players.filter(p => p.COMMENT);

  const renderRow = (p) => {
    const isDNP = Boolean(p.COMMENT);
    return (
      <tr key={p.PLAYER_ID} className="border-b border-zinc-800/40 hover:bg-zinc-800/20 transition-colors">
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
            {starters.map(renderRow)}
            {bench.length > 0 && <SectionLabel label="Bench" colSpan={totalCols} />}
            {bench.map(renderRow)}
            {dnp.length > 0 && <SectionLabel label="Did Not Play" colSpan={totalCols} />}
            {dnp.map(renderRow)}
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

const GamePage = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!gameId) return;
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    fetch(`http://localhost:8000/game/${gameId}`, { signal: controller.signal })
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then(data => { if (data.error) throw new Error(data.error); setGameData(data); setLoading(false); })
      .catch(err => { setError(err.name === 'AbortError' ? 'Request timed out' : err.message); setLoading(false); })
      .finally(() => clearTimeout(timeout));
  }, [gameId]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-zinc-600 animate-pulse text-sm">Loading box score…</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <p className="text-rose-500/70 text-sm">{error}</p>
      <button
        onClick={() => navigate(-1)}
        className="px-4 py-2 border border-zinc-700 text-zinc-400 rounded-lg text-xs hover:border-zinc-500 hover:text-zinc-200 transition-colors uppercase tracking-wider"
      >
        Go Back
      </button>
    </div>
  );

  if (!gameData) return null;

  const { away, home, game_date, arena } = gameData;
  const awayWon = (away?.score ?? 0) > (home?.score ?? 0);

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors uppercase tracking-widest"
      >
        ← Back
      </button>

      {/* Game header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
        <div className="flex items-center justify-between gap-4">

          {/* Away team */}
          <div className={`flex flex-col items-center gap-3 flex-1 transition-opacity ${awayWon ? 'opacity-100' : 'opacity-50'}`}>
            <img
              src={getTeamLogo(away?.team_id)}
              alt={away?.abbreviation}
              className="w-12 h-12 object-contain"
              onError={e => { e.target.style.display = 'none'; }}
            />
            <div className="text-center">
              <p className="font-display font-extrabold text-2xl text-zinc-50 uppercase tracking-wide">{away?.full_name}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Away</p>
            </div>
          </div>

          {/* Score */}
          <div className="text-center shrink-0 px-4">
            <div className="flex items-center gap-5">
              <span className={`font-display font-extrabold text-8xl leading-none ${awayWon ? 'text-zinc-50' : 'text-zinc-500'}`}>
                {away?.score}
              </span>
              <span className="text-zinc-700 text-2xl font-light">–</span>
              <span className={`font-display font-extrabold text-8xl leading-none ${!awayWon ? 'text-zinc-50' : 'text-zinc-500'}`}>
                {home?.score}
              </span>
            </div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-[0.15em] mt-3">Final</p>
            {game_date && <p className="text-[10px] text-zinc-600 mt-1">{game_date}</p>}
            {arena && <p className="text-[10px] text-zinc-700 mt-0.5">{arena}</p>}
          </div>

          {/* Home team */}
          <div className={`flex flex-col items-center gap-3 flex-1 transition-opacity ${!awayWon ? 'opacity-100' : 'opacity-50'}`}>
            <img
              src={getTeamLogo(home?.team_id)}
              alt={home?.abbreviation}
              className="w-12 h-12 object-contain"
              onError={e => { e.target.style.display = 'none'; }}
            />
            <div className="text-center">
              <p className="font-display font-extrabold text-2xl text-zinc-50 uppercase tracking-wide">{home?.full_name}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Home</p>
            </div>
          </div>

        </div>
      </div>

      <BoxScoreTable team={away} />
      <BoxScoreTable team={home} />
    </div>
  );
};

export default GamePage;
