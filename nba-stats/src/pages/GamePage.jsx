import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import GameHeader from '../components/GameHeader';
import BoxScoreTable from '../components/BoxScoreTable';

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

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors uppercase tracking-widest"
      >
        ← Back
      </button>

      <GameHeader away={away} home={home} game_date={game_date} arena={arena} />
      <BoxScoreTable team={away} />
      <BoxScoreTable team={home} />
    </div>
  );
};

export default GamePage;
