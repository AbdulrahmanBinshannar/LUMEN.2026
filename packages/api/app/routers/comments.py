"""
Comments Router — fan discussion on matches.
"""
from fastapi import APIRouter, Depends, HTTPException
from ..deps import get_supabase, get_current_user

router = APIRouter(prefix="/matches", tags=["comments"])


@router.post("/{match_id}/comments")
async def create_comment(match_id: str, body: dict, user: dict = Depends(get_current_user)):
    """Add a comment to a match."""
    supabase = get_supabase()

    message = body.get("message", "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    if len(message) > 500:
        raise HTTPException(status_code=400, detail="Message too long (max 500 chars)")

    result = supabase.table("match_comments").insert({
        "match_id": match_id,
        "user_id": user["id"],
        "message": message,
    }).execute()

    return result.data[0] if result.data else {}


@router.get("/{match_id}/comments")
async def list_comments(match_id: str, limit: int = 50):
    """Get comments for a match, newest first."""
    supabase = get_supabase()
    result = (
        supabase.table("match_comments")
        .select("*, users(username, fav_team)")
        .eq("match_id", match_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


@router.post("/{match_id}/comments/{comment_id}/like")
async def like_comment(match_id: str, comment_id: str, user: dict = Depends(get_current_user)):
    """Toggle like on a comment."""
    supabase = get_supabase()

    # Check if already liked
    existing = (
        supabase.table("comment_likes")
        .select("id")
        .eq("user_id", user["id"])
        .eq("comment_id", comment_id)
        .execute()
    )

    if existing.data:
        # Unlike
        supabase.table("comment_likes").delete().eq("id", existing.data[0]["id"]).execute()
        return {"liked": False}
    else:
        # Like
        supabase.table("comment_likes").insert({
            "user_id": user["id"],
            "comment_id": comment_id,
        }).execute()
        return {"liked": True}
