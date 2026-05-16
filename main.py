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
from nba_api.stats.endpoints import boxscoretraditionalv2
from nba_api.stats.endpoints import commonplayerinfo
from datetime import datetime, date
from retrying import retry
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

import pandas as pd
import numpy as np
import requests.exceptions
import traceback

# NBA API is often slow; use a generous timeout and pass to all endpoint calls
NBA_REQUEST_TIMEOUT = 90
# Short delay between sequential NBA API calls to reduce rate-limit/timeout issues
NBA_REQUEST_DELAY_SEC = 0.6

# In-memory cache for get_team_season to avoid repeated NBA API timeouts
# Key: (abbr, season), Value: (expires_at_ts, response_dict)
_team_season_cache = {}
# Past seasons never change; cache 7 days. Current/last season: 15 min.
TEAM_SEASON_CACHE_TTL_CURRENT_SEC = 15 * 60
TEAM_SEASON_CACHE_TTL_PAST_SEC = 7 * 24 * 60 * 60
CURRENT_SEASONS = ("2025-26", "2024-25")


def _team_season_cache_ttl_sec(season: str) -> int:
    return (
        TEAM_SEASON_CACHE_TTL_CURRENT_SEC
        if season in CURRENT_SEASONS
        else TEAM_SEASON_CACHE_TTL_PAST_SEC
    )


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

@app.get("/player/{player_id}")
def get_player(player_id: int):
    try:
        print(f"[GET /player/{player_id}] Starting request...")
        # One API call returns all result sets; [0] = regular season totals, [2] = playoff totals
        frames = playercareerstats.PlayerCareerStats(
            player_id=player_id,
            timeout=NBA_REQUEST_TIMEOUT
        ).get_data_frames()

        regular_df = frames[0]
        playoff_df = frames[2]

        if regular_df.empty:
            print(f"[GET /player/{player_id}] Empty dataframe returned")
            return {"error": "No career stats available"}

        regular_df = regular_df.replace([np.nan, np.inf, -np.inf], None).astype(object)
        playoff_df = playoff_df.replace([np.nan, np.inf, -np.inf], None).astype(object)

        print(f"[GET /player/{player_id}] Success - {len(regular_df)} regular, {len(playoff_df)} playoff records")
        return {
            "regular": regular_df.to_dict(orient="records"),
            "playoffs": playoff_df.to_dict(orient="records"),
        }

    except Exception as e:
        print(f"[GET /player/{player_id}] Error: {type(e).__name__}: {str(e)}")
        traceback.print_exc()
        return {"error": str(e)}

@app.get("/player/{player_id}/info")
def get_player_info(player_id: int):
    try:
        row = commonplayerinfo.CommonPlayerInfo(
            player_id=player_id, timeout=NBA_REQUEST_TIMEOUT
        ).get_data_frames()[0].iloc[0]
        return {
            "team_id":           int(row["TEAM_ID"]) if row["TEAM_ID"] else None,
            "team_name":         row["TEAM_NAME"],
            "team_abbreviation": row["TEAM_ABBREVIATION"],
            "position":          row["POSITION"],
            "jersey":            row["JERSEY"],
            "height":            row["HEIGHT"],
            "weight":            row["WEIGHT"],
            "roster_status":     row["ROSTERSTATUS"],
        }
    except Exception as e:
        traceback.print_exc()
        return {"error": str(e)}

# Simple TTL cache — each (season, position) combo is cached independently
_similarity_cache: dict = {}
_SIMILARITY_CACHE_TTL = 3600  # 1 hour

# Advanced stats used for similarity — describe role, efficiency, and impact
SIMILARITY_STATS         = ['USG_PCT', 'TS_PCT', 'AST_PCT', 'REB_PCT', 'OFF_RATING', 'DEF_RATING']
SIMILARITY_STATS_BASIC   = ['PTS', 'REB', 'AST', 'FG_PCT', 'FG3_PCT', 'MIN']

# Maps commonplayerinfo position strings → nba_api position filter codes
POSITION_MAP = {
    'Guard':          'G',
    'Forward':        'F',
    'Center':         'C',
    'Guard-Forward':  'G',
    'Forward-Guard':  'G',
    'Forward-Center': 'F',
    'Center-Forward': 'F',
}

