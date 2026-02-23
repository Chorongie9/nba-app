import React, { useState, useEffect } from "react";

const SearchBar = ({ searchPlayer }) => {
  const [allPlayers, setAllPlayers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    fetch("http://localhost:8000/players", { signal: controller.signal })
      .then(res => res.json())
      .then(data => setAllPlayers(data))
      .catch(err => {
        if (err.name !== 'AbortError') console.error('Error fetching players:', err);
      })
      .finally(() => clearTimeout(timeout));
  }, []);

  const filteredPlayers =
    searchTerm.length >= 3
      ? allPlayers
          .filter(player =>
            player.full_name.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .slice(0, 10)
      : [];

  return (
    <div className="w-full flex justify-center">
      {/* This wrapper keeps dropdown centered */}
      <div className="relative w-64">
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search Player..."
          className="border p-2 w-full"
        />

        {filteredPlayers.length > 0 && (
          <ul className="absolute left-0 w-full border bg-gray-100 max-h-40 overflow-auto z-10 shadow-md">
            {filteredPlayers.map(player => (
              <li
                key={player.id}
                onClick={() => {
                  searchPlayer(player.id, player.full_name);
                  setSearchTerm("");
                }}
                className="cursor-pointer p-2 hover:bg-gray-200"
              >
                {player.full_name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
