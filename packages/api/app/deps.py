from functools import lru_cache
from supabase import create_client, Client
from pydantic_settings import BaseSettings
from fastapi import Header, HTTPException
from supabase import Client as SupabaseClient


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    supabase_anon_key: str
    gemini_api_key: str
    football_api_key: str = ""
    football_api_base_url: str = "https://v3.football.api-sports.io"

    model_config = {
        "env_file": ".env",
        "extra": "ignore"
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()


@lru_cache
def get_supabase() -> Client:
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


async def get_current_user(authorization: str = Header(...)) -> dict:
    """Validate JWT from Supabase and return user dict."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = authorization.removeprefix("Bearer ")
    supabase = get_supabase()
    try:
        response = supabase.auth.get_user(token)
        if not response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"id": response.user.id, "email": response.user.email}
    except Exception:
        raise HTTPException(status_code=401, detail="Token validation failed")
