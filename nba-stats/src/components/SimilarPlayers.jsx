import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';

const SimilarPlayers = ({ playerId, regularData, position }) => {
  // Build a deduped, most-recent-first list of seasons from the player's career data
  const seasons = useMemo(() => {
    if (!regularData?.length) return [];
    const seen = new Set();
    return [...regularData]
      .reverse()
      .map(r => r.SEASON_ID)
      .filter(s => s && !seen.has(s) && seen.add(s));
  }, [regularData]);

  const [season, setSeason] = useState(seasons[0] || '2025-26');
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  // Reset to most recent season when navigating to a different player
  useEffect(() => {
    if (seasons.length > 0) setSeason(seasons[0]);
  }, [playerId]);

  useEffect(() => {
    if (!playerId || !season) return;
    setLoading(true);
    setError(null);
    setData(null);

    const params = new URLSearchParams({ season });
    if (position) params.append('position', position);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    fetch(`http://localhost:8000/player/${playerId}/similar?${params}`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { if (d.error) throw new Error(d.error); setData(d); })
      .catch(err => setError(err.name === 'AbortError' ? 'Request timed out' : err.message))
      .finally(() => { setLoading(false); clearTimeout(timeout); });
  }, [playerId, season, position]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
          Similar Players
        </h2>
        {seasons.length > 1 && (
          <select
            value={season}
            onChange={e => setSeason(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px] uppercase tracking-widest rounded px-2 py-1 focus:outline-none focus:border-zinc-500 cursor-pointer"
          >
            {seasons.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
      </div>

      {loading && (
        <p className="text-zinc-600 text-sm animate-pulse">Finding similar players…</p>
      )}
      {error && (
        <p className="text-rose-500/70 text-sm">Error: {error}</p>
      )}
      {!loading && data?.unavailable && (
        <p className="text-zinc-600 text-sm">No data available for this player in {season}.</p>
      )}
      {!loading && !error && data?.basic_stats && (
        <p className="text-zinc-600 text-[10px] uppercase tracking-wider mb-4">
          Based on per-game stats — advanced metrics unavailable for this season
        </p>
      )}
      {!loading && !error && data?.similar?.length > 0 && (
        <div className="space-y-1">
          {data.similar.map((p, i) => (
            <div key={p.player_id} className="flex items-center gap-3 py-2.5 border-b border-zinc-800/50 last:border-0">
              {/* Rank */}
              <span className="text-[10px] text-zinc-700 w-4 shrink-0 tabular-nums">{i + 1}</span>

              {/* Name + team */}
              <div className="flex-1 min-w-0">
                <Link
                  to={`/player/${p.player_id}?name=${encodeURIComponent(p.player_name)}`}
                  className="text-xs text-zinc-200 hover:text-white hover:underline transition-colors block truncate"
                >
                  {p.player_name}
                </Link>
                <span className="text-[10px] text-zinc-600 uppercase tracking-wider">{p.team}</span>
              </div>

              {/* Mini stats */}
              <div className="flex gap-3 text-[10px] tabular-nums text-zinc-500 shrink-0">
                <span><span className="text-zinc-300 font-semibold">{p.pts}</span> pts</span>
                <span><span className="text-zinc-300 font-semibold">{p.reb}</span> reb</span>
                <span><span className="text-zinc-300 font-semibold">{p.ast}</span> ast</span>
              </div>

              {/* Similarity bar */}
              <div className="w-20 shrink-0">
                <span className="text-[10px] tabular-nums text-zinc-400 block mb-0.5">{p.similarity}%</span>
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500/70"
                    style={{ width: `${p.similarity}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SimilarPlayers;
