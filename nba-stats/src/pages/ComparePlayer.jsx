import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
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
      .catch(err => { setError(err.name === 'AbortError' ? 'Request timed out' : "Failed to load player"); })
      .finally(() => { setLoading(false); clearTimeout(timeout); });
  }, [playerId]);

  const fetchComparison = (secondId, name) => {
    if (!playerId) return;
    setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    fetch(`http://localhost:8000/compare/${playerId}/${secondId}`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setPlayer1Regular(data.player1.regular || []);
        setPlayer1Playoffs(data.player1.playoffs || []);
        setPlayer2Regular(data.player2.regular || []);
        setPlayer2Playoffs(data.player2.playoffs || []);
        setSecondPlayerName(name);
        setSecondPlayerId(secondId);
        setError(null);
      })
      .catch(err => { setError(err.name === 'AbortError' ? 'Request timed out' : "Failed to fetch comparison"); })
      .finally(() => { setLoading(false); clearTimeout(timeout); });
  };

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500 mb-3">Compare</p>
        <h2 className="font-display font-extrabold text-3xl text-zinc-50 uppercase tracking-wide mb-5">
          {firstPlayerName} <span className="text-zinc-700">vs.</span>
        </h2>
        <SearchBar searchPlayer={fetchComparison} />
        {loading && <p className="text-zinc-600 text-xs mt-3 animate-pulse">Loading…</p>}
        {error && <p className="text-rose-500/70 text-xs mt-3">{error}</p>}
      </div>

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
