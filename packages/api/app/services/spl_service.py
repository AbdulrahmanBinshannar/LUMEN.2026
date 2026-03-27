"""
SPL (Saudi Professional League) Data Service.

Parses historical CSV data from the SPL datasets and provides
a unified API for match listing and details.
"""
import csv
import os
from pathlib import Path
from typing import Any

SPL_DATA_DIR = Path(__file__).resolve().parents[4] / "Saudi-Professional-League-Datasets-master"

# Cache
_matches: list[dict[str, Any]] = []
_loaded = False


def _parse_season(filename: str) -> str:
    """Extract season from filename like SPL-2017-2018-FS.csv -> 2017-2018"""
    parts = filename.replace(".csv", "").split("-")
    if len(parts) >= 3:
        return f"{parts[1]}-{parts[2]}"
    return "unknown"


def _load_all_matches():
    """Load and parse all SPL CSV files into a unified dataset."""
    global _matches, _loaded
    if _loaded:
        return

    match_id = 0
    for csv_file in sorted(SPL_DATA_DIR.glob("SPL-*-FS.csv")):
        season = _parse_season(csv_file.name)
        try:
            with open(csv_file, "r", encoding="utf-8-sig") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    match_id += 1
                    try:
                        score1 = int(row.get("Score1", 0) or 0)
                        score2 = int(row.get("Score2", 0) or 0)
                    except (ValueError, TypeError):
                        score1, score2 = 0, 0

                    home_team = (row.get("Team1") or "").strip()
                    away_team = (row.get("Team2") or "").strip()
                    if not home_team or not away_team:
                        continue

                    # Determine result
                    if score1 > score2:
                        result = "home_win"
                    elif score1 < score2:
                        result = "away_win"
                    else:
                        result = "draw"

                    _matches.append({
                        "id": f"spl-{match_id}",
                        "match_no": row.get("matchNo", ""),
                        "round": row.get("Round", ""),
                        "date": row.get("Date", ""),
                        "time": row.get("Time", ""),
                        "home_team": home_team,
                        "away_team": away_team,
                        "home_score": score1,
                        "away_score": score2,
                        "result": result,
                        "season": season,
                        "status": "finished",
                        "league": "Saudi Professional League",
                        "note": (row.get("Note") or "").strip(),
                    })
        except Exception:
            continue

    _loaded = True


def list_matches(
    season: str | None = None,
    team: str | None = None,
    page: int = 1,
    per_page: int = 20,
) -> dict[str, Any]:
    """List SPL matches with optional filters."""
    _load_all_matches()

    filtered = _matches
    if season:
        filtered = [m for m in filtered if m["season"] == season]
    if team:
        t = team.lower()
        filtered = [m for m in filtered if t in m["home_team"].lower() or t in m["away_team"].lower()]

    total = len(filtered)
    # Most recent first
    filtered = list(reversed(filtered))
    start = (page - 1) * per_page
    end = start + per_page

    return {
        "matches": filtered[start:end],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page,
    }


def get_match(match_id: str) -> dict[str, Any] | None:
    """Get a single match by ID."""
    _load_all_matches()
    for m in _matches:
        if m["id"] == match_id:
            return m
    return None


def get_seasons() -> list[str]:
    """Get list of available seasons."""
    _load_all_matches()
    seasons = sorted(set(m["season"] for m in _matches))
    return list(reversed(seasons))


def get_teams() -> list[str]:
    """Get list of all teams."""
    _load_all_matches()
    teams = set()
    for m in _matches:
        teams.add(m["home_team"])
        teams.add(m["away_team"])
    return sorted(teams)


def get_team_stats(team: str) -> dict[str, Any]:
    """Get aggregate stats for a team."""
    _load_all_matches()
    t = team.lower()
    home_matches = [m for m in _matches if t in m["home_team"].lower()]
    away_matches = [m for m in _matches if t in m["away_team"].lower()]

    total = len(home_matches) + len(away_matches)
    wins = sum(1 for m in home_matches if m["result"] == "home_win") + \
           sum(1 for m in away_matches if m["result"] == "away_win")
    draws = sum(1 for m in home_matches if m["result"] == "draw") + \
            sum(1 for m in away_matches if m["result"] == "draw")
    losses = total - wins - draws
    goals_scored = sum(m["home_score"] for m in home_matches) + sum(m["away_score"] for m in away_matches)
    goals_conceded = sum(m["away_score"] for m in home_matches) + sum(m["home_score"] for m in away_matches)

    return {
        "team": team,
        "total_matches": total,
        "wins": wins,
        "draws": draws,
        "losses": losses,
        "goals_scored": goals_scored,
        "goals_conceded": goals_conceded,
        "goal_difference": goals_scored - goals_conceded,
        "win_rate": round(wins / total * 100, 1) if total > 0 else 0,
    }
