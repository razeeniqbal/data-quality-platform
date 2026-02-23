import { useState, useEffect, useRef } from 'react';
import { Search, Crown, Edit, Eye, Users, Trash2, X, FileText, FolderOpen, ImageIcon } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import type { Project } from '../types/database';

interface ProjectWithRole extends Project {
  role: 'owner' | 'editor' | 'viewer';
  member_count?: number;
}

interface DashboardProps {
  onNavigateToRecords: (projectId: string) => void;
}

// Store project icons in localStorage keyed by project id
function saveProjectIcon(projectId: string, dataUrl: string) {
  localStorage.setItem(`project_icon_${projectId}`, dataUrl);
}
function getProjectIcon(projectId: string): string | null {
  return localStorage.getItem(`project_icon_${projectId}`);
}

export default function Dashboard({ onNavigateToRecords }: DashboardProps) {
  const [myProjects, setMyProjects] = useState<ProjectWithRole[]>([]);
  const [sharedProjects, setSharedProjects] = useState<ProjectWithRole[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my' | 'shared'>('my');

  // New Project modal state
  const [showNewProject, setShowNewProject] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const projects = await apiClient.getProjects() as Project[];
      const owned = projects.map((p: Project) => ({ ...p, role: 'owner' as const }));
      setMyProjects(owned);
      setSharedProjects([]);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  }

  function getRoleIcon(role: 'owner' | 'editor' | 'viewer') {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4" />;
      case 'editor': return <Edit className="w-4 h-4" />;
      case 'viewer': return <Eye className="w-4 h-4" />;
    }
  }

  function getRoleColor(role: 'owner' | 'editor' | 'viewer') {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'editor': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'viewer': return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  }

  async function handleDeleteProject(e: React.MouseEvent, projectId: string) {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) return;
    try {
      await apiClient.deleteProject(projectId);
      localStorage.removeItem(`project_icon_${projectId}`);
      setMyProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project.');
    }
  }

  function openNewProject() {
    setProjectName('');
    setProjectDescription('');
    setIconPreview(null);
    setShowNewProject(true);
  }

  function closeNewProject() {
    setShowNewProject(false);
    setProjectName('');
    setProjectDescription('');
    setIconPreview(null);
  }

  function handleIconSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setIconPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleCreateProject() {
    const name = projectName.trim();
    if (!name) {
      alert('Please enter a project name.');
      return;
    }
    setIsCreating(true);
    try {
      const project = await apiClient.createProject(name, projectDescription.trim()) as { id: string };
      if (iconPreview) {
        saveProjectIcon(project.id, iconPreview);
      }
      await loadProjects();
      closeNewProject();
      onNavigateToRecords(project.id);
    } catch (error: unknown) {
      console.error('Error creating project:', error);
      const message = error instanceof Error ? error.message : 'Error creating project. Please try again.';
      alert(message);
    } finally {
      setIsCreating(false);
    }
  }

  const projectsToShow = activeTab === 'my' ? myProjects : sharedProjects;
  const filteredProjects = projectsToShow.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
        <button
          onClick={openNewProject}
          className="flex items-center space-x-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-teal-700 hover:to-emerald-700 transition shadow-lg hover:shadow-xl"
        >
          <FolderOpen className="w-5 h-5" />
          <span className="font-medium">New Project</span>
        </button>
      </div>

      {/* New Project Modal */}
      {showNewProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">New Project</h2>
              <button onClick={closeNewProject} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Project icon upload */}
              <div className="flex flex-col items-center space-y-3">
                <div
                  onClick={() => iconInputRef.current?.click()}
                  className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 hover:border-teal-400 cursor-pointer overflow-hidden flex items-center justify-center bg-slate-50 hover:bg-teal-50 transition group"
                  title="Click to upload project icon"
                >
                  {iconPreview ? (
                    <img src={iconPreview} alt="Project icon" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center space-y-1 text-slate-400 group-hover:text-teal-500 transition">
                      <ImageIcon className="w-8 h-8" />
                      <span className="text-xs font-medium">Upload Icon</span>
                    </div>
                  )}
                </div>
                {iconPreview && (
                  <button
                    onClick={() => { setIconPreview(null); if (iconInputRef.current) iconInputRef.current.value = ''; }}
                    className="text-xs text-slate-400 hover:text-red-500 transition"
                  >
                    Remove icon
                  </button>
                )}
                <input
                  ref={iconInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleIconSelect}
                  className="hidden"
                />
              </div>

              {/* Project name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter project name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  placeholder="Brief description of this project"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-slate-200">
              <button
                onClick={closeNewProject}
                className="px-5 py-2.5 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!projectName.trim() || isCreating}
                className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg hover:from-teal-700 hover:to-emerald-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <FolderOpen className="w-4 h-4" />
                    <span>Create Project</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
          <FolderOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
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
              onClick={openNewProject}
              className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-teal-700 hover:to-emerald-700 transition inline-flex items-center space-x-2"
            >
              <FolderOpen className="w-5 h-5" />
              <span>New Project</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const icon = getProjectIcon(project.id);
            return (
              <div
                key={project.id}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition p-6 cursor-pointer group"
                onClick={() => onNavigateToRecords(project.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  {/* Project icon */}
                  <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center group-hover:scale-105 transition">
                    {icon ? (
                      <img src={icon} alt={project.name} className="w-full h-full object-cover" />
                    ) : (
                      <FolderOpen className="w-7 h-7 text-white" />
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(project.role)}`}>
                      {getRoleIcon(project.role)}
                      <span className="capitalize">{project.role}</span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteProject(e, project.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                      title="Delete project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-slate-800 text-lg mb-1 truncate group-hover:text-teal-700 transition">
                  {project.name}
                </h3>
                {project.description && (
                  <p className="text-sm text-slate-500 mb-1 line-clamp-2">{project.description}</p>
                )}
                <p className="text-xs text-slate-400 mb-3">
                  Created: {new Date(project.created_at).toLocaleDateString()}
                </p>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center space-x-1 text-xs text-teal-600 font-medium">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Open Datasets</span>
                  </div>
                  {project.role === 'owner' && project.member_count !== undefined && project.member_count > 0 && (
                    <div className="flex items-center space-x-1 text-xs text-slate-500">
                      <Users className="w-3.5 h-3.5" />
                      <span>{project.member_count} collaborator{project.member_count !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
