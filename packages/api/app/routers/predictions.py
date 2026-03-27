from fastapi import APIRouter, Depends, HTTPException
from ..deps import get_supabase, get_current_user
from ..models.schemas import PredictionCreate
from ..services.points_engine import award_points

router = APIRouter(prefix="/predictions", tags=["predictions"])


@router.post("/")
async def create_prediction(body: PredictionCreate, user: dict = Depends(get_current_user)):
    supabase = get_supabase()

    # Check if match exists and isn't started
    match = supabase.table("matches").select("status, kick_off").eq("id", body.match_id).single().execute()
    if not match.data:
        # Check SPL data fallback
        from ..services.spl_service import get_match as get_spl_match
        spl_match = get_spl_match(body.match_id)
        if spl_match:
            if spl_match["status"] != "scheduled":
                 raise HTTPException(status_code=400, detail="Predictions are closed for this historical match")
        else:
            raise HTTPException(status_code=404, detail="Match not found")
    elif match.data["status"] != "scheduled":
        raise HTTPException(status_code=400, detail="Predictions are closed for this match")

    # Check for existing prediction
    existing = supabase.table("predictions").select("id, is_locked").eq("user_id", user["id"]).eq("match_id", body.match_id).execute()
    if existing.data:
        pred = existing.data[0]
        if pred["is_locked"]:
            raise HTTPException(status_code=400, detail="Prediction is locked")
        result = supabase.table("predictions").update({
            "predicted_home": body.predicted_home,
            "predicted_away": body.predicted_away,
            "predicted_mvp": body.predicted_mvp,
        }).eq("id", pred["id"]).execute()
        return result.data[0]

    result = supabase.table("predictions").insert({
        "user_id": user["id"],
        "match_id": body.match_id,
        "predicted_home": body.predicted_home,
        "predicted_away": body.predicted_away,
        "predicted_mvp": body.predicted_mvp,
    }).execute()

    # Award participation points
    await award_points(user["id"], 10, "prediction", "Submitted a match prediction")
    return result.data[0]


@router.put("/{prediction_id}/lock")
async def lock_prediction(prediction_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    pred = supabase.table("predictions").select("*").eq("id", prediction_id).eq("user_id", user["id"]).single().execute()
    if not pred.data:
        raise HTTPException(status_code=404, detail="Prediction not found")
    if pred.data["is_locked"]:
        raise HTTPException(status_code=400, detail="Already locked")

    result = supabase.table("predictions").update({"is_locked": True}).eq("id", prediction_id).execute()
    return result.data[0]


@router.get("/me")
async def my_predictions(user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    result = supabase.table("predictions").select("*, matches(home_team, away_team, kick_off)").eq("user_id", user["id"]).order("created_at", desc=True).limit(20).execute()
    return result.data or []
