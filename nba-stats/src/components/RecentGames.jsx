import { useEffect, useState } from "react";

const parseMMDDYYYY = dateStr => {
  if (!dateStr || dateStr.length !== 8) return null;
  const month = parseInt(dateStr.slice(0, 2)) - 1;
  const day = parseInt(dateStr.slice(2, 4));
  const year = parseInt(dateStr.slice(4, 8));
  return new Date(year, month, day);
};

const RecentGames = ({ playerId }) => {
  const [recentGames, setRecentGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!playerId) return;

    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    fetch(`http://localhost:8000/player/${playerId}/recent`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) throw new Error(data.error || "Invalid data");

        const sorted = data
          .map(game => ({ ...game, parsedDate: parseMMDDYYYY(game.GAME_DATE) }))
          .sort((a, b) => b.parsedDate - a.parsedDate)
          .slice(0, 5);

        setRecentGames(sorted);
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
        {recentGames.map(game => (
          <li key={game.GAME_ID} className="border p-2 rounded">
            <div className="font-semibold">
              {game.MATCHUP} - {game.GAME_DATE}
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
