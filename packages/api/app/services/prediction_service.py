"""
Prediction Service — wraps LaLiga Match Prediction ML models.

Loads pre-trained Gradient Boosting, Random Forest, and LightGBM models
and generates match outcome predictions (Home Win / Draw / Away Win).
"""
import sys
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import joblib

# Path to the prediction ML project
PREDICTION_ML_DIR = Path(__file__).resolve().parents[4] / "laliga-match-prediction-ml-main"
MODELS_DIR = PREDICTION_ML_DIR / "models"
DATA_DIR = PREDICTION_ML_DIR / "data" / "processed"

# Default La Liga teams
DEFAULT_TEAMS = sorted([
    "Real Madrid", "Barcelona", "Atletico Madrid", "Sevilla",
    "Real Sociedad", "Real Betis", "Villarreal", "Athletic Club",
    "Valencia", "Osasuna", "Celta Vigo", "Rayo Vallecano",
    "Mallorca", "Girona", "Getafe", "Alaves", "Las Palmas",
    "Espanyol", "Real Valladolid", "Leganes",
])

# Singleton model cache
_models: dict[str, Any] = {}
_data: pd.DataFrame | None = None


def _load_models():
    """Load pre-trained ML models (called once, cached)."""
    global _models
    if _models:
        return

    model_files = {
        "RandomForest": "RandomForest_LaLiga.pkl",
        "GradientBoosting": "GradientBoosting_LaLiga.pkl",
        "LightGBM": "LightGBM_LaLiga.pkl",
    }

    for name, fname in model_files.items():
        path = MODELS_DIR / fname
        if path.exists():
            _models[name] = joblib.load(path)


def _load_data() -> pd.DataFrame:
    """Load historical match data."""
    global _data
    if _data is not None:
        return _data

    csv_path = DATA_DIR / "LaLiga_clean.csv"
    if csv_path.exists():
        _data = pd.read_csv(csv_path, parse_dates=["Date"])
        _data = _data.sort_values("Date").reset_index(drop=True)
    else:
        _data = pd.DataFrame()

    return _data


def _get_team_stats(df: pd.DataFrame, team: str, is_home: bool, n_matches: int = 5) -> dict:
    """Get team statistics from recent matches."""
    if df is None or len(df) == 0:
        return {
            "form": 0.0,
            "goals_scored": 1.5,
            "goals_conceded": 1.5,
            "shots": 12 if is_home else 10,
            "shots_conceded": 10 if is_home else 12,
            "cards": 2.5,
            "win_rate": 0.33,
        }

    if is_home:
        matches = df[df["HomeTeam"] == team].tail(n_matches)
        if len(matches) == 0:
            return _get_team_stats(pd.DataFrame(), team, is_home, n_matches)

        wins = (matches["FTR"] == "H").sum()
        losses = (matches["FTR"] == "A").sum()

        return {
            "form": (wins - losses) / len(matches),
            "goals_scored": float(matches["FTHG"].mean()),
            "goals_conceded": float(matches["FTAG"].mean()),
            "shots": float(matches["HS"].mean()),
            "shots_conceded": float(matches["AS"].mean()),
            "cards": float(matches["HY"].mean() + 2 * matches["HR"].mean()),
            "win_rate": float(wins / len(matches)),
        }
    else:
        matches = df[df["AwayTeam"] == team].tail(n_matches)
        if len(matches) == 0:
            return _get_team_stats(pd.DataFrame(), team, is_home, n_matches)

        wins = (matches["FTR"] == "A").sum()
        losses = (matches["FTR"] == "H").sum()

        return {
            "form": (wins - losses) / len(matches),
            "goals_scored": float(matches["FTAG"].mean()),
            "goals_conceded": float(matches["FTHG"].mean()),
            "shots": float(matches["AS"].mean()),
            "shots_conceded": float(matches["HS"].mean()),
            "cards": float(matches["AY"].mean() + 2 * matches["AR"].mean()),
            "win_rate": float(wins / len(matches)),
        }


def _get_h2h(df: pd.DataFrame, home_team: str, away_team: str, n_matches: int = 5) -> tuple[float, float]:
    """Get head-to-head statistics."""
    if df is None or len(df) == 0:
        return 0.0, 0.0

    h2h = df[
        ((df["HomeTeam"] == home_team) & (df["AwayTeam"] == away_team))
        | ((df["HomeTeam"] == away_team) & (df["AwayTeam"] == home_team))
    ].tail(n_matches)

    if len(h2h) == 0:
        return 0.0, 0.0

    home_wins = ((h2h["HomeTeam"] == home_team) & (h2h["FTR"] == "H")).sum()
    away_wins = ((h2h["AwayTeam"] == home_team) & (h2h["FTR"] == "A")).sum()

    home_score = (home_wins - away_wins) / len(h2h)
    return float(home_score), float(-home_score)


