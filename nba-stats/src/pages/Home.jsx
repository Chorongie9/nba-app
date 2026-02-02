import React from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar";

function Home() {
  const navigate = useNavigate();

  const searchPlayer = (id, name) => {
    // Navigate to player details page with player ID and name as URL params
    navigate(`/player/${id}?name=${encodeURIComponent(name)}`);
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-5xl text-center font-bold mb-4">NBA Stats</h1>
      <div className="flex justify-center mb-4">
        <SearchBar searchPlayer={searchPlayer} />
      </div>
      <div className="text-center text-gray-600">
        <p>Search for an NBA player to view their career statistics and recent games.</p>
      </div>
    </div>
  );
}

export default Home;