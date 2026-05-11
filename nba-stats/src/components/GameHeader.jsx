import React from 'react';
import { getTeamLogo } from '../utils/gameUtils';

const TeamSide = ({ team, won }) => (
  <div className={`flex flex-col items-center gap-3 flex-1 transition-opacity ${won ? 'opacity-100' : 'opacity-50'}`}>
    <img
      src={getTeamLogo(team?.team_id)}
      alt={team?.abbreviation}
      className="w-12 h-12 object-contain"
      onError={e => { e.target.style.display = 'none'; }}
    />
    <div className="text-center">
      <p className="font-display font-extrabold text-2xl text-zinc-50 uppercase tracking-wide">{team?.full_name}</p>
      <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">{team?.label}</p>
    </div>
  </div>
);

const GameHeader = ({ away, home, game_date, arena }) => {
  const awayWon = (away?.score ?? 0) > (home?.score ?? 0);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
      <div className="flex items-center justify-between gap-4">
        <TeamSide team={{ ...away, label: 'Away' }} won={awayWon} />

        <div className="text-center shrink-0 px-4">
          <div className="flex items-center gap-5">
            <span className={`font-display font-extrabold text-8xl leading-none ${awayWon ? 'text-zinc-50' : 'text-zinc-500'}`}>
              {away?.score}
            </span>
            <span className="text-zinc-700 text-2xl font-light">–</span>
            <span className={`font-display font-extrabold text-8xl leading-none ${!awayWon ? 'text-zinc-50' : 'text-zinc-500'}`}>
              {home?.score}
            </span>
          </div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-[0.15em] mt-3">Final</p>
          {game_date && <p className="text-[10px] text-zinc-600 mt-1">{game_date}</p>}
          {arena && <p className="text-[10px] text-zinc-700 mt-0.5">{arena}</p>}
        </div>

        <TeamSide team={{ ...home, label: 'Home' }} won={!awayWon} />
      </div>
    </div>
  );
};

export default GameHeader;
