import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import CompareTable from "../components/CompareTable";

const ComparePlayer = () => {
  const { playerId } = useParams(); // get playerId from the URL
  const [searchParams] = useSearchParams();
  const firstPlayerName = searchParams.get("name");

  const [firstPlayerData, setFirstPlayerData] = useState([]);
  const [secondPlayerData, setSecondPlayerData] = useState([]);
  const [secondPlayerName, setSecondPlayerName] = useState(""); // ✅ store second player name
  const [secondPlayerId, setSecondPlayerId] = useState(null);


  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!playerId) return;

    setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    fetch(`http://localhost:8000/player/${playerId}`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) throw new Error("Invalid player data");
        setFirstPlayerData(data);
        setError(null);
      })
      .catch(err => {
        console.error(err);
        setFirstPlayerData([]);
        setError(err.name === 'AbortError' ? 'Request timed out' : "Failed to load first player");
      })
      .finally(() => {
        setLoading(false);
        clearTimeout(timeout);
      });
  }, [playerId]);

  const fetchComparison = (secondId, secondPlayerName) => {
    if (!playerId) return;

    setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20 second timeout
    
    fetch(`http://localhost:8000/compare/${playerId}/${secondId}`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
          setSecondPlayerData([]);
        } else {
          setFirstPlayerData(data.player1);
          setSecondPlayerData(data.player2);
          setSecondPlayerName(secondPlayerName);
          setSecondPlayerId(secondId);
          setError(null);
        }
      })
      .catch(err => {
        console.error(err);
        setError(err.name === 'AbortError' ? 'Request timed out' : "Failed to fetch comparison");
        setSecondPlayerData([]);
      })
      .finally(() => {
        setLoading(false);
        clearTimeout(timeout);
      });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-center"> Compare {firstPlayerName} with:</h2>
      <div className="flex justify-center my-4">
              <SearchBar searchPlayer={fetchComparison} />
      </div>
      <Link to="/" className="block text-center mb-4 text-blue-500 hover:underline">
        &larr; Back to Home
      </Link>

      {loading && <p>Loading comparison...</p>}

      {error && <p className="text-red-500">{error}</p>}

      <CompareTable
        player1data={firstPlayerData}
        player2data={secondPlayerData}
        firstPlayerName={firstPlayerName}
        secondPlayerName={secondPlayerName}
        player1Id={playerId}
        player2Id={secondPlayerId}
      />
    </div>
  );
};

export default ComparePlayer;
