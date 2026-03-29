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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
    setIsMenuOpen(false);
    router.push('/');
  };

  const navLinks = [
    { name: t('matches'), href: '/matches' },
    { name: t('communities'), href: '/communities' },
    { name: t('rewards'), href: '/rewards' },
    { name: t('analysis'), href: '/analysis' },
    ...(user ? [{ name: t('profile'), href: '/profile' }] : []),
  ];

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
          <div className="hidden sm:flex items-center bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-black/5 dark:border-white/10">
            <button onClick={() => setTheme('light')} className={`p-1.5 rounded-lg transition-all ${theme === 'light' ? 'bg-white shadow-sm text-black' : 'text-current opacity-40'}`}>☀️</button>
            <button onClick={() => setTheme('dark')} className={`p-1.5 rounded-lg transition-all ${theme === 'dark' ? 'bg-white/10 text-white' : 'text-current opacity-40'}`}>🌙</button>
          </div>

          {/* Lang Toggle */}
          <button 
            onClick={() => setLanguage(lang === 'en' ? 'ar' : 'en')}
            className="hidden sm:block text-xs font-bold px-3 py-1.5 rounded-lg border border-[var(--volt-border)] text-[var(--volt)] hover:bg-[var(--volt-dim)] transition-all"
          >
            {lang === 'en' ? 'AR' : 'EN'}
          </button>

          {user ? (
            <div className="flex items-center gap-4">
              <Link href="/profile" className="hidden sm:block text-sm font-bold" style={{ color: 'var(--volt)' }}>
                {dbUser?.username || user.email?.split('@')[0]}
              </Link>
              <button onClick={handleLogout} className="hidden sm:block text-sm font-semibold opacity-60 hover:opacity-100 transition-opacity">
                Logout
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-4">
              <Link href="/login" className="text-sm font-semibold transition-all hover:text-[var(--volt)]" style={{ color: 'var(--text-secondary)' }}>{t('logIn')}</Link>
              <Link href="/signup" className="btn-primary !py-2 !px-5 !text-xs !rounded-xl">{t('getStarted')}</Link>
            </div>
          )}

          {/* Hamburger Menu Button */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 rounded-xl glass border border-white/10 text-2xl transition-all active:scale-95"
          >
            {isMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={`lg:hidden fixed inset-x-0 top-16 transition-all duration-300 overflow-hidden ${isMenuOpen ? 'max-h-screen opacity-100 border-b border-[var(--nav-border)]' : 'max-h-0 opacity-0 pointer-events-none'}`} style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)' }}>
        <div className="p-6 space-y-6">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="py-4 text-xl font-bold border-b border-white/5 last:border-0 flex items-center justify-between"
              >
                <span>{link.name}</span>
                <span className="text-[var(--volt)] opacity-40">→</span>
              </Link>
            ))}
          </div>

          <div className="pt-6 border-t border-white/10 flex flex-wrap items-center gap-4">
            <button 
              onClick={() => { setLanguage(lang === 'en' ? 'ar' : 'en'); setIsMenuOpen(false); }}
              className="flex-1 py-3 rounded-xl border border-[var(--volt-border)] text-[var(--volt)] font-bold text-sm"
            >
              {lang === 'en' ? 'العربية (AR)' : 'English (EN)'}
            </button>
            
            <div className="flex-1 flex bg-black/10 dark:bg-white/5 p-1 rounded-xl border border-white/10">
              <button onClick={() => setTheme('light')} className={`flex-1 py-2 rounded-lg transition-all ${theme === 'light' ? 'bg-white text-black' : 'opacity-40'}`}>☀️</button>
              <button onClick={() => setTheme('dark')} className={`flex-1 py-2 rounded-lg transition-all ${theme === 'dark' ? 'bg-white/10 text-white' : 'opacity-40'}`}>🌙</button>
            </div>
          </div>

          <div className="pt-6">
            {user ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[var(--volt-dim)] border border-[var(--volt-border)] flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[var(--volt)] text-black font-black flex items-center justify-center text-xl uppercase">
                    {(dbUser?.username?.[0] || user.email?.[0] || '?')}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[var(--volt)]">@{dbUser?.username || user.email?.split('@')[0]}</div>
                    <div className="text-[10px] uppercase font-black opacity-40">{user.email}</div>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Link href="/login" onClick={() => setIsMenuOpen(false)} className="py-4 rounded-2xl border border-white/10 text-center font-bold">
                  {t('logIn')}
                </Link>
                <Link href="/signup" onClick={() => setIsMenuOpen(false)} className="py-4 rounded-2xl bg-[var(--volt)] text-black text-center font-bold">
                  {t('getStarted')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
