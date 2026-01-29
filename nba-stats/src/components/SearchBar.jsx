import React, { useState, useEffect } from "react";

const SearchBar = ({ searchPlayer }) => {
  const [allPlayers, setAllPlayers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetch("http://localhost:8000/players")
      .then(res => res.json())
      .then(data => setAllPlayers(data));
  }, []);

  // Only filter after 3+ characters
  const filteredPlayers =
    searchTerm.length >= 3
      ? allPlayers
          .filter(player =>
            player.full_name.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .slice(0, 10)
      : [];

  return (
    <div className="relative">
      <input
        type="text"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        placeholder="Search Player..."
        className="border p-2 w-64"
      />
      {filteredPlayers.length > 0 && (
        <ul className="absolute border bg-gray-100 w-64 max-h-40 overflow-auto z-10">
          {filteredPlayers.map(player => (
            <li
              key={player.id}
              onClick={() => {
                searchPlayer(player.id, player.full_name);
                setSearchTerm(""); // clear input
              }}
              className="cursor-pointer p-2 hover:bg-gray-200"
            >
              {player.full_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchBar;
