import { useState, useEffect } from 'react';
import { Search, Upload, Grid3x3, Crown, Edit, Eye, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Project } from '../types/database';

interface ProjectWithRole extends Project {
  role: 'owner' | 'editor' | 'viewer';
  member_count?: number;
}

interface DashboardProps {
  onNavigateToScore: (projectId?: string) => void;
  onNavigateToRecords: (projectId: string) => void;
}

export default function Dashboard({ onNavigateToScore, onNavigateToRecords }: DashboardProps) {
  const { user } = useAuth();
  const [myProjects, setMyProjects] = useState<ProjectWithRole[]>([]);
  const [sharedProjects, setSharedProjects] = useState<ProjectWithRole[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my' | 'shared'>('my');

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  async function loadProjects() {
    try {
      // Load projects owned by user
      const { data: owned, error: ownedError } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false });

      if (ownedError) throw ownedError;

      // Load projects shared with user
      const { data: memberships, error: memberError } = await supabase
        .from('project_members')
        .select(`
          role,
          projects (*)
        `)
        .eq('user_id', user!.id);

      if (memberError) throw memberError;

      // Get member counts for owned projects
      const ownedWithCounts = await Promise.all(
        (owned || []).map(async (project) => {
          const { count } = await supabase
            .from('project_members')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id);

          return {
            ...project,
            role: 'owner' as const,
            member_count: count || 0,
          };
        })
      );

      const sharedWithRole = (memberships || [])
        .filter((m) => m.projects)
        .map((m) => ({
          ...(m.projects as any),
          role: m.role as 'editor' | 'viewer',
        }));

      setMyProjects(ownedWithCounts);
      setSharedProjects(sharedWithRole);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  }

  function getRoleIcon(role: 'owner' | 'editor' | 'viewer') {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4" />;
      case 'editor':
        return <Edit className="w-4 h-4" />;
      case 'viewer':
        return <Eye className="w-4 h-4" />;
    }
  }

  function getRoleColor(role: 'owner' | 'editor' | 'viewer') {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'editor':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'viewer':
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  }

  const projectsToShow = activeTab === 'my' ? myProjects : sharedProjects;
  const filteredProjects = projectsToShow.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
        <button
          onClick={() => onNavigateToScore()}
          className="flex items-center space-x-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-teal-700 hover:to-emerald-700 transition shadow-lg hover:shadow-xl"
        >
          <Upload className="w-5 h-5" />
          <span className="font-medium">New Project</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="border-b border-slate-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('my')}
              className={`px-6 py-4 font-medium transition border-b-2 ${
                activeTab === 'my'
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-slate-600 hover:text-slate-800'
              }`}
            >
              My Projects ({myProjects.length})
            </button>
            <button
              onClick={() => setActiveTab('shared')}
              className={`px-6 py-4 font-medium transition border-b-2 ${
                activeTab === 'shared'
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-slate-600 hover:text-slate-800'
              }`}
            >
              Shared with Me ({sharedProjects.length})
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            />
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-slate-600 mt-4">Loading projects...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-lg shadow-md">
          <Grid3x3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-600 mb-2">
            {searchQuery
              ? 'No Projects Found'
              : activeTab === 'my'
              ? 'No Projects Yet'
              : 'No Shared Projects'}
          </h2>
          <p className="text-slate-500 mb-6">
            {searchQuery
              ? 'Try a different search term'
              : activeTab === 'my'
              ? 'Get started by creating your first project'
              : 'Projects shared with you will appear here'}
          </p>
          {activeTab === 'my' && !searchQuery && (
            <button
              onClick={() => onNavigateToScore()}
              className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-teal-700 hover:to-emerald-700 transition inline-flex items-center space-x-2"
            >
              <Upload className="w-5 h-5" />
              <span>Create Project</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-lg shadow-md hover:shadow-xl transition p-6 cursor-pointer group"
              onClick={() => onNavigateToRecords(project.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="grid grid-cols-3 gap-1 flex-shrink-0">
                  {[...Array(9)].map((_, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 bg-gradient-to-br from-teal-600 to-emerald-600 rounded-sm group-hover:scale-110 transition"
                    ></div>
                  ))}
                </div>
                <div className="flex items-center space-x-2">
                  {/* Role Badge */}
                  <div
                    className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(
                      project.role
                    )}`}
                  >
                    {getRoleIcon(project.role)}
                    <span className="capitalize">{project.role}</span>
                  </div>
                </div>
              </div>

              <h3 className="font-bold text-slate-800 text-lg mb-1 truncate group-hover:text-teal-700 transition">
                {project.name}
              </h3>
              <p className="text-sm text-slate-500 mb-2">
                Created: {new Date(project.created_at).toLocaleDateString()}
              </p>
              <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                {project.description}
              </p>

              {/* Member count for owned projects */}
              {project.role === 'owner' && project.member_count !== undefined && (
                <div className="flex items-center space-x-1 text-xs text-slate-500 pt-3 border-t border-slate-100">
                  <Users className="w-4 h-4" />
                  <span>
                    {project.member_count === 0
                      ? 'No collaborators'
                      : `${project.member_count} collaborator${
                          project.member_count !== 1 ? 's' : ''
                        }`}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
