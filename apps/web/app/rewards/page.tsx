'use client';

export const dynamic = 'force-dynamic';


import { useState, useEffect } from "react";
import { useTranslation } from "../i18n";
import { createClient } from "../../lib/supabase";
import { API_BASE_URL } from "../../lib/config";

export default function RewardsPage() {
  const { t, dir } = useTranslation();
  const supabase = createClient();

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [nextMatch, setNextMatch] = useState<any>(null);
  const [prediction, setPrediction] = useState({ home: 0, away: 0 });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rewards = [
    { id: 1, title: "Legendary Badge", cost: 5000, icon: "🎖️" },
    { id: 2, title: "Custom Avatar Frame", cost: 2000, icon: "🖼️" },
    { id: 3, title: "Match Ticket Entry", cost: 10000, icon: "🎟️" },
  ];

  useEffect(() => {
    async function fetchData() {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      // Fetch leaderboard
      const { data: users } = await supabase
        .from('users')
        .select('id, username, full_name, total_points, level, streak_count, fav_team')
        .order('total_points', { ascending: false });

      if (users && users.length > 0) {
        const ranked = users.map((u: any, i: number) => ({
          ...u,
          rank: i + 1,
          isMe: u.id === userId,
        }));
        setLeaderboard(ranked);
        const me = ranked.find((u: any) => u.isMe);
        if (me) setCurrentUser(me);
      }

      // Fetch next match
      try {
        const res = await fetch(`${API_BASE_URL}/matches/spl?per_page=50`);
        if (res.ok) {
          const data = await res.json();
          const upcoming = data.matches?.find((m: any) => m.status === 'scheduled');
          if (upcoming) setNextMatch(upcoming);
          else throw new Error("No upcoming found");
        } else throw new Error("API error");
      } catch (err) {
        // Fallback sample match
        setNextMatch({
          id: 'next-1',
          home_team: 'Al-Hilal',
          away_team: 'Al-Nassr',
          date: '2026.04.15',
          time: '21:00',
          status: 'scheduled'
        });
      }

      setLoading(false);
    }
    fetchData();
  }, []);

  const handlePredictionSubmit = async () => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmitted(true);
    setIsSubmitting(false);
  };

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "text-yellow-400";
    if (rank === 2) return "text-gray-400";
    if (rank === 3) return "text-amber-600";
    return "opacity-40";
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 lg:px-12" dir={dir}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-bold mb-3">{t('rewards')} & Ranking</h1>
            <p className="text-[var(--text-secondary)]">Climb the global leaderboard and redeem your prediction points for exclusive prizes.</p>
          </div>
          <div className="glass-strong px-8 py-4 rounded-3xl flex items-center gap-4">
            <span className="text-2xl">🏆</span>
            <div>
              <div className="text-xs uppercase font-bold opacity-40">{t('totalPoints')}</div>
              <div className="text-2xl font-black text-[var(--volt)]">{(currentUser?.total_points || 0).toLocaleString()}</div>
            </div>
            {currentUser && (
              <div className="ml-4 pl-4 border-l border-[var(--border)]">
                <div className="text-xs uppercase font-bold opacity-40">Your Rank</div>
                <div className="text-2xl font-black">{getRankEmoji(currentUser.rank)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Next Game Prediction Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span>🎯</span> Next Game Prediction
          </h2>
          
          {nextMatch ? (
            <div className="glass-strong p-8 rounded-[2rem] border border-[var(--volt-border)] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <span className="px-3 py-1 rounded-full bg-[var(--volt-dim)] text-[var(--volt)] text-[10px] font-bold uppercase tracking-widest border border-[var(--volt-border)]">
                  Upcoming Match
                </span>
              </div>

              {isSubmitted ? (
                <div className="text-center py-8 animate-fade-in">
                  <div className="text-5xl mb-4">✅</div>
                  <h3 className="text-2xl font-bold mb-2">Prediction Locked!</h3>
                  <p className="text-[var(--text-secondary)] mb-6">
                    You predicted: <span className="text-[var(--volt)] font-bold">{prediction.home} - {prediction.away}</span>
                  </p>
                  <div className="inline-block px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-medium">
                    🏆 Earn up to <span className="text-[var(--volt)]">50 pts</span> if you get it right!
                  </div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                  <div className="flex-1 flex items-center justify-center gap-8 md:gap-16">
                    {/* Home */}
                    <div className="text-center">
                      <div className="text-lg font-bold mb-4">{nextMatch.home_team}</div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setPrediction(p => ({ ...p, home: Math.max(0, p.home - 1) }))}
                          className="w-10 h-10 rounded-xl border border-[var(--border)] flex items-center justify-center hover:bg-white/5 transition-colors"
                        >-</button>
                        <span className="text-4xl font-black w-12">{prediction.home}</span>
                        <button 
                          onClick={() => setPrediction(p => ({ ...p, home: p.home + 1 }))}
                          className="w-10 h-10 rounded-xl border border-[var(--border)] flex items-center justify-center hover:bg-white/5 transition-colors"
                        >+</button>
                      </div>
                    </div>

                    <div className="text-4xl font-black opacity-20">:</div>

                    {/* Away */}
                    <div className="text-center">
                      <div className="text-lg font-bold mb-4">{nextMatch.away_team}</div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setPrediction(p => ({ ...p, away: Math.max(0, p.away - 1) }))}
                          className="w-10 h-10 rounded-xl border border-[var(--border)] flex items-center justify-center hover:bg-white/5 transition-colors"
                        >-</button>
                        <span className="text-4xl font-black w-12">{prediction.away}</span>
                        <button 
                          onClick={() => setPrediction(p => ({ ...p, away: p.away + 1 }))}
                          className="w-10 h-10 rounded-xl border border-[var(--border)] flex items-center justify-center hover:bg-white/5 transition-colors"
                        >+</button>
                      </div>
                    </div>
                  </div>

                  <div className="w-full md:w-64 space-y-4">
                    <div className="text-xs text-[var(--text-secondary)] bg-white/5 p-3 rounded-xl border border-white/10">
                      <div className="flex justify-between mb-1">
                        <span>Date:</span>
                        <span className="font-bold">{nextMatch.date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Time:</span>
                        <span className="font-bold">{nextMatch.time}</span>
                      </div>
                    </div>
                    <button 
                      onClick={handlePredictionSubmit}
                      disabled={isSubmitting}
                      className="w-full py-4 rounded-2xl bg-[var(--volt)] text-black font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <span className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full" />
                      ) : (
                        <><span>🎯</span> Submit Prediction</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass p-12 rounded-[2rem] text-center opacity-50">
              <span className="text-4xl mb-4 block">🏟️</span>
              <p>No upcoming matches scheduled at the moment.</p>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Leaderboard */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span>🌍</span> Global Leaderboard
            </h2>
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--volt)]"></div>
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="glass rounded-3xl p-12 text-center">
                <div className="text-4xl mb-4">🏟️</div>
                <p className="text-[var(--text-secondary)]">No users yet. Be the first to earn points!</p>
              </div>
            ) : (
              <div className="glass rounded-3xl overflow-hidden border border-[var(--border)]">
                {/* Table Header */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border)] text-xs uppercase font-bold opacity-40">
                  <div className="flex items-center gap-6">
                    <span className="w-8">Rank</span>
                    <span>Player</span>
                  </div>
                  <div className="flex items-center gap-8 text-right">
                    <span className="w-16">Team</span>
                    <span className="w-16">Level</span>
                    <span className="w-20">Points</span>
                  </div>
                </div>

                {leaderboard.map((u) => (
                  <div
                    key={u.id}
                    className={`flex items-center justify-between p-6 transition-colors ${
                      u.isMe
                        ? 'bg-[var(--volt-dim)] border-y border-[var(--volt-border)]'
                        : 'border-b border-[var(--border)] last:border-0 hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center gap-6">
                      <span className={`w-8 text-lg font-black ${getRankColor(u.rank)}`}>
                        {u.rank <= 3 ? getRankEmoji(u.rank) : u.rank}
                      </span>
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-xl font-bold uppercase">
                        {u.username?.[0] || u.full_name?.[0] || '?'}
                      </div>
                      <div>
                        <span className={`font-bold ${u.isMe ? 'text-[var(--volt)]' : ''}`}>
                          {u.username || u.full_name || 'Anonymous'}
                          {u.isMe && <span className="ml-2 text-xs opacity-60">(You)</span>}
                        </span>
                        {u.full_name && u.username && (
                          <div className="text-xs text-[var(--text-muted)]">{u.full_name}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-8 text-right">
                      <span className="w-16 text-xs font-medium text-[var(--text-secondary)]">{u.fav_team || '—'}</span>
                      <span className="w-16 text-sm font-bold">Lv.{u.level || 1}</span>
                      <div className="w-20">
                        <div className="font-black">{(u.total_points || 0).toLocaleString()}</div>
                        <div className="text-[10px] uppercase font-bold opacity-30">pts</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rewards Shop */}
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span>💎</span> Rewards Store
            </h2>
            <div className="space-y-4">
              {rewards.map(r => (
                <div key={r.id} className="glass-strong p-6 rounded-3xl">
                  <div className="text-4xl mb-4">{r.icon}</div>
                  <h3 className="font-bold mb-1">{r.title}</h3>
                  <div className="text-sm font-black text-[var(--volt)] mb-4">{r.cost.toLocaleString()} pts</div>
                  <button className="w-full py-3 rounded-xl bg-white/5 border border-white/10 hover:border-[var(--volt-border)] hover:bg-[var(--volt-dim)] hover:text-[var(--volt)] transition-all font-bold text-sm">
                    Redeem Reward
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
