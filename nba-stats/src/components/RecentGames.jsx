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
        console.error(err);
        setError(err.name === 'AbortError' ? 'Request timed out' : "Failed to fetch recent games");
        setRecentGames([]);
        setLoading(false);
      })
      .finally(() => clearTimeout(timeout));
  }, [playerId]);

  if (loading) return <p>Loading recent games...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!recentGames.length) return <p>No recent games found</p>;

  return (
    <div className="mt-4">
      <h2 className="font-bold text-lg mb-2">Last 5 Games</h2>
      <ul className="space-y-2">
        {recentGames.map((game, i) => (
          <li key={game.GAME_ID ?? i} className="border p-2 rounded">
            <div className="font-semibold flex items-center gap-2">
              <span>{game.MATCHUP} — {game.GAME_DATE}</span>
              {game.GAME_TYPE === 'Playoffs' && (
                <span className="text-xs bg-yellow-400 text-black px-1.5 py-0.5 rounded font-bold">PO</span>
              )}
            </div>
            <div className="text-sm">
              PTS: {game.PTS} | REB: {game.REB} | AST: {game.AST}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RecentGames;
