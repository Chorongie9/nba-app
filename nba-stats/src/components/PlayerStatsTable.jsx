import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const PlayerStatsTable = ({ abbr, season, playerStats: externalStats }) => {
  const [fetchedStats, setFetchedStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'PTS', direction: 'desc' });

  useEffect(() => {
    if (externalStats !== undefined) return;
    if (!abbr || !season) return;
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    fetch(`http://localhost:8000/teams/${abbr}/${season}`, { signal: controller.signal })
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then(data => setFetchedStats(data.player_stats || []))
      .catch(err => setError(err.name === 'AbortError' ? 'Request timed out' : err.message))
      .finally(() => { setLoading(false); clearTimeout(timeout); });
  }, [abbr, season, externalStats]);

  const handleSort = (col) => {
    setSortConfig(prev => ({
      key: col,
      direction: prev.key === col && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const players = externalStats ?? fetchedStats ?? [];
  const sortedPlayers = players.slice().sort((a, b) => {
    const valA = isNaN(a[sortConfig.key]) ? String(a[sortConfig.key]).toLowerCase() : Number(a[sortConfig.key]);
    const valB = isNaN(b[sortConfig.key]) ? String(b[sortConfig.key]).toLowerCase() : Number(b[sortConfig.key]);
    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const COLS = [
    { key: 'PLAYER_NAME', label: 'Player' },
    { key: 'GP',          label: 'GP' },
    { key: 'MIN',         label: 'MIN' },
    { key: 'PTS',         label: 'PTS' },
    { key: 'AST',         label: 'AST' },
    { key: 'REB',         label: 'REB' },
  ];

  if (loading) return <p className="text-zinc-600 text-sm animate-pulse">Loading player stats…</p>;
  if (error)   return <p className="text-rose-500/70 text-sm">Error: {error}</p>;

  return (
    <div>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500 mb-5">
        Roster Stats — {season}
      </h2>
      {sortedPlayers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {COLS.map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className={`text-[10px] font-semibold text-zinc-600 uppercase tracking-[0.12em] pb-3 cursor-pointer select-none hover:text-zinc-400 transition-colors ${key === 'PLAYER_NAME' ? 'text-left' : 'text-center'}`}
                  >
                    {label}
                    {sortConfig.key === key && (
                      <span className="ml-1 text-amber-400">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {sortedPlayers.map((player, idx) => (
                <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                  {COLS.map(({ key }) => (
                    <td key={key} className={`py-3 text-xs ${key === 'PLAYER_NAME' ? 'text-left' : 'text-center text-zinc-400'}`}>
                      {key === 'PLAYER_NAME' ? (
                        <Link
                          to={`/player/${player.PLAYER_ID}?name=${encodeURIComponent(player.PLAYER_NAME)}`}
                          className="text-zinc-200 hover:text-amber-400 font-medium transition-colors"
                        >
                          {player[key]}
                        </Link>
                      ) : (
                        <span className={key === 'PTS' ? 'font-semibold text-zinc-100' : ''}>
                          {player[key] != null ? Number(player[key]).toFixed(key === 'GP' ? 0 : 1) : '—'}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-zinc-600 text-sm">No player stats found for this season</p>
      )}
    </div>
  );
};

export default PlayerStatsTable;
