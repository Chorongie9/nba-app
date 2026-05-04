import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import RecentGames from "../components/RecentGames";
import PlayerStats from "../components/PlayerStats";
import CareerAverages from "../components/CareerAverages";
import SearchBar from "../components/SearchBar";

function PlayerDetails() {
  const { playerId } = useParams();
  const [searchParams] = useSearchParams();
  const playerName = searchParams.get("name");
  const [regularData, setRegularData] = useState([]);
  const [playoffData, setPlayoffData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!playerId) return;

    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    fetch(`http://localhost:8000/player/${playerId}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setRegularData([]);
          setPlayoffData([]);
        } else {
          setRegularData(data.regular || []);
          setPlayoffData(data.playoffs || []);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.name === 'AbortError' ? 'Request timed out - the server is taking too long to respond' : err.message);
        setRegularData([]);
        setPlayoffData([]);
        setLoading(false);
      })
      .finally(() => clearTimeout(timeout));
  }, [playerId]);

  const searchPlayer = (id, name) => {
    navigate(`/player/${id}?name=${encodeURIComponent(name)}`);
  };

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto flex justify-center items-center h-64">
        <p className="text-gray-600 text-lg animate-pulse">Loading player data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center">
        <p className="text-red-600 text-lg font-semibold">Error: {error}</p>
        <button
          onClick={() => window.history.back()}
          className="mt-5 px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-5xl mx-auto">

      {/* Search Bar */}
      <div className="mb-6">
        <SearchBar searchPlayer={searchPlayer} />
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200">

        {/* Header Row (Name + Compare Btn) */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-4xl font-bold tracking-tight">{playerName}</h2>

          <Link
            to={`/compare/${playerId}?name=${encodeURIComponent(playerName)}`}
            className="px-5 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition"
          >
            Compare Player
          </Link>
        </div>

        {/* Player Image */}
        <div className="flex justify-center mb-8">
          <img
            src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`}
            alt={playerName}
            className="w-44 h-44 rounded-full object-cover shadow-xl border border-gray-300 transition-transform duration-200"
            onError={(e) => {
              e.target.src = "https://via.placeholder.com/160x160?text=No+Photo";
            }}
          />
        </div>

        <div className="space-y-10">

          {/* Career Averages */}
          <div className="p-6 bg-gray-50 rounded-xl border shadow-sm">
            <CareerAverages regularData={regularData} playoffData={playoffData} />
          </div>

          {/* Recent Games */}
          <div className="p-6 bg-gray-50 rounded-xl border shadow-sm">
            <RecentGames playerId={playerId} />
          </div>

          {/* Player Stats Table */}
          <div className="p-6 bg-gray-50 rounded-xl border shadow-sm">
            {regularData.length > 0 ? (
              <PlayerStats regularData={regularData} playoffData={playoffData} />
            ) : (
              <p className="text-center text-gray-600">No stats found for {playerName}</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default PlayerDetails;
