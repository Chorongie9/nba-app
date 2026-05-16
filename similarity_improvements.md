# Player Similarity Engine — Improvements

Two changes were made to the original implementation: switching to advanced stats,
and restricting comparisons to players at the same position. This document explains
what was changed, why, and how it works.

---

## Change 1 — Advanced Stats for Similarity

### What changed

The original engine used 10 raw per-game counting stats:

```
PTS, REB, AST, STL, BLK, TOV, MIN, FG%, 3P%, FT%
```

These were replaced with 6 advanced stats from the NBA API's Advanced measure type:

```
USG_PCT, TS_PCT, AST_PCT, REB_PCT, OFF_RATING, DEF_RATING
```

### Why counting stats were a problem

Raw counting stats describe *how much* a player does, not *how they play*.
Two players can have nearly identical stat lines but be completely different
types of players in terms of role and impact.

For example:
- A player who scores 18 points on 30% shooting and a player who scores 18 points
  on 55% shooting look identical to counting stats, but they play very differently.
- A high-usage ball-handler and a catch-and-shoot role player might both average
  15/4/3 but have nothing in common stylistically.


Counting stats are also redundant in certain ways. MIN, PTS, and FGA are all
measuring roughly the same thing — "how much does this player play". Including
all three inflates the weight of usage in the comparison.

### What the new stats measure

| Stat | Full Name | What it captures |
|------|-----------|-----------------|
| `USG_PCT` | Usage Rate | What % of team possessions end with this player shooting, fouling, or turning it over while on the court. Measures role size and ball-handling responsibility. |
| `TS_PCT` | True Shooting % | Overall shooting efficiency combining 2-pointers, 3-pointers, and free throws into one number. Removes the noise of volume. |
| `AST_PCT` | Assist Percentage | What % of teammate field goals a player assisted on while on the court. A true measure of playmaking rate, not just assist count. |
| `REB_PCT` | Rebound Percentage | What % of available rebounds a player grabbed while on the court. Normalises for pace and minutes. |
| `OFF_RATING` | Offensive Rating | Points scored per 100 possessions when the player is on the court. Captures offensive impact in context. |
| `DEF_RATING` | Defensive Rating | Points allowed per 100 possessions when the player is on the court. The only stat in the group that directly measures defensive contribution. |

Together these 6 stats describe three things about a player:
1. **Role** — how much of the offence runs through them (USG_PCT) and whether they
   create for others (AST_PCT) or crash the boards (REB_PCT)
2. **Efficiency** — how well they convert their opportunities (TS_PCT)
3. **Impact** — how the team performs offensively and defensively with them on the court
   (OFF_RATING, DEF_RATING)

### How the data is fetched

Because the advanced stats come from a different API endpoint than per-game stats,
two requests are made in parallel using `ThreadPoolExecutor`:

- **Request 1** — per-game stats (`PerGame` mode) → used for display (PTS, REB, AST shown in the UI)
- **Request 2** — advanced stats (`Advanced` mode) → used for the actual similarity calculation

The results are merged on `PLAYER_ID` so each player row has both sets of columns.

---

## Change 2 — Position-Aware Similarity

### What changed

The original engine compared a player against everyone in the league.
Now the comparison pool is filtered to players at the same position before
computing distances.

The position comes from the `commonplayerinfo` endpoint (already fetched for
the player header card) and is passed from the frontend to the backend as a
query parameter: `?position=Guard`.

The backend maps the position string to the NBA API's filter code:

| commonplayerinfo value | nba_api filter code |
|------------------------|---------------------|
| Guard                  | G                   |
| Guard-Forward          | G                   |
| Forward-Guard          | G                   |
| Forward                | F                   |
| Forward-Center         | F                   |
| Center-Forward         | F                   |
| Center                 | C                   |

Combo positions (Guard-Forward, Forward-Center) are mapped to their primary category
(the first word). This keeps the groups clean and avoids splitting the pool too thinly.

### Why this matters

Without position filtering, a center's advanced stats put them in a completely
different part of the statistical space to guards just because of what the position
demands — not because of anything interesting about how they play.

For example:
- Centers naturally have high `REB_PCT` and low `AST_PCT` just because of where
  they play on the court, not because they are unusually strong rebounders or
  unusually weak playmakers compared to other centers.
- A guard with a 12% `REB_PCT` is an exceptional rebounder for their position.
  A center with a 12% `REB_PCT` is below average. Without position filtering,
  the engine treats these as identical.

By filtering to the same position group first, the z-score normalization step
(mean=0, std=1 scaling) operates within a meaningful peer group. A guard's
rebounding is measured against other guards, a center's against other centers.
The result is comparisons that reflect playing style and role within a position,
not just raw numbers.

### Caching

Each unique `(season, position)` combination is cached separately. So Guards in
2024-25 and Forwards in 2024-25 are two independent cache entries, each lasting
1 hour. This means after the first visit to a Guard's page in a session, all
subsequent Guard comparisons for that season are served instantly from cache.

---

## Season Toggle

The frontend now reads all seasons from the player's career data (already loaded
on the page) and builds a dropdown selector. When a different season is selected,
the component re-fetches with the new season while keeping the same position filter.

The most recent season is selected by default. If a player was not active in the
selected season (e.g. they were injured, retired, or hadn't entered the league yet),
the endpoint returns `unavailable: true` and the UI shows a message rather than an
error. The user can then pick a different season from the dropdown.

Old seasons (pre-2004 approximately) may have incomplete advanced stat coverage
from the NBA API. The 15 GP / 10 MIN filter still applies within whatever data
is available.
