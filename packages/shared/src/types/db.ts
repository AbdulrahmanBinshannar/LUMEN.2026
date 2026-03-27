// Auto-generated Supabase database types
// Run: supabase gen types typescript --local > packages/shared/src/types/db.ts

export type MatchStatus = 'scheduled' | 'live' | 'finished';
export type RewardType = 'ticket' | 'discount' | 'badge' | 'merch';
export type ChallengeType = 'daily' | 'weekly' | 'special';
export type ChallengeEntryStatus = 'pending' | 'completed' | 'failed';
export type RewardClaimStatus = 'pending' | 'fulfilled' | 'cancelled';
export type MessageType = 'fan' | 'ai';

export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url: string | null;
  fav_team: string | null;
  total_points: number;
  level: number;
  streak_count: number;
  created_at: string;
}

export interface Match {
  id: string;
  home_team: string;
  away_team: string;
  league: string | null;
  home_score: number;
  away_score: number;
  status: MatchStatus;
  kick_off: string | null;
  lineups: { home: string[]; away: string[] } | null;
  tactics: { home: string; away: string } | null;
}

export interface Prediction {
  id: string;
  user_id: string;
  match_id: string;
  predicted_home: number | null;
  predicted_away: number | null;
  predicted_mvp: string | null;
  is_locked: boolean;
  is_correct: boolean | null;
  points_earned: number;
  created_at: string;
}

export interface MatchStats {
  id: string;
  match_id: string;
  heatmap_data: HeatmapZone[] | null;
  pass_map: PassNode[] | null;
  player_positions: PlayerPosition[] | null;
  key_moments: KeyMoment[] | null;
  goal_probability: number | null;
}

export interface HeatmapZone {
  x: number;
  y: number;
  intensity: number;
}

export interface PassNode {
  from: string;
  to: string;
  count: number;
}

export interface PlayerPosition {
  player: string;
  x: number;
  y: number;
  team: 'home' | 'away';
}

export interface KeyMoment {
  minute: number;
  event: 'goal' | 'shot' | 'card' | 'substitution';
  player: string;
  team: string;
}

export interface AIInsight {
  id: string;
  match_id: string;
  insight_type: 'tactical' | 'statistical' | 'prediction' | 'general';
  content: string;
  confidence: number;
  generated_at: string;
}

export interface PointsLog {
  id: string;
  user_id: string;
  points: number;
  source: string;
  description: string;
  earned_at: string;
}

export interface Badge {
  id: string;
  user_id: string;
  badge_type: string;
  badge_name: string;
  unlocked_at: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string | null;
  challenge_type: ChallengeType;
  points_reward: number;
  starts_at: string | null;
  ends_at: string | null;
}

export interface ChallengeEntry {
  id: string;
  user_id: string;
  challenge_id: string;
  status: ChallengeEntryStatus;
  score: number;
  submitted_at: string | null;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  match_id: string;
  content: string;
  msg_type: MessageType;
  sent_at: string;
}

export interface Reward {
  id: string;
  title: string;
  description: string | null;
  points_cost: number;
  reward_type: RewardType | null;
  is_active: boolean;
}

export interface RewardClaim {
  id: string;
  user_id: string;
  reward_id: string;
  status: RewardClaimStatus;
  claimed_at: string;
}
