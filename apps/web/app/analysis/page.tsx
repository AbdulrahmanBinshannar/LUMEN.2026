'use client';

export const dynamic = 'force-dynamic';

import { useState, useRef, useCallback, useEffect } from 'react';
import CustomSelect from '../components/CustomSelect';
import CommentSection from '../components/CommentSection';
import { SPL_TEAMS, useTranslation } from '../i18n';
import { API_BASE_URL } from '@/lib/config';
import { createClient } from '@/lib/supabase';

/* ─── Types ───────────────────────────────────────────── */
interface PlayerStat {
  id: number;
  team: number;
  avg_speed_kmh: number;
  total_distance_m: number;
}

interface TrackingData {
  team_ball_control: { team_1_pct: number; team_2_pct: number };
  player_stats: PlayerStat[];
  player_count: number;
  team_colors?: Record<string, number[]>;
}

interface PredictionProbabilities {
  home_win: number;
  draw: number;
  away_win: number;
}

interface ModelPrediction {
  prediction: string;
  confidence: number;
  probabilities: PredictionProbabilities;
}

interface PredictionData {
  models: Record<string, ModelPrediction>;
  ensemble: {
    prediction: string;
    confidence: number;
    probabilities: PredictionProbabilities;
  };
  home_team: string;
  away_team: string;
}

interface AIReport {
  summary: string;
  key_insights: string[];
  tactical_analysis: string;
  prediction_explanation: string;
  player_spotlight: string;
}

interface AnalysisResult {
  tracking: TrackingData | null;
  prediction: PredictionData | null;
  ai_report: AIReport | null;
}

/* ─── Sub-Components ────────────────────────────────────── */

