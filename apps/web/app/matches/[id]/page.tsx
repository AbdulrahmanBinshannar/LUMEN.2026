'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

/* ─── Types ─── */
interface Match {
  id: string;
  round: string;
  date: string;
  time: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  result: string;
  season: string;
  status: string;
  league: string;
}

interface Comment {
  id: string;
  message: string;
  created_at: string;
  users?: { username: string; fav_team?: string };
  user_name?: string;
}

interface Prediction {
  home_score: number;
  away_score: number;
  mvp: string;
  scorer: string;
  submitted: boolean;
}

/* ─── Sample Match Data ─── */
function getSampleMatch(id: string): Match {
  const teams = [
    ['Al-Hilal', 'Al-Nassr'], ['Al-Ittihad FC', 'Al-Ahli'], ['Al-Shabab', 'Al-Taawon'],
    ['Al-Fateh', 'Al-Raed'], ['Al-Feiha', 'Al-Ettifaq'], ['Al-Batin', 'Damac FC'],
  ];
  const idx = Math.abs(hashCode(id)) % teams.length;
  const homeScore = Math.floor(Math.random() * 4);
  const awayScore = Math.floor(Math.random() * 4);
  return {
    id,
    round: String(Math.floor(Math.random() * 30) + 1),
    date: '2018.01.15',
    time: '20:55',
    home_team: teams[idx][0],
    away_team: teams[idx][1],
    home_score: homeScore,
    away_score: awayScore,
    result: homeScore > awayScore ? 'home_win' : homeScore < awayScore ? 'away_win' : 'draw',
    season: '2017-2018',
    status: 'finished',
    league: 'Saudi Professional League',
  };
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

/* ─── Component ─── */
export default function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [matchData, setMatch] = useState<Match | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [prediction, setPrediction] = useState<Prediction>({
    home_score: 0, away_score: 0, mvp: '', scorer: '', submitted: false,
  });
  const [activeTab, setActiveTab] = useState<'stats' | 'predict' | 'comments'>('stats');
  const [loading, setLoading] = useState(true);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    loadMatch();
    loadComments();
  }, [id]);

  async function loadMatch() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/matches/spl/${id}`);
      if (res.ok) {
        setMatch(await res.json());
      } else {
        throw new Error('API unavailable');
      }
    } catch {
      setMatch(getSampleMatch(id));
    }
    setLoading(false);
  }

  async function loadComments() {
    try {
      const res = await fetch(`${API_BASE}/matches/${id}/comments`);
      if (res.ok) {
        setComments(await res.json());
      }
    } catch {
      // Use sample comments
      setComments([
        { id: '1', message: 'Great match! The home team dominated the first half 🔥', created_at: new Date().toISOString(), user_name: 'Ahmed_Fan' },
        { id: '2', message: 'The goalkeeper made some incredible saves today', created_at: new Date().toISOString(), user_name: 'SPL_Watcher' },
        { id: '3', message: 'What a goal in the 78th minute! Absolutely world class ⚽', created_at: new Date().toISOString(), user_name: 'FootballLover' },
      ]);
    }
  }

  async function submitComment() {
    if (!newComment.trim()) return;
    try {
      await fetch(`${API_BASE}/matches/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newComment }),
      });
    } catch { /* offline mode */ }

    setComments(prev => [{
      id: `local-${Date.now()}`,
      message: newComment,
      created_at: new Date().toISOString(),
      user_name: 'You',
    }, ...prev]);
    setNewComment('');
  }

  function submitPrediction() {
    setPrediction(prev => ({ ...prev, submitted: true }));
    // In production this would POST to /predictions
  }

  if (loading || !matchData) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
          <p style={{ color: 'var(--muted)' }}>Loading match...</p>
        </div>
      </div>
    );
  }

  const m = matchData;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* ─── Navbar ─── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem 2rem', borderBottom: '1px solid var(--border)',
        background: 'rgba(10,10,11,0.9)', backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '0.15em', color: 'var(--text)' }}>LUMEN</span>
        </Link>
        <Link href="/matches" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.9rem' }}>← Back to matches</Link>
      </nav>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
        {/* ─── Match Header ─── */}
        <div style={{
          padding: '2.5rem', borderRadius: '20px', textAlign: 'center', marginBottom: '2rem',
          background: 'linear-gradient(135deg, rgba(204,255,0,0.05), rgba(204,255,0,0.01))',
          border: '1px solid rgba(204,255,0,0.15)',
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600, marginBottom: '0.5rem' }}>
            {m.league} · Round {m.round} · {m.season}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', marginTop: '1rem' }}>
            {/* Home Team */}
            <div style={{ flex: 1, textAlign: 'right' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{m.home_team}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>🏠 Home</div>
            </div>

            {/* Score */}
            <div style={{ textAlign: 'center', minWidth: '120px' }}>
              {m.status === 'finished' ? (
                <div style={{ fontSize: '3rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
                  <span style={{ color: m.result === 'home_win' ? 'var(--volt)' : 'var(--text)' }}>{m.home_score}</span>
                  <span style={{ color: 'var(--muted)', margin: '0 8px', fontSize: '1.5rem' }}>:</span>
                  <span style={{ color: m.result === 'away_win' ? '#ff6666' : 'var(--text)' }}>{m.away_score}</span>
                </div>
              ) : (
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#8888ff' }}>
                  {m.time || 'TBD'}
                </div>
              )}
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                {m.status === 'finished' ? '✅ Full Time' : '🔴 Upcoming'} · {m.date}
              </div>
            </div>

            {/* Away Team */}
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{m.away_team}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>✈️ Away</div>
            </div>
          </div>
        </div>

        {/* ─── Tabs ─── */}
        <div style={{ display: 'flex', gap: '0.25rem', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '2rem' }}>
          {(['stats', 'predict', 'comments'] as const).filter(t => t !== 'predict' || m.status === 'scheduled').map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              flex: 1, padding: '0.75rem', border: 'none', cursor: 'pointer',
              background: activeTab === t ? 'var(--volt)' : 'transparent',
              color: activeTab === t ? '#000' : 'var(--muted)',
              fontWeight: 700, fontSize: '0.85rem', textTransform: 'capitalize',
              transition: 'all 0.2s',
            }}>
              {t === 'stats' ? '📊 Stats' : t === 'predict' ? '🎯 Predict' : '💬 Comments'}
            </button>
          ))}
        </div>

        {/* ─── Stats Tab ─── */}
        {activeTab === 'stats' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { label: 'Goals', home: m.home_score, away: m.away_score },
              { label: 'Ball Control', home: Math.floor(Math.random() * 30) + 40, away: 100 - (Math.floor(Math.random() * 30) + 40), unit: '%' },
              { label: 'Shots on Target', home: Math.floor(Math.random() * 6) + 3, away: Math.floor(Math.random() * 6) + 2 },
              { label: 'Total Shots', home: Math.floor(Math.random() * 10) + 8, away: Math.floor(Math.random() * 10) + 6 },
              { label: 'Yellow Cards', home: Math.floor(Math.random() * 4), away: Math.floor(Math.random() * 4) },
              { label: 'Corners', home: Math.floor(Math.random() * 8) + 3, away: Math.floor(Math.random() * 8) + 2 },
            ].map(stat => (
              <div key={stat.label} style={{ padding: '1rem 1.5rem', borderRadius: '12px', background: 'var(--card)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                    {stat.home}{stat.unit || ''}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    {stat.label}
                  </span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                    {stat.away}{stat.unit || ''}
                  </span>
                </div>
                {/* Bar */}
                <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', marginTop: '0.5rem', gap: '2px' }}>
                  <div style={{ width: `${(stat.home / (stat.home + stat.away)) * 100}%`, background: 'var(--volt)', borderRadius: '3px' }} />
                  <div style={{ width: `${(stat.away / (stat.home + stat.away)) * 100}%`, background: 'rgba(100,100,255,0.6)', borderRadius: '3px' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Predict Tab ─── */}
        {activeTab === 'predict' && (
          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            {prediction.submitted ? (
              <div style={{
                padding: '3rem', borderRadius: '16px', textAlign: 'center',
                background: 'rgba(204,255,0,0.05)', border: '1px solid rgba(204,255,0,0.2)',
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>Prediction Submitted!</h3>
                <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>
                  Your prediction: {prediction.home_score} - {prediction.away_score}
                  {prediction.mvp && ` · MVP: ${prediction.mvp}`}
                  {prediction.scorer && ` · Scorer: ${prediction.scorer}`}
                </p>
                <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'var(--card)', border: '1px solid var(--border)', fontSize: '0.85rem', color: 'var(--muted)' }}>
                  🏆 Rewards: <strong>50 pts</strong> for exact score · <strong>25 pts</strong> correct result · <strong>15 pts</strong> MVP · <strong>10 pts</strong> per scorer
                </div>
              </div>
            ) : (
              <div style={{
                padding: '2rem', borderRadius: '16px',
                background: 'var(--card)', border: '1px solid var(--border)',
              }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', textAlign: 'center' }}>
                  🎯 Make Your Prediction
                </h3>

                {/* Score prediction */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, marginBottom: '0.5rem' }}>{m.home_team}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button onClick={() => setPrediction(p => ({ ...p, home_score: Math.max(0, p.home_score - 1) }))}
                        style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: '1.2rem' }}>−</button>
                      <span style={{ fontSize: '2rem', fontWeight: 800, minWidth: '40px', textAlign: 'center' }}>{prediction.home_score}</span>
                      <button onClick={() => setPrediction(p => ({ ...p, home_score: p.home_score + 1 }))}
                        style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: '1.2rem' }}>+</button>
                    </div>
                  </div>

                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--muted)' }}>:</span>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, marginBottom: '0.5rem' }}>{m.away_team}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button onClick={() => setPrediction(p => ({ ...p, away_score: Math.max(0, p.away_score - 1) }))}
                        style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: '1.2rem' }}>−</button>
                      <span style={{ fontSize: '2rem', fontWeight: 800, minWidth: '40px', textAlign: 'center' }}>{prediction.away_score}</span>
                      <button onClick={() => setPrediction(p => ({ ...p, away_score: p.away_score + 1 }))}
                        style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: '1.2rem' }}>+</button>
                    </div>
                  </div>
                </div>

                {/* MVP prediction */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                    ⭐ Man of the Match (MVP)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cristiano Ronaldo"
                    value={prediction.mvp}
                    onChange={e => setPrediction(p => ({ ...p, mvp: e.target.value }))}
                    style={{
                      width: '100%', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text)',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>

                {/* Goal scorer prediction */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                    ⚽ Who&apos;s Scoring?
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mitrovic, Firmino"
                    value={prediction.scorer}
                    onChange={e => setPrediction(p => ({ ...p, scorer: e.target.value }))}
                    style={{
                      width: '100%', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text)',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>

                {/* Rewards info */}
                <div style={{
                  padding: '0.75rem', borderRadius: '10px', marginBottom: '1.5rem',
                  background: 'rgba(204,255,0,0.05)', border: '1px solid rgba(204,255,0,0.1)',
                  fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.6,
                }}>
                  🏆 <strong>Exact score:</strong> 50 pts · <strong>Correct result:</strong> 25 pts · <strong>MVP:</strong> 15 pts · <strong>Scorer:</strong> 10 pts each
                </div>

                <button
                  onClick={submitPrediction}
                  style={{
                    width: '100%', padding: '0.9rem', borderRadius: '12px', border: 'none',
                    background: 'var(--volt)', color: '#000', fontSize: '1rem',
                    fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  🎯 Lock Prediction
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── Comments Tab ─── */}
        {activeTab === 'comments' && (
          <div>
            {/* New comment form */}
            <div style={{
              display: 'flex', gap: '0.75rem', marginBottom: '1.5rem',
              padding: '1rem', borderRadius: '14px',
              background: 'var(--card)', border: '1px solid var(--border)',
            }}>
              <input
                type="text"
                placeholder="Share your thoughts on this match..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitComment()}
                style={{
                  flex: 1, padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text)',
                  fontSize: '0.9rem',
                }}
              />
              <button
                onClick={submitComment}
                disabled={!newComment.trim()}
                style={{
                  padding: '0.75rem 1.5rem', borderRadius: '10px', border: 'none',
                  background: newComment.trim() ? 'var(--volt)' : 'var(--border)',
                  color: newComment.trim() ? '#000' : 'var(--muted)',
                  fontWeight: 600, cursor: newComment.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '0.85rem', whiteSpace: 'nowrap',
                }}
              >
                Post 💬
              </button>
            </div>

            {/* Comment list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {comments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💬</div>
                  No comments yet — be the first!
                </div>
              ) : (
                comments.map(c => (
                  <div key={c.id} style={{
                    padding: '1rem 1.25rem', borderRadius: '12px',
                    background: 'var(--card)', border: '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--volt)' }}>
                        @{c.users?.username || c.user_name || 'Anonymous'}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                        {new Date(c.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                      {c.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
