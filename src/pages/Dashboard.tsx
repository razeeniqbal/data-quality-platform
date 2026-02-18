import { useState, useEffect, useRef } from 'react';
import { Search, Upload, Grid3x3, Crown, Edit, Eye, Users, Trash2, X, FileText } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import type { Project } from '../types/database';

interface ProjectWithRole extends Project {
  role: 'owner' | 'editor' | 'viewer';
  member_count?: number;
}

interface DashboardProps {
  onNavigateToRecords: (projectId: string) => void;
}

export default function Dashboard({ onNavigateToRecords }: DashboardProps) {
  const [myProjects, setMyProjects] = useState<ProjectWithRole[]>([]);
  const [sharedProjects, setSharedProjects] = useState<ProjectWithRole[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my' | 'shared'>('my');

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [datasetTitle, setDatasetTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setMyProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project.');
    }
  }

  function openUploadModal() {
    setDatasetTitle('');
    setSelectedFile(null);
    setShowUploadModal(true);
  }

  function closeUploadModal() {
    setShowUploadModal(false);
    setDatasetTitle('');
    setSelectedFile(null);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!target.contains(relatedTarget)) setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find((f) => f.name.toLowerCase().endsWith('.csv'));
    if (csvFile) {
      setSelectedFile(csvFile);
    } else {
      alert('Please upload a CSV file');
    }
  }

  async function handleUploadSubmit() {
    if (!selectedFile) {
      alert('Please select a CSV file first.');
      return;
    }

    setIsUploading(true);
    try {
      const projectName = datasetTitle.trim() || selectedFile.name.replace(/\.csv$/i, '');
      const projectData = await apiClient.createProject(projectName, `Imported from ${selectedFile.name}`) as { id: string };
      await apiClient.uploadDataset(projectData.id, selectedFile);

      // Reload projects list
      await loadProjects();
      closeUploadModal();
      // Navigate directly to Data Records
      onNavigateToRecords(projectData.id);
    } catch (error: unknown) {
      console.error('Error uploading dataset:', error);
      const message = error instanceof Error ? error.message : 'Error uploading dataset. Please try again.';
      alert(message);
    } finally {
      setIsUploading(false);
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
          onClick={openUploadModal}
          className="flex items-center space-x-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-teal-700 hover:to-emerald-700 transition shadow-lg hover:shadow-xl"
        >
          <Upload className="w-5 h-5" />
          <span className="font-medium">New Dataset</span>
        </button>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">New Dataset</h2>
              <button
                onClick={closeUploadModal}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Title input */}
              <div>
                <label htmlFor="dataset-title" className="block text-sm font-medium text-slate-700 mb-2">
                  Dataset Title
                </label>
                <input
                  id="dataset-title"
                  type="text"
                  placeholder="Enter dataset title (optional, defaults to filename)"
                  value={datasetTitle}
                  onChange={(e) => setDatasetTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                  autoFocus
                />
              </div>

              {/* File drop zone */}
              <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition ${
                  isDragging
                    ? 'border-teal-500 bg-teal-50'
                    : selectedFile
                    ? 'border-teal-400 bg-teal-50'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                {selectedFile ? (
                  <div className="flex flex-col items-center space-y-2">
                    <FileText className="w-10 h-10 text-teal-600" />
                    <p className="font-medium text-slate-800 w-full truncate text-center px-2" title={selectedFile.name}>{selectedFile.name}</p>
                    <p className="text-sm text-slate-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB — click to change
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2">
                    <Upload className="w-10 h-10 text-slate-400" />
                    <p className="text-slate-600 font-medium">
                      <span className="text-teal-600 font-bold">Browse</span> or drag & drop
                    </p>
                    <p className="text-sm text-slate-400">CSV files only</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-slate-200">
              <button
                onClick={closeUploadModal}
                className="px-5 py-2.5 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadSubmit}
                disabled={!selectedFile || isUploading}
                className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg hover:from-teal-700 hover:to-emerald-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Upload Dataset</span>
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
              My Datasets ({myProjects.length})
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
              placeholder="Search datasets"
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
          <p className="text-slate-600 mt-4">Loading datasets...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-lg shadow-md">
          <Grid3x3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-600 mb-2">
            {searchQuery
              ? 'No Datasets Found'
              : activeTab === 'my'
              ? 'No Datasets Yet'
              : 'No Shared Datasets'}
          </h2>
          <p className="text-slate-500 mb-6">
            {searchQuery
              ? 'Try a different search term'
              : activeTab === 'my'
              ? 'Get started by uploading your first dataset'
              : 'Datasets shared with you will appear here'}
          </p>
          {activeTab === 'my' && !searchQuery && (
            <button
              onClick={openUploadModal}
              className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-teal-700 hover:to-emerald-700 transition inline-flex items-center space-x-2"
            >
              <Upload className="w-5 h-5" />
              <span>Upload Dataset</span>
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
                  <div
                    className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(project.role)}`}
                  >
                    {getRoleIcon(project.role)}
                    <span className="capitalize">{project.role}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteProject(e, project.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                    title="Delete dataset"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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

              {project.role === 'owner' && project.member_count !== undefined && (
                <div className="flex items-center space-x-1 text-xs text-slate-500 pt-3 border-t border-slate-100">
                  <Users className="w-4 h-4" />
                  <span>
                    {project.member_count === 0
                      ? 'No collaborators'
                      : `${project.member_count} collaborator${project.member_count !== 1 ? 's' : ''}`}
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
