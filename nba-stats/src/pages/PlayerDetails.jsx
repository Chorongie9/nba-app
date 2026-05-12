import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import RecentGames from "../components/RecentGames";
import PlayerStats from "../components/PlayerStats";
import CareerAverages from "../components/CareerAverages";
import CareerChart from "../components/CareerChart";
import SimilarPlayers from "../components/SimilarPlayers";

function PlayerDetails() {
  const { playerId } = useParams();
  const [searchParams] = useSearchParams();
  const playerName = searchParams.get("name");
  const [regularData, setRegularData] = useState([]);
  const [playoffData, setPlayoffData] = useState([]);
  const [playerInfo, setPlayerInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!playerId) return;
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    Promise.all([
      fetch(`http://localhost:8000/player/${playerId}`, { signal: controller.signal }).then(r => r.json()),
      fetch(`http://localhost:8000/player/${playerId}/info`, { signal: controller.signal }).then(r => r.json()),
    ])
      .then(([statsData, infoData]) => {
        if (statsData.error) throw new Error(statsData.error);
        setRegularData(statsData.regular || []);
        setPlayoffData(statsData.playoffs || []);
        if (!infoData.error) setPlayerInfo(infoData);
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

  const teamLogoUrl = playerInfo?.team_id
    ? `https://cdn.nba.com/logos/nba/${playerInfo.team_id}/global/L/logo.svg`
    : null;

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

            {/* Team + position row */}
            <div className="flex items-center gap-4 mt-3 justify-center sm:justify-start flex-wrap">
              {playerInfo?.team_name && (
                <Link
                  to={`/teams/${playerInfo.team_abbreviation}`}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  {teamLogoUrl && (
                    <img
                      src={teamLogoUrl}
                      alt={playerInfo.team_name}
                      className="w-5 h-5 object-contain"
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  )}
                  <span className="text-[11px] uppercase tracking-widest text-zinc-400">
                    {playerInfo.team_name}
                  </span>
                </Link>
              )}
              {playerInfo?.team_name && playerInfo?.position && (
                <span className="text-zinc-700 text-xs">·</span>
              )}
              {playerInfo?.position && (
                <span className="text-[11px] uppercase tracking-widest text-zinc-500">
                  {playerInfo.position}
                </span>
              )}
              {playerInfo?.jersey && (
                <>
                  <span className="text-zinc-700 text-xs">·</span>
                  <span className="text-[11px] uppercase tracking-widest text-zinc-500">
                    #{playerInfo.jersey}
                  </span>
                </>
              )}
              {playerInfo?.height && (
                <>
                  <span className="text-zinc-700 text-xs">·</span>
                  <span className="text-[11px] uppercase tracking-widest text-zinc-500">
                    {playerInfo.height} / {playerInfo.weight} lbs
                  </span>
                </>
              )}
            </div>

            <p className="text-zinc-600 mt-2 text-[11px] uppercase tracking-widest">
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

      {/* Career Chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <CareerChart regularData={regularData} playoffData={playoffData} />
      </div>

      {/* Similar Players */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <SimilarPlayers playerId={playerId} />
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
