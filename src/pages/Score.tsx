import { useState, useEffect } from 'react';
import UploadInterface from '../components/UploadInterface';
import DataPreview from '../components/DataPreview';
import QualityConfiguration from '../components/QualityConfiguration';
import ResultsView from '../components/ResultsView';
import { apiClient } from '../lib/api-client';

type ScoreStep = 'upload' | 'configure' | 'results';

interface ScoreProps {
  projectId?: string | null;
  onDatasetCreated?: (datasetId: string) => void;
}

export default function Score({ projectId, onDatasetCreated }: ScoreProps) {
  const [currentStep, setCurrentStep] = useState<ScoreStep>('upload');
  const [uploadedData, setUploadedData] = useState<any>(null);
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [executionResults, setExecutionResults] = useState<any[] | null>(null);

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
      const datasets = await apiClient.getProjectDatasets(projId) as any[];

      if (datasets && datasets.length > 0) {
        const dataset = datasets[0];
        const rows = await apiClient.previewDataset(dataset.id, 10000) as Record<string, any>[];

        if (rows && rows.length > 0) {
          const headers = Object.keys(rows[0]);
          setUploadedData({ headers, rows });
          setDatasetId(dataset.id);

          // Check if quality results already exist for this dataset
          try {
            const existingResults = await apiClient.getQualityResults(dataset.id) as any[];
            if (existingResults && existingResults.length > 0) {
              setCurrentStep('results');
              return;
            }
          } catch {
            // If check fails, fall through to configure step
          }

          setCurrentStep('configure');
          return;
        }
      }

      setCurrentStep('upload');
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
    onDatasetCreated?.(id);
  }

  function handleExecuteRules(results?: any[]) {
    if (results) {
      setExecutionResults(results);
    }
    setCurrentStep('results');
  }

  function handleClearData() {
    setUploadedData(null);
    setDatasetId(null);
    setExecutionResults(null);
    setCurrentStep('upload');
  }

  return (
    <div>
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
        <ResultsView datasetId={datasetId} initialResults={executionResults} onBack={() => setCurrentStep('configure')} />
      )}
    </div>
  );
}
