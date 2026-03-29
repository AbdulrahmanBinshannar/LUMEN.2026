"""
Analysis Router — endpoints for the video analysis pipeline.

POST /analysis/upload    — Upload video + team names → starts pipeline
GET  /analysis/{job_id}  — Get job status and results
"""
import os
import asyncio
import tempfile
import httpx
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from ..services.analysis_pipeline import create_job, get_job, run_pipeline

router = APIRouter(prefix="/analysis", tags=["analysis"])


class AnalysisRequest(BaseModel):
    video_url: str
    home_team: str = "Team 1"
    away_team: str = "Team 2"


@router.post("/upload")
async def upload_video(
    background_tasks: BackgroundTasks,
    request: AnalysisRequest,
):
    """
    Receive a Supabase Storage URL for a match video and start the analysis pipeline.

    The pipeline runs asynchronously:
    1. YOLO video tracking (player detection, team assignment, ball control)
    2. ML match prediction (Random Forest + Gradient Boosting + LightGBM)
    3. AI report generation (Gemini formats tracking + prediction into insights)

    Returns a job_id to poll for results.
    """
    # Download video from Supabase Storage URL into a temp file
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.get(request.video_url)
            response.raise_for_status()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=400, detail=f"Could not download video from URL: {e}")

    suffix = ".mp4"
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix, prefix="lumen_upload_")
    temp_file.write(response.content)
    temp_file.close()

    home_team = request.home_team
    away_team = request.away_team

    # Create job
    job_id = create_job()

    # Run pipeline in background
    async def _run():
        await run_pipeline(
            job_id=job_id,
            video_path=temp_file.name,
            home_team=home_team,
            away_team=away_team,
        )
        # Cleanup temp file
        try:
            os.unlink(temp_file.name)
        except OSError:
            pass

    background_tasks.add_task(_run)

    return {
        "job_id": job_id,
        "status": "pending",
        "message": f"Analysis started for {home_team} vs {away_team}",
    }


@router.get("/{job_id}")
async def get_analysis(job_id: str):
    """
    Get the status and results of an analysis job.

    Poll this endpoint until status is 'completed' or 'failed'.
    """
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return job


@router.post("/predict")
async def predict_only(
    home_team: str = Form(...),
    away_team: str = Form(...),
):
    """
    Run prediction only (no video tracking).

    Quick endpoint that just uses the ML models with historical data.
    """
    from ..services.prediction_service import predict_match as pm

    result = pm(home_team=home_team, away_team=away_team)
    return result
