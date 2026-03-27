from ..deps import get_supabase


async def award_points(user_id: str, points: int, source: str, description: str) -> None:
    """Award points to a user and log the transaction."""
    supabase = get_supabase()

    # Insert log entry
    supabase.table("points_log").insert({
        "user_id": user_id,
        "points": points,
        "source": source,
        "description": description,
    }).execute()

    # Update user total
    user = supabase.table("users").select("total_points, level").eq("id", user_id).single().execute()
    if user.data:
        new_total = user.data["total_points"] + points
        new_level = max(1, new_total // 500)
        supabase.table("users").update({
            "total_points": new_total,
            "level": new_level,
        }).eq("id", user_id).execute()


async def process_prediction_result(prediction_id: str) -> None:
    """Called after a match finishes — score predictions and award points."""
    supabase = get_supabase()

    pred = supabase.table("predictions").select("*, matches(*)").eq("id", prediction_id).single().execute()
    if not pred.data:
        return

    p = pred.data
    match = p["matches"]
    is_correct = (
        p["predicted_home"] == match["home_score"]
        and p["predicted_away"] == match["away_score"]
    )
    points = 50 if is_correct else 10

    supabase.table("predictions").update({
        "is_correct": is_correct,
        "points_earned": points,
    }).eq("id", prediction_id).execute()

    await award_points(
        user_id=p["user_id"],
        points=points,
        source="prediction",
        description=f"{'Correct' if is_correct else 'Participation'} prediction: {match['home_team']} vs {match['away_team']}",
    )

    # Update streak
    if is_correct:
        user = supabase.table("users").select("streak_count").eq("id", p["user_id"]).single().execute()
        if user.data:
            new_streak = user.data["streak_count"] + 1
            supabase.table("users").update({"streak_count": new_streak}).eq("id", p["user_id"]).execute()
            # Streak bonus
            if new_streak % 5 == 0:
                await award_points(p["user_id"], new_streak * 5, "streak", f"{new_streak}-match streak bonus!")
