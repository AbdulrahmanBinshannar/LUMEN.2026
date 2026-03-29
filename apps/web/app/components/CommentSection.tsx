'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '../../lib/supabase';
import { API_BASE_URL } from '@/lib/config';

interface Comment {
  id: string;
  message: string;
  created_at: string;
  user_id: string;
  users?: {
    username: string;
    fav_team: string;
  };
}

interface CommentSectionProps {
  matchId: string; // Job ID or Match ID
}

export default function CommentSection({ matchId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);

  const supabase = createClient();
  const API_BASE = API_BASE_URL;

  /* ── Auth Check ─── */
  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    }
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  /* ── Fetch Comments ─── */
  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/matches/${matchId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    } finally {
      setLoading(false);
    }
  }, [matchId, API_BASE]);

  useEffect(() => {
    fetchComments();
    // Poll for new comments every 5 seconds for a "live" feel
    const interval = setInterval(fetchComments, 5000);
    return () => clearInterval(interval);
  }, [fetchComments]);

  /* ── Post Comment ─── */
  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    setPosting(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) throw new Error('You must be logged in to comment');

      const res = await fetch(`${API_BASE}/matches/${matchId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: newMessage.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to post comment');
      }

      setNewMessage('');
      fetchComments(); // Refresh list
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: '16px',
      border: '1px solid var(--border)',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      height: '500px',
    }}>
      <h3 style={{ 
        fontSize: '1rem', 
        fontWeight: 700, 
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        💬 Community Chat
        <span style={{ 
          fontSize: '0.7rem', 
          background: 'var(--volt)', 
          color: '#000', 
          padding: '2px 6px', 
          borderRadius: '4px',
          textTransform: 'uppercase'
        }}>Live</span>
      </h3>

      {/* Message List */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        marginBottom: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        paddingRight: '0.5rem'
      }}>
        {loading && comments.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading discussion...</p>
        ) : comments.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No comments yet. Start the conversation!</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'var(--volt)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: 700, color: '#000', flexShrink: 0
              }}>
                {(c.users?.username || 'U')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    {c.users?.username || 'Anonymous'}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p style={{ 
                  fontSize: '0.9rem', 
                  color: 'var(--text-primary)', 
                  lineHeight: 1.4,
                  background: 'rgba(255,255,255,0.03)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '10px'
                }}>
                  {c.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handlePost} style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
        {error && <p style={{ color: '#ff5050', fontSize: '0.75rem', marginBottom: '0.5rem' }}>{error}</p>}
        {user ? (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Say something about the match..."
              style={{
                flex: 1,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '0.6rem 0.75rem',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
              maxLength={500}
            />
            <button
              type="submit"
              disabled={posting || !newMessage.trim()}
              style={{
                background: newMessage.trim() ? 'var(--volt)' : 'var(--border)',
                color: newMessage.trim() ? '#000' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '8px',
                padding: '0 1rem',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
              }}
            >
              Post
            </button>
          </div>
        ) : (
          <div style={{ 
            background: 'rgba(255,255,255,0.03)', 
            padding: '0.75rem', 
            borderRadius: '8px', 
            textAlign: 'center',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)'
          }}>
            Please log in to participate in the chat.
          </div>
        )}
      </form>
    </div>
  );
}
