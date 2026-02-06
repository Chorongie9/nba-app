import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import RecentGames from "../components/RecentGames";
import PlayerStats from "../components/PlayerStats";
import CareerAverages from "../components/CareerAverages";
import SearchBar from "../components/SearchBar";


function PlayerDetails() {
  const { playerId } = useParams();
  const [searchParams] = useSearchParams();
  const playerName = searchParams.get('name');
  const [playerData, setPlayerData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!playerId) return;

    setLoading(true);
    setError(null);

    fetch(`http://localhost:8000/player/${playerId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
          setPlayerData([]);
        } else {
          setPlayerData(data);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setPlayerData([]);
        setLoading(false);
      });
  }, [playerId]);

  const searchPlayer = (id, name) => {
    // Navigate to player details page with player ID and name as URL params
    navigate(`/player/${id}?name=${encodeURIComponent(name)}`);
  };


  if (loading) {
    return (
      <div className="p-4 max-w-5xl mx-auto">
        <div className="text-center">
          <p>Loading player data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 max-w-5xl mx-auto">
        <div className="text-center text-red-600">
          <p>Error: {error}</p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="mb-4 text-center">
        <SearchBar searchPlayer={searchPlayer}/>
      </div>

      <div className="mt-6">
        <h2 className="text-3xl font-semibold mb-4 text-center">{playerName}</h2>

        {/* Player photo */}
        <div className="flex justify-center mb-6">
          <img
            src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`}
            alt={playerName}
            className="w-40 h-40 object-cover rounded-lg shadow-lg"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/160x160?text=No+Photo';
            }}
          />
        </div>

        <div className="mb-4 text-center">
          <Link to={`/compare/${playerId}?name=${encodeURIComponent(playerName)}`} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
            Compare Player
          </Link>
        </div>

        <CareerAverages playerData={playerData} />
        <RecentGames playerId={playerId} />

        {/* Stats table */}
        {playerData.length > 0 ? (
          <PlayerStats playerData={playerData} />
        ) : (
          <p className="text-center text-gray-600">No stats found for {playerName}</p>
        )}
      </div>
    </div>
  );
}

export default PlayerDetails;