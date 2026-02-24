import { useState, useEffect, useRef } from 'react';
import UploadInterface from '../components/UploadInterface';
import DataPreview from '../components/DataPreview';
import QualityConfiguration from '../components/QualityConfiguration';
import ResultsView from '../components/ResultsView';
import { apiClient } from '../lib/api-client';
import type { QualityCheckResult } from '../components/QualityConfiguration';
import { FileText, ChevronDown } from 'lucide-react';

type ScoreStep = 'upload' | 'configure' | 'results';

interface UploadedData {
  headers: string[];
  rows: Record<string, string>[];
}

interface Dataset {
  id: string;
  name: string;
  row_count: number;
  column_count: number;
}

interface ScoreProps {
  projectId?: string | null;
  onDatasetCreated?: (datasetId: string) => void;
}

export default function Score({ projectId, onDatasetCreated }: ScoreProps) {
  const [currentStep, setCurrentStep] = useState<ScoreStep>('upload');
  const [uploadedData, setUploadedData] = useState<UploadedData | null>(null);
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [executionResults, setExecutionResults] = useState<QualityCheckResult[] | null>(null);
  const loadingRef = useRef<string | null>(null);

  // Dataset list + selector
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      loadDatasets(projectId);
    } else {
      setDatasets([]);
      setSelectedDatasetId(null);
      setCurrentStep('upload');
      setUploadedData(null);
      setDatasetId(null);
    }
  }, [projectId]);

  // When selected dataset changes, load its data (track which load is current to prevent races)
  useEffect(() => {
    if (!selectedDatasetId) return;
    loadingRef.current = selectedDatasetId;
    loadDatasetForScoring(selectedDatasetId);
  }, [selectedDatasetId]);

  async function loadDatasets(projId: string) {
    setLoading(true);
    try {
      const ds = await apiClient.getProjectDatasets(projId) as Dataset[];
      setDatasets(ds || []);
      if (ds && ds.length > 0) {
        setSelectedDatasetId(ds[0].id);
      } else {
        setLoading(false);
        setCurrentStep('upload');
      }
    } catch (error) {
      console.error('Error loading datasets:', error);
      setLoading(false);
      setCurrentStep('upload');
    }
  }

  async function loadDatasetForScoring(dsId: string) {
    setLoading(true);
    setUploadedData(null);
    setDatasetId(null);
    setExecutionResults(null);
    try {
      const rows = await apiClient.previewDataset(dsId, 10000) as Record<string, string>[];

      // Ignore stale responses if the user switched datasets
      if (loadingRef.current !== dsId) return;

      if (rows && rows.length > 0) {
        const headers = Object.keys(rows[0]);
        setUploadedData({ headers, rows });
        setDatasetId(dsId);

        // Check if quality results already exist
        try {
          const existingResults = await apiClient.getQualityResults(dsId) as QualityCheckResult[];
          if (existingResults && existingResults.length > 0) {
            setCurrentStep('results');
            return;
          }
        } catch {
          // fall through to configure
        }

        setCurrentStep('configure');
      } else {
        setCurrentStep('upload');
      }
    } catch (error) {
      console.error('Error loading dataset for scoring:', error);
      setCurrentStep('upload');
    } finally {
      if (loadingRef.current === dsId) {
        setLoading(false);
      }
    }
  }

  async function handleDatasetChange(dsId: string) {
    setSelectedDatasetId(dsId);
    setCurrentStep('configure');
    setExecutionResults(null);
  }

  function handleDataUploaded(data: UploadedData, id: string) {
    setUploadedData(data);
    setDatasetId(id);
    setCurrentStep('configure');
    onDatasetCreated?.(id);
    // Refresh dataset list
    if (projectId) loadDatasets(projectId);
  }

  function handleExecuteRules(results?: QualityCheckResult[]) {
    if (results) setExecutionResults(results);
    setCurrentStep('results');
  }

  const selectedDataset = datasets.find(d => d.id === selectedDatasetId);

  return (
    <div className="space-y-4">
      {/* Dataset selector — shown only when there are datasets */}
      {projectId && datasets.length > 0 && (
        <div className="bg-white rounded-lg shadow-md px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 flex-shrink-0">
              <FileText className="w-4 h-4 text-teal-600" />
              <span>Dataset</span>
            </div>
            <div className="relative flex-1 max-w-sm">
              <select
                value={selectedDatasetId ?? ''}
                onChange={(e) => handleDatasetChange(e.target.value)}
                className="w-full appearance-none pl-4 pr-9 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none bg-white text-slate-700 cursor-pointer"
              >
                {datasets.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name} ({ds.row_count.toLocaleString()} rows)
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            {selectedDataset && (
              <span className="text-xs text-slate-400">
                {selectedDataset.column_count} columns
              </span>
            )}
          </div>
        </div>
      )}

      {/* Step content */}
      {loading && (
        <div className="text-center py-20 bg-white rounded-lg shadow-md">
          <div className="animate-spin w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading dataset...</p>
        </div>
      )}

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
        <ResultsView
          datasetId={datasetId}
          initialResults={executionResults}
          onBack={() => setCurrentStep('configure')}
        />
      )}
    </div>
  );
}
