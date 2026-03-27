from fastapi import APIRouter, Depends, HTTPException
from ..deps import get_supabase, get_current_user
from ..models.schemas import MatchResponse
from ..services.spl_service import (
    list_matches as spl_list_matches,
    get_match as spl_get_match,
    get_seasons as spl_get_seasons,
    get_teams as spl_get_teams,
    get_team_stats as spl_get_team_stats,
)

router = APIRouter(prefix="/matches", tags=["matches"])


# ─── SPL Data Endpoints ──────────────────────────────────


@router.get("/spl")
async def list_spl_matches(
    season: str | None = None,
    team: str | None = None,
    page: int = 1,
    per_page: int = 20,
):
    """List SPL historical matches with optional filters."""
    return spl_list_matches(season=season, team=team, page=page, per_page=per_page)


@router.get("/spl/seasons")
async def spl_seasons():
    """Get available SPL seasons."""
    return spl_get_seasons()


@router.get("/spl/teams")
async def spl_teams():
    """Get all SPL teams."""
    return spl_get_teams()


@router.get("/spl/teams/{team_name}/stats")
async def spl_team_stats(team_name: str):
    """Get aggregate stats for an SPL team."""
    return spl_get_team_stats(team_name)


@router.get("/spl/{match_id}")
async def get_spl_match(match_id: str):
    """Get a single SPL match by ID."""
    match = spl_get_match(match_id)
    if not match:
        raise HTTPException(status_code=404, detail="SPL match not found")
    return match


# ─── Live/Supabase Match Endpoints ────────────────────────


@router.get("/", response_model=list[dict])
async def list_matches(status: str | None = None):
    """Get live and upcoming matches."""
    supabase = get_supabase()
    query = supabase.table("matches").select("*").order("kick_off", desc=False)
    if status:
        query = query.eq("status", status)
    else:
        query = query.in_("status", ["live", "scheduled"])
    result = query.limit(20).execute()
    return result.data or []


@router.get("/{match_id}", response_model=dict)
async def get_match(match_id: str):
    supabase = get_supabase()
    result = supabase.table("matches").select("*").eq("id", match_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Match not found")
    return result.data


@router.get("/{match_id}/stats")
async def get_match_stats(match_id: str):
    supabase = get_supabase()
    result = supabase.table("match_stats").select("*").eq("match_id", match_id).single().execute()
    return result.data or {}


@router.get("/{match_id}/insights")
async def get_ai_insights(match_id: str):
    supabase = get_supabase()
    result = supabase.table("ai_insights").select("*").eq("match_id", match_id).order("generated_at", desc=True).limit(10).execute()
    return result.data or []

