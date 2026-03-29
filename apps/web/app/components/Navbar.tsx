'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "../i18n";
import { useTheme } from "../theme-provider";
import { createClient } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { t, setLanguage, lang } = useTranslation();
  const { setTheme, theme } = useTheme();
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [dbUser, setDbUser] = useState<any>(null);

  useEffect(() => {
    if (!supabase?.auth) return;

    supabase.auth.getSession().then(({ data: { session } }: any) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) fetchDbUser(u.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) fetchDbUser(u.id);
      else setDbUser(null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function fetchDbUser(userId: string) {
    const { data } = await supabase.from('users').select('username').eq('id', userId).single();
    if (data) setDbUser(data);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300" style={{ background: 'var(--nav-bg)', borderBottom: '1px solid var(--nav-border)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xl font-extrabold tracking-[4px]" style={{ color: 'var(--volt)' }}>LUMEN</Link>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ background: 'var(--volt-dim)', color: 'var(--volt)', border: '1px solid var(--volt-border)' }}>{t('beta')}</span>
        </div>

        <div className="hidden lg:flex items-center gap-8">
          <Link href="/matches" className="text-sm font-semibold transition-colors hover:text-[var(--volt)]" style={{ color: 'var(--text-secondary)' }}>{t('matches')}</Link>
          <Link href="/communities" className="text-sm font-semibold transition-colors hover:text-[var(--volt)]" style={{ color: 'var(--text-secondary)' }}>{t('communities')}</Link>
          <Link href="/rewards" className="text-sm font-semibold transition-colors hover:text-[var(--volt)]" style={{ color: 'var(--text-secondary)' }}>{t('rewards')}</Link>
          <Link href="/analysis" className="text-sm font-semibold transition-colors hover:text-[var(--volt)]" style={{ color: 'var(--text-secondary)' }}>{t('analysis')}</Link>
          {user && <Link href="/profile" className="text-sm font-semibold transition-colors hover:text-[var(--volt)]" style={{ color: 'var(--text-secondary)' }}>{t('profile')}</Link>}
        </div>

        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <div className="flex items-center bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-black/5 dark:border-white/10">
            <button onClick={() => setTheme('light')} className={`p-1.5 rounded-lg transition-all ${theme === 'light' ? 'bg-white shadow-sm text-black' : 'text-current opacity-40'}`}>☀️</button>
            <button onClick={() => setTheme('dark')} className={`p-1.5 rounded-lg transition-all ${theme === 'dark' ? 'bg-white/10 text-white' : 'text-current opacity-40'}`}>🌙</button>
          </div>

          {/* Lang Toggle */}
          <button 
            onClick={() => setLanguage(lang === 'en' ? 'ar' : 'en')}
            className="text-xs font-bold px-3 py-1.5 rounded-lg border border-[var(--volt-border)] text-[var(--volt)] hover:bg-[var(--volt-dim)] transition-all"
          >
            {lang === 'en' ? 'AR' : 'EN'}
          </button>

          {user ? (
            <div className="flex items-center gap-4">
              <Link href="/profile" className="hidden sm:block text-sm font-bold" style={{ color: 'var(--volt)' }}>
                {dbUser?.username || user.email?.split('@')[0]}
              </Link>
              <button onClick={handleLogout} className="text-sm font-semibold opacity-60 hover:opacity-100 transition-opacity">
                Logout
              </button>
            </div>
          ) : (
            <>
              <Link href="/login" className="hidden sm:block text-sm font-semibold transition-all hover:text-[var(--volt)]" style={{ color: 'var(--text-secondary)' }}>{t('logIn')}</Link>
              <Link href="/signup" className="btn-primary !py-2 !px-5 !text-xs !rounded-xl">{t('getStarted')}</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
