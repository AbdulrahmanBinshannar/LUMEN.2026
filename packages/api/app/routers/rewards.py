from fastapi import APIRouter, Depends, HTTPException
from ..deps import get_supabase, get_current_user
from ..services.points_engine import award_points

router = APIRouter(prefix="/rewards", tags=["rewards"])


@router.get("/")
async def list_rewards():
    supabase = get_supabase()
    result = supabase.table("rewards").select("*").eq("is_active", True).execute()
    return result.data or []


@router.post("/{reward_id}/claim")
async def claim_reward(reward_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()

    reward = supabase.table("rewards").select("*").eq("id", reward_id).eq("is_active", True).single().execute()
    if not reward.data:
        raise HTTPException(status_code=404, detail="Reward not found")

    user_data = supabase.table("users").select("total_points").eq("id", user["id"]).single().execute()
    if not user_data.data:
        raise HTTPException(status_code=404, detail="User not found")

    cost = reward.data["points_cost"]
    if user_data.data["total_points"] < cost:
        raise HTTPException(status_code=400, detail="Insufficient points")

    # Deduct points and create claim
    supabase.table("users").update({"total_points": user_data.data["total_points"] - cost}).eq("id", user["id"]).execute()
    supabase.table("points_log").insert({
        "user_id": user["id"],
        "points": -cost,
        "source": "redemption",
        "description": f"Redeemed: {reward.data['title']}",
    }).execute()

    result = supabase.table("reward_claims").insert({
        "user_id": user["id"],
        "reward_id": reward_id,
        "status": "pending",
    }).execute()
    return result.data[0]


@router.get("/me/points")
async def my_points(user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    user_data = supabase.table("users").select("total_points, level").eq("id", user["id"]).single().execute()
    logs = supabase.table("points_log").select("*").eq("user_id", user["id"]).order("earned_at", desc=True).limit(20).execute()
    return {
        "balance": user_data.data["total_points"] if user_data.data else 0,
        "level": user_data.data["level"] if user_data.data else 1,
        "history": logs.data or [],
    }


@router.get("/me/badges")
async def my_badges(user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    result = supabase.table("badges").select("*").eq("user_id", user["id"]).order("unlocked_at", desc=True).execute()
    return result.data or []
