import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const PlayerStatsTable = ({ abbr, season }) => {
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'GP', direction: 'desc' }); // default sort

  useEffect(() => {
    if (!abbr || !season) return;

    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    fetch(`http://localhost:8000/teams/${abbr}/${season}`, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => setTeamData(data))
      .catch(err => setError(err.name === 'AbortError' ? 'Request timed out' : err.message))
      .finally(() => {
        setLoading(false);
        clearTimeout(timeout);
      });
  }, [abbr, season]);

  // Handle column header click
  const handleSort = (col) => {
    setSortConfig(prev => {
      if (prev.key === col) {
        // toggle direction
        return { key: col, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      } else {
        return { key: col, direction: 'desc' }; // new column defaults to descending
      }
    });
  };

  // Sort players
  const sortedPlayers = (teamData?.player_stats || []).sort((a, b) => {
    const valA = isNaN(a[sortConfig.key]) ? String(a[sortConfig.key]).toLowerCase() : Number(a[sortConfig.key]);
    const valB = isNaN(b[sortConfig.key]) ? String(b[sortConfig.key]).toLowerCase() : Number(b[sortConfig.key]);
    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  if (loading) return <p className="text-center mt-4">Loading player stats...</p>;
  if (error) return <p className="text-center mt-4 text-red-600">Error: {error}</p>;

  const columns = ['PLAYER_NAME', 'GP', 'PTS', 'AST', 'REB', 'MIN'];

  return (
    <div className="mt-6 overflow-x-auto max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-3">Player Stats — {season}</h2>

      {sortedPlayers.length > 0 ? (
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-100 text-left">
              {columns.map(col => (
                <th
                  key={col}
                  className="px-4 py-2 text-sm font-medium text-gray-700 cursor-pointer select-none"
                  onClick={() => handleSort(col)}
                >
                  {col.replace('_',' ')}
                  {sortConfig.key === col && (
                    <span>{sortConfig.direction === 'asc' ? ' ▲' : ' ▼'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player, idx) => (
              <tr key={idx} className="border-t hover:bg-gray-50">
                {columns.map(col => (
                  <td key={col} className="px-4 py-2 text-sm text-gray-800">
                    {col === 'PLAYER_NAME' ? (
                      <Link
                        to={`/player/${player.PLAYER_ID}`}
                        className="text-blue-600 hover:underline"
                      >
                        {player[col]}
                      </Link>
                    ) : (
                      player[col] ?? 'N/A'
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-gray-600">No player stats found for this season</p>
      )}
    </div>
  );
};

export default PlayerStatsTable;
