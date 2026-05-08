import { useState, useEffect } from "react";

const SearchBar = ({ searchPlayer }) => {
  const [allPlayers, setAllPlayers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    fetch("http://localhost:8000/players", { signal: controller.signal })
      .then(res => res.json())
      .then(data => setAllPlayers(data))
      .catch(err => { if (err.name !== 'AbortError') console.error('Error fetching players:', err); })
      .finally(() => clearTimeout(timeout));
  }, []);

  const filteredPlayers = searchTerm.length >= 2
    ? allPlayers.filter(p => p.full_name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 10)
    : [];

  return (
    <div className="relative w-72">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
        </svg>
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search players…"
          className="w-full bg-zinc-900 text-zinc-200 placeholder-zinc-600 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-zinc-600 transition-colors"
        />
      </div>
      {filteredPlayers.length > 0 && (
        <ul className="absolute left-0 top-full mt-1.5 w-full bg-zinc-900 border border-zinc-800 rounded-lg max-h-64 overflow-auto z-50 shadow-2xl shadow-black/60">
          {filteredPlayers.map(player => (
            <li
              key={player.id}
              onClick={() => { searchPlayer(player.id, player.full_name); setSearchTerm(""); }}
              className="px-4 py-2.5 cursor-pointer text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors first:rounded-t-lg last:rounded-b-lg"
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
