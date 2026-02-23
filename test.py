from nba_api.stats.static import players
from nba_api.stats.endpoints import playercareerstats

player_dict = playercareerstats.PlayerCareerStats(2544)
print(player_dict)

