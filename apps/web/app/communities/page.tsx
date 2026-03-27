'use client';

export const dynamic = 'force-dynamic';


import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslation, SPL_TEAMS } from "../i18n";
import CustomSelect from "../components/CustomSelect";
import { createClient } from "../../lib/supabase";

export default function CommunitiesPage() {
  const { t, dir } = useTranslation();
  const supabase = createClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("All");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state for creation
  const [newName, setNewName] = useState("");
  const [newTeam, setNewTeam] = useState(SPL_TEAMS[0]);
  const [newBio, setNewBio] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const fetchCommunities = async () => {
    setLoading(true);
    let query = supabase.from('communities').select('*');
    
    if (selectedTeam !== "All") {
      query = query.eq('team', selectedTeam);
    }
    
    if (searchQuery) {
      query = query.ilike('name', `%${searchQuery}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (!error) {
      setCommunities(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCommunities();
  }, [selectedTeam, searchQuery]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error("Not logged in");
      setIsCreating(false);
      return;
    }

    const { data, error } = await supabase
      .from('communities')
      .insert({
        name: newName,
        team: newTeam,
        bio: newBio,
        creator_id: session.user.id,
        id: Math.random().toString(36).substring(2, 10) // Simple unique ID
      })
      .select()
      .single();

    if (!error && data) {
      // Add creator as member
      await supabase.from('community_members').insert({
        community_id: data.id,
        user_id: session.user.id,
        role: 'admin'
      });

      setIsCreateModalOpen(false);
      setNewName("");
      setNewBio("");
      fetchCommunities();
    } else if (error) {
      console.error("Creation failed:", error.message);
    }
    setIsCreating(false);
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 lg:px-12" dir={dir}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black mb-2">{t('communities')}</h1>
            <p className="text-[var(--text-secondary)]">Join collective fan groups and climb the ranks together</p>
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary !rounded-2xl !py-3 px-8 flex items-center gap-2 group"
          >
            <span className="text-xl group-hover:rotate-90 transition-transform">+</span> {t('createCommunity')}
          </button>
        </div>

        {/* Filters */}
        <div className="glass-strong p-4 rounded-3xl mb-8 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">🔍</span>
            <input 
              type="text" 
              placeholder="Search communities..." 
              className="w-full bg-transparent border-none outline-none pl-12 pr-4 py-2"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="w-full md:w-64">
            <CustomSelect
              options={["All", ...SPL_TEAMS]}
              value={selectedTeam}
              onChange={setSelectedTeam}
              className="w-full"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--volt)]"></div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {communities.map((community) => (
              <Link 
                href={`/communities/${community.id}`} 
                key={community.id}
                className="glass hover-card p-6 rounded-3xl group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--volt-dim)] border border-[var(--volt-border)] flex items-center justify-center text-xl">
                    ⚽
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-strong)' }}>
                    {community.team}
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-[var(--volt)] transition-colors">{community.name}</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-6 line-clamp-2">
                  {community.bio || community.description || "A community for passionate football fans."}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                  <div className="flex -space-x-2">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-[var(--bg-card)] bg-gray-600" />
                    ))}
                    <div className="w-8 h-8 rounded-full border-2 border-[var(--bg-card)] bg-[var(--bg-secondary)] flex items-center justify-center text-[10px] font-bold">
                      +{community.member_count || 0}
                    </div>
                  </div>
                  <button className="text-[var(--volt)] text-sm font-bold flex items-center gap-1">
                    Join <span className="text-xs">→</span>
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="glass p-8 w-full max-w-lg rounded-3xl animate-scale-in">
            <h2 className="text-2xl font-bold mb-6">{t('createCommunity')}</h2>
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Community Name" 
                className="input-field !rounded-2xl" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <CustomSelect
                options={SPL_TEAMS}
                value={newTeam}
                onChange={setNewTeam}
                className="w-full"
              />
              <textarea 
                placeholder="Description" 
                className="input-field !rounded-2xl min-h-[100px]" 
                value={newBio}
                onChange={(e) => setNewBio(e.target.value)}
              />
              <div className="flex gap-4 pt-4">
                <button onClick={() => setIsCreateModalOpen(false)} className="btn-secondary flex-1 !rounded-2xl">Cancel</button>
                <button 
                  onClick={handleCreate} 
                  disabled={isCreating}
                  className="btn-primary flex-1 !rounded-2xl flex items-center justify-center gap-2"
                >
                  {isCreating ? <span className="animate-spin text-lg">⏳</span> : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