def _get_league_stats(season: str, pos_code: str = '') -> "pd.DataFrame":
    cache_key = f"{season}_{pos_code or 'all'}"
    cached = _similarity_cache.get(cache_key)
    if cached and (time.time() - cached['ts'] < _SIMILARITY_CACHE_TTL):
        return cached['df']

    base_kwargs = dict(
        season=season,
        season_type_all_star='Regular Season',
        per_mode_detailed='PerGame',
        timeout=NBA_REQUEST_TIMEOUT,
    )
    if pos_code:
        base_kwargs['player_position_abbreviation_nullable'] = pos_code

    # The NBA API does not support position filtering on the Advanced measure type —
    # it returns an empty response. Fetch advanced stats for all players, then let
    # the inner merge restrict the pool to the position-filtered base rows.
    def fetch_base():
        try:
            return leaguedashplayerstats.LeagueDashPlayerStats(
                **base_kwargs
            ).get_data_frames()[0]
        except Exception:
            return pd.DataFrame()

    def fetch_advanced():
        try:
            return leaguedashplayerstats.LeagueDashPlayerStats(
                season=season,
                season_type_all_star='Regular Season',
                per_mode_detailed='PerGame',
                measure_type_detailed_defense='Advanced',
                timeout=NBA_REQUEST_TIMEOUT,
            ).get_data_frames()[0]
        except Exception:
            return pd.DataFrame()

    with ThreadPoolExecutor(max_workers=2) as executor:
        base_future = executor.submit(fetch_base)
        adv_future  = executor.submit(fetch_advanced)
        base_df = base_future.result()
        adv_df  = adv_future.result()

    if base_df.empty:
        return pd.DataFrame()

    # For traded players keep the row with the most GP
    base_df = base_df.sort_values('GP', ascending=False).drop_duplicates('PLAYER_ID').copy()

    if adv_df.empty:
        df = base_df.copy()
    else:
        adv_df = adv_df.sort_values('GP', ascending=False).drop_duplicates('PLAYER_ID').copy()
        # Inner merge — only players present in position-filtered base_df are kept
        df = base_df.merge(adv_df[['PLAYER_ID'] + SIMILARITY_STATS], on='PLAYER_ID', how='inner')

    # Drop low-sample players
    df = df[(df['GP'] >= 15) & (df['MIN'] >= 10)].reset_index(drop=True)

    _similarity_cache[cache_key] = {'df': df, 'ts': time.time()}
    return df

@app.get("/player/{player_id}/similar")
def get_similar_players(player_id: int, season: str = "2025-26", position: str = ""):
    try:
        pos_code = POSITION_MAP.get(position, '')
        df = _get_league_stats(season, pos_code)

        if df.empty or player_id not in df['PLAYER_ID'].values:
            return {"similar": [], "season": season, "unavailable": True}

        has_advanced = all(s in df.columns for s in SIMILARITY_STATS)
        stats_to_use = SIMILARITY_STATS if has_advanced else SIMILARITY_STATS_BASIC

        stat_df = df[stats_to_use].fillna(df[stats_to_use].mean())
        means = stat_df.mean()
        stds  = stat_df.std().replace(0, 1)
        normalized = (stat_df - means) / stds

        target_idx = df[df['PLAYER_ID'] == player_id].index[0]
        target_vec = normalized.loc[target_idx].values

        diffs     = normalized.values - target_vec
        distances = np.sqrt((diffs ** 2).sum(axis=1))

        df = df.copy()
        df['_dist'] = distances

        others   = df[df['PLAYER_ID'] != player_id].sort_values('_dist')
        max_dist = distances.max() if distances.max() > 0 else 1

        result = []
        for _, row in others.head(8).iterrows():
            result.append({
                'player_id':   int(row['PLAYER_ID']),
                'player_name': row['PLAYER_NAME'],
                'team':        row['TEAM_ABBREVIATION'],
                'similarity':  round((1 - row['_dist'] / max_dist) * 100, 1),
                'pts':         round(float(row['PTS']), 1),
                'reb':         round(float(row['REB']), 1),
                'ast':         round(float(row['AST']), 1),
            })

        return {"similar": result, "season": season, "basic_stats": not has_advanced}
    except Exception as e:
        traceback.print_exc()
        return {"error": str(e), "similar": []}