def predict_match(
    home_team: str,
    away_team: str,
    tracking_data: dict | None = None,
) -> dict[str, Any]:
    """
    Predict match outcome using all 3 ML models.

    Args:
        home_team: Name of home team
        away_team: Name of away team
        tracking_data: Optional tracking data from video analysis to enhance predictions

    Returns:
        Dictionary with model predictions, probabilities, and ensemble result
    """
    _load_models()
    df = _load_data()

    if not _models:
        return {
            "error": "No prediction models found",
            "models": {},
            "ensemble": {"prediction": "Unknown", "confidence": 0.0, "probabilities": {}},
        }

    # Get team stats
    home_stats = _get_team_stats(df, home_team, is_home=True)
    away_stats = _get_team_stats(df, away_team, is_home=False)
    h2h_home, h2h_away = _get_h2h(df, home_team, away_team)

    # If tracking data is available, enhance stats with observed data
    if tracking_data and tracking_data.get("team_ball_control"):
        bc = tracking_data["team_ball_control"]
        # Adjust form based on ball control dominance
        if bc.get("team_1_pct", 50) > 55:
            home_stats["form"] = min(home_stats["form"] + 0.1, 1.0)
        elif bc.get("team_2_pct", 50) > 55:
            away_stats["form"] = min(away_stats["form"] + 0.1, 1.0)

    # Default odds (neutral)
    odds_home, odds_draw, odds_away = 2.0, 3.5, 3.0
    prob_h = 1 / odds_home
    prob_d = 1 / odds_draw
    prob_a = 1 / odds_away
    total = prob_h + prob_d + prob_a
    prob_h, prob_d, prob_a = prob_h / total, prob_d / total, prob_a / total

    # Build feature vector
    features = pd.DataFrame([{
        "HomeTeam": home_team,
        "AwayTeam": away_team,
        "Home_LastNForm": home_stats["form"],
        "Away_LastNForm": away_stats["form"],
        "HomeTeam_AvgGoalsScored3": home_stats["goals_scored"],
        "AwayTeam_AvgGoalsScored3": away_stats["goals_scored"],
        "HomeTeam_AvgGoalsConceded3": home_stats["goals_conceded"],
        "AwayTeam_AvgGoalsConceded3": away_stats["goals_conceded"],
        "Home_H2H": h2h_home,
        "Away_H2H": h2h_away,
        "Home_ShotsPerMatch": home_stats["shots"],
        "Away_ShotsPerMatch": away_stats["shots"],
        "Home_ShotsConcededPerMatch": home_stats["shots_conceded"],
        "Away_ShotsConcededPerMatch": away_stats["shots_conceded"],
        "Home_CardsPerMatch": home_stats["cards"],
        "Away_CardsPerMatch": away_stats["cards"],
        "Home_WinRate_Home": home_stats["win_rate"],
        "Away_WinRate_Away": away_stats["win_rate"],
        "Prob_H": prob_h,
        "Prob_D": prob_d,
        "Prob_A": prob_a,
    }])

    outcome_map = {"H": "Home Win", "D": "Draw", "A": "Away Win"}
    results: dict[str, Any] = {}

    for name, model in _models.items():
        try:
            is_lgb_booster = "Booster" in str(type(model))

            if is_lgb_booster:
                X_encoded = pd.get_dummies(features)
                for team in DEFAULT_TEAMS:
                    for col in [f"HomeTeam_{team}", f"AwayTeam_{team}"]:
                        if col not in X_encoded.columns:
                            X_encoded[col] = 0
                X_encoded[f"HomeTeam_{home_team}"] = 1
                X_encoded[f"AwayTeam_{away_team}"] = 1
                X_aligned = X_encoded.reindex(sorted(X_encoded.columns), axis=1)

                proba = model.predict(X_aligned)[0]
                pred_idx = int(np.argmax(proba))
                classes_map = {0: "A", 1: "D", 2: "H"}
                pred = classes_map[pred_idx]
                prob_home_w = float(proba[2])
                prob_draw_w = float(proba[1])
                prob_away_w = float(proba[0])
            else:
                X_encoded = pd.get_dummies(features)
                if hasattr(model, "feature_names_in_"):
                    X_aligned = X_encoded.reindex(columns=model.feature_names_in_, fill_value=0)
                else:
                    X_aligned = X_encoded

                pred = model.predict(X_aligned)[0]
                proba = model.predict_proba(X_aligned)[0]
                classes = list(model.classes_)
                prob_home_w = float(proba[classes.index("H")])
                prob_draw_w = float(proba[classes.index("D")])
                prob_away_w = float(proba[classes.index("A")])

            pred_label = outcome_map.get(pred, str(pred))

            results[name] = {
                "prediction": pred_label,
                "confidence": round(float(max(prob_home_w, prob_draw_w, prob_away_w)) * 100, 1),
                "probabilities": {
                    "home_win": round(prob_home_w * 100, 1),
                    "draw": round(prob_draw_w * 100, 1),
                    "away_win": round(prob_away_w * 100, 1),
                },
            }
        except Exception as e:
            results[name] = {
                "prediction": "Error",
                "confidence": 0.0,
                "probabilities": {"home_win": 33.3, "draw": 33.3, "away_win": 33.3},
                "error": str(e),
            }

    # Ensemble prediction
    avg_h = np.mean([r["probabilities"]["home_win"] for r in results.values()])
    avg_d = np.mean([r["probabilities"]["draw"] for r in results.values()])
    avg_a = np.mean([r["probabilities"]["away_win"] for r in results.values()])

    max_prob = max(avg_h, avg_d, avg_a)
    if max_prob == avg_h:
        ensemble_pred = "Home Win"
    elif max_prob == avg_d:
        ensemble_pred = "Draw"
    else:
        ensemble_pred = "Away Win"

    return {
        "models": results,
        "ensemble": {
            "prediction": ensemble_pred,
            "confidence": round(float(max_prob), 1),
            "probabilities": {
                "home_win": round(float(avg_h), 1),
                "draw": round(float(avg_d), 1),
                "away_win": round(float(avg_a), 1),
            },
        },
        "home_team": home_team,
        "away_team": away_team,
        "team_stats": {
            "home": home_stats,
            "away": away_stats,
        },
    }
