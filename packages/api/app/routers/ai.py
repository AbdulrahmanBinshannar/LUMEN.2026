from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from ..deps import get_supabase, get_current_user
from ..models.schemas import AIChatRequest
from ..services.gemini_client import stream_chat, complete

router = APIRouter(tags=["ai"])


def build_match_system_prompt(match: dict, stats: dict | None) -> str:
    lines = [
        "You are Lumen AI, an expert football analyst assistant.",
        f"Current match: {match['home_team']} vs {match['away_team']} ({match.get('league', '')})",
        f"Status: {match['status']}  Score: {match['home_score']}-{match['away_score']}",
    ]
    if match.get("lineups"):
        lineups = match["lineups"]
        lines.append(f"Home lineup: {', '.join(lineups.get('home', []))}")
        lines.append(f"Away lineup: {', '.join(lineups.get('away', []))}")
    if stats and stats.get("goal_probability"):
        lines.append(f"Current goal probability: {round(stats['goal_probability'] * 100)}%")
    lines.append("Answer concisely. Be data-driven and insightful. Keep responses under 200 words.")
    return "\n".join(lines)


@router.post("/matches/{match_id}/chat/ai")
async def ai_chat(match_id: str, body: AIChatRequest, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    match_res = supabase.table("matches").select("*").eq("id", match_id).single().execute()
    if not match_res.data:
        raise HTTPException(status_code=404, detail="Match not found")

    stats_res = supabase.table("match_stats").select("goal_probability").eq("match_id", match_id).single().execute()
    system = build_match_system_prompt(match_res.data, stats_res.data)

    messages = body.history[-10:] + [{"role": "user", "content": body.message}]

    async def generate():
        async for chunk in stream_chat(system=system, messages=messages):
            yield chunk

    return StreamingResponse(generate(), media_type="text/plain")


@router.get("/matches/{match_id}/insights/generate")
async def generate_insights(match_id: str):
    """Generate fresh AI insights for a match (called by scheduler)."""
    supabase = get_supabase()
    match_res = supabase.table("matches").select("*").eq("id", match_id).single().execute()
    if not match_res.data:
        raise HTTPException(status_code=404, detail="Match not found")

    m = match_res.data
    system = "You are an expert football analyst. Produce concise, data-driven insights."
    prompt = (
        f"Analyze {m['home_team']} vs {m['away_team']} ({m.get('league', '')}).\n"
        f"Score: {m['home_score']}-{m['away_score']}  Status: {m['status']}\n"
        "Provide 3 key insights: one tactical, one statistical, one prediction. "
        "Return as JSON: [{\"type\": \"tactical|statistical|prediction\", \"content\": \"...\", \"confidence\": 0.0-1.0}]"
    )
    raw = await complete(system=system, messages=[{"role": "user", "content": prompt}])

    import json
    try:
        insights = json.loads(raw)
        for insight in insights:
            supabase.table("ai_insights").insert({
                "match_id": match_id,
                "insight_type": insight.get("type", "general"),
                "content": insight.get("content", ""),
                "confidence": insight.get("confidence", 0.5),
            }).execute()
    except Exception:
        pass

    return {"generated": True}