@app.get("/compare/{player_id1}/{player_id2}/similarity")
def compare_similarity(player_id1: int, player_id2: int, season1: str = "2024-25", season2: str = "2024-25"):
    try:
        df1 = _get_league_stats(season1)
        df2 = _get_league_stats(season2) if season2 != season1 else df1

        if df1.empty or df2.empty:
            return {"similarity": None, "unavailable": True}
        if player_id1 not in df1['PLAYER_ID'].values or player_id2 not in df2['PLAYER_ID'].values:
            return {"similarity": None, "unavailable": True}

        has_adv1 = all(s in df1.columns for s in SIMILARITY_STATS)
        has_adv2 = all(s in df2.columns for s in SIMILARITY_STATS)
        stats_to_use = SIMILARITY_STATS if (has_adv1 and has_adv2) else SIMILARITY_STATS_BASIC

        combined = pd.concat([df1[stats_to_use], df2[stats_to_use]], ignore_index=True)
        combined = combined.fillna(combined.mean())
        means = combined.mean()
        stds = combined.std().replace(0, 1)

        row1 = df1[df1['PLAYER_ID'] == player_id1].iloc[0][stats_to_use].fillna(means)
        row2 = df2[df2['PLAYER_ID'] == player_id2].iloc[0][stats_to_use].fillna(means)

        vec1 = ((row1 - means) / stds).values.astype(float)
        vec2 = ((row2 - means) / stds).values.astype(float)

        distance = float(np.sqrt(((vec1 - vec2) ** 2).sum()))
        # Normalize against the combined pool's max pairwise distance for a meaningful percentage
        all_normalized = ((combined - means) / stds).values
        pairwise_max = 0.0
        sample = all_normalized[::max(1, len(all_normalized) // 200)]
        for row in sample:
            dists = np.sqrt(((all_normalized - row) ** 2).sum(axis=1))
            pairwise_max = max(pairwise_max, dists.max())
        pairwise_max = pairwise_max or 1

        similarity = round((1 - distance / pairwise_max) * 100, 1)
        similarity = max(0.0, similarity)

        return {
            "similarity": similarity,
            "season1": season1,
            "season2": season2,
            "basic_stats": stats_to_use is SIMILARITY_STATS_BASIC,
        }
    except Exception as e:
        traceback.print_exc()
        return {"error": str(e), "similarity": None}

@app.get("/player/{player_id}/recent")
def get_recent_games(player_id: int):
    try:
        # Fetch regular and playoff logs in parallel — same endpoint, different season_type param
        def fetch_regular():
            return playergamelog.PlayerGameLog(
                player_id=player_id, season='ALL',
                season_type_all_star='Regular Season',
                timeout=NBA_REQUEST_TIMEOUT
            ).get_data_frames()[0]

        def fetch_playoffs():
            return playergamelog.PlayerGameLog(
                player_id=player_id, season='ALL',
                season_type_all_star='Playoffs',
                timeout=NBA_REQUEST_TIMEOUT
            ).get_data_frames()[0]

        with ThreadPoolExecutor(max_workers=2) as executor:
            reg_future = executor.submit(fetch_regular)
            po_future = executor.submit(fetch_playoffs)
            reg_df = reg_future.result()
            po_df = po_future.result()

        frames = []
        if not reg_df.empty:
            reg_df['GAME_TYPE'] = 'Regular Season'
            frames.append(reg_df)
        if not po_df.empty:
            po_df['GAME_TYPE'] = 'Playoffs'
            frames.append(po_df)

        if not frames:
            return {"error": "No games found"}

        combined = pd.concat(frames)
        # GAME_DATE from the API is "MMM DD, YYYY" (e.g. "NOV 05, 2024"); parse for sorting
        combined['_sort_date'] = pd.to_datetime(combined['GAME_DATE'], format='%b %d, %Y', errors='coerce')
        combined = combined.sort_values('_sort_date', ascending=False).drop(columns=['_sort_date']).head(5)

        combined = combined.replace([np.nan, np.inf, -np.inf], None).astype(object)
        return combined.to_dict(orient="records")

    except Exception as e:
        return {"error": str(e)}
    
@app.get("/compare/{player_id1}/{player_id2}")
def compare_players(player_id1: int, player_id2: int):
    try:
        def fetch_player(pid):
            frames = playercareerstats.PlayerCareerStats(player_id=pid, timeout=NBA_REQUEST_TIMEOUT).get_data_frames()
            return frames[0], frames[2]  # regular season totals, playoff season totals

        with ThreadPoolExecutor(max_workers=2) as executor:
            f1 = executor.submit(fetch_player, player_id1)
            f2 = executor.submit(fetch_player, player_id2)
            reg1, po1 = f1.result()
            reg2, po2 = f2.result()

        if reg1.empty or reg2.empty:
            return {"error": "No career stats available for one or both players"}

        def clean(df):
            return df.replace([np.nan, np.inf, -np.inf], None).astype(object).to_dict(orient="records")

        return {
            "player1": {"regular": clean(reg1), "playoffs": clean(po1)},
            "player2": {"regular": clean(reg2), "playoffs": clean(po2)},
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


def _is_timeout_or_connection_error(e):
    return isinstance(
        e,
        (
            requests.exceptions.Timeout,
            requests.exceptions.ConnectionError,
            requests.exceptions.ReadTimeout,
            requests.exceptions.ConnectTimeout,
        ),
    )


@retry(
    stop_max_attempt_number=5,
    wait_exponential_multiplier=1000,
    wait_exponential_max=10000,
    retry_on_exception=_is_timeout_or_connection_error,
)
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
        log = teamgamelog.TeamGameLog(
            team_id=team_id, season="2025-26", timeout=NBA_REQUEST_TIMEOUT
        )
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
                    summary = boxscoresummaryv3.BoxScoreSummaryV3(
                        game_id=game_id, timeout=NBA_REQUEST_TIMEOUT
                    )
                    time.sleep(NBA_REQUEST_DELAY_SEC)

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
                "GAME_ID": game_id,
                "PTS": team_pts,
                "WL": wl,
                "OPP_PTS": opp_pts,
                "OPP_ABBR": opp_abbr,
                "OPP_ID": opp_id
            })

         #conference and division
        standings = leaguestandings.LeagueStandings(
            season=season, league_id='00', timeout=NBA_REQUEST_TIMEOUT
        )
        df = standings.get_data_frames()[0]

        team_name = team["full_name"]
        # TeamInfoCommon expects 'season_nullable' (not 'season')
        try:
            team_info = TeamInfoCommon(
                team_id=team_id, season_nullable=season, timeout=NBA_REQUEST_TIMEOUT
            )
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
        year_stats = teamyearbyyearstats.TeamYearByYearStats(
            team_id=team_id, timeout=NBA_REQUEST_TIMEOUT
        )
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
            season_type_all_star="Regular Season",
            timeout=NBA_REQUEST_TIMEOUT,
        )
        season_stats_df = dashboard.get_data_frames()[0]
        season_stats_df = season_stats_df.replace([np.nan, np.inf, -np.inf], None).astype(object)
        season_stats = season_stats_df.to_dict(orient="records")

        playerseasonstats = leaguedashplayerstats.LeagueDashPlayerStats(
            season=season,
            team_id_nullable=team_id,
            season_type_all_star="Regular Season",
            per_mode_detailed="PerGame",
            timeout=NBA_REQUEST_TIMEOUT,
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



@retry(
    stop_max_attempt_number=5,
    wait_exponential_multiplier=1000,
    wait_exponential_max=10000,
    retry_on_exception=_is_timeout_or_connection_error,
)
@app.get("/teams/{abbr}/{season}")
def get_team_season(abbr: str, season: str):
    try:
        abbr = abbr.strip().upper()
        cache_key = (abbr, season)
        now = time.time()
        if cache_key in _team_season_cache:
            expires_at, cached = _team_season_cache[cache_key]
            if now < expires_at:
                return cached
            del _team_season_cache[cache_key]

        all_teams = teams.get_teams()
        team = next((t for t in all_teams if t["abbreviation"] == abbr), None)

        if not team:
            raise HTTPException(status_code=404, detail=f"Team {abbr} not found")

        team_id = team["id"]

        # Last 5 games in specific season
        log = teamgamelog.TeamGameLog(
            team_id=team_id, season=season, timeout=NBA_REQUEST_TIMEOUT
        )
        games_df = log.get_data_frames()[0].head(5)
        games_df = games_df.replace([np.nan, np.inf, -np.inf], None)

        # Build list of (game_id, wl, game_date_iso) for the loop
        game_rows = []
        for _, row in games_df.iterrows():
            game_id = row.get("Game_ID") or row.get("GAME_ID")
            wl = str(row.get("WL", ""))
            game_date = str(row.get("GAME_DATE", ""))
            dt = datetime.strptime(game_date, "%b %d, %Y")
            game_date_iso = dt.strftime("%Y-%m-%d")
            game_rows.append((game_id, wl, game_date_iso))

        # Fetch scoreboard once per unique game date (not per game) to reduce timeouts
        scoreboard_by_date = {}
        unique_dates = list(set([gdate for _, _, gdate in game_rows]))
        
        # Fetch scoreboards in parallel to speed up requests
        def fetch_scoreboard(gdate):
            try:
                sb = ScoreboardV2(game_date=gdate, timeout=NBA_REQUEST_TIMEOUT)
                return (gdate, sb.get_data_frames()[1])
            except Exception as sb_err:
                print(f"Error getting ScoreboardV2 for date {gdate}: {sb_err}")
                return (gdate, None)
        
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(fetch_scoreboard, gdate) for gdate in unique_dates]
            for future in as_completed(futures):
                gdate, result = future.result()
                scoreboard_by_date[gdate] = result
                time.sleep(NBA_REQUEST_DELAY_SEC / 3)  # Reduced delay since we're parallelizing

        recent_games = []
        for game_id, wl, game_date in game_rows:
            team_pts = None
            opp_pts = None
            opp_abbr = None
            opp_id = None
            linescore_df = scoreboard_by_date.get(game_date) if game_date else None
            if game_id and linescore_df is not None and not linescore_df.empty:
                try:
                    game_scores = linescore_df[linescore_df["GAME_ID"] == game_id]
                    our_row = game_scores[game_scores["TEAM_ID"] == team_id]
                    if not our_row.empty:
                        team_pts = int(our_row.iloc[0].get("PTS") or 0)
                    opp_row = game_scores[game_scores["TEAM_ID"] != team_id]
                    if not opp_row.empty:
                        opp_pts = int(opp_row.iloc[0].get("PTS") or 0)
                        opp_abbr = opp_row.iloc[0].get("TEAM_ABBREVIATION")
                        opp_id = int(opp_row.iloc[0].get("TEAM_ID"))
                except Exception as box_err:
                    print(f"Error parsing ScoreboardV2 for game {game_id}: {box_err}")
            # Append final dict entry
            recent_games.append({
                "GAME_DATE": game_date,
                "GAME_ID": game_id,
                "PTS": team_pts,
                "WL": wl,
                "OPP_PTS": opp_pts,
                "OPP_ABBR": opp_abbr,
                "OPP_ID": opp_id
            })


        #conference and division
        conference_rank = None
        
        # Parallelize these three API calls
        standings_df = None
        conference = None
        division = None
        season_stats_df = None
        player_stats_df = None
        year_stats_df = None
        
        def fetch_standings():
            try:
                standings = leaguestandings.LeagueStandings(
                    season=season, league_id='00', timeout=NBA_REQUEST_TIMEOUT
                )
                return standings.get_data_frames()[0]
            except Exception as e:
                print(f"Error fetching standings: {e}")
                return None
        
        def fetch_team_info():
            try:
                team_info = TeamInfoCommon(
                    team_id=team_id, season_nullable=season, timeout=NBA_REQUEST_TIMEOUT
                )
                return team_info.get_data_frames()[0]
            except Exception as info_err:
                print(f"Error fetching TeamInfoCommon for team {abbr} season {season}: {info_err}")
                return None
        
        def fetch_year_stats():
            try:
                year_stats = teamyearbyyearstats.TeamYearByYearStats(
                    team_id=team_id, timeout=NBA_REQUEST_TIMEOUT
                )
                return year_stats.get_data_frames()[0]
            except Exception as e:
                print(f"Error fetching year stats: {e}")
                return None
        
        def fetch_season_stats():
            try:
                dashboard = teamdashboardbygeneralsplits.TeamDashboardByGeneralSplits(
                    team_id=team_id,
                    season=season,
                    season_type_all_star="Regular Season",
                    timeout=NBA_REQUEST_TIMEOUT,
                )
                return dashboard.get_data_frames()[0]
            except Exception as e:
                print(f"Error fetching season stats: {e}")
                return None
        
        def fetch_player_stats():
            try:
                playerseasonstats = leaguedashplayerstats.LeagueDashPlayerStats(
                    season=season,
                    team_id_nullable=team_id,
                    season_type_all_star="Regular Season",
                    per_mode_detailed="PerGame",
                    timeout=NBA_REQUEST_TIMEOUT,
                )
                return playerseasonstats.get_data_frames()[0]
            except Exception as e:
                print(f"Error fetching player stats: {e}")
                return None
        
        # Execute all fetches in parallel
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = {
                'standings': executor.submit(fetch_standings),
                'team_info': executor.submit(fetch_team_info),
                'year_stats': executor.submit(fetch_year_stats),
                'season_stats': executor.submit(fetch_season_stats),
                'player_stats': executor.submit(fetch_player_stats),
            }
            
            standings_df = futures['standings'].result()
            team_info_df = futures['team_info'].result()
            year_stats_df = futures['year_stats'].result()
            season_stats_df = futures['season_stats'].result()
            player_stats_df = futures['player_stats'].result()
        
        # Extract standings info
        if standings_df is not None and not standings_df.empty:
            row = standings_df[standings_df["TeamID"] == team_id]
            if not row.empty:
                conference_rank = int(row.iloc[0]["PlayoffRank"])
        
        # Extract team info
        if team_info_df is not None and not team_info_df.empty:
            conference = team_info_df.iloc[0].get("TEAM_CONFERENCE")
            division = team_info_df.iloc[0].get("TEAM_DIVISION")
        else:
            conference = team.get("conference")
            division = team.get("division")
        
        # Extract season record (wins/losses)
        team["wins"] = None
        team["losses"] = None
        if year_stats_df is not None and not year_stats_df.empty:
            year_stats_df = year_stats_df.replace([np.nan, np.inf, -np.inf], None)
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
                    pass
            
            if not season_row.empty:
                try:
                    team["wins"] = int(season_row.iloc[0]["WINS"])
                    team["losses"] = int(season_row.iloc[0]["LOSSES"])
                except Exception as e:
                    print(f"Error parsing W/L: {e}")
        
        # Convert dataframes to dicts
        season_stats = []
        player_stats = []
        
        if season_stats_df is not None and not season_stats_df.empty:
            season_stats_df = season_stats_df.replace([np.nan, np.inf, -np.inf], None)
            season_stats_df = season_stats_df.astype(object)
            season_stats = season_stats_df.to_dict(orient="records")
        
        if player_stats_df is not None and not player_stats_df.empty:
            player_stats_df = player_stats_df.replace([np.nan, np.inf, -np.inf], None)
            player_stats_df = player_stats_df.astype(object)
            player_stats = player_stats_df.to_dict(orient="records")

        response = {
            "team_info": team,
            "season_stats": season_stats,
            "recent_games": recent_games,
            "player_stats": player_stats,
            "season": season,
            "wins": team.get("wins"),
            "losses": team.get("losses"),
            "division": division,
            "conference": conference,
            "placing": conference_rank,
        }
        # Cache so repeat requests don't hit the NBA API (avoids timeouts)
        _team_season_cache[cache_key] = (
            now + _team_season_cache_ttl_sec(season),
            response,
        )
        return response

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_team_season: {e}")
        status = 503 if _is_timeout_or_connection_error(e) else 500
        detail = (
            "The NBA API timed out or is unavailable; please try again."
            if status == 503
            else f"Internal server error: {str(e)}"
        )
        raise HTTPException(status_code=status, detail=detail)


