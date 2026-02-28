import { useState, useEffect, useRef, useCallback } from 'react';
import UploadInterface from '../components/UploadInterface';
import DataPreview from '../components/DataPreview';
import QualityConfiguration from '../components/QualityConfiguration';
import ResultsView from '../components/ResultsView';
import { apiClient } from '../lib/api-client';
import type { QualityCheckResult } from '../components/QualityConfiguration';
import type { QualitySnapshot } from '../types/database';
import { useUser } from '../contexts/UserContext';
import { FileText, ChevronDown, BookMarked, Trash2, BarChart2, Eye } from 'lucide-react';

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
  /** viewer role — can only see snapshots, not run checks */
  isViewer?: boolean;
}

export default function Score({ projectId, onDatasetCreated, isViewer = false }: ScoreProps) {
  const { user } = useUser();
  const [currentStep, setCurrentStep] = useState<ScoreStep>('upload');
  const [uploadedData, setUploadedData] = useState<UploadedData | null>(null);
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [executionResults, setExecutionResults] = useState<QualityCheckResult[] | null>(null);
  const loadingRef = useRef<string | null>(null);

  // Dataset list + selector
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);

  // Snapshots
  const [snapshots, setSnapshots] = useState<QualitySnapshot[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [deletingSnapshotId, setDeletingSnapshotId] = useState<string | null>(null);
  // Snapshot being viewed (read-only results mode)
  const [viewingSnapshot, setViewingSnapshot] = useState<QualitySnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);

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

  // When selected dataset changes, load its data
  useEffect(() => {
    if (!selectedDatasetId) return;
    loadingRef.current = selectedDatasetId;
    if (!isViewer) {
      loadDatasetForScoring(selectedDatasetId);
    } else {
      // Viewers only need the datasetId set so snapshots load
      setDatasetId(selectedDatasetId);
      setLoading(false);
    }
  }, [selectedDatasetId, isViewer]);

  // Load snapshots whenever the active dataset changes
  const loadSnapshots = useCallback(async (dsId: string) => {
    setSnapshotsLoading(true);
    try {
      const data = await apiClient.getQualitySnapshots(dsId) as QualitySnapshot[];
      setSnapshots(data || []);
    } catch (err) {
      console.error('Error loading snapshots:', err);
    } finally {
      setSnapshotsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (datasetId) loadSnapshots(datasetId);
    else setSnapshots([]);
  }, [datasetId, loadSnapshots]);

  async function loadDatasets(projId: string) {
    setLoading(true);
    try {
      const ds = await apiClient.getProjectDatasets(projId) as Dataset[];
      setDatasets(ds || []);
      if (ds && ds.length > 0) {
        setSelectedDatasetId(ds[0].id);
        if (isViewer) setLoading(false);
      } else {
        setLoading(false);
        if (!isViewer) setCurrentStep('upload');
      }
    } catch (error) {
      console.error('Error loading datasets:', error);
      setLoading(false);
      if (!isViewer) setCurrentStep('upload');
    }
  }

  async function loadDatasetForScoring(dsId: string) {
    setLoading(true);
    setUploadedData(null);
    setDatasetId(null);
    setExecutionResults(null);
    setViewingSnapshot(null);
    try {
      const rows = await apiClient.previewDataset(dsId, 10000) as Record<string, string>[];

      if (loadingRef.current !== dsId) return;

      if (rows && rows.length > 0) {
        const headers = Object.keys(rows[0]);
        setUploadedData({ headers, rows });
        setDatasetId(dsId);

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
    setViewingSnapshot(null);
    if (!isViewer) {
      setCurrentStep('configure');
      setExecutionResults(null);
    }
  }

  function handleDataUploaded(data: UploadedData, id: string) {
    setUploadedData(data);
    setDatasetId(id);
    setCurrentStep('configure');
    onDatasetCreated?.(id);
    if (projectId) loadDatasets(projectId);
  }

  function handleExecuteRules(results?: QualityCheckResult[]) {
    if (results) setExecutionResults(results);
    setCurrentStep('results');
  }

  async function handleDeleteSnapshot(snapshotId: string) {
    if (!window.confirm('Delete this snapshot? This cannot be undone.')) return;
    setDeletingSnapshotId(snapshotId);
    try {
      await apiClient.deleteQualitySnapshot(snapshotId);
      setSnapshots(prev => prev.filter(s => s.id !== snapshotId));
      if (viewingSnapshot?.id === snapshotId) setViewingSnapshot(null);
    } catch (err) {
      console.error('Failed to delete snapshot:', err);
      alert('Failed to delete snapshot. Please try again.');
    } finally {
      setDeletingSnapshotId(null);
    }
  }

  async function handleViewSnapshot(snap: QualitySnapshot) {
    setSnapshotLoading(true);
    try {
      const full = await apiClient.getQualitySnapshot(snap.id) as QualitySnapshot;
      setViewingSnapshot(full);
    } catch (err) {
      console.error('Failed to load snapshot:', err);
      alert('Failed to load snapshot details.');
    } finally {
      setSnapshotLoading(false);
    }
  }

  const selectedDataset = datasets.find(d => d.id === selectedDatasetId);

  // Score colour helper
  function scoreColor(s: number) {
    if (s === 100) return 'text-green-600';
    if (s >= 75) return 'text-yellow-600';
    if (s >= 50) return 'text-orange-600';
    return 'text-red-600';
  }

  return (
    <div className="space-y-4">
      {/* Dataset selector + snapshot list */}
      {projectId && datasets.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Dropdown row */}
          <div className="px-6 py-4 border-b border-slate-100">
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

          {/* Published Snapshots — inside the same card, below dropdown */}
          <div>
            <div className="px-6 py-3 flex items-center gap-2 border-b border-slate-100 bg-slate-50">
              <BookMarked className="w-4 h-4 text-teal-600" />
              <span className="text-sm font-semibold text-slate-700">Published Snapshots</span>
              {snapshots.length > 0 && (
                <span className="text-xs bg-teal-100 text-teal-700 font-semibold px-2 py-0.5 rounded-full">
                  {snapshots.length}
                </span>
              )}
            </div>

            {snapshotsLoading ? (
              <div className="px-6 py-6 text-center text-slate-400 text-sm">
                <div className="animate-spin w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full mx-auto mb-2" />
                Loading snapshots...
              </div>
            ) : snapshots.length === 0 ? (
              <div className="px-6 py-6 text-center text-slate-400">
                <p className="text-sm font-medium">No published snapshots yet</p>
                {!isViewer && (
                  <p className="text-xs mt-1">Run a quality check and click Publish to save a snapshot.</p>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {snapshots.map((snap) => {
                  const date = new Date(snap.published_at).toLocaleString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  });
                  const isViewing = viewingSnapshot?.id === snap.id;
                  return (
                    <li
                      key={snap.id}
                      className={`flex items-center gap-3 px-6 py-3.5 transition group cursor-pointer ${isViewing ? 'bg-teal-50' : 'hover:bg-slate-50'}`}
                      onClick={() => handleViewSnapshot(snap)}
                    >
                      <BarChart2 className={`w-4 h-4 flex-shrink-0 ${isViewing ? 'text-teal-600' : 'text-teal-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isViewing ? 'text-teal-700' : 'text-slate-800'}`}>{snap.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {date}{snap.published_by ? ` · by ${snap.published_by}` : ''}
                        </p>
                      </div>
                      <span className={`text-sm font-bold flex-shrink-0 ${scoreColor(snap.overall_score)}`}>
                        {snap.overall_score.toFixed(1)}%
                      </span>
                      <Eye className={`w-4 h-4 flex-shrink-0 transition ${isViewing ? 'text-teal-600' : 'text-slate-300 group-hover:text-teal-500'}`} />
                      {!isViewer && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteSnapshot(snap.id); }}
                          disabled={deletingSnapshotId === snap.id}
                          className="flex-shrink-0 p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition opacity-0 group-hover:opacity-100 disabled:opacity-50"
                          title="Delete snapshot"
                        >
                          {deletingSnapshotId === snap.id
                            ? <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />
                          }
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Snapshot viewer — read-only ResultsView from a saved snapshot */}
      {viewingSnapshot && (
        <ResultsView
          datasetId={viewingSnapshot.dataset_id}
          datasetName={selectedDataset?.name}
          initialResults={viewingSnapshot.results as unknown as QualityCheckResult[]}
          onBack={() => setViewingSnapshot(null)}
          readOnly
        />
      )}

      {/* Snapshot loading spinner */}
      {snapshotLoading && (
        <div className="text-center py-10 bg-white rounded-lg shadow-md">
          <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading snapshot...</p>
        </div>
      )}

      {/* Step content — hidden for viewers and when viewing a snapshot */}
      {!isViewer && !viewingSnapshot && (
        <>
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
              datasetName={selectedDataset?.name}
              publishedBy={user?.displayName}
              initialResults={executionResults}
              onBack={() => setCurrentStep('configure')}
              onPublished={() => loadSnapshots(datasetId)}
            />
          )}
        </>
      )}
    </div>
  );
}
