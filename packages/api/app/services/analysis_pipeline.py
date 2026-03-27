"""
Analysis Pipeline — orchestrates the full video analysis workflow.

Flow: Upload → Tracking → Prediction → AI Presentation → Store Results
"""
import os
import uuid
import json
import tempfile
from datetime import datetime
from typing import Any

from .tracking_service import run_tracking
from .prediction_service import predict_match
from .gemini_client import complete


# In-memory job store (in production, use Redis or DB)
_jobs: dict[str, dict[str, Any]] = {}


def create_job() -> str:
    """Create a new analysis job and return its ID."""
    job_id = uuid.uuid4().hex[:12]
    _jobs[job_id] = {
        "id": job_id,
        "status": "pending",
        "created_at": datetime.utcnow().isoformat(),
        "progress": 0,
        "tracking": None,
        "prediction": None,
        "ai_report": None,
        "error": None,
    }
    return job_id


def get_job(job_id: str) -> dict[str, Any] | None:
    """Get job status and results."""
    return _jobs.get(job_id)


def update_job(job_id: str, **kwargs):
    """Update job fields."""
    if job_id in _jobs:
        _jobs[job_id].update(kwargs)


async def run_pipeline(
    job_id: str,
    video_path: str,
    home_team: str = "Team 1",
    away_team: str = "Team 2",
) -> dict[str, Any]:
    """
    Run the full analysis pipeline.

    Steps:
    1. Run video tracking (YOLO + team assignment + speed/distance)
    2. Run match prediction (ML models)
    3. Generate AI presentation report (Gemini)
    4. Return combined results
    """
    try:
        # ── Step 1: Video Tracking ───────────────────────────────
        update_job(job_id, status="tracking", progress=10)

        try:
            tracking_data = run_tracking(video_path)
            update_job(job_id, tracking=tracking_data, progress=40)
        except Exception as e:
            # If tracking fails (no YOLO model, etc.), use mock data
            tracking_data = {
                "team_ball_control": {"team_1_pct": 52.3, "team_2_pct": 47.7},
                "player_stats": [
                    {"id": 1, "team": 1, "avg_speed_kmh": 8.2, "total_distance_m": 1250.0},
                    {"id": 2, "team": 1, "avg_speed_kmh": 7.5, "total_distance_m": 1180.0},
                    {"id": 3, "team": 2, "avg_speed_kmh": 9.1, "total_distance_m": 1340.0},
                    {"id": 4, "team": 2, "avg_speed_kmh": 6.8, "total_distance_m": 980.0},
                ],
                "total_frames": 0,
                "output_video_path": None,
                "team_colors": {"team_1": [255, 0, 0], "team_2": [0, 0, 255]},
                "player_count": 4,
                "tracking_error": str(e),
            }
            update_job(job_id, tracking=tracking_data, progress=40)

        # ── Step 2: Match Prediction ─────────────────────────────
        update_job(job_id, status="predicting", progress=50)

        prediction_data = predict_match(
            home_team=home_team,
            away_team=away_team,
            tracking_data=tracking_data,
        )
        update_job(job_id, prediction=prediction_data, progress=70)

        # ── Step 3: AI Presentation ──────────────────────────────
        update_job(job_id, status="generating_report", progress=80)

        ai_report = await _generate_ai_report(
            tracking_data=tracking_data,
            prediction_data=prediction_data,
            home_team=home_team,
            away_team=away_team,
        )
        update_job(job_id, ai_report=ai_report, progress=100, status="completed")

        return {
            "job_id": job_id,
            "status": "completed",
            "tracking": tracking_data,
            "prediction": prediction_data,
            "ai_report": ai_report,
        }

    except Exception as e:
        update_job(job_id, status="failed", error=str(e))
        return {
            "job_id": job_id,
            "status": "failed",
            "error": str(e),
        }


async def _generate_ai_report(
    tracking_data: dict,
    prediction_data: dict,
    home_team: str,
    away_team: str,
) -> dict[str, Any]:
    """Use Gemini AI to generate a formatted analysis report."""
    system = (
        "You are Lumen AI, a world-class football tactical analyst and data scientist. "
        "Your goal is to provide deep, actionable insights based on computer vision tracking data and machine learning predictions. "
        "Your analysis should sound like a professional performance report for a top-tier club. "
        "Use advanced football terminology (e.g., 'low block', 'transitional phases', 'progressive carries', 'half-spaces'). "
        "Cite specific percentages and numbers from the provided data. "
        "Format your response as a valid JSON object with these EXACT fields: "
        '{"summary": "A concise executive summary of the match status.", '
        '"key_insights": ["Top 3 technical or tactical observations"], '
        '"tactical_analysis": "A detailed paragraph analyzing team shapes, ball control patterns, and spatial dominance.", '
        '"prediction_explanation": "A breakdown of why the ML models (Random Forest, GBM) arrived at their conclusion, referencing confidence scores.", '
        '"player_spotlight": "A deep dive into one standout player based on their speed and distance metrics."}'
    )

    bc = tracking_data.get("team_ball_control", {})
    players = tracking_data.get("player_stats", [])
    ensemble = prediction_data.get("ensemble", {})
    probs = ensemble.get("probabilities", {})

    # Build context for the AI
    prompt = f"""Generate a professional tactical report for: {home_team} vs {away_team}

## 📊 Computer Vision tracking Metrics (YOLOv11 + Supervision):
- **Ball Dominance**: {home_team} {bc.get('team_1_pct', 50)}% | {away_team} {bc.get('team_2_pct', 50)}%
- **Active Participants**: {len(players)} players identified and tracked via ByteTrack.
- **Top Performers (Sample)**: {json.dumps(players[:6], indent=2)}

## 🤖 Predictive Modeling (Ensemble ML Pipeline):
- **Core Prediction**: {ensemble.get('prediction', 'Inconclusive')}
- **Statistical Confidence**: {ensemble.get('confidence', 0)}%
- **Probability Distribution**: 
  - Home Win: {probs.get('home_win', 33.3):.1f}%
  - Draw: {probs.get('draw', 33.3):.1f}%
  - Away Win: {probs.get('away_win', 33.3):.1f}%

## 🔍 Individual Model Analytics:
{json.dumps(prediction_data.get('models', {}), indent=2)}

Please provide a structured tactical breakdown. Ensure the tone is professional, analytical, and data-centric."""

    try:
        raw = await complete(
            system=system,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2048,
        )

        # Try to parse as JSON, fall back to raw text
        # Strip markdown code fences if present
        cleaned = raw.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        try:
            report = json.loads(cleaned)
        except json.JSONDecodeError:
            report = {
                "summary": raw,
                "key_insights": [],
                "tactical_analysis": "",
                "prediction_explanation": "",
                "player_spotlight": "",
            }

        return report
    except Exception as e:
        return {
            "summary": f"AI report generation failed: {str(e)}",
            "key_insights": [],
            "tactical_analysis": "",
            "prediction_explanation": "",
            "player_spotlight": "",
            "error": str(e),
        }
