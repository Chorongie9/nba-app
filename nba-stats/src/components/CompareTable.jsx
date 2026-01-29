import React from 'react';
import PlayerStats from './PlayerStats';
import { Link } from 'react-router-dom';
import CareerAverages from './CareerAverages';

const CompareTable = ({ player1data, player2data, firstPlayerName, secondPlayerName, player1Id, player2Id }) => {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-center mb-6">Player Comparison</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Player 1 Card */}
        <div className="border rounded-lg shadow-lg bg-white p-4 flex flex-col items-center">
          <h3 className="text-xl font-semibold mb-2">
            <Link to={`/player/${player1Id}?name=${encodeURIComponent(firstPlayerName)}`} className="text-black-500 hover:underline">
                {firstPlayerName}
            </Link>
            </h3>
          <img
            src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player1Id}.png`}
            alt={firstPlayerName}
            className="w-40 h-40 rounded-full object-cover shadow-md mb-4"
            onError={(e) => { e.target.src = 'https://via.placeholder.com/160x160?text=No+Photo'; }}
          />
          <div className="w-full">
            <CareerAverages playerData={player1data} />
          </div>
          <div className="w-full mt-4">
            <PlayerStats playerData={player1data} />
          </div>
        </div>

        {/* Player 2 Card */}
        <div className="border rounded-lg shadow-lg bg-white p-4 flex flex-col items-center">
          <h3 className="text-xl font-semibold mb-2">
            <Link to={`/player/${player2Id}?name=${encodeURIComponent(secondPlayerName)}`} className="text-black-500 hover:underline">
              {secondPlayerName}
            </Link>
          </h3>
          <img
            src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player2Id}.png`}
            alt={secondPlayerName}
            className="w-40 h-40 rounded-full object-cover shadow-md mb-4"
            onError={(e) => { e.target.src = 'https://via.placeholder.com/160x160?text=No+Photo'; }}
          />
          <div className="w-full">
            <CareerAverages playerData={player2data} />
          </div>
          <div className="w-full mt-4">
            <PlayerStats playerData={player2data} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompareTable;
