import httpx
from ..deps import get_settings


async def fetch_live_matches() -> list[dict]:
    settings = get_settings()
    if not settings.football_api_key:
        return []
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.football_api_base_url}/fixtures",
            params={"live": "all"},
            headers={"x-apisports-key": settings.football_api_key},
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json().get("response", [])


async def fetch_fixture(fixture_id: int) -> dict | None:
    settings = get_settings()
    if not settings.football_api_key:
        return None
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.football_api_base_url}/fixtures",
            params={"id": fixture_id},
            headers={"x-apisports-key": settings.football_api_key},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json().get("response", [])
        return data[0] if data else None


async def fetch_lineups(fixture_id: int) -> dict | None:
    settings = get_settings()
    if not settings.football_api_key:
        return None
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.football_api_base_url}/fixtures/lineups",
            params={"fixture": fixture_id},
            headers={"x-apisports-key": settings.football_api_key},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json().get("response", [])
        if len(data) >= 2:
            return {
                "home": [p["player"]["name"] for p in data[0].get("startXI", [])],
                "away": [p["player"]["name"] for p in data[1].get("startXI", [])],
            }
        return None
