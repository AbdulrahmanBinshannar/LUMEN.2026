"""
Communities Router — Social groups for team fans.
"""
from fastapi import APIRouter, Depends, HTTPException
from ..deps import get_supabase, get_current_user
from typing import Optional
import uuid

router = APIRouter(prefix="/communities", tags=["communities"])

@router.post("/")
async def create_community(body: dict, user: dict = Depends(get_current_user)):
    """Create a new team-based community."""
    supabase = get_supabase()
    
    name = body.get("name", "").strip()
    team = body.get("team", "").strip()
    bio = body.get("bio", "").strip()
    
    if not name or not team:
        raise HTTPException(status_code=400, detail="Name and team are required")
        
    # Create community record
    result = supabase.table("communities").insert({
        "name": name,
        "team": team,
        "bio": bio,
        "creator_id": user["id"],
        "id": str(uuid.uuid4())[:8] # Unique short ID
    }).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create community")
        
    community = result.data[0]
    
    # Add creator as admin member
    supabase.table("community_members").insert({
        "community_id": community["id"],
        "user_id": user["id"],
        "role": "admin",
        "status": "active"
    }).execute()
    
    return community

@router.get("/")
async def list_communities(search: Optional[str] = None, team: Optional[str] = None):
    """Search and filter communities."""
    supabase = get_supabase()
    query = supabase.table("communities").select("*")
    
    if team:
        query = query.eq("team", team)
    if search:
        # Search by name or short ID
        query = query.or_(f"name.ilike.%{search}%,id.eq.{search}")
        
    result = query.execute()
    return result.data or []

@router.get("/{community_id}")
async def get_community(community_id: str):
    """Get detailed community info."""
    supabase = get_supabase()
    result = supabase.table("communities").select("*").eq("id", community_id).single().execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Community not found")
        
    return result.data

@router.post("/{community_id}/join")
async def join_request(community_id: str, user: dict = Depends(get_current_user)):
    """Request to join a community."""
    supabase = get_supabase()
    
    # Check if already a member or pending
    existing = supabase.table("community_members").select("id").eq("community_id", community_id).eq("user_id", user["id"]).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Already a member or request pending")
        
    result = supabase.table("community_requests").insert({
        "community_id": community_id,
        "user_id": user["id"],
        "status": "pending"
    }).execute()
    
    return {"message": "Join request sent to admin"}

@router.get("/{community_id}/requests")
async def list_join_requests(community_id: str, user: dict = Depends(get_current_user)):
    """List pending requests (Admin only)."""
    supabase = get_supabase()
    
    # Verify admin status
    is_admin = supabase.table("community_members").select("role").eq("community_id", community_id).eq("user_id", user["id"]).eq("role", "admin").execute()
    if not is_admin.data:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    result = supabase.table("community_requests").select("*, users(username)").eq("community_id", community_id).eq("status", "pending").execute()
    return result.data or []

@router.post("/{community_id}/requests/{request_id}/action")
async def handle_request(community_id: str, request_id: str, body: dict, user: dict = Depends(get_current_user)):
    """Approve or Reject a join request."""
    supabase = get_supabase()
    action = body.get("action") # 'approve' or 'reject'
    
    if action not in ['approve', 'reject']:
        raise HTTPException(status_code=400, detail="Invalid action")
        
    # Verify admin
    is_admin = supabase.table("community_members").select("role").eq("community_id", community_id).eq("user_id", user["id"]).eq("role", "admin").execute()
    if not is_admin.data:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    request = supabase.table("community_requests").select("*").eq("id", request_id).single().execute()
    if not request.data:
        raise HTTPException(status_code=404, detail="Request not found")
        
    if action == 'approve':
        # Add to members
        supabase.table("community_members").insert({
            "community_id": community_id,
            "user_id": request.data["user_id"],
            "role": "member",
            "status": "active"
        }).execute()
        
    # Update request status
    supabase.table("community_requests").update({"status": action}).eq("id", request_id).execute()
    return {"message": f"User {action}d"}

@router.delete("/{community_id}/members/{target_user_id}")
async def kick_member(community_id: str, target_user_id: str, user: dict = Depends(get_current_user)):
    """Kick a member (Admin only)."""
    supabase = get_supabase()
    
    # Verify admin
    is_admin = supabase.table("community_members").select("role").eq("community_id", community_id).eq("user_id", user["id"]).eq("role", "admin").execute()
    if not is_admin.data:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    supabase.table("community_members").delete().eq("community_id", community_id).eq("user_id", target_user_id).execute()
    return {"message": "Member kicked"}

@router.patch("/{community_id}")
async def update_community(community_id: str, body: dict, user: dict = Depends(get_current_user)):
    """Update community bio/photo (Admin only)."""
    supabase = get_supabase()
    
    # Verify admin
    is_admin = supabase.table("community_members").select("role").eq("community_id", community_id).eq("user_id", user["id"]).eq("role", "admin").execute()
    if not is_admin.data:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    updates = {}
    if "bio" in body: updates["bio"] = body["bio"]
    if "photo_url" in body: updates["photo_url"] = body["photo_url"]
    
    result = supabase.table("communities").update(updates).eq("id", community_id).execute()
    return result.data[0]

@router.get("/{community_id}/comments")
async def get_community_comments(community_id: str, limit: int = 50):
    """Fetch discussion for a community."""
    supabase = get_supabase()
    result = supabase.table("community_comments").select("*, users(username)").eq("community_id", community_id).order("created_at", desc=True).limit(limit).execute()
    return result.data or []

@router.post("/{community_id}/comments")
async def post_community_comment(community_id: str, body: dict, user: dict = Depends(get_current_user)):
    """Post a comment in a community."""
    supabase = get_supabase()
    
    message = body.get("message", "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message required")
        
    # Check membership
    is_member = supabase.table("community_members").select("id").eq("community_id", community_id).eq("user_id", user["id"]).execute()
    if not is_member.data:
        raise HTTPException(status_code=403, detail="Must be a member to comment")
        
    result = supabase.table("community_comments").insert({
        "community_id": community_id,
        "user_id": user["id"],
        "message": message
    }).execute()
    
    return result.data[0]
