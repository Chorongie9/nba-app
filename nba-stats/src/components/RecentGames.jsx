import { useEffect, useState } from "react";

const RecentGames = ({ playerId }) => {
  const [recentGames, setRecentGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!playerId) return;
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    fetch(`http://localhost:8000/player/${playerId}/recent`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) throw new Error(data.error || "Invalid data");
        setRecentGames(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.name === 'AbortError' ? 'Request timed out' : "Failed to fetch recent games");
        setRecentGames([]);
        setLoading(false);
      })
      .finally(() => clearTimeout(timeout));
  }, [playerId]);

  const header = (
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500 mb-5">Last 5 Games</h2>
  );

  if (loading) return <div>{header}<p className="text-zinc-600 text-sm animate-pulse">Loading…</p></div>;
  if (error)   return <div>{header}<p className="text-rose-500/70 text-sm">{error}</p></div>;
  if (!recentGames.length) return <div>{header}<p className="text-zinc-600 text-sm">No recent games found</p></div>;

  return (
    <div>
      {header}
      <div className="divide-y divide-zinc-800/50">
        {recentGames.map((game, i) => (
          <div key={game.GAME_ID ?? i} className="flex items-center justify-between py-3.5">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-zinc-200">{game.MATCHUP}</span>
              {game.GAME_TYPE === 'Playoffs' && (
                <span className="text-[10px] bg-amber-400/15 text-amber-400 px-1.5 py-0.5 rounded font-semibold tracking-wide">PO</span>
              )}
            </div>
            <span className="text-xs text-zinc-600 tabular-nums">{game.GAME_DATE}</span>
            <div className="flex gap-5">
              {[{ v: game.PTS, l: "pts" }, { v: game.REB, l: "reb" }, { v: game.AST, l: "ast" }].map(({ v, l }) => (
                <span key={l} className="flex items-baseline gap-1">
                  <span className="font-display font-bold text-xl text-zinc-100 leading-none">{v}</span>
                  <span className="text-[10px] uppercase tracking-wide text-zinc-600">{l}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentGames;
