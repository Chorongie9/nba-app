import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import CompareTable from "../components/CompareTable";

const ComparePlayer = () => {
  const { playerId } = useParams();
  const [searchParams] = useSearchParams();
  const firstPlayerName = searchParams.get("name");

  const [player1Regular, setPlayer1Regular] = useState([]);
  const [player1Playoffs, setPlayer1Playoffs] = useState([]);
  const [player2Regular, setPlayer2Regular] = useState([]);
  const [player2Playoffs, setPlayer2Playoffs] = useState([]);
  const [secondPlayerName, setSecondPlayerName] = useState("");
  const [secondPlayerId, setSecondPlayerId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load first player's data on mount so their card shows immediately
  useEffect(() => {
    if (!playerId) return;

    setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    fetch(`http://localhost:8000/player/${playerId}`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setPlayer1Regular(data.regular || []);
        setPlayer1Playoffs(data.playoffs || []);
        setError(null);
      })
      .catch(err => {
        console.error(err);
        setError(err.name === 'AbortError' ? 'Request timed out' : "Failed to load first player");
      })
      .finally(() => {
        setLoading(false);
        clearTimeout(timeout);
      });
  }, [playerId]);

  const fetchComparison = (secondId, name) => {
    if (!playerId) return;

    setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    fetch(`http://localhost:8000/compare/${playerId}/${secondId}`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setPlayer1Regular(data.player1.regular || []);
          setPlayer1Playoffs(data.player1.playoffs || []);
          setPlayer2Regular(data.player2.regular || []);
          setPlayer2Playoffs(data.player2.playoffs || []);
          setSecondPlayerName(name);
          setSecondPlayerId(secondId);
          setError(null);
        }
      })
      .catch(err => {
        console.error(err);
        setError(err.name === 'AbortError' ? 'Request timed out' : "Failed to fetch comparison");
      })
      .finally(() => {
        setLoading(false);
        clearTimeout(timeout);
      });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-center">Compare {firstPlayerName} with:</h2>
      <div className="flex justify-center my-4">
        <SearchBar searchPlayer={fetchComparison} />
      </div>
      <Link to="/" className="block text-center mb-4 text-blue-500 hover:underline">
        &larr; Back to Home
      </Link>

      {loading && <p>Loading comparison...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <CompareTable
        player1Regular={player1Regular}
        player1Playoffs={player1Playoffs}
        player2Regular={player2Regular}
        player2Playoffs={player2Playoffs}
        firstPlayerName={firstPlayerName}
        secondPlayerName={secondPlayerName}
        player1Id={playerId}
        player2Id={secondPlayerId}
      />
    </div>
  );
};

export default ComparePlayer;
