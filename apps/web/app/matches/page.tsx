'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import CustomSelect from '../components/CustomSelect';

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
}

interface MatchesResponse {
  matches: Match[];
  total: number;
  page: number;
  total_pages: number;
}

/* ─── SPL Teams (for local data fallback) ─── */
const SPL_SEASONS = [
  '2017-2018', '2016-2017', '2015-2016', '2014-2015', '2013-2014',
  '2012-2013', '2011-2012', '2010-2011', '2009-2010', '2008-2009',
  '2007-2008', '2006-2007', '2005-2006', '2004-2005', '2003-2004',
  '2002-2003', '2001-2002', '2000-2001',
];

/* ─── Sample SPL Data (bundled so page works without API) ─── */
function generateSampleMatches(): Match[] {
  const teams = [
    'Al-Hilal', 'Al-Ittihad FC', 'Al-Ahli', 'Al-Nassr', 'Al-Shabab',
    'Al-Taawon', 'Al-Fateh', 'Al-Raed', 'Al-Feiha', 'Al-Ettifaq',
    'Al-Batin', 'Al-Hazem', 'Damac FC', 'Abha Club',
  ];
  const matches: Match[] = [];
  let id = 1;
  // Generate sample matches for the latest season
  for (let round = 1; round <= 30; round++) {
    for (let i = 0; i < teams.length; i += 2) {
      if (i + 1 >= teams.length) break;
      const homeScore = Math.floor(Math.random() * 4);
      const awayScore = Math.floor(Math.random() * 4);
      matches.push({
        id: `spl-${id++}`,
        round: String(round),
        date: `${2017 + Math.floor(round / 20)}.${String((round % 12) + 1).padStart(2, '0')}.${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        time: round % 2 === 0 ? '19:00' : '20:55',
        home_team: teams[i],
        away_team: teams[i + 1],
        home_score: homeScore,
        away_score: awayScore,
        result: homeScore > awayScore ? 'home_win' : homeScore < awayScore ? 'away_win' : 'draw',
        season: '2017-2018',
        status: round > 25 ? 'scheduled' : 'finished',
      });
    }
  }
  return matches;
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [season, setSeason] = useState('2017-2018');
  const [teamFilter, setTeamFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'upcoming'>('all');

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    loadMatches();
  }, [season, teamFilter, page]);

  async function loadMatches() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page), per_page: '15',
        ...(season && { season }),
        ...(teamFilter && { team: teamFilter }),
      });
      const res = await fetch(`${API_BASE}/matches/spl?${params}`);
      if (res.ok) {
        const data: MatchesResponse = await res.json();
        if (data.matches && data.matches.length > 0) {
          setMatches(data.matches);
          setTotalPages(data.total_pages);
        } else {
          // Empty data from API — trigger fallback
          throw new Error('No data from API');
        }
      } else {
        throw new Error('API unavailable');
      }
    } catch {
      // Fallback to sample data
      const all = generateSampleMatches();
      const filtered = all.filter(m => {
        if (season && m.season !== season) return false;
        if (teamFilter && !m.home_team.toLowerCase().includes(teamFilter.toLowerCase()) && !m.away_team.toLowerCase().includes(teamFilter.toLowerCase())) return false;
        return true;
      });
      setMatches(filtered.slice(0, 15));
      setTotalPages(Math.ceil(filtered.length / 15));
    }
    setLoading(false);
  }

  const upcoming = matches.filter(m => m.status === 'scheduled');
  const finished = matches.filter(m => m.status === 'finished');
  const displayMatches = tab === 'upcoming' ? upcoming : matches;

  const resultBadge = (result: string, status: string) => {
    if (status === 'scheduled') return { bg: 'rgba(100,100,255,0.15)', color: '#8888ff', label: 'Upcoming' };
    if (result === 'home_win') return { bg: 'rgba(204,255,0,0.1)', color: 'var(--volt)', label: 'Home Win' };
    if (result === 'away_win') return { bg: 'rgba(255,100,100,0.1)', color: '#ff6666', label: 'Away Win' };
    return { bg: 'rgba(255,255,255,0.05)', color: '#888', label: 'Draw' };
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem' }}>
        {/* ─── Header ─── */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            🏟️ SPL <span style={{ color: 'var(--volt)' }}>Matches</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
            Saudi Professional League — Historical match data & predictions
          </p>
        </div>

        {/* ─── Filters ─── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
          {/* Tab toggle */}
          <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            {(['all', 'upcoming'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '0.5rem 1.25rem', border: 'none', cursor: 'pointer',
                background: tab === t ? 'var(--volt)' : 'transparent',
                color: tab === t ? '#000' : 'var(--text-secondary)',
                fontWeight: 600, fontSize: '0.85rem', textTransform: 'capitalize',
              }}>
                {t === 'all' ? 'All Matches' : `Upcoming (${upcoming.length})`}
              </button>
            ))}
          </div>

          {/* Season filter */}
          <CustomSelect
            options={['All Seasons', ...SPL_SEASONS]}
            value={season || 'All Seasons'}
            onChange={(val: string) => { 
              const nextSeason = val === 'All Seasons' ? '' : val;
              setSeason(nextSeason); 
              setPage(1); 
            }}
            className="md:w-48"
          />

          {/* Team filter */}
          <input
            type="text"
            placeholder="Filter by team..."
            value={teamFilter}
            onChange={e => { setTeamFilter(e.target.value); setPage(1); }}
            style={{
              padding: '0.5rem 1rem', background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '10px', color: 'var(--text)', fontSize: '0.85rem', flex: 1, minWidth: '150px',
            }}
          />
        </div>

        {/* ─── Match List ─── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
            Loading matches...
          </div>
        ) : displayMatches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
            No matches found for this filter
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {displayMatches.map(m => {
              const badge = resultBadge(m.result, m.status);
              return (
                <Link
                  key={m.id}
                  href={`/matches/${m.id}`}
                  style={{
                    display: 'grid', gridTemplateColumns: '80px 1fr auto 1fr 120px',
                    alignItems: 'center', gap: '1rem',
                    padding: '1rem 1.5rem', borderRadius: '14px',
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    textDecoration: 'none', color: 'inherit',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--volt)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
                >
                  {/* Round */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Round</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{m.round}</div>
                  </div>

                  {/* Home Team */}
                  <div style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.95rem' }}>
                    {m.home_team}
                  </div>

                  {/* Score */}
                  <div style={{ textAlign: 'center', minWidth: '80px' }}>
                    {m.status === 'finished' ? (
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                        <span style={{ color: m.result === 'home_win' ? 'var(--volt)' : 'var(--text)' }}>{m.home_score}</span>
                        <span style={{ color: 'var(--text-secondary)', margin: '0 6px' }}>-</span>
                        <span style={{ color: m.result === 'away_win' ? '#ff6666' : 'var(--text)' }}>{m.away_score}</span>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#8888ff' }}>
                        {m.time || 'TBD'}
                      </div>
                    )}
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{m.date}</div>
                  </div>

                  {/* Away Team */}
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    {m.away_team}
                  </div>

                  {/* Badge */}
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 600, padding: '4px 10px',
                      borderRadius: '6px', background: badge.bg, color: badge.color,
                    }}>
                      {badge.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* ─── Pagination ─── */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              style={{
                padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)',
                background: 'transparent', color: page === 1 ? 'var(--text-secondary)' : 'var(--text)',
                cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '0.85rem',
              }}
            >← Prev</button>

            <span style={{ padding: '0.5rem 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Page {page} of {totalPages}
            </span>

            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              style={{
                padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)',
                background: 'transparent', color: page === totalPages ? 'var(--text-secondary)' : 'var(--text)',
                cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: '0.85rem',
              }}
            >Next →</button>
          </div>
        )}
      </main>
    </div>
  );
}
