import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import PlayerStatsTable from '../components/PlayerStatsTable.jsx';


const TeamPage = () => {
  const { abbr } = useParams();
  const season = "2025-26"; // Default season for team page
  const navigate = useNavigate();
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper function to get team logo URL

  useEffect(() => {
    if (!abbr || !season) return;

    setLoading(true);
    setError(null);

    fetch(`http://localhost:8000/teams/${abbr}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data.error) {
          throw new Error(data.error);
        }
        setTeamData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(`Error fetching team ${abbr} season ${season}:`, err);
        setError(err.message);
        setLoading(false);
      });
  }, [abbr, season]);


  if (loading) {
    return (
      <div className="p-4 max-w-5xl mx-auto">
        <p className="text-center">Loading team data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 max-w-5xl mx-auto">
        <div className="text-center text-red-600">
          <p>Error: {error}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!teamData) {
    return (
      <div className="p-4 max-w-5xl mx-auto">
        <p className="text-center text-gray-600">No team data found</p>
      </div>
    );
  }

  // Handle both single team object and profile object with team_info
  const team = teamData.team_info || teamData;
  const recentGames = teamData.recent_games || [];
  const seasonStats = teamData.season_stats || [];
  const teamAbbr = team.abbreviation || abbr;
  const teamId = team.id;


  const getTeamLogo = (identifier) => {
    if (!identifier) return null;
    // If identifier looks like a numeric NBA team id, use the cdn.nba.com logo path
    const asNum = Number(identifier);
    if (!Number.isNaN(asNum) && asNum > 1000) {
      return `https://cdn.nba.com/logos/nba/${asNum}/global/L/logo.svg`;
    }
    // Otherwise treat as abbreviation
    return `https://i.cdn.turner.com/nba/nba/.element/img/4.0/global/logos/512x512/bg.white/${identifier}_logo.svg`;
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="mb-4">
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          ← Back to Home
        </button>
      </div>

      <div className="mb-6">
        <h1 className="text-4xl font-bold mb-2">{team.full_name}</h1>
        <div className="grid grid-cols-2 gap-4 text-gray-700">
          <div>
            <p><strong>Abbreviation:</strong> {team.abbreviation}</p>
            <p><strong>City:</strong> {team.city}</p>
          </div>
          <div>
            <p><strong>Conference:</strong> {team.conference || 'N/A'}</p>
            <p><strong>Division:</strong> {team.division || 'N/A'}</p>
          </div>
          <div>
            <p><strong>Season:</strong> {teamData.season || 'N/A'}</p>
            <p><strong>Win-Loss Record:</strong> {teamData.wins || 'N/A'}-{teamData.losses || 'N/A'}</p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-3">Recent Games</h2>
        {recentGames.length > 0 ? (
          <div className="space-y-4">
            {recentGames.map((game, i) => {
              const opponentAbbr = game.OPP_ABBR;
              const opponentId = game.OPP_ID || opponentAbbr;
              const isWin = game.WL === 'W';
              
              return (
                <div key={i} className={`border-2 rounded-lg p-4 ${isWin ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                  <p className="text-sm text-gray-600 mb-3"><strong>Date:</strong> {game.GAME_DATE}</p>
                  
                  <div className="flex items-center justify-between gap-4">
                    {/* Our Team */}
                    <div className="flex flex-col items-center flex-1">
                      <img
                        src={getTeamLogo(teamId)}
                        alt={teamAbbr}
                        className="w-16 h-16 mb-2 object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <p className="font-semibold text-center text-sm">{teamAbbr}</p>
                    </div>

                    {/* Score */}
                    <div className="flex flex-col items-center justify-center gap-1">
                      <div className="flex items-baseline gap-2">
                        <p className={`text-4xl font-bold ${isWin ? 'text-green-600' : 'text-red-600'}`}>
                          {game.PTS}
                        </p>
                        <p className="text-2xl font-semibold text-gray-400">-</p>
                        <p className={`text-4xl font-bold ${isWin ? 'text-red-600' : 'text-green-600'}`}>
                          {game.OPP_PTS}
                        </p>
                      </div>
                      <p className={`text-sm font-semibold mt-2 ${isWin ? 'text-green-600' : 'text-red-600'}`}>
                        {isWin ? 'W' : 'L'}
                      </p>
                    </div>

                    {/* Opponent Team */}
                    {opponentId && (
                      <div className="flex flex-col items-center flex-1">
                        <img
                          src={getTeamLogo(opponentId)}
                          alt={opponentAbbr || opponentId}
                          className="w-16 h-16 mb-2 object-contain"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <Link to={`/teams/${opponentAbbr}/${season}`} className="text-gray-600 hover:underline">
                          {opponentAbbr || opponentId}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-600">No recent games found</p>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-3">Season Stats</h2>
        {seasonStats.length > 0 ? (
          <div className="space-y-2">
            {seasonStats.map((stat, i) => (
              <div key={i} className="border p-3 rounded bg-gray-50">
                <p><strong>GP:</strong> {stat.GP || 'N/A'} | <strong>PTS:</strong> {stat.PTS || 'N/A'} | <strong>AST:</strong> {stat.AST || 'N/A'} | <strong>REB:</strong> {stat.REB || 'N/A'}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No season stats found</p>
        )}
      </div>

      {/* Player stats for the season (per-team) */}
      {/* Player stats for the season (per-team) */}
       <PlayerStatsTable abbr={abbr} season={season} />

    </div>
  );
}

export default TeamPage;
