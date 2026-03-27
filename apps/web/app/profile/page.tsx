'use client';

export const dynamic = 'force-dynamic';


import { useState, useEffect } from "react";
import { useTranslation, SPL_TEAMS } from "../i18n";
import { createClient } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import CustomSelect from "../components/CustomSelect";

export default function ProfilePage() {
  const { t, dir } = useTranslation();
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [isResetSent, setIsResetSent] = useState(false);
  const [favTeam, setFavTeam] = useState(SPL_TEAMS[0]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ full_name: '', username: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function getProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      // Try to fetch existing profile
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (data) {
        setUserData(data);
        setEditData({ 
          full_name: data.full_name || '', 
          username: data.username || ''
        });
        if (data.fav_team) setFavTeam(data.fav_team);
      } else {
        // Row doesn't exist — create it from auth metadata
        const meta = session.user.user_metadata || {};
        const newUser = {
          id: session.user.id,
          email: session.user.email || '',
          username: meta.username || session.user.email?.split('@')[0] || '',
          full_name: meta.full_name || '',
          phone: meta.phone || '',
          total_points: 0,
          level: 1,
          streak_count: 0,
          fav_team: SPL_TEAMS[0],
        };

        const { data: inserted } = await supabase
          .from('users')
          .upsert(newUser)
          .select()
          .single();

        if (inserted) {
          setUserData(inserted);
          setEditData({ full_name: inserted.full_name || '', username: inserted.username || '' });
        }
      }
      setLoading(false);
    }
    getProfile();
  }, []);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { error } = await supabase
        .from('users')
        .update({ 
          full_name: editData.full_name, 
          username: editData.username
        })
        .eq('id', session.user.id);

      if (!error) {
        setUserData({ ...userData, ...editData });
        setIsEditing(false);
      } else {
        console.error("Profile update failed:", error.message);
      }
    }
    setIsSaving(false);
  };

  const handlePasswordReset = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email) {
      await supabase.auth.resetPasswordForEmail(session.user.email, {
        redirectTo: `${window.location.origin}/profile`,
      });
      setIsResetSent(true);
      setTimeout(() => setIsResetSent(false), 5000);
    }
  };

  const updateFavTeam = async (team: string) => {
    setFavTeam(team);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from('users').update({ fav_team: team }).eq('id', session.user.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--volt)]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 lg:px-12" dir={dir}>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-[var(--volt)] flex items-center justify-center text-4xl font-bold text-black uppercase shadow-xl">
                {userData?.username?.[0] || userData?.full_name?.[0] || 'U'}
              </div>
            </div>
            <div>
              {isEditing ? (
                <div className="space-y-2">
                  <input className="input-field !py-2 !text-2xl font-bold" value={editData.full_name} onChange={e => setEditData({...editData, full_name: e.target.value})} placeholder="Full Name" />
                  <input className="input-field !py-1 !text-sm opacity-60" value={editData.username} onChange={e => setEditData({...editData, username: e.target.value})} placeholder="username" />
                </div>
              ) : (
                <>
                  <h1 className="text-4xl font-bold">{userData?.full_name || t('profile')}</h1>
                  <p className="text-[var(--text-secondary)]">@{userData?.username || 'user'}</p>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            {isEditing ? (
              <>
                <button onClick={() => setIsEditing(false)} className="btn-secondary !py-2 !px-6 !rounded-xl text-sm">Cancel</button>
                <button onClick={handleSaveProfile} disabled={isSaving} className="btn-primary !py-2 !px-6 !rounded-xl text-sm flex items-center gap-2">
                  {isSaving ? <span className="animate-spin text-lg">⏳</span> : 'Save Changes'}
                </button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} className="btn-secondary !py-2 !px-6 !rounded-xl text-sm flex items-center gap-2">
                <span>✏️</span> Edit Profile
              </button>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="glass-strong p-6 rounded-2xl text-center">
            <div className="text-3xl mb-2">🏆</div>
            <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('totalPoints')}</div>
            <div className="text-3xl font-black gradient-text">{userData?.total_points || 0}</div>
          </div>
          <div className="glass-strong p-6 rounded-2xl text-center">
            <div className="text-3xl mb-2">🔥</div>
            <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('currentStreak')}</div>
            <div className="text-3xl font-black">{userData?.streak_count || 0}</div>
          </div>
          <div className="glass-strong p-6 rounded-2xl text-center">
            <div className="text-3xl mb-2">⚽</div>
            <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Level</div>
            <div className="text-3xl font-black">{userData?.level || 1}</div>
          </div>
        </div>

        <div className="glass p-8 rounded-3xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">{t('accountSettings')}</h2>
            <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'var(--volt-dim)', color: 'var(--volt)', border: '1px solid var(--volt-border)' }}>Level {userData?.level || 1}</span>
          </div>
          <div className="space-y-8">
            <div>
              <label className="block text-sm font-bold uppercase tracking-widest opacity-40 mb-3">{t('favTeam')}</label>
              <CustomSelect options={SPL_TEAMS} value={favTeam} onChange={updateFavTeam} className="w-full" />
            </div>
            <div className="pt-6 border-t border-[var(--border)]">
              <label className="block text-sm font-bold uppercase tracking-widest opacity-40 mb-3">Email Address</label>
              <div className="text-[var(--text-secondary)] opacity-80">{userData?.email}</div>
            </div>
            <div className="pt-6 border-t border-[var(--border)]">
              <label className="block text-sm font-bold uppercase tracking-widest opacity-40 mb-3">Security</label>
              {isResetSent ? (
                <div className="p-4 rounded-xl bg-[var(--volt-dim)] border border-[var(--volt-border)] text-[var(--volt)] font-bold animate-fade-in">
                  ✅ Reset link sent! Check your email.
                </div>
              ) : (
                <button onClick={handlePasswordReset} className="btn-secondary !rounded-xl text-sm px-8">{t('forgetPassword')}</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
