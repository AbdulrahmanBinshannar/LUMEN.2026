from pydantic import BaseModel, UUID4
from typing import Optional, Any
from datetime import datetime


class PredictionCreate(BaseModel):
    match_id: str
    predicted_home: int
    predicted_away: int
    predicted_mvp: Optional[str] = None


class PredictionResponse(BaseModel):
    id: str
    user_id: str
    match_id: str
    predicted_home: int
    predicted_away: int
    predicted_mvp: Optional[str]
    is_locked: bool
    is_correct: Optional[bool]
    points_earned: int
    created_at: datetime


class MatchResponse(BaseModel):
    id: str
    home_team: str
    away_team: str
    league: Optional[str]
    home_score: int
    away_score: int
    status: str
    kick_off: Optional[datetime]
    lineups: Optional[Any]
    tactics: Optional[Any]


class AIChatRequest(BaseModel):
    message: str
    history: list[dict[str, str]] = []


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    username: str
    total_points: int
    streak_count: int


class RewardClaimRequest(BaseModel):
    reward_id: str


class ChallengeJoinRequest(BaseModel):
    challenge_id: str


class PointsAwardRequest(BaseModel):
    user_id: str
    points: int
    source: str
    description: str


# ─── Analysis Pipeline Schemas ────────────────────────────


class TeamBallControl(BaseModel):
    team_1_pct: float
    team_2_pct: float


class PlayerStat(BaseModel):
    id: int
    team: int
    avg_speed_kmh: float
    total_distance_m: float


class TrackingData(BaseModel):
    team_ball_control: TeamBallControl
    player_stats: list[PlayerStat]
    total_frames: int
    output_video_path: Optional[str] = None
    team_colors: Optional[dict[str, list[int]]] = None
    player_count: int


class PredictionProbabilities(BaseModel):
    home_win: float
    draw: float
    away_win: float


class ModelPrediction(BaseModel):
    prediction: str
    confidence: float
    probabilities: PredictionProbabilities


class EnsemblePrediction(BaseModel):
    prediction: str
    confidence: float
    probabilities: PredictionProbabilities


class PredictionResult(BaseModel):
    models: dict[str, ModelPrediction]
    ensemble: EnsemblePrediction
    home_team: str
    away_team: str


class AIReport(BaseModel):
    summary: str
    key_insights: list[str] = []
    tactical_analysis: str = ""
    prediction_explanation: str = ""
    player_spotlight: str = ""


class AnalysisJobResponse(BaseModel):
    id: str
    status: str
    progress: int = 0
    tracking: Optional[Any] = None
    prediction: Optional[Any] = None
    ai_report: Optional[Any] = None
    error: Optional[str] = None
    created_at: Optional[str] = None

