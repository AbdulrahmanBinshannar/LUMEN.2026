'use client';

import { useState } from 'react';
import { createClient } from '../../lib/supabase';
import { useTranslation } from '../i18n';

export default function InterestForm() {
    const { t, dir } = useTranslation();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');

        try {
            console.log('LUMEN: Submitting interest for:', { name, email });
            const { error } = await supabase
                .from('waitlist')
                .insert([{ name, email }]);

            if (error) {
                // Check for unique constraint violation (duplicate email)
                if (error.code === '23505') {
                    console.log('LUMEN: Email already in waitlist');
                    setStatus('success');
                    setName('');
                    setEmail('');
                    return;
                }
                console.error('LUMEN: Supabase insertion error:', error);
                throw error;
            }
            
            console.log('LUMEN: Successfully joined waitlist');
            setStatus('success');
            setName('');
            setEmail('');
        } catch (err: any) {
            console.error('LUMEN: Critical error in InterestForm:', err.message || err);
            setStatus('error');
        }
    };

    return (
        <div className="w-full max-w-md mx-auto" dir={dir}>
            <div className="glass-strong p-8 rounded-3xl relative overflow-hidden border border-[var(--border)]">
                {status === 'success' ? (
                    <div className="text-center animate-fade-in">
                        <div className="w-16 h-16 bg-[var(--success)] bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                            ✅
                        </div>
                        <h3 className="text-xl font-bold mb-2">{t('interestSuccess')}</h3>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-bold mb-2">{t('interestedTitle')}</h3>
                            <p className="text-sm opacity-70">{t('interestedSubtitle')}</p>
                        </div>

                        <div className="space-y-2">
                            <input
                                type="text"
                                placeholder={t('namePlaceholder')}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] focus:border-[var(--volt)] outline-none transition-colors"
                            />
                            <input
                                type="email"
                                placeholder={t('emailPlaceholder')}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] focus:border-[var(--volt)] outline-none transition-colors"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="w-full btn-primary !py-4 !rounded-xl relative overflow-hidden group"
                        >
                            <span className={status === 'loading' ? 'opacity-0' : 'opacity-100'}>
                                {t('submitInterest')}
                            </span>
                            {status === 'loading' && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                        </button>

                        {status === 'error' && (
                            <p className="text-xs text-center text-red-500 animate-shake">
                                {t('interestError')}
                            </p>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
}
