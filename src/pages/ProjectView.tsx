import { useState, useEffect } from 'react';
import { ArrowLeft, Table2, Target } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import Records from './Records';
import Score from './Score';

type ProjectTab = 'records' | 'score';

interface ProjectViewProps {
  projectId: string;
  initialTab?: 'records' | 'score';
  onBack: () => void;
}

export default function ProjectView({ projectId, initialTab = 'records', onBack }: ProjectViewProps) {
  const isNewProject = projectId === 'new';
  const [activeTab, setActiveTab] = useState<ProjectTab>(initialTab);
  const [projectName, setProjectName] = useState(isNewProject ? 'New Project' : '');
  const [actualProjectId, setActualProjectId] = useState<string | null>(isNewProject ? null : projectId);
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isNewProject);

  useEffect(() => {
    if (!isNewProject) {
      loadProject();
    }
  }, [projectId]);

  async function loadProject() {
    setLoading(true);
    try {
      const project = await apiClient.getProject(projectId) as any;
      setProjectName(project?.name || '');

      const datasets = await apiClient.getProjectDatasets(projectId) as any[];
      if (datasets && datasets.length > 0) {
        setDatasetId(datasets[0].id);
      }
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleDatasetCreated(id: string) {
    setDatasetId(id);
  }

  if (loading) {
    return (
      <div className="text-center py-20 bg-white rounded-lg shadow-md">
        <div className="animate-spin w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-600 font-medium">Loading project...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-200 rounded-lg transition"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-6 h-6 text-slate-700" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">{projectName}</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-slate-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('records')}
              className={`flex items-center space-x-2 px-6 py-4 font-medium transition border-b-2 ${
                activeTab === 'records'
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-slate-600 hover:text-slate-800'
              }`}
            >
              <Table2 className="w-4 h-4" />
              <span>Data Records</span>
            </button>
            <button
              onClick={() => setActiveTab('score')}
              className={`flex items-center space-x-2 px-6 py-4 font-medium transition border-b-2 ${
                activeTab === 'score'
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-slate-600 hover:text-slate-800'
              }`}
            >
              <Target className="w-4 h-4" />
              <span>Quality Score</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'records' && (
        <Records projectId={actualProjectId || ''} datasetId={datasetId} />
      )}
      {activeTab === 'score' && (
        <Score projectId={actualProjectId} onDatasetCreated={handleDatasetCreated} />
      )}
    </div>
  );
}
