from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import matches, predictions, ai, arena, rewards, analysis, comments, communities

app = FastAPI(title="Lumen API", version="1.0.0", description="AI-powered football platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(matches.router)
app.include_router(predictions.router)
app.include_router(ai.router)
app.include_router(arena.router)
app.include_router(rewards.router)
app.include_router(analysis.router)
app.include_router(comments.router)
app.include_router(communities.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "lumen-api"}
