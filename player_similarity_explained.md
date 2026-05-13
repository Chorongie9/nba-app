# How the Player Similarity Engine Works

## The Big Picture

When you visit a player's page, the app finds the 8 most statistically similar players
in the current season and shows them in a ranked list. It does this by turning each
player's stats into a point in space, then measuring how close together those points are.

---

## Step 1 — Fetching the Data

The backend asks the NBA API for every player's per-game stats for the current season
(2024-25 by default). This returns around 550-570 players with stats like points,
rebounds, assists, shooting percentages, etc.

**Filtering out noise:**
Not every player in that list is worth comparing against. A player who appeared in
3 games off the bench tells us almost nothing. So before doing any math, we throw out
anyone who played fewer than 15 games or averaged less than 10 minutes per game. This
keeps the pool to players with a meaningful sample size.

**Handling trades:**
When a player gets traded mid-season, the NBA API returns a separate row for each team
they played on. To avoid duplicates, we keep only the row with the most games played,
which best represents their full season.

---

## Step 2 — The 10 Stats Used

The engine compares players across these 10 per-game statistics:

| Stat | What it captures |
|------|-----------------|
| PTS  | Scoring load |
| REB  | Rebounding role |
| AST  | Playmaking role |
| STL  | Defensive activity |
| BLK  | Rim protection |
| TOV  | Ball-handling tendencies |
| MIN  | Overall usage and role size |
| FG%  | Shooting efficiency from the field |
| 3P%  | Perimeter shooting profile |
| FT%  | Free throw shooting profile |

Together, these describe *how* a player plays — their role, their offensive profile,
and their defensive contributions — not just how good they are.

---

## Step 3 — Normalization (Making Stats Comparable)

Here's the problem with comparing raw numbers: a player who scores 25 points is not
*25 times more similar* to you than someone with 1 rebound. Points are just a bigger
number than blocks — they're measuring different things on different scales.

To fix this, each stat is **z-score normalized**:

```
normalized value = (player's value - league average) / league standard deviation
```

In plain English: we ask "how far above or below average is this player for each stat?"
After this step, every stat is on the same scale. A player who is 2 standard deviations
above average in scoring and 2 standard deviations above average in assists are treated
as equally extreme — which is exactly what we want.

---

## Step 4 — Measuring Distance

Once every player is represented as a list of 10 normalized numbers, we use
**Euclidean distance** to measure how different two players are. This is the same as
measuring a straight-line distance between two points — except in 10 dimensions instead
of 2 or 3.

The formula:

```
distance = sqrt( (Δpts)² + (Δreb)² + (Δast)² + ... )
```

A small distance means the two players are statistically similar across all 10 stats.
A large distance means they play very differently.

We compute the distance between the target player and every other player in the dataset,
then sort from smallest to largest and take the top 8.

---

## Step 5 — Converting Distance to a Similarity Percentage

Raw distance numbers aren't very readable, so we convert them to a percentage:

```
similarity % = (1 - player's distance / max distance in dataset) × 100
```

- The most similar player gets close to **99%**
- The most dissimilar player in the entire league would get **0%**
- The target player compared to themselves would be **100%**

This gives the visual similarity bar shown next to each result.

---

## Step 6 — Caching

Fetching stats for all 550+ players takes several seconds. To avoid re-doing that work
on every page visit, the result is stored in memory for **1 hour**. The first person to
visit a player page in a given session triggers the full load; everyone after that gets
the cached result instantly.

---

## Limitations

- **Current season only** — the engine only compares players within a single season.
  It won't find that a player is similar to someone from 10 years ago.
- **Equal weights** — all 10 stats are treated equally. In reality, some stats might
  be more meaningful for certain positions (e.g. blocks matter more for centers).
- **Per-game stats only** — it doesn't account for pace, role context, or advanced
  metrics like true shooting percentage or usage rate.

These are good starting points for future improvements.
