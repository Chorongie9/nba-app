from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from nba_api.stats.endpoints import playercareerstats
from nba_api.stats.static import players
from nba_api.stats.endpoints import playergamelog
from nba_api.stats.static import teams
from nba_api.stats.endpoints import teamgamelog
from nba_api.stats.endpoints import teamdashboardbygeneralsplits  # general stats
from nba_api.stats.endpoints import boxscoresummaryv3
from nba_api.stats.endpoints import teamyearbyyearstats
from nba_api.stats.endpoints import leaguestandings
from nba_api.stats.endpoints import TeamInfoCommon
from nba_api.stats.endpoints import leaguedashplayerstats
from nba_api.stats.endpoints import ScoreboardV2
from datetime import datetime

import pandas as pd
import numpy as np
import traceback



app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoint to return all players
@app.get("/players")
def get_players():
    return players.get_players()

# Endpoint to return stats by player ID
@app.get("/player/{player_id}")
def get_player(player_id: int):
    try:
        df = playercareerstats.PlayerCareerStats(
            player_id=player_id
        ).get_data_frames()[0]

        if df.empty:
            return {"error": "No career stats available"}

        # 🔥 THIS LINE FIXES YOUR BUG
        df = df.replace([np.nan, np.inf, -np.inf], None)
        df = df.astype(object)

        return df.to_dict(orient="records")

    except Exception as e:
        return {"error": str(e)}
    
from nba_api.stats.endpoints import playergamelog

@app.get("/player/{player_id}/recent")
def get_recent_games(player_id: int):
    try:
        df = playergamelog.PlayerGameLog(
            player_id=player_id,
            season='ALL'
        ).get_data_frames()[0]

        if df.empty:
            return {"error": "No games found"}

        # sort newest → oldest & take last 5
        df = df.head(5)

        # replace NaN with None (JSON-safe)
        df = df.replace([np.nan, np.inf, -np.inf], None)
        df = df.astype(object)

        return df.to_dict(orient="records")

    except Exception as e:
        return {"error": str(e)}
    
@app.get("/compare/{player_id1}/{player_id2}")
def compare_players(player_id1: int, player_id2: int):
    try:
        df1 = playercareerstats.PlayerCareerStats(player_id=player_id1).get_data_frames()[0]
        df2 = playercareerstats.PlayerCareerStats(player_id=player_id2).get_data_frames()[0]

        if df1.empty or df2.empty:
            return {"error": "No career stats available for one or both players"}

        # replace NaN with None (JSON-safe)
        df1 = df1.replace([np.nan, np.inf, -np.inf], None)
        df1 = df1.astype(object)
        df2 = df2.replace([np.nan, np.inf, -np.inf], None)
        df2 = df2.astype(object)

        return {
            "player1": df1.to_dict(orient="records"),
            "player2": df2.to_dict(orient="records")
        }

    except Exception as e:
        return {"error": str(e)}
    
@app.get("/teams")
def get_teams():
    try:
        df = teams.get_teams()

        if df.empty:
            return {"error": "No teams found"}

        return df.to_dict(orient="records")

    except Exception as e:
        return {"error": str(e)}

