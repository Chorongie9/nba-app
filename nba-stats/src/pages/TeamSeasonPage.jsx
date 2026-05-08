import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import PlayerStatsTable from '../components/PlayerStatsTable.jsx';

const getTeamLogo = (identifier) => {
  if (!identifier) return null;
  const asNum = Number(identifier);
  if (!Number.isNaN(asNum) && asNum > 1000) {
    return `https://cdn.nba.com/logos/nba/${asNum}/global/L/logo.svg`;
  }
  return `https://i.cdn.turner.com/nba/nba/.element/img/4.0/global/logos/512x512/bg.white/${identifier}_logo.svg`;
};

const ordinal = (n) => {
  if (!n) return null;
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const SEASON_FLOOR = 1996;
const SEASON_CEILING = 2025;

const getAdjacentSeasons = (season) => {
  const startYear = parseInt(season?.split('-')[0], 10);
  if (isNaN(startYear)) return { prev: null, next: null };
  const prev = startYear > SEASON_FLOOR
    ? `${startYear - 1}-${String(startYear).slice(-2)}`
    : null;
  const next = startYear < SEASON_CEILING
    ? `${startYear + 1}-${String(startYear + 2).slice(-2)}`
    : null;
  return { prev, next };
};

const TeamSeasonPage = () => {
  const { abbr, season } = useParams();
  const navigate = useNavigate();
  const { prev: prevSeason, next: nextSeason } = getAdjacentSeasons(season);
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!abbr || !season) return;
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    fetch(`http://localhost:8000/teams/${abbr}/${season}`, { signal: controller.signal })
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then(data => { if (data.error) throw new Error(data.error); setTeamData(data); setLoading(false); })
      .catch(err => { setError(err.name === 'AbortError' ? 'Request timed out' : err.message); setLoading(false); })
      .finally(() => clearTimeout(timeout));
  }, [abbr, season]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-zinc-600 animate-pulse text-sm">Loading team data…</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <p className="text-rose-500/70 text-sm">{error}</p>
      <button
        onClick={() => navigate(-1)}
        className="px-4 py-2 border border-zinc-700 text-zinc-400 rounded-lg text-xs hover:border-zinc-500 hover:text-zinc-200 transition-colors uppercase tracking-wider"
      >
        Go Back
      </button>
    </div>
  );

  if (!teamData) return null;

  const team = teamData.team_info || teamData;
  const recentGames = teamData.recent_games || [];
  const seasonStats = teamData.season_stats?.[0] || null;
  const teamAbbr = team.abbreviation || abbr;
  const teamId = team.id;

  return (
    <div className="space-y-4">
      {/* Back + Season Nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors uppercase tracking-widest"
        >
          ← Back
        </button>
        <div className="flex items-center gap-2">
          {prevSeason ? (
            <button
              onClick={() => navigate(`/teams/${abbr}/${prevSeason}`)}
              className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors uppercase tracking-widest px-3 py-1.5 border border-zinc-800 hover:border-zinc-600 rounded-lg"
            >
              ← {prevSeason}
            </button>
          ) : (
            <span className="text-xs text-zinc-700 uppercase tracking-widest px-3 py-1.5 border border-zinc-800/40 rounded-lg cursor-not-allowed">← Prev</span>
          )}
          {nextSeason ? (
            <button
              onClick={() => navigate(`/teams/${abbr}/${nextSeason}`)}
              className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors uppercase tracking-widest px-3 py-1.5 border border-zinc-800 hover:border-zinc-600 rounded-lg"
            >
              {nextSeason} →
            </button>
          ) : (
            <span className="text-xs text-zinc-700 uppercase tracking-widest px-3 py-1.5 border border-zinc-800/40 rounded-lg cursor-not-allowed">Next →</span>
          )}
        </div>
      </div>

      {/* Team header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
        <div className="flex items-center gap-8">
          <img
            src={getTeamLogo(teamId)}
            alt={teamAbbr}
            className="w-20 h-20 object-contain opacity-90 shrink-0"
            onError={e => { e.target.style.display = 'none'; }}
          />
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-extrabold text-5xl text-zinc-50 uppercase tracking-wide leading-none">
              {team.full_name}
            </h1>
            <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-zinc-600 uppercase tracking-wider">
              <span>{team.conference} Conference</span>
              <span>·</span>
              <span>{team.division} Division</span>
              <span>·</span>
              <span>{season}</span>
              {teamData.placing && (
                <>
                  <span>·</span>
                  <span>{ordinal(teamData.placing)} in conference</span>
                </>
              )}
            </div>
          </div>
          {(teamData.wins != null && teamData.losses != null) && (
            <div className="text-center shrink-0">
              <p className="font-display font-extrabold text-5xl text-zinc-50 leading-none">
                {teamData.wins}–{teamData.losses}
              </p>
              <p className="text-[10px] text-zinc-600 uppercase tracking-[0.15em] mt-2">Record</p>
            </div>
          )}
        </div>

        {seasonStats && (
          <div className="grid grid-cols-4 divide-x divide-zinc-800 text-center mt-8 pt-8 border-t border-zinc-800">
            {[
              { label: "PPG", value: (seasonStats.PTS/82)?.toFixed(1) },
              { label: "RPG", value: (seasonStats.REB/82)?.toFixed(1)},
              { label: "APG", value: (seasonStats.AST/82)?.toFixed(1) },
              { label: "FG%", value: seasonStats.FG_PCT ? (seasonStats.FG_PCT * 100).toFixed(1) + "%" : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="px-4">
                <p className="font-display font-extrabold text-4xl text-zinc-50 leading-none">{value ?? "—"}</p>
                <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-600 mt-2">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Games */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500 mb-5">Recent Games</h2>
        {recentGames.length > 0 ? (
          <div className="divide-y divide-zinc-800/50">
            {recentGames.map((game, i) => {
              const isWin = game.WL === 'W';
              return (
                <div
                  key={i}
                  onClick={() => game.GAME_ID && navigate(`/games/${game.GAME_ID}`)}
                  className={`flex items-center justify-between py-3.5 pl-4 border-l-2 ${isWin ? 'border-emerald-500' : 'border-rose-500'} ${game.GAME_ID ? 'cursor-pointer hover:bg-zinc-800/30 transition-colors' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <span className={`text-xs font-bold w-4 shrink-0 ${isWin ? 'text-emerald-500' : 'text-rose-500'}`}>{game.WL}</span>
                    <div className="flex items-center gap-2">
                      <img src={getTeamLogo(teamId)} alt={teamAbbr} className="w-6 h-6 object-contain" onError={e => { e.target.style.display = 'none'; }} />
                      <span className="font-display font-bold text-xl text-zinc-100 leading-none">{game.PTS}</span>
                      <span className="text-zinc-700 text-sm">–</span>
                      <span className="font-display font-bold text-xl text-zinc-100 leading-none">{game.OPP_PTS}</span>
                      {game.OPP_ID && (
                        <img src={getTeamLogo(game.OPP_ID)} alt={game.OPP_ABBR} className="w-6 h-6 object-contain" onError={e => { e.target.style.display = 'none'; }} />
                      )}
                    </div>
                    {game.OPP_ABBR && (
                      <Link
                        to={`/teams/${game.OPP_ABBR}/${season}`}
                        onClick={e => e.stopPropagation()}
                        className="text-xs text-zinc-500 hover:text-amber-400 transition-colors font-medium"
                      >
                        {game.OPP_ABBR}
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-3 pr-4">
                    <span className="text-xs text-zinc-600 tabular-nums">{game.GAME_DATE}</span>
                    {game.GAME_ID && <span className="text-[10px] text-zinc-700 uppercase tracking-wider">Box Score →</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-zinc-600 text-sm">No recent games found</p>
        )}
      </div>

      {/* Roster */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <PlayerStatsTable abbr={abbr} season={season} />
      </div>
    </div>
  );
};

export default TeamSeasonPage;
