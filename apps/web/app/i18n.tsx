'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'ar';

interface I18nContextType {
  lang: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
  dir: 'ltr' | 'rtl';
}

export const SPL_TEAMS = [
  'Al-Hilal', 'Al-Nassr', 'Al-Ittihad FC', 'Al-Ahli', 'Al-Shabab', 'Al-Taawon',
  'Al-Fateh', 'Al-Raed', 'Al-Feiha', 'Al-Batin', 'Al-Hazem', 'Damac FC', 
  'Abha Club', 'Al-Faisaly', 'Al-Wehda', 'Al-Riyadh', 'Al-Tai', 'Al-Khaleej'
];

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Nav
    matches: 'Matches',
    communities: 'Communities',
    rewards: 'Rewards',
    analysis: 'Analysis',
    profile: 'Profile',
    features: 'Features',
    howItWorks: 'How It Works',
    logIn: 'Log In',
    getStarted: 'Get Started',
    language: 'Language',
    theme: 'Theme',
    beta: 'BETA',
    contact: 'Contact',
    Privacy: 'Privacy',
    Terms: 'Terms',

    // Hero
    heroTitle: 'The Smart Football Platform',
    heroSubtitle: 'AI-powered analytics, live predictions, and a passionate fan community — all in one place.',
    heroCTA: 'Get Started — It\'s Free',
    exploreFeatures: 'Explore Features',

    // Landing Features
    landingFeature1Title: 'AI Analytics',
    landingFeature1Desc: 'Real-time tactical breakdowns, goal probability, and player insights powered by artificial intelligence.',
    landingFeature2Title: 'Compete & Predict',
    landingFeature2Desc: 'Predict match scores, climb the leaderboard, complete challenges, and earn points with every right call.',
    landingFeature3Title: 'Fan Communities',
    landingFeature3Desc: 'Join team-based groups, share insights, and discuss with legends in a dedicated community space.',

    // How it Works
    createAccount: 'Create Account',
    predict: 'Predict',

    // Profile
    accountSettings: 'Account Settings',
    totalPoints: 'Total Points',
    currentStreak: 'Current Streak',
    forgetPassword: 'Forget Password?',
    favTeam: 'Favourite Team',

    // Communities
    searchPlaceholder: 'Search by Name or Community ID...',
    createCommunity: 'Create Community',
    allTeams: 'All Teams',
    membersCount: 'members',
    joinRequestSent: 'Join request sent to admin!',

    // General
    loading: 'Loading...',
    backToMatches: '← Back to matches',
    lightMode: 'Light',
    darkMode: 'Dark',
    systemMode: 'System',
    rankings: 'Rankings',
    rewards_description: 'Predict matches, climb the leaderboard, and unlock exclusive rewards.',
    global_leaderboard: 'Global Leaderboard',
    interestedTitle: 'Interested in LUMEN?',
    interestedSubtitle: 'Join our waitlist to get early access and updates.',
    namePlaceholder: 'Enter your name',
    emailPlaceholder: 'Enter your email',
    submitInterest: "I'm Interested",
    interestSuccess: "Thanks for your interest! We'll keep you updated.",
    interestError: 'Something went wrong. Please try again.',
  },
  ar: {
    // Nav
    matches: 'المباريات',
    communities: 'المجتمعات',
    rewards: 'المكافآت',
    analysis: 'التحليل',
    profile: 'الملف الشخصي',
    features: 'المميزات',
    howItWorks: 'كيف يعمل',
    logIn: 'تسجيل الدخول',
    getStarted: 'ابدأ الآن',
    language: 'اللغة',
    theme: 'النمط',
    beta: 'نسخة تجريبية',
    contact: 'اتصل بنا',
    Privacy: 'سياسة الخصوصية',
    Terms: 'الشروط والأحكام',

    // Hero
    heroTitle: 'منصة كرة القدم الذكية',
    heroSubtitle: 'تحليلات مدعومة بالذكاء الاصطناعي، توقعات مباشرة، ومجتمع مشجعين شغوف — كل ذلك في مكان واحد.',
    heroCTA: 'ابدأ الآن — إنه مجاني',
    exploreFeatures: 'استكشف المميزات',

    // Landing Features
    landingFeature1Title: 'تحليلات الذكاء الاصطناعي',
    landingFeature1Desc: 'تحليلات تكتيكية في الوقت الفعلي، احتمالية الهدف، ورؤى حول اللاعبين مدعومة بالذكاء الاصطناعي.',
    landingFeature2Title: 'تنافس وتوقع',
    landingFeature2Desc: 'توقع نتائج المباريات، ارتقِ في لوحة المتصدرين، أكمل التحديات، واكسب النقاط مع كل توقع صحيح.',
    landingFeature3Title: 'مجتمعات المشجعين',
    landingFeature3Desc: 'انضم إلى مجموعات قائمة على الفرق، وشارك الرؤى، وناقش مع الأساطير في مساحة مجتمعية مخصصة.',

    // How it Works
    createAccount: 'إنشاء حساب',
    predict: 'توقع',

    // Profile
    accountSettings: 'إعدادات الحساب',
    totalPoints: 'إجمالي النقاط',
    currentStreak: 'السلسلة الحالية',
    forgetPassword: 'نسيت كلمة المرور؟',
    favTeam: 'الفريق المفضل',

    // Communities
    searchPlaceholder: 'ابحث بالاسم أو معرف المجتمع...',
    createCommunity: 'إنشاء مجتمع',
    allTeams: 'جميع الفرق',
    membersCount: 'عضو',
    joinRequestSent: 'تم إرسال طلب الانضمام إلى المدير!',

    // General
    loading: 'جاري التحميل...',
    backToMatches: '← العودة للمباريات',
    lightMode: 'فاتح',
    darkMode: 'داكن',
    systemMode: 'تلقائي',
    rankings: 'الترتيب',
    rewards_description: 'توقع المباريات، ارتقِ في لوحة المتصدرين، وافتح مكافآت حصرية.',
    global_leaderboard: 'لوحة المتصدرين العالمية',
    interestedTitle: 'هل أنت مهتم بـ LUMEN؟',
    interestedSubtitle: 'انضم إلى قائمة الانتظار للحصول على وصول مبكر وتحديثات.',
    namePlaceholder: 'أدخل اسمك',
    emailPlaceholder: 'أدخل بريدك الإلكتروني',
    submitInterest: 'أنا مهتم',
    interestSuccess: 'شكراً لاهتمامك! سنبقيك على اطلاع.',
    interestError: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
  }
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>('en');

  useEffect(() => {
    const saved = localStorage.getItem('lumen-lang') as Language;
    if (saved) setLang(saved);
    else {
      const browserLang = typeof navigator !== 'undefined' ? (navigator.language.startsWith('ar') ? 'ar' : 'en') : 'en';
      setLang(browserLang);
    }
  }, []);

  const setLanguage = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('lumen-lang', newLang);
  };

  const t = (key: string) => translations[lang][key] || translations['en'][key] || key;
  const isRTL = lang === 'ar';
  const dir = isRTL ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  return (
    <I18nContext.Provider value={{ lang, setLanguage, t, isRTL, dir }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useTranslation must be used within I18nProvider');
  return context;
}
