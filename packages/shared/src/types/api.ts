// API request/response types shared between mobile, web, and API

export interface LeaderboardEntry {
  rank: number;
  id: string;
  username: string;
  total_points: number;
  streak_count: number;
  fav_team: string | null;
}

export interface PointsBalance {
  balance: number;
  level: number;
  history: import('./db').PointsLog[];
}

export interface AIInsightResponse {
  type: 'tactical' | 'statistical' | 'prediction';
  content: string;
  confidence: number;
}

export const POINTS_RULES = {
  CORRECT_PREDICTION: 50,
  PARTICIPATION: 10,
  STREAK_BONUS_MULTIPLIER: 5,
} as const;

export const LEVEL_XP_THRESHOLD = 500; // points per level
