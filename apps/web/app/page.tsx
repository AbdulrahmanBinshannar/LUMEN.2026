'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "./i18n";
import { createClient } from "../lib/supabase";
import InterestForm from "./components/InterestForm";

export default function LandingPage() {
  const { t, dir } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return (
    <div className="flex flex-col overflow-x-hidden" dir={dir}>
      <HeroSection t={t} user={user} />
      <FeaturesSection t={t} />
      <HowItWorksSection t={t} />

      <CTASection t={t} user={user} />
      <Footer t={t} />
    </div>
  );
}

function HeroSection({ t, user }: { t: any; user: any }) {
  return (
    <section className="hero-gradient relative min-h-[90vh] flex items-center justify-center pt-8 overflow-hidden">
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 grid-pattern opacity-50" />

      {/* Floating orbs - Theme Aware */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full animate-float opacity-40" style={{ background: 'radial-gradient(circle, var(--hero-glow) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div className="absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full animate-float opacity-30" style={{ background: 'radial-gradient(circle, var(--hero-glow) 0%, transparent 70%)', filter: 'blur(40px)', animationDelay: '2s' }} />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Badge */}
        <div className="animate-fade-in-up stagger-1 inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--success)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>AI-Powered Football Platform</span>
        </div>

        {/* Headline */}
        <h1 className="animate-fade-in-up stagger-2 text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.05] tracking-tight mb-6">
          {t('heroTitle').split(' ').map((word: string, i: number) => 
            word.toLowerCase() === 'smart' || word.toLowerCase() === 'platform' || word === 'الذكية' || word === 'الذكاء' ? 
            <span key={i} className="gradient-text">{word} </span> : word + ' '
          )}
        </h1>

        {/* Subtitle */}
        <p className="animate-fade-in-up stagger-3 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {t('heroSubtitle')}
        </p>

        {/* CTAs */}
        <div className="animate-fade-in-up stagger-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          {user ? (
            <Link href="/matches" className="btn-primary animate-pulse-glow text-lg !py-4 !px-10 !rounded-2xl">
              {t('matches')}
            </Link>
          ) : (
            <Link href="/signup" className="btn-primary animate-pulse-glow text-lg !py-4 !px-10 !rounded-2xl">
              {t('heroCTA')}
            </Link>
          )}
          <a href="#features" className="btn-secondary !py-4 !px-10 !rounded-2xl text-lg">
            {t('exploreFeatures')}
          </a>
        </div>

        {/* Interest Form */}
        <div className="mt-12 animate-fade-in-up stagger-5">
          <InterestForm />
        </div>

        {/* Floating stats below CTA */}
        <div className="animate-fade-in-up stagger-6 mt-16 flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {[
            { value: "AI", label: "Powered Analytics" },
            { value: "⚡", label: "Real-Time Data" },
            { value: "🌍", label: "Global Community" },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3 px-5 py-3 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <span className="text-2xl">{stat.value}</span>
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32" style={{ background: 'linear-gradient(to top, var(--bg) 0%, transparent 100%)' }} />
    </section>
  );
}

