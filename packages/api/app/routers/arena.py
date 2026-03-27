from fastapi import APIRouter, Depends, HTTPException
from ..deps import get_supabase, get_current_user

router = APIRouter(tags=["arena"])


@router.get("/leaderboard")
async def leaderboard(limit: int = 50, offset: int = 0):
    supabase = get_supabase()
    result = supabase.table("users").select("id, username, total_points, streak_count, fav_team").order("total_points", desc=True).range(offset, offset + limit - 1).execute()
    return [{"rank": i + offset + 1, **u} for i, u in enumerate(result.data or [])]


@router.get("/challenges")
async def list_challenges():
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()
    supabase = get_supabase()
    result = supabase.table("challenges").select("*").lte("starts_at", now).gte("ends_at", now).order("ends_at").execute()
    return result.data or []


@router.post("/challenges/{challenge_id}/join")
async def join_challenge(challenge_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()

    # Check already joined
    existing = supabase.table("challenge_entries").select("id").eq("user_id", user["id"]).eq("challenge_id", challenge_id).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Already joined this challenge")

    result = supabase.table("challenge_entries").insert({
        "user_id": user["id"],
        "challenge_id": challenge_id,
        "status": "pending",
    }).execute()
    return result.data[0]
