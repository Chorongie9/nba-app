import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import RecentGames from "../components/RecentGames";
import PlayerStats from "../components/PlayerStats";
import CareerAverages from "../components/CareerAverages";

function PlayerDetails() {
  const { playerId } = useParams();
  const [searchParams] = useSearchParams();
  const playerName = searchParams.get("name");
  const [regularData, setRegularData] = useState([]);
  const [playoffData, setPlayoffData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!playerId) return;
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    fetch(`http://localhost:8000/player/${playerId}`, { signal: controller.signal })
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then(data => {
        if (data.error) { setError(data.error); setRegularData([]); setPlayoffData([]); }
        else { setRegularData(data.regular || []); setPlayoffData(data.playoffs || []); }
        setLoading(false);
      })
      .catch(err => {
        setError(err.name === 'AbortError' ? 'Request timed out' : err.message);
        setRegularData([]); setPlayoffData([]);
        setLoading(false);
      })
      .finally(() => clearTimeout(timeout));
  }, [playerId]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-zinc-600 text-sm animate-pulse">Loading player data…</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <p className="text-rose-500/70 text-sm">Error: {error}</p>
      <button
        onClick={() => window.history.back()}
        className="px-4 py-2 border border-zinc-700 text-zinc-400 rounded-lg text-xs hover:border-zinc-500 hover:text-zinc-200 transition-colors uppercase tracking-wider"
      >
        Go Back
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Player header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
        <div className="flex flex-col sm:flex-row items-center gap-8">
          <img
            src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`}
            alt={playerName}
            className="w-32 h-32 rounded-full object-cover object-top border border-zinc-800"
            onError={e => { e.target.src = "https://via.placeholder.com/128x128?text=?"; }}
          />
          <div className="flex-1 text-center sm:text-left">
            <h1 className="font-display font-extrabold text-5xl text-zinc-50 uppercase tracking-wide leading-none">
              {playerName}
            </h1>
            <p className="text-zinc-600 mt-3 text-[11px] uppercase tracking-widest">
              {regularData.length} seasons in the league
            </p>
          </div>
          <Link
            to={`/compare/${playerId}?name=${encodeURIComponent(playerName)}`}
            className="px-5 py-2 border border-zinc-700 text-zinc-400 rounded-lg text-xs font-medium hover:border-zinc-500 hover:text-zinc-200 transition-colors uppercase tracking-wider shrink-0"
          >
            Compare
          </Link>
        </div>
      </div>

      {/* Career Averages */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <CareerAverages regularData={regularData} playoffData={playoffData} />
      </div>

      {/* Recent Games */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <RecentGames playerId={playerId} />
      </div>

      {/* Season Stats */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        {regularData.length > 0
          ? <PlayerStats regularData={regularData} playoffData={playoffData} />
          : <p className="text-center text-zinc-600 text-sm">No stats found for {playerName}</p>
        }
      </div>
    </div>
  );
}

export default PlayerDetails;