@app.get("/teams/{abbr}")
def get_team_profile(abbr: str):
    season = "2025-26"  # default season
    try:
        abbr = abbr.strip().upper()
        all_teams = teams.get_teams()
        team = next((t for t in all_teams if t["abbreviation"] == abbr), None)

        if not team:
            raise HTTPException(status_code=404, detail=f"Team {abbr} not found")

        team_id = team["id"]
        abbr_to_id = {t["abbreviation"]: t["id"] for t in all_teams}

        # Last 5 games
        log = teamgamelog.TeamGameLog(team_id=team_id, season="2025-26")
        games_df = log.get_data_frames()[0].head(5)
        games_df = games_df.replace([np.nan, np.inf, -np.inf], None)

        recent_games = []

        for _, row in games_df.iterrows():
            game_id = row.get("Game_ID") or row.get("GAME_ID")
            wl = str(row.get("WL", ""))
            game_date = str(row.get("GAME_DATE", ""))


            team_pts = None
            opp_pts = None
            opp_abbr = None
            opp_id = None

            if game_id:
                try:
                    summary = boxscoresummaryv3.BoxScoreSummaryV3(game_id=game_id, timeout=60)

                    # ---------------------------
                    # Extract home/away IDs
                    # ---------------------------
                    game_summary_df = summary.game_summary.get_data_frame()

                    if game_summary_df is None or game_summary_df.empty:
                        raise ValueError("game_summary dataframe empty")

                    home_id = int(game_summary_df.iloc[0].get("homeTeamId"))
                    away_id = int(game_summary_df.iloc[0].get("awayTeamId"))

                    # Determine opponent ID
                    if home_id == team_id:
                        opp_id = away_id
                        is_home = True
                    else:
                        opp_id = home_id
                        is_home = False

                    # ---------------------------
                    # Extract scores + opponent abbreviation
                    # ---------------------------
                    line_score_df = summary.line_score.get_data_frame()

                    if line_score_df is None or line_score_df.empty:
                        raise ValueError("line_score dataframe empty")

                    # Your row
                    our_rows = line_score_df[line_score_df.get("teamId") == team_id]
                    if our_rows.empty:
                        raise ValueError(f"No row found for teamId {team_id} in line_score")
                    our_row = our_rows.iloc[0]
                    team_pts = int(our_row.get("score") or 0)

                    # Opponent row
                    opp_rows = line_score_df[line_score_df.get("teamId") == opp_id]
                    if opp_rows.empty:
                        raise ValueError(f"No row found for opp_id {opp_id} in line_score")
                    opp_row = opp_rows.iloc[0]
                    opp_pts = int(opp_row.get("score") or 0)
                    opp_abbr = opp_row.get("teamTricode")

                except Exception as box_err:
                    print(f"Error getting BoxScoreSummaryV3 for game {game_id}: {box_err}")
                    # keep values None and continue so one bad game doesn't 500 the whole response
                    opp_id = opp_id if 'opp_id' in locals() else None
                    opp_abbr = opp_abbr if 'opp_abbr' in locals() else None
                    team_pts = team_pts if 'team_pts' in locals() else None
                    opp_pts = opp_pts if 'opp_pts' in locals() else None

            # Append final dict entry
            recent_games.append({
                "GAME_DATE": game_date,
                "PTS": team_pts,
                "WL": wl,
                "OPP_PTS": opp_pts,
                "OPP_ABBR": opp_abbr,
                "OPP_ID": opp_id
            })

         #conference and division
        standings = leaguestandings.LeagueStandings(season=season, league_id='00')
        df = standings.get_data_frames()[0]

        team_name = team["full_name"]
        # TeamInfoCommon expects 'season_nullable' (not 'season')
        try:
            team_info = TeamInfoCommon(team_id=team_id, season_nullable=season)
            df_team = team_info.get_data_frames()[0]
            if df_team is not None and not df_team.empty:
                conference = df_team.iloc[0].get("TEAM_CONFERENCE")
                division = df_team.iloc[0].get("TEAM_DIVISION")
            else:
                conference = team.get("conference")
                division = team.get("division")
        except Exception as info_err:
            print(f"Error fetching TeamInfoCommon for team {abbr} season {season}: {info_err}")
            traceback.print_exc()
            conference = team.get("conference")
            division = team.get("division")

        # ensure values exist on team object for frontend use
        team["conference"] = conference
        team["division"] = division

        # Season Record
        year_stats = teamyearbyyearstats.TeamYearByYearStats(team_id=team_id)
        year_stats_df = year_stats.get_data_frames()[0]
        year_stats_df = year_stats_df.replace([np.nan, np.inf, -np.inf], None)
        year_stats_df = year_stats_df.astype(object)
        season_row = year_stats_df[year_stats_df["YEAR"] == season]
        if season_row.empty:
            # try alternate hyphen variations
            alt = season.replace('–', '-').strip()
            if alt != season:
                season_row = year_stats_df[year_stats_df["YEAR"] == alt]

        if season_row.empty:
            # try prefix match on year (e.g., '2017' matches '2017-18')
            try:
                season_prefix = str(season)[:4]
                season_row = year_stats_df[year_stats_df["YEAR"].astype(str).str.startswith(season_prefix)]
            except Exception:
                season_row = season_row

        if not season_row.empty:
            try:
                team["wins"] = int(season_row.iloc[0]["WINS"])
                team["losses"] = int(season_row.iloc[0]["LOSSES"])
            except Exception as e:
                print(f"Error parsing W/L from year_stats for team {abbr} season {season}: {e}")
                traceback.print_exc()
                team["wins"] = None
                team["losses"] = None
        else:
            print(f"Warning: no season row found for team {abbr} season {season}. Sample YEARS: {year_stats_df['YEAR'].astype(str).tolist()[:10]}")
            team["wins"] = None
            team["losses"] = None
    
        # Season stats endpoint
        dashboard = teamdashboardbygeneralsplits.TeamDashboardByGeneralSplits(
            team_id=team_id,
            season=season,
            season_type_all_star="Regular Season"
        )
        season_stats_df = dashboard.get_data_frames()[0]
        season_stats_df = season_stats_df.replace([np.nan, np.inf, -np.inf], None).astype(object)
        season_stats = season_stats_df.to_dict(orient="records")

        playerseasonstats = leaguedashplayerstats.LeagueDashPlayerStats(
            season=season,
            team_id_nullable=team_id,
            season_type_all_star="Regular Season",
            per_mode_detailed="PerGame"
        )
        player_stats_df = playerseasonstats.get_data_frames()[0]
        player_stats_df = player_stats_df.replace([np.nan, np.inf, -np.inf], None)
        player_stats_df = player_stats_df.astype(object)
        player_stats = player_stats_df.to_dict(orient="records")

        return {
            "team_info": team,
            "season_stats": season_stats,
            "recent_games": recent_games,
            "player_stats": player_stats,
            "season": season,
            "wins": team.get("wins"),
            "losses": team.get("losses"),
            "division": division,
            "conference": conference
        }

    except Exception as e:
        print(f"Error in get_team_profile: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.get("/teams/{abbr}/{season}")
def get_team_season(abbr: str, season: str):
    try:
        abbr = abbr.strip().upper()
        all_teams = teams.get_teams()
        team = next((t for t in all_teams if t["abbreviation"] == abbr), None)

        if not team:
            raise HTTPException(status_code=404, detail=f"Team {abbr} not found")

        team_id = team["id"]

        # Last 5 games in specific season
        log = teamgamelog.TeamGameLog(team_id=team_id, season=season)
        games_df = log.get_data_frames()[0].head(5)
        games_df = games_df.replace([np.nan, np.inf, -np.inf], None)

        recent_games = []

        for _, row in games_df.iterrows():
            game_id = row.get("Game_ID") or row.get("GAME_ID")
            wl = str(row.get("WL", ""))
            game_date = str(row.get("GAME_DATE", ""))  
            dt = datetime.strptime(game_date, "%b %d, %Y")
            game_date = dt.strftime("%Y-%m-%d")
            team_pts = None
            opp_pts = None
            opp_abbr = None
            opp_id = None

            if game_id:
                try:
                    sb = ScoreboardV2(game_date=game_date, timeout=60)

                    linescore_df = sb.get_data_frames()[1]

                    game_scores = linescore_df[linescore_df["GAME_ID"] == game_id]
                    our_row = game_scores[game_scores["TEAM_ID"] == team_id]
                    team_pts = int(our_row.iloc[0].get("PTS") or 0)

                    opp_row = game_scores[game_scores["TEAM_ID"] != team_id]
                    opp_pts = int(opp_row.iloc[0].get("PTS") or 0)
                    opp_abbr = opp_row.iloc[0].get("TEAM_ABBREVIATION")
                    opp_id = int(opp_row.iloc[0].get("TEAM_ID"))

                except Exception as box_err:
                   
                    print(f"Error getting ScoreboardV2 for game {game_id}: {box_err}")
                    # keep values None and continue so one bad game doesn't 500 the whole response  
                    opp_id = opp_id if 'opp_id' in locals() else None
                    opp_abbr = opp_abbr if 'opp_abbr' in locals() else None

            # Append final dict entry
            recent_games.append({
                "GAME_DATE": game_date,
                "PTS": team_pts,
                "WL": wl,
                "OPP_PTS": opp_pts,
                "OPP_ABBR": opp_abbr,
                "OPP_ID": opp_id
            })


        #conference and division
        standings = leaguestandings.LeagueStandings(season=season, league_id='00')
        df = standings.get_data_frames()[0]

        team_name = team["full_name"]
        # TeamInfoCommon expects 'season_nullable' (not 'season')
        try:
            team_info = TeamInfoCommon(team_id=team_id, season_nullable=season)
            df_team = team_info.get_data_frames()[0]
            if df_team is not None and not df_team.empty:
                conference = df_team.iloc[0].get("TEAM_CONFERENCE")
                division = df_team.iloc[0].get("TEAM_DIVISION")
            else:
                conference = team.get("conference")
                division = team.get("division")
        except Exception as info_err:
            print(f"Error fetching TeamInfoCommon for team {abbr} season {season}: {info_err}")
            traceback.print_exc()
            conference = team.get("conference")
            division = team.get("division")

        # ensure values exist on team object for frontend use
        team["conference"] = conference
        team["division"] = division

        # Season Record
        year_stats = teamyearbyyearstats.TeamYearByYearStats(team_id=team_id)
        year_stats_df = year_stats.get_data_frames()[0]
        year_stats_df = year_stats_df.replace([np.nan, np.inf, -np.inf], None)
        year_stats_df = year_stats_df.astype(object)
        season_row = year_stats_df[year_stats_df["YEAR"] == season]
        if season_row.empty:
            # try alternate hyphen variations
            alt = season.replace('–', '-').strip()
            if alt != season:
                season_row = year_stats_df[year_stats_df["YEAR"] == alt]

        if season_row.empty:
            # try prefix match on year (e.g., '2017' matches '2017-18')
            try:
                season_prefix = str(season)[:4]
                season_row = year_stats_df[year_stats_df["YEAR"].astype(str).str.startswith(season_prefix)]
            except Exception:
                season_row = season_row

        if not season_row.empty:
            try:
                team["wins"] = int(season_row.iloc[0]["WINS"])
                team["losses"] = int(season_row.iloc[0]["LOSSES"])
            except Exception as e:
                print(f"Error parsing W/L from year_stats for team {abbr} season {season}: {e}")
                traceback.print_exc()
                team["wins"] = None
                team["losses"] = None
        else:
            print(f"Warning: no season row found for team {abbr} season {season}. Sample YEARS: {year_stats_df['YEAR'].astype(str).tolist()[:10]}")
            team["wins"] = None
            team["losses"] = None
    
        # Season stats endpoint
        dashboard = teamdashboardbygeneralsplits.TeamDashboardByGeneralSplits(
            team_id=team_id,
            season=season,
            season_type_all_star="Regular Season"
        )
        season_stats_df = dashboard.get_data_frames()[0]
        season_stats_df = season_stats_df.replace([np.nan, np.inf, -np.inf], None).astype(object)
        season_stats = season_stats_df.to_dict(orient="records")

        playerseasonstats = leaguedashplayerstats.LeagueDashPlayerStats(
            season=season,
            team_id_nullable=team_id,
            season_type_all_star="Regular Season",
            per_mode_detailed="PerGame"
        )
        player_stats_df = playerseasonstats.get_data_frames()[0]
        player_stats_df = player_stats_df.replace([np.nan, np.inf, -np.inf], None)
        player_stats_df = player_stats_df.astype(object)
        player_stats = player_stats_df.to_dict(orient="records")

        return {
            "team_info": team,
            "season_stats": season_stats,
            "recent_games": recent_games,
            "player_stats": player_stats,
            "season": season,
            "wins": team.get("wins"),
            "losses": team.get("losses"),
            "division": division,
            "conference": conference
        }

    except Exception as e:
        print(f"Error in get_team_season: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    


