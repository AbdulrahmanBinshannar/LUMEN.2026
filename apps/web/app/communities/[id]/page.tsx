'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/config';

interface Community {
  id: string;
  name: string;
  team: string;
  bio: string;
  photo_url?: string;
  creator_id: string;
}

interface Member {
  user_id: string;
  username: string;
  role: 'admin' | 'member';
}

interface JoinRequest {
  id: string;
  user_id: string;
  username: string;
}

interface Comment {
  id: string;
  username: string;
  message: string;
  created_at: string;
}

export default function CommunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [community, setCommunity] = useState<Community | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'member' | 'none'>('admin'); // Mocking current user role
  const [loading, setLoading] = useState(true);

  const API_BASE = API_BASE_URL;

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/communities/${id}`);
        if (res.ok) {
          setCommunity(await res.json());
        } else throw new Error();
      } catch {
        // Mock data
        setCommunity({
          id,
          name: 'Blue Giants',
          team: 'Al-Hilal',
          bio: 'The biggest Al-Hilal fan group in Riyadh. Join for match discussions and news.',
          creator_id: 'user-1'
        });
        setMembers([
          { user_id: 'user-1', username: 'Ahmed_Fan', role: 'admin' },
          { user_id: 'user-2', username: 'Sami_K', role: 'member' },
          { user_id: 'user-3', username: 'Laila_H', role: 'member' },
        ]);
        setRequests([
          { id: 'req-1', user_id: 'user-4', username: 'Majed_X' },
        ]);
        setComments([
          { id: 'c1', username: 'Sami_K', message: 'What a win yesterday! 💙', created_at: new Date().toISOString() },
          { id: 'c2', username: 'Laila_H', message: 'The new striker is amazing.', created_at: new Date().toISOString() },
        ]);
      }
      setLoading(false);
    }
    loadData();
  }, [id]);

  const handleJoin = async () => {
    setUserRole('none'); 
    alert('Join request sent to admin!');
  };

  const handleApprove = (reqId: string) => {
    setRequests(prev => prev.filter(r => r.id !== reqId));
    alert('User approved!');
  };

  const handleKick = (userId: string) => {
    setMembers(prev => prev.filter(m => m.user_id !== userId));
    alert('Member kicked!');
  };

  const handlePostComment = () => {
    if (!newComment.trim()) return;
    setComments(prev => [{ id: Date.now().toString(), username: 'You', message: newComment, created_at: new Date().toISOString() }, ...prev]);
    setNewComment('');
  };

  if (loading || !community) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--muted)' }}>⏳ Loading community...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <nav style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/" style={{ textDecoration: 'none', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>LUMEN</Link>
        <Link href="/communities" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '0.9rem' }}>← Back to Communities</Link>
      </nav>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
          
          {/* Main Body */}
          <div>
            {/* Header Card */}
            <div style={{ padding: '2.5rem', borderRadius: '24px', background: 'var(--card)', border: '1px solid var(--border)', marginBottom: '2rem', position: 'relative' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '20px', background: 'var(--volt-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>🏟️</div>
                  <div>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: '0.25rem' }}>{community.name}</h1>
                    <span style={{ fontSize: '1rem', color: 'var(--volt)', fontWeight: 700 }}>Official {community.team} Collective</span>
                  </div>
               </div>
               <p style={{ color: 'var(--muted)', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '2rem' }}>{community.bio}</p>
               
               {userRole === 'none' ? (
                 <button onClick={handleJoin} style={{ padding: '0.8rem 2rem', borderRadius: '14px', background: 'var(--volt)', border: 'none', color: '#000', fontWeight: 800, cursor: 'pointer' }}>Apply to Join</button>
               ) : (
                 <div style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600 }}>✅ You are a member ({userRole})</div>
               )}
            </div>

            {/* Comments / Discussion */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '24px', padding: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>Discussion 💬</h2>
              
              {userRole !== 'none' ? (
                <>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                    <input 
                      placeholder="Share your thoughts..." 
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handlePostComment()}
                      style={{ flex: 1, padding: '1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '14px', color: 'var(--text)' }} 
                    />
                    <button onClick={handlePostComment} style={{ padding: '0 1.5rem', borderRadius: '14px', background: 'var(--volt)', border: 'none', color: '#000', fontWeight: 700, cursor: 'pointer' }}>Post</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {comments.map(c => (
                      <div key={c.id} style={{ padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
                          <span style={{ fontWeight: 800, color: 'var(--volt)' }}>@{c.username}</span>
                          <span style={{ color: 'var(--muted)' }}>{new Date(c.created_at).toLocaleTimeString()}</span>
                        </div>
                        <p style={{ fontSize: '0.95rem', lineHeight: 1.5, margin: 0 }}>{c.message}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
                  🔒 Membership required to see and participate in the discussion.
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Management */}
          <div>
            {userRole === 'admin' && (
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '24px', padding: '1.5rem', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem' }}>Admin Controls 🛡️</h3>
                
                {/* Join Requests */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Join Requests ({requests.length})</label>
                  {requests.length === 0 ? <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>No pending requests.</p> : (
                    requests.map(r => (
                      <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '12px', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{r.username}</span>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button onClick={() => handleApprove(r.id)} style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', border: 'none', background: 'var(--volt)', color: '#000', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer' }}>✓</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Settings shortcut */}
                <Link href="#" style={{ fontSize: '0.8rem', color: 'var(--volt)', textDecoration: 'none', fontWeight: 600 }}>Update Bio / Photo →</Link>
              </div>
            )}

            {/* Member List */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '24px', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem' }}>Members 👥</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {members.map(m => (
                  <div key={m.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--border)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{m.username}</span>
                      {m.role === 'admin' && <span style={{ fontSize: '0.6rem', color: 'var(--volt)', fontWeight: 800 }}>ADMIN</span>}
                    </div>
                    {userRole === 'admin' && m.role !== 'admin' && (
                      <button onClick={() => handleKick(m.user_id)} style={{ border: 'none', background: 'transparent', color: '#ff6666', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer', padding: '4px' }}>KICK</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
