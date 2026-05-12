import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const SimilarPlayers = ({ playerId }) => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!playerId) return;
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    fetch(`http://localhost:8000/player/${playerId}/similar`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { if (d.error) throw new Error(d.error); setData(d); })
      .catch(err => setError(err.name === 'AbortError' ? 'Request timed out' : err.message))
      .finally(() => { setLoading(false); clearTimeout(timeout); });
  }, [playerId]);

  if (loading) return (
    <p className="text-zinc-600 text-sm animate-pulse">Finding similar players…</p>
  );
  if (error) return (
    <p className="text-rose-500/70 text-sm">Error: {error}</p>
  );
  if (data?.unavailable) return (
    <p className="text-zinc-600 text-sm">No current-season data available for this player.</p>
  );
  if (!data?.similar?.length) return null;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
          Similar Players
        </h2>
        <span className="text-[10px] text-zinc-600 uppercase tracking-widest">{data.season}</span>
      </div>

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

            {/* Mini stat pills */}
            <div className="flex gap-3 text-[10px] tabular-nums text-zinc-500 shrink-0">
              <span><span className="text-zinc-300 font-semibold">{p.pts}</span> pts</span>
              <span><span className="text-zinc-300 font-semibold">{p.reb}</span> reb</span>
              <span><span className="text-zinc-300 font-semibold">{p.ast}</span> ast</span>
            </div>

            {/* Similarity bar */}
            <div className="w-20 shrink-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] tabular-nums text-zinc-400">{p.similarity}%</span>
              </div>
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
    </div>
  );
};

export default SimilarPlayers;
