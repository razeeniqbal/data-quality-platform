import { useState, useEffect } from 'react';
import UploadInterface from '../components/UploadInterface';
import DataPreview from '../components/DataPreview';
import QualityConfiguration from '../components/QualityConfiguration';
import ResultsView from '../components/ResultsView';
import { apiClient } from '../lib/api-client';

type ScoreStep = 'upload' | 'configure' | 'results';

interface ScoreProps {
  projectId?: string | null;
}

export default function Score({ projectId }: ScoreProps) {
  const [currentStep, setCurrentStep] = useState<ScoreStep>('upload');
  const [uploadedData, setUploadedData] = useState<any>(null);
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadProjectData(projectId);
    } else {
      setCurrentStep('upload');
      setUploadedData(null);
      setDatasetId(null);
    }
  }, [projectId]);

  async function loadProjectData(projId: string) {
    setLoading(true);
    try {
      // Load project - datasets would be fetched from backend when ready
      const project = await apiClient.getProject(projId) as any;

      if (project) {
        // For now, start with upload step since we need to implement dataset fetching
        setCurrentStep('upload');
      }
    } catch (error) {
      console.error('Error loading project data:', error);
      setCurrentStep('upload');
    } finally {
      setLoading(false);
    }
  }

  function handleDataUploaded(data: any, id: string) {
    setUploadedData(data);
    setDatasetId(id);
    setCurrentStep('configure');
  }

  function handleExecuteRules() {
    setCurrentStep('results');
  }

  function handleClearData() {
    setUploadedData(null);
    setDatasetId(null);
    setCurrentStep('upload');
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Score</h1>
        {currentStep !== 'upload' && !loading && (
          <button
            onClick={handleClearData}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
          >
            New Upload
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 bg-white rounded-lg shadow-md">
          <div className="animate-spin w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading project data...</p>
        </div>
      ) : null}

      {!loading && currentStep === 'upload' && (
        <UploadInterface onDataUploaded={handleDataUploaded} />
      )}

      {!loading && currentStep === 'configure' && uploadedData && datasetId && (
        <div className="space-y-6">
          <DataPreview data={uploadedData} />
          <QualityConfiguration
            data={uploadedData}
            datasetId={datasetId}
            onExecute={handleExecuteRules}
          />
        </div>
      )}

      {!loading && currentStep === 'results' && datasetId && (
        <ResultsView datasetId={datasetId} onBack={() => setCurrentStep('configure')} />
      )}
    </div>
  );
}
