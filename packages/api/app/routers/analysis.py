"""
Analysis Router — endpoints for the video analysis pipeline.

POST /analysis/upload    — Upload video + team names → starts pipeline
GET  /analysis/{job_id}  — Get job status and results
"""
import os
import asyncio
import tempfile
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from ..services.analysis_pipeline import create_job, get_job, run_pipeline

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.post("/upload")
async def upload_video(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    home_team: str = Form("Team 1"),
    away_team: str = Form("Team 2"),
):
    """
    Upload a match video clip to start the analysis pipeline.

    The pipeline runs asynchronously:
    1. YOLO video tracking (player detection, team assignment, ball control)
    2. ML match prediction (Random Forest + Gradient Boosting + LightGBM)
    3. AI report generation (Gemini formats tracking + prediction into insights)

    Returns a job_id to poll for results.
    """
    # Validate file type
    if not video.content_type or not video.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="File must be a video (mp4, avi, etc.)")

    # Save uploaded video to temp file
    suffix = os.path.splitext(video.filename or "video.mp4")[1] or ".mp4"
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix, prefix="lumen_upload_")
    content = await video.read()
    temp_file.write(content)
    temp_file.close()

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