function MatchClock({ active }: { active: boolean }) {
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!active) return;
    // Start at a random "live" point if just completed
    setMinutes(70 + Math.floor(Math.random() * 15));
    
    const interval = setInterval(() => {
      setSeconds(s => {
        if (s >= 59) {
          setMinutes(m => m + 1);
          return 0;
        }
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [active]);

  if (!active) return null;

  return (
    <div style={{ 
      background: 'rgba(0,0,0,0.5)', 
      padding: '4px 12px', 
      borderRadius: '6px',
      fontFamily: 'monospace',
      fontSize: '1.2rem',
      fontWeight: 'bold',
      color: 'white',
      border: '1px solid var(--volt)',
      boxShadow: '0 0 10px rgba(204,255,0,0.3)',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px'
    }}>
      <span style={{ 
        width: '8px', height: '8px', background: '#ff4444', 
        borderRadius: '50%', animation: 'pulse 1.5s infinite' 
      }} />
      {minutes}:{seconds.toString().padStart(2, '0')}'
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────── */

export default function AnalysisPage() {
  const [file, setFile] = useState<File | null>(null);
  const [homeTeam, setHomeTeam] = useState(SPL_TEAMS[0]);
  const [awayTeam, setAwayTeam] = useState(SPL_TEAMS[1]);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t, lang, isRTL } = useTranslation();

  const API_BASE = API_BASE_URL;

  /* ── File handling ─── */
  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('video/')) {
      setError('Please upload a video file (mp4, avi, etc.)');
      return;
    }
    setFile(f);
    setError('');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  /* ── Upload & Poll ─── */
  const handleUpload = async () => {
    if (!file) return;

    setStatus('uploading');
    setProgress(5);
    setProgressLabel('Uploading video...');
    setError('');

    try {
      // Step 1: upload video directly to Supabase Storage (avoids proxy size limits)
      setProgressLabel('Uploading video to storage...');
      const supabase = createClient();
      const storagePath = `analysis/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(storagePath, file, { upsert: true });
      if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(storagePath);

      // Step 2: send just the URL to the backend (tiny JSON payload, no size limit)
      setProgressLabel('Starting analysis pipeline...');
      const res = await fetch(`${API_BASE}/analysis/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_url: publicUrl, home_team: homeTeam, away_team: awayTeam }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`Upload failed (${res.status}): ${errBody || res.statusText}`);
      }
      const { job_id } = await res.json();
      setJobId(job_id);

      setStatus('processing');
      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(`${API_BASE}/analysis/${job_id}`);
          const job = await pollRes.json();

          setProgress(job.progress || 0);

          const labels: Record<string, string> = {
            tracking: '🔍 Running YOLO video tracking...',
            predicting: '🤖 Generating ML predictions...',
            generating_report: '📝 Building AI report...',
            completed: '✅ Analysis complete!',
            failed: '❌ Analysis failed',
          };
          setProgressLabel(labels[job.status] || 'Processing...');

          if (job.status === 'completed') {
            clearInterval(pollInterval);
            setStatus('completed');
            setResult({
              tracking: job.tracking,
              prediction: job.prediction,
              ai_report: job.ai_report,
            });
          } else if (job.status === 'failed') {
            clearInterval(pollInterval);
            setStatus('error');
            setError(job.error || 'Analysis failed');
          }
        } catch {
          // Polling error — keep trying
        }
      }, 2000);

    } catch (err: any) {
      setStatus('error');
      const msg = err.message || 'Upload failed';
      if (msg === 'Failed to fetch') {
        setError(t('backendError'));
      } else {
        setError(msg);
      }
    }
  };

  const handleDemo = () => {
    setStatus('completed');
    setJobId('demo_job_123');
    
    if (lang === 'ar') {
      setResult({
        tracking: {
          team_ball_control: { team_1_pct: 58.3, team_2_pct: 41.7 },
          player_stats: [
            { id: 7, team: 1, avg_speed_kmh: 9.2, total_distance_m: 1450 },
            { id: 10, team: 1, avg_speed_kmh: 8.7, total_distance_m: 1280 },
            { id: 4, team: 1, avg_speed_kmh: 7.1, total_distance_m: 980 },
            { id: 9, team: 2, avg_speed_kmh: 10.1, total_distance_m: 1590 },
            { id: 11, team: 2, avg_speed_kmh: 8.4, total_distance_m: 1220 },
            { id: 3, team: 2, avg_speed_kmh: 6.9, total_distance_m: 870 },
          ],
          player_count: 6,
        },
        prediction: {
          models: {
            RandomForest: { prediction: 'فوز المستضيف', confidence: 57.0, probabilities: { home_win: 57.0, draw: 24.0, away_win: 19.0 } },
            GradientBoosting: { prediction: 'فوز المستضيف', confidence: 62.3, probabilities: { home_win: 62.3, draw: 21.5, away_win: 16.2 } },
            LightGBM: { prediction: 'فوز المستضيف', confidence: 48.5, probabilities: { home_win: 48.5, draw: 28.0, away_win: 23.5 } },
          },
          ensemble: { prediction: 'فوز المستضيف', confidence: 55.9, probabilities: { home_win: 55.9, draw: 24.5, away_win: 19.6 } },
          home_team: homeTeam,
          away_team: awayTeam,
        },
        ai_report: {
          summary: `في مباراة ممتعة بين ${homeTeam} و ${awayTeam}، أظهر أصحاب الأرض سيطرة متفوقة على الكرة بنسبة 58.3%. تتوقع نماذج التعلم الآلي فوز الفريق المستضيف.`,
          key_insights: [
            `${homeTeam} سيطر على الاستحواذ بنسبة 58.3%`,
            'اللاعب رقم 9 من الفريق الضيف قطع 1590 مترًا مما يشير إلى كثافة عالية',
          ],
          tactical_analysis: `كان أسلوب ${homeTeam} المعتمد على السيطرة هو العامل الحاسم.`,
          prediction_explanation: `الأداء التاريخي القوي لـ ${homeTeam} على أرضه يؤكد التوقعات.`,
          player_spotlight: `كان اللاعب رقم 9 استثنائيًا بسرعة قصوى بلغت 10.1 كم/ساعة.`,
        },
      });
    } else {
      setResult({
        tracking: {
          team_ball_control: { team_1_pct: 58.3, team_2_pct: 41.7 },
          player_stats: [
            { id: 7, team: 1, avg_speed_kmh: 9.2, total_distance_m: 1450 },
            { id: 10, team: 1, avg_speed_kmh: 8.7, total_distance_m: 1280 },
            { id: 4, team: 1, avg_speed_kmh: 7.1, total_distance_m: 980 },
            { id: 9, team: 2, avg_speed_kmh: 10.1, total_distance_m: 1590 },
            { id: 11, team: 2, avg_speed_kmh: 8.4, total_distance_m: 1220 },
            { id: 3, team: 2, avg_speed_kmh: 6.9, total_distance_m: 870 },
          ],
          player_count: 6,
        },
        prediction: {
          models: {
            RandomForest: { prediction: 'Home Win', confidence: 57.0, probabilities: { home_win: 57.0, draw: 24.0, away_win: 19.0 } },
            GradientBoosting: { prediction: 'Home Win', confidence: 62.3, probabilities: { home_win: 62.3, draw: 21.5, away_win: 16.2 } },
            LightGBM: { prediction: 'Home Win', confidence: 48.5, probabilities: { home_win: 48.5, draw: 28.0, away_win: 23.5 } },
          },
          ensemble: { prediction: 'Home Win', confidence: 55.9, probabilities: { home_win: 55.9, draw: 24.5, away_win: 19.6 } },
          home_team: homeTeam,
          away_team: awayTeam,
        },
        ai_report: {
          summary: `In an engaging match between ${homeTeam} and ${awayTeam}, the home side demonstrated superior ball control at 58.3%. the ML models predict a Home Win.`,
          key_insights: [
            `${homeTeam} dominated possession with 58.3% ball control`,
            'Player #9 from away team covered 1590m indicating high intensity',
          ],
          tactical_analysis: `${homeTeam}'s control-oriented style was the deciding factor.`,
          prediction_explanation: `Strong historical performance of ${homeTeam} at home validates the prediction.`,
          player_spotlight: `Player #9 was exceptional with top speeds of 10.1 km/h.`,
        },
      });
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        {/* ─── Header ─── */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            ⚽ {t('analysisTitle').split(' ')[0]} <span style={{ color: 'var(--volt)' }}>{t('analysisTitle').split(' ')[1]}</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
            {t('analysisSubtitle')}
          </p>
        </div>

        {status === 'idle' || status === 'error' ? (
          /* ─── Upload Section ─── */
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'end', marginBottom: '2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('homeTitle')}</label>
                <CustomSelect options={SPL_TEAMS} value={homeTeam} onChange={setHomeTeam} className="w-full" />
              </div>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, paddingBottom: '0.75rem' }}>{t('vs')}</span>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('awayTitle')}</label>
                <CustomSelect options={SPL_TEAMS.filter(t => t !== homeTeam)} value={awayTeam} onChange={setAwayTeam} className="w-full" />
              </div>
            </div>

            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--volt)' : 'var(--border)'}`,
                borderRadius: '16px', padding: '3rem 2rem', textAlign: 'center',
                cursor: 'pointer', background: dragOver ? 'rgba(204,255,0,0.05)' : 'var(--bg-card)',
                marginBottom: '1.5rem', transition: '0.2s all'
              }}
            >
              <input ref={inputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎬</div>
              <p style={{ fontWeight: 600 }}>{file ? file.name : t('dropVideo')}</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{file ? `${(file.size/1024/1024).toFixed(1)}MB` : t('clickToBrowse')}</p>
            </div>

            {error && <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,0,0,0.1)', color: '#ff5555', marginBottom: '1rem' }}>{error}</div>}

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={handleUpload} disabled={!file} style={{ flex: 1, padding: '1rem', borderRadius: '12px', background: file ? 'var(--volt)' : 'var(--border)', color: '#000', fontWeight: 700, cursor: file ? 'pointer' : 'not-allowed' }}>{t('startAnalysis')}</button>
              <button onClick={handleDemo} style={{ padding: '1rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)' }}>{t('viewDemo')}</button>
            </div>
          </div>
        ) : status === 'uploading' || status === 'processing' ? (
          /* ─── Processing ─── */
          <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1.5rem', animation: 'spin 2s linear infinite' }}>⚙️</div>
            <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>{progressLabel}</p>
            <div style={{ width: '100%', height: '8px', background: 'var(--bg-card)', borderRadius: '4px', overflow: 'hidden', marginTop: '1.5rem' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'var(--volt)', transition: 'width 0.5s ease' }} />
            </div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : result ? (
          /* ─── Results Dashboard ─── */
          <div>
            <div style={{ textAlign: isRTL ? 'left' : 'right', marginBottom: '1.5rem' }}>
              <button onClick={() => { setStatus('idle'); setResult(null); setFile(null); }} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)' }}>{t('newAnalysis')}</button>
            </div>

            {/* Live Indicator */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', padding: '1rem 1.5rem', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                <div style={{ background: '#ff3333', color: '#fff', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>{t('liveAnalysis')}</div>
                <MatchClock active={true} />
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <strong>{result.prediction?.home_team} {t('vs')} {result.prediction?.away_team}</strong>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start', direction: isRTL ? 'rtl' : 'ltr' }}>
              {/* Left Column (Data) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {result.ai_report && (
                  <div style={{ padding: '2rem', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(204,255,0,0.08), rgba(204,255,0,0.02))', border: '1px solid rgba(204,255,0,0.2)' }}>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem' }}>{t('aiTacticalReport')}</h2>
                    <p style={{ lineHeight: 1.7, color: 'var(--text-secondary)' }}>{result.ai_report.summary}</p>
                    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {result.ai_report.key_insights.map((insight, i) => (
                        <div key={i} style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', fontSize: '0.9rem' }}>💡 {insight}</div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                  {result.tracking && (
                    <div style={{ padding: '1.5rem', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{t('ballControl')}</h3>
                      <div style={{ display: 'flex', height: '10px', borderRadius: '5px', overflow: 'hidden', marginBottom: '1rem' }}>
                        <div style={{ width: `${result.tracking.team_ball_control.team_1_pct}%`, background: 'var(--volt)' }} />
                        <div style={{ width: `${result.tracking.team_ball_control.team_2_pct}%`, background: '#555' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                        <span>{result.tracking.team_ball_control.team_1_pct}%</span>
                        <span>{result.tracking.team_ball_control.team_2_pct}%</span>
                      </div>
                    </div>
                  )}

                  {result.prediction && (
                    <div style={{ padding: '1.5rem', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{t('mlPrediction')}</h3>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--volt)' }}>{result.prediction.ensemble.prediction}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{result.prediction.ensemble.confidence}% confidence</div>
                    </div>
                  )}
                </div>

                {result.ai_report && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div style={{ padding: '1.5rem', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <h4 style={{ fontSize: '0.8rem', color: 'var(--volt)', marginBottom: '0.5rem' }}>{t('tactics')}</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{result.ai_report.tactical_analysis}</p>
                    </div>
                    <div style={{ padding: '1.5rem', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <h4 style={{ fontSize: '0.8rem', color: 'var(--volt)', marginBottom: '0.5rem' }}>{t('explanation')}</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{result.ai_report.prediction_explanation}</p>
                    </div>
                    <div style={{ padding: '1.5rem', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', gridColumn: 'span 2' }}>
                      <h4 style={{ fontSize: '0.8rem', color: 'var(--volt)', marginBottom: '0.5rem' }}>{t('spotlight')}</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{result.ai_report.player_spotlight}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column (Chat) */}
              <div style={{ position: 'sticky', top: '2rem' }}>
                <CommentSection matchId={jobId || 'demo'} />
                <div style={{ marginTop: '1.5rem', padding: '1.5rem', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
                  <h4 style={{ color: 'var(--volt)', marginBottom: '0.5rem' }}>{t('community')}</h4>
                  <p style={{ color: 'var(--text-secondary)' }}>{t('communityDesc')}</p>
                  <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center' }}>
                    <div style={{ background: '#444', height: '20px', width: '20px', borderRadius: '50%' }} />
                    <span style={{ marginLeft: isRTL ? '0' : '1rem', marginRight: isRTL ? '1rem' : '0', color: 'var(--text-secondary)' }}>+42 {t('othersWatching')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