_game_cache = {}
GAME_CACHE_TTL_PAST_SEC = 30 * 24 * 60 * 60
GAME_CACHE_TTL_LIVE_SEC = 5 * 60


def _game_cache_ttl_sec(game_date_str: str) -> int:
    try:
        gd = date.fromisoformat(str(game_date_str)[:10])
        return GAME_CACHE_TTL_PAST_SEC if gd < date.today() else GAME_CACHE_TTL_LIVE_SEC
    except Exception:
        return GAME_CACHE_TTL_PAST_SEC


@app.get("/game/{game_id}")
def get_game(game_id: str):
    now = time.time()
    if game_id in _game_cache:
        expires_at, cached = _game_cache[game_id]
        if now < expires_at:
            return cached
        del _game_cache[game_id]

    try:
        def fetch_summary():
            return boxscoresummaryv3.BoxScoreSummaryV3(game_id=game_id, timeout=NBA_REQUEST_TIMEOUT)

        def fetch_box():
            return boxscoretraditionalv2.BoxScoreTraditionalV2(game_id=game_id, timeout=NBA_REQUEST_TIMEOUT)

        with ThreadPoolExecutor(max_workers=2) as executor:
            sf = executor.submit(fetch_summary)
            bf = executor.submit(fetch_box)
            summary = sf.result()
            box = bf.result()

        game_summary_df = summary.game_summary.get_data_frame()
        line_score_df = summary.line_score.get_data_frame()

        if game_summary_df is None or game_summary_df.empty:
            raise HTTPException(status_code=404, detail="Game not found")

        row0 = game_summary_df.iloc[0]
        home_team_id = int(row0.get("homeTeamId"))
        away_team_id = int(row0.get("awayTeamId"))

        raw_date = row0.get("gameDate") or row0.get("GAME_DATE_EST") or ""
        game_date = str(raw_date)[:10]

        arena = row0.get("arenaName") or row0.get("ARENA_NAME") or ""
        arena_city = row0.get("arenaCity") or row0.get("ARENA_CITY") or ""
        arena_parts = [p for p in [arena, arena_city] if p]
        arena_str = ", ".join(str(p) for p in arena_parts)

        # Team metadata from static data (no extra API call)
        all_teams_list = teams.get_teams()
        home_meta = next((t for t in all_teams_list if t["id"] == home_team_id), {})
        away_meta = next((t for t in all_teams_list if t["id"] == away_team_id), {})

        # Scores from line_score
        scores = {}
        for _, row in line_score_df.iterrows():
            tid = int(row.get("teamId") or 0)
            scores[tid] = int(row.get("score") or 0)

        player_df = box.get_data_frames()[0]
        team_df = box.get_data_frames()[1]

        def build_team(tid, meta):
            p = (
                player_df[player_df["TEAM_ID"] == tid]
                .replace([np.nan, np.inf, -np.inf], None)
                .astype(object)
                .to_dict(orient="records")
            )
            t = team_df[team_df["TEAM_ID"] == tid].replace([np.nan, np.inf, -np.inf], None).astype(object)
            return {
                "team_id": tid,
                "abbreviation": meta.get("abbreviation", ""),
                "full_name": meta.get("full_name", ""),
                "score": scores.get(tid, 0),
                "players": p,
                "totals": t.iloc[0].to_dict() if not t.empty else {},
            }

        response = {
            "game_id": game_id,
            "game_date": game_date,
            "arena": arena_str,
            "home": build_team(home_team_id, home_meta),
            "away": build_team(away_team_id, away_meta),
        }

        ttl = _game_cache_ttl_sec(game_date)
        _game_cache[game_id] = (now + ttl, response)
        return response

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_game {game_id}: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