function FeaturesSection({ t }: { t: any }) {
  const features = [
    {
      icon: "⚡",
      title: t('landingFeature1Title') || "AI Analytics",
      desc: t('landingFeature1Desc') || "Real-time tactical breakdowns, goal probability, and player insights powered by artificial intelligence.",
      href: "/analysis",
    },
    {
      icon: "🏆",
      title: t('landingFeature2Title') || "Compete & Predict",
      desc: t('landingFeature2Desc') || "Predict match scores, climb the leaderboard, complete challenges, and earn points with every right call.",
      href: "/matches",
    },
    {
      icon: "💬",
      title: t('landingFeature3Title') || "Fan Communities",
      desc: t('landingFeature3Desc') || "Join team-based groups, share insights, and discuss with legends in a dedicated community space.",
      href: "/communities",
    },
  ];

  return (
    <section id="features" className="relative py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-sm font-semibold tracking-widest uppercase mb-4 block" style={{ color: 'var(--volt)' }}>{t('features')}</span>
          <h2 className="text-4xl md:text-5xl font-bold mb-5">
            Everything You <span className="gradient-text">Need</span>
          </h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            From AI-driven insights to live fan engagement — Lumen delivers the ultimate football experience.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <Link
              href={f.href}
              key={f.title}
              className={`group glass-strong p-8 rounded-2xl transition-all duration-500 hover:scale-[1.03] hover:shadow-[0_20px_60px_rgba(204,255,0,0.08)] stagger-${i + 1} animate-fade-in-up`}
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6 transition-transform duration-300 group-hover:scale-110" style={{ background: 'var(--volt-dim)', border: '1px solid var(--volt-border)' }}>
                {f.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{f.title}</h3>
              <p className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
              <div className="mt-6 flex items-center gap-2 text-sm font-semibold transition-all duration-300 group-hover:gap-3" style={{ color: 'var(--volt)' }}>
                <span>Learn more</span>
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection({ t }: { t: any }) {
  const steps = [
    { step: "01", title: t('createAccount') || "Create Account", desc: "Sign up in seconds and pick your favourite team.", icon: "👤" },
    { step: "02", title: t('matches') || "Matches", desc: "Get real-time scores, AI-powered analytics, and match predictions.", icon: "⚽" },
    { step: "03", title: t('predict') || "Predict", desc: "Submit match predictions, climb leaderboards, and earn rewards.", icon: "🏆" },
    { step: "04", title: t('communities') || "Communities", desc: "Chat with fans in real time, earn badges, and unlock exclusive rewards.", icon: "💬" },
  ];

  return (
    <section id="how-it-works" className="relative py-24 md:py-32" style={{ background: 'var(--bg-secondary)' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-sm font-semibold tracking-widest uppercase mb-4 block" style={{ color: 'var(--volt)' }}>{t('howItWorks')}</span>
          <h2 className="text-4xl md:text-5xl font-bold mb-5">
            Get Started in <span className="gradient-text">Minutes</span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <div key={s.step} className={`relative p-8 rounded-3xl glass transition-all duration-500 hover:scale-[1.02] stagger-${i + 1} animate-fade-in-up`}>
              <div className="text-6xl font-black mb-4 opacity-20 leading-none" style={{ color: 'var(--volt)' }}>{s.step}</div>
              <div className="text-3xl mb-4">{s.icon}</div>
              <h3 className="text-lg font-bold mb-2">{s.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}



function CTASection({ t, user }: { t: any; user: any }) {
  return (
    <section className="relative py-24 md:py-32" style={{ background: 'var(--bg-secondary)' }}>
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="glass-strong p-12 md:p-16 rounded-3xl relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold mb-5">
              Ready to <span className="gradient-text">Join</span>?
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              {user ? (
                <Link href="/profile" className="btn-primary text-lg !py-4 !px-12 !rounded-2xl animate-pulse-glow">
                  {t('profile')}
                </Link>
              ) : (
                <>
                  <Link href="/signup" className="btn-primary text-lg !py-4 !px-12 !rounded-2xl animate-pulse-glow">
                    {t('getStarted')}
                  </Link>
                  <Link href="/login" className="btn-secondary text-lg !py-4 !px-12 !rounded-2xl">
                    {t('logIn')}
                  </Link>
                </>
              )}
            </div>

            {/* Interest Form in CTA */}
            <div className="max-w-md mx-auto">
              <InterestForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer({ t }: { t: any }) {
  return (
    <footer className="py-12" style={{ borderTop: '1px solid var(--border)' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="text-lg font-extrabold tracking-[4px]" style={{ color: 'var(--volt)' }}>LUMEN</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="text-sm transition-colors hover:text-[var(--volt)]" style={{ color: 'var(--text-secondary)' }}>{t('Privacy')}</a>
            <a href="#" className="text-sm transition-colors hover:text-[var(--volt)]" style={{ color: 'var(--text-secondary)' }}>{t('Terms')}</a>
            <a href="mailto:lumen.org.sa@gmail.com" className="text-sm transition-colors hover:text-[var(--volt)]" style={{ color: 'var(--text-secondary)' }}>{t('contact')}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
