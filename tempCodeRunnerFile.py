from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from nba_api.stats.endpoints import playercareerstats
from nba_api.stats.static import players
from nba_api.stats.endpoints import playergamelog
from nba_api.stats.static import teams
from nba_api.stats.endpoints import teamgamelog
from nba_api.stats.endpoints import teamdashboardbygeneralsplits  # general stats
from nba_api.stats.endpoints import boxscoretraditionalv2
from nba_api.stats.endpoints import boxscoresummaryv2
import pandas as pd
import numpy as np



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
    try:
        abbr = abbr.strip().upper()
        all_teams = teams.get_teams()
        team = next((t for t in all_teams if t['abbreviation'] == abbr), None)

        if not team:
            raise HTTPException(status_code=404, detail=f"Team {abbr} not found")

        team_id = team['id']

        # Get last 5 games
        log = teamgamelog.TeamGameLog(team_id=team_id, season='2024-25')
        games_df = log.get_data_frames()[0].head(5)
        games_df = games_df.replace([np.nan, np.inf, -np.inf], None)

        recent_games = []

        for _, row in games_df.iterrows():
            game_id = row.get('Game_ID') or row.get('GAME_ID')
            pts = int(row.get('PTS', 0)) if pd.notna(row.get('PTS')) else 0
            wl = str(row.get('WL', ''))
            game_date = str(row.get('GAME_DATE', ''))

            opp_pts = None
            opp_abbr = None

            if game_id:
                try:
                    box = boxscoretraditionalv2.BoxScoreTraditionalV2(game_id=game_id)
                    team_stats_df = box.get_data_frames()[0]

                    # Use abbreviation to reliably identify team row
                    if abbr in team_stats_df['TEAM_ABBREVIATION'].values:
                        team_row = team_stats_df.loc[team_stats_df['TEAM_ABBREVIATION'] == abbr].iloc[0]
                        opp_row = team_stats_df.loc[team_stats_df['TEAM_ABBREVIATION'] != abbr].iloc[0]

                        pts = int(team_row['PTS']) if pd.notna(team_row['PTS']) else 0
                        opp_pts = int(opp_row['PTS']) if pd.notna(opp_row['PTS']) else 0
                        opp_abbr = opp_row['TEAM_ABBREVIATION']

                except Exception as box_err:
                    print(f"Error getting opponent info for game {game_id}: {box_err}")

            recent_games.append({
                "GAME_DATE": game_date,
                "PTS": pts,
                "WL": wl,
                "OPP_PTS": opp_pts,
                "OPP_ABBR": opp_abbr
            })

        # Get season stats
        dashboard = teamdashboardbygeneralsplits.TeamDashboardByGeneralSplits(
            team_id=team_id,
            season='2024-25',
            season_type_all_star='Regular Season'
        )
        season_stats_df = dashboard.get_data_frames()[0]
        season_stats_df = season_stats_df.replace([np.nan, np.inf, -np.inf], None).astype(object)
        season_stats = season_stats_df.to_dict(orient="records")

        return {
            "team_info": team,
            "recent_games": recent_games,
            "season_stats": season_stats
        }

    except Exception as e:
        print(f"Error in get_team_profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


print(teamgamelog.TeamGameLog(team_id=1610612739, season='2024-25').get_data_frames()[0])
print(boxscoresummaryv2.BoxScoreSummaryV2(game_id='0022401189').get_data_frames()[0])