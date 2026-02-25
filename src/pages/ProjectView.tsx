import { useState, useEffect } from 'react';
import { ArrowLeft, Table2, Target, FileText, Plus, Upload, X, Search, ChevronDown, ChevronRight, FilterX, Info, Pencil, Trash2, Settings } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import { useUser } from '../contexts/UserContext';
import Records from './Records';
import Score from './Score';
import ProjectSettingsPanel from '../components/ProjectSettingsPanel';
import type { ProjectUserRole } from '../types/database';

type ProjectTab = 'records' | 'score';

interface Dataset {
  id: string;
  name: string;
  description: string | null;
  row_count: number;
  column_count: number;
  created_at: string;
}

// columnValueFilters: { [columnName]: Set of selected values (empty Set = all values allowed) }
export type ColumnValueFilters = Record<string, Set<string>>;

interface ProjectViewProps {
  projectId: string;
  initialTab?: 'records' | 'score';
  onBack: () => void;
}

export default function ProjectView({ projectId, initialTab = 'records', onBack }: ProjectViewProps) {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<ProjectTab>(initialTab);
  const [projectName, setProjectName] = useState('');
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<ProjectUserRole>('viewer');

  // Sidebar section expand states
  const [datasetsExpanded, setDatasetsExpanded] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  // Column data for sidebar filters
  // allColumns: ordered list of column names
  // columnUniqueValues: { col -> sorted unique values }
  // columnValueFilters: { col -> Set of checked values } — empty set means "all selected"
  const [allColumns, setAllColumns] = useState<string[]>([]);
  const [columnUniqueValues, setColumnUniqueValues] = useState<Record<string, string[]>>({});
  const [columnValueFilters, setColumnValueFilters] = useState<ColumnValueFilters>({});
  const [columnSearch, setColumnSearch] = useState('');
  // Which columns are expanded in the accordion
  const [expandedColumns, setExpandedColumns] = useState<Set<string>>(new Set());

  // Add dataset modal
  const [showAddDataset, setShowAddDataset] = useState(false);
  const [addFile, setAddFile] = useState<File | null>(null);
  const [addDatasetName, setAddDatasetName] = useState('');
  const [addDatasetDescription, setAddDatasetDescription] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Dataset detail modal
  const [detailDataset, setDetailDataset] = useState<Dataset | null>(null);
  const [detailName, setDetailName] = useState('');
  const [detailDescription, setDetailDescription] = useState('');
  const [isSavingDetail, setIsSavingDetail] = useState(false);
  const [detailEditMode, setDetailEditMode] = useState(false);

  // (inline rename removed — now handled via detail modal)

  // Delete dataset
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Project settings panel
  const [showSettings, setShowSettings] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [projectDescription, setProjectDescription] = useState('');
  const [projectOwnerName, setProjectOwnerName] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadProject(); }, [projectId]);

  async function loadProject() {
    setLoading(true);
    try {
      const project = await apiClient.getProject(projectId) as { name: string; description: string; is_public: boolean; owner_name: string | null };
      setProjectName(project?.name || '');
      setProjectDescription(project?.description || '');
      setIsPublic(project?.is_public ?? false);
      setProjectOwnerName(project?.owner_name ?? null);

      // Determine current user's role for this project
      if (user) {
        if (project?.owner_name === null) {
          // Legacy project with no owner recorded — treat current user as owner
          setCurrentUserRole('owner');
        } else if (project?.owner_name === user.displayName) {
          setCurrentUserRole('owner');
        } else {
          const members = await apiClient.getProjectMembers(projectId) as Array<{ display_name: string | null; role: 'owner' | 'editor' | 'viewer' }>;
          const myMembership = members.find(m => m.display_name === user.displayName);
          if (myMembership) {
            // project_members role='owner' means co-owner
            setCurrentUserRole(myMembership.role === 'owner' ? 'co-owner' : myMembership.role);
          } else {
            setCurrentUserRole('viewer');
          }
        }
      }

      const ds = await apiClient.getProjectDatasets(projectId) as Dataset[];
      setDatasets(ds || []);
      if (ds && ds.length > 0) setSelectedDatasetId(ds[0].id);
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setLoading(false);
    }
  }

  // Called by Records when rows are loaded — compute unique values per column
  function handleDataLoaded(rows: Record<string, string>[], cols: string[]) {
    setAllColumns(cols);
    setColumnValueFilters({});
    setExpandedColumns(new Set());
    setColumnSearch('');

    const uniq: Record<string, string[]> = {};
    for (const col of cols) {
      const vals = Array.from(new Set(rows.map(r => String(r[col] ?? '')))).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
      );
      uniq[col] = vals;
    }
    setColumnUniqueValues(uniq);
  }

  // Reset when dataset changes
  useEffect(() => {
    setAllColumns([]);
    setColumnUniqueValues({});
    setColumnValueFilters({});
    setExpandedColumns(new Set());
    setColumnSearch('');
  }, [selectedDatasetId]);

  function toggleColumnExpand(col: string) {
    setExpandedColumns(prev => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col); else next.add(col);
      return next;
    });
  }

  function toggleColumnValue(col: string, val: string) {
    setColumnValueFilters(prev => {
      const currentSet = prev[col] ? new Set(prev[col]) : new Set(columnUniqueValues[col] ?? []);
      if (currentSet.has(val)) {
        currentSet.delete(val);
      } else {
        currentSet.add(val);
      }
      // If all values are selected, remove the key (means "no filter / show all")
      const all = columnUniqueValues[col] ?? [];
      if (currentSet.size === all.length) {
        const next = { ...prev };
        delete next[col];
        return next;
      }
      return { ...prev, [col]: currentSet };
    });
  }

  function clearColumnFilter(col: string) {
    setColumnValueFilters(prev => {
      const next = { ...prev };
      delete next[col];
      return next;
    });
  }

  function clearAllFilters() {
    setColumnValueFilters({});
  }

  const activeFilterCount = Object.keys(columnValueFilters).length;
  const filteredColumnList = allColumns.filter(c =>
    c.toLowerCase().includes(columnSearch.toLowerCase())
  );

  // Add dataset modal handlers
  async function handleAddDataset() {
    if (!addFile || !addDatasetName.trim()) return;
    setIsAdding(true);
    try {
      const ds = await apiClient.uploadDataset(projectId, addFile, addDatasetName.trim(), addDatasetDescription.trim() || undefined) as Dataset;
      const updated = await apiClient.getProjectDatasets(projectId) as Dataset[];
      setDatasets(updated || []);
      setSelectedDatasetId(ds.id);
      setShowAddDataset(false);
      setAddFile(null);
      setAddDatasetName('');
      setAddDatasetDescription('');
    } catch (error) {
      console.error('Error adding dataset:', error);
      alert('Failed to add dataset.');
    } finally {
      setIsAdding(false);
    }
  }

  function openDetail(ds: Dataset) {
    setDetailEditMode(false);
    setDetailDataset(ds);
    setDetailName(ds.name);
    setDetailDescription(ds.description ?? '');
  }

  async function handleSaveDetail() {
    if (!detailDataset || !detailName.trim()) return;
    setIsSavingDetail(true);
    try {
      await apiClient.renameDataset(detailDataset.id, detailName.trim(), detailDescription.trim() || null);
      setDatasets(prev => prev.map(d =>
        d.id === detailDataset.id
          ? { ...d, name: detailName.trim(), description: detailDescription.trim() || null }
          : d
      ));
      setDetailDataset(prev => prev ? { ...prev, name: detailName.trim(), description: detailDescription.trim() || null } : null);
    } catch (error) {
      console.error('Error updating dataset:', error);
      alert('Failed to update dataset.');
    } finally {
      setIsSavingDetail(false);
    }
  }

  async function handleDeleteDataset(dsId: string) {
    if (!confirm('Delete this dataset? This cannot be undone.')) return;
    setIsDeletingId(dsId);
    try {
      await apiClient.deleteDataset(dsId);
      const updated = datasets.filter(d => d.id !== dsId);
      setDatasets(updated);
      if (selectedDatasetId === dsId) {
        setSelectedDatasetId(updated.length > 0 ? updated[0].id : null);
      }
    } catch (error) {
      console.error('Error deleting dataset:', error);
      alert('Failed to delete dataset.');
    } finally {
      setIsDeletingId(null);
    }
  }

  function handleDragEnter(e: React.DragEvent) { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }
  function handleDragOver(e: React.DragEvent) { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }
  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault(); e.stopPropagation();
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as HTMLElement)) setIsDragging(false);
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const csv = Array.from(e.dataTransfer.files).find(f => f.name.toLowerCase().endsWith('.csv'));
    if (csv) setAddFile(csv); else alert('Please upload a CSV file');
  }

  if (loading) {
    return (
      <div className="text-center py-20 bg-white rounded-lg shadow-md">
        <div className="animate-spin w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-slate-600 font-medium">Loading project...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-lg transition" title="Back to Dashboard">
            <ArrowLeft className="w-6 h-6 text-slate-700" />
          </button>
          <h1 className="text-3xl font-bold text-slate-800">{projectName}</h1>
        </div>
        {(currentUserRole === 'owner' || currentUserRole === 'co-owner') && (
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center space-x-2 px-3 py-2 text-slate-600 hover:text-teal-700 hover:bg-teal-50 border border-slate-200 rounded-lg transition"
            title="Project Settings"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm font-medium">Settings</span>
          </button>
        )}
      </div>

      {/* Project settings slide-over panel */}
      {showSettings && (
        <ProjectSettingsPanel
          projectId={projectId}
          projectName={projectName}
          projectDescription={projectDescription}
          ownerName={projectOwnerName}
          isPublic={isPublic}
          isOwner={currentUserRole === 'owner'}
          onClose={() => setShowSettings(false)}
          onVisibilityChange={async (newValue) => {
            await apiClient.updateProject(projectId, { is_public: newValue });
            setIsPublic(newValue);
          }}
          onMemberAdded={() => {}}
          onMemberRoleChanged={() => {}}
          onMemberRemoved={() => {}}
        />
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-slate-200 flex">
          <button
            onClick={() => setActiveTab('records')}
            className={`flex items-center space-x-2 px-6 py-4 font-medium transition border-b-2 ${
              activeTab === 'records' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            <Table2 className="w-4 h-4" /><span>Data Records</span>
          </button>
          <button
            onClick={() => setActiveTab('score')}
            className={`flex items-center space-x-2 px-6 py-4 font-medium transition border-b-2 ${
              activeTab === 'score' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            <Target className="w-4 h-4" /><span>Quality Score</span>
          </button>
        </div>
      </div>

      {activeTab === 'records' && (
        <div className="flex gap-4 items-start">

          {/* ── LEFT SIDEBAR ── */}
          <div
            className="w-64 flex-shrink-0 bg-white rounded-lg shadow-md flex flex-col overflow-hidden"
            style={{ maxHeight: 'calc(100vh - 220px)', minHeight: 240 }}
          >

            {/* ── SECTION 1: Dataset ── */}
            <div className="flex-shrink-0">
              <button
                onClick={() => setDatasetsExpanded(p => !p)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 hover:bg-slate-100 transition"
              >
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dataset</span>
                {datasetsExpanded
                  ? <ChevronDown className="w-4 h-4 text-slate-400" />
                  : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </button>

              {datasetsExpanded && (
                <>
                  {datasets.length === 0 ? (
                    <div className="px-4 py-4 text-center">
                      <FileText className="w-7 h-7 text-slate-300 mx-auto mb-1" />
                      <p className="text-xs text-slate-400">No datasets yet</p>
                    </div>
                  ) : (
                    <ul>
                      {datasets.map((ds) => (
                        <li key={ds.id} className="border-b border-slate-100 last:border-0 group/item">
                          <div className={`flex items-start gap-2.5 px-4 py-3 transition ${
                            selectedDatasetId === ds.id ? 'bg-teal-50' : 'hover:bg-slate-50'
                          }`}>
                            <input
                              type="radio"
                              name="dataset"
                              checked={selectedDatasetId === ds.id}
                              onChange={() => setSelectedDatasetId(ds.id)}
                              className="mt-0.5 accent-teal-600 flex-shrink-0 cursor-pointer"
                            />
                            <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setSelectedDatasetId(ds.id)}>
                              <p className={`text-sm font-medium truncate ${
                                selectedDatasetId === ds.id ? 'text-teal-700' : 'text-slate-700'
                              }`} title={ds.name}>{ds.name}</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {ds.row_count.toLocaleString()} rows · {ds.column_count} cols
                              </p>
                            </div>
                            {/* Detail / Delete actions — visible on hover */}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition flex-shrink-0 mt-0.5">
                              <button
                                onClick={(e) => { e.stopPropagation(); openDetail(ds); }}
                                className="p-1 text-slate-400 hover:text-teal-600 rounded transition"
                                title="Dataset details"
                              >
                                <Info className="w-3.5 h-3.5" />
                              </button>
                              {(currentUserRole === 'owner' || currentUserRole === 'co-owner' || currentUserRole === 'editor') && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteDataset(ds.id); }}
                                  disabled={isDeletingId === ds.id}
                                  className="p-1 text-slate-400 hover:text-red-500 rounded transition disabled:opacity-50"
                                  title="Delete dataset"
                                >
                                  {isDeletingId === ds.id
                                    ? <div className="w-3.5 h-3.5 border border-slate-400 border-t-transparent rounded-full animate-spin" />
                                    : <Trash2 className="w-3.5 h-3.5" />}
                                </button>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {(currentUserRole === 'owner' || currentUserRole === 'co-owner' || currentUserRole === 'editor') && (
                    <button
                      onClick={() => setShowAddDataset(true)}
                      className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium text-teal-600 hover:bg-teal-50 border-t border-slate-100 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />Add Dataset
                    </button>
                  )}
                </>
              )}
            </div>

            {/* ── SECTION 2: Filters (column value filters) ── */}
            <div className="flex flex-col flex-1 min-h-0 border-t border-slate-200">
              <button
                onClick={() => setFiltersExpanded(p => !p)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 hover:bg-slate-100 transition flex-shrink-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="text-xs bg-teal-600 text-white rounded-full px-1.5 py-0.5 leading-none font-medium">
                      {activeFilterCount}
                    </span>
                  )}
                </div>
                {filtersExpanded
                  ? <ChevronDown className="w-4 h-4 text-slate-400" />
                  : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </button>

              {filtersExpanded && (
                <div className="flex flex-col flex-1 min-h-0">
                  {allColumns.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6 px-4">
                      {selectedDatasetId ? 'Loading attributes...' : 'Select a dataset to filter'}
                    </p>
                  ) : (
                    <>
                      {/* Attribute search */}
                      <div className="px-3 py-2 border-b border-slate-100 flex-shrink-0">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search attributes..."
                            value={columnSearch}
                            onChange={(e) => setColumnSearch(e.target.value)}
                            className="w-full pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-teal-400 focus:border-transparent outline-none"
                          />
                        </div>
                      </div>

                      {/* Clear all */}
                      {activeFilterCount > 0 && (
                        <div className="px-4 py-1.5 border-b border-slate-100 flex-shrink-0">
                          <button
                            onClick={clearAllFilters}
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition"
                          >
                            <FilterX className="w-3 h-3" />Clear all filters
                          </button>
                        </div>
                      )}

                      {/* Scrollable column accordion list */}
                      <div className="overflow-y-auto flex-1">
                        {filteredColumnList.length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-4">No attributes match</p>
                        ) : (
                          filteredColumnList.map((col) => {
                            const isExpanded = expandedColumns.has(col);
                            const uniqueVals = columnUniqueValues[col] ?? [];
                            const activeFilter = columnValueFilters[col];
                            // Selected set: if filter is active use it, otherwise all values
                            const selectedVals = activeFilter ?? new Set(uniqueVals);
                            const isFiltered = !!activeFilter;

                            return (
                              <div key={col} className="border-b border-slate-100 last:border-0">
                                {/* Column header row */}
                                <button
                                  onClick={() => toggleColumnExpand(col)}
                                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition text-left"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className={`text-xs font-medium truncate ${isFiltered ? 'text-teal-700' : 'text-slate-700'}`} title={col}>
                                      {col}
                                    </span>
                                    {isFiltered && (
                                      <span className="text-xs bg-teal-100 text-teal-700 rounded px-1 py-0.5 leading-none flex-shrink-0">
                                        {selectedVals.size}/{uniqueVals.length}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    {isFiltered && (
                                      <span
                                        role="button"
                                        onClick={(e) => { e.stopPropagation(); clearColumnFilter(col); }}
                                        className="text-slate-400 hover:text-red-500 transition p-0.5"
                                        title="Clear filter"
                                      >
                                        <X className="w-3 h-3" />
                                      </span>
                                    )}
                                    {isExpanded
                                      ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                      : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                                  </div>
                                </button>

                                {/* Values checklist */}
                                {isExpanded && (
                                  <div className="bg-slate-50 border-t border-slate-100 max-h-48 overflow-y-auto">
                                    {uniqueVals.length === 0 ? (
                                      <p className="text-xs text-slate-400 px-4 py-2">No values</p>
                                    ) : (
                                      uniqueVals.map((val) => (
                                        <label
                                          key={val}
                                          className="flex items-center gap-2 px-5 py-1.5 cursor-pointer hover:bg-white transition"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={selectedVals.has(val)}
                                            onChange={() => toggleColumnValue(col, val)}
                                            className="accent-teal-600 flex-shrink-0"
                                          />
                                          <span
                                            className="text-xs text-slate-600 truncate"
                                            title={val}
                                          >
                                            {val === '' ? <em className="text-slate-400">(empty)</em> : val}
                                          </span>
                                        </label>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── MAIN RECORDS ── */}
          <div className="flex-1 min-w-0">
            <Records
              projectId={projectId}
              datasetId={selectedDatasetId}
              columnValueFilters={columnValueFilters}
              onDataLoaded={handleDataLoaded}
            />
          </div>
        </div>
      )}

      {activeTab === 'score' && (
        currentUserRole === 'viewer'
          ? (
            <div className="bg-white rounded-lg shadow-md flex flex-col items-center justify-center py-20 text-center">
              <Target className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-slate-600 font-semibold text-lg">View-only access</p>
              <p className="text-slate-400 text-sm mt-1">Quality Score is only available to editors and owners.</p>
            </div>
          )
          : <Score projectId={projectId} />
      )}

      {/* ── Dataset Detail Modal ── */}
      {detailDataset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800">Dataset Details</h2>
                {detailEditMode && (
                  <span className="text-xs bg-teal-100 text-teal-700 font-medium px-2 py-0.5 rounded-full">Editing</span>
                )}
              </div>
              <button
                onClick={() => {
                  setDetailDataset(null);
                  setDetailEditMode(false);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Stats */}
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg text-sm text-slate-500">
                <span><span className="font-semibold text-slate-700">{detailDataset.row_count.toLocaleString()}</span> rows</span>
                <span className="text-slate-300">·</span>
                <span><span className="font-semibold text-slate-700">{detailDataset.column_count}</span> columns</span>
                <span className="text-slate-300">·</span>
                <span>Added {new Date(detailDataset.created_at).toLocaleDateString('en-GB')}</span>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Dataset Name</label>
                {detailEditMode ? (
                  <input
                    type="text"
                    value={detailName}
                    onChange={e => setDetailName(e.target.value)}
                    autoFocus
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                ) : (
                  <p className="px-4 py-2.5 bg-slate-50 rounded-lg text-sm text-slate-800 font-medium">{detailName}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Description <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                {detailEditMode ? (
                  <textarea
                    value={detailDescription}
                    onChange={e => setDetailDescription(e.target.value)}
                    rows={3}
                    placeholder="Add a description..."
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm resize-none outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                ) : (
                  <p className={`px-4 py-2.5 bg-slate-50 rounded-lg text-sm min-h-[72px] ${detailDescription ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                    {detailDescription || 'No description'}
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
              <div>
                {!detailEditMode && (currentUserRole === 'owner' || currentUserRole === 'co-owner' || currentUserRole === 'editor') && (
                  <button
                    onClick={() => setDetailEditMode(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-teal-700 border border-teal-300 rounded-lg hover:bg-teal-50 transition font-medium"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                {detailEditMode ? (
                  <>
                    <button
                      onClick={() => {
                        setDetailName(detailDataset.name);
                        setDetailDescription(detailDataset.description ?? '');
                        setDetailEditMode(false);
                      }}
                      className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => { await handleSaveDetail(); setDetailEditMode(false); }}
                      disabled={!detailName.trim() || isSavingDetail}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg hover:from-teal-700 hover:to-emerald-700 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSavingDetail
                        ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Saving...</span></>
                        : <span>Save Changes</span>}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setDetailDataset(null)}
                    className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition text-sm font-medium"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Dataset Modal — owner/co-owner/editor only ── */}
      {showAddDataset && currentUserRole !== 'viewer' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">Add Dataset</h2>
              <button onClick={() => { setShowAddDataset(false); setAddFile(null); setAddDatasetName(''); setAddDatasetDescription(''); }} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Dataset name — required */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Dataset Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter a name for this dataset"
                  value={addDatasetName}
                  onChange={e => setAddDatasetName(e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm ${
                    addDatasetName.trim() === '' && addFile ? 'border-red-300 bg-red-50' : 'border-slate-300'
                  }`}
                  autoFocus
                />
                {addDatasetName.trim() === '' && addFile && (
                  <p className="text-xs text-red-500 mt-1">Dataset name is required</p>
                )}
              </div>
              {/* Description — optional */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Description <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  placeholder="Brief description of this dataset"
                  value={addDatasetDescription}
                  onChange={e => setAddDatasetDescription(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm resize-none"
                />
              </div>
              {/* Drop zone */}
              <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('add-dataset-file')?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
                  isDragging ? 'border-teal-500 bg-teal-50'
                  : addFile ? 'border-teal-400 bg-teal-50'
                  : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                {addFile ? (
                  <div className="flex flex-col items-center space-y-1">
                    <FileText className="w-8 h-8 text-teal-600" />
                    <p className="font-medium text-slate-800 text-sm truncate max-w-full px-2" title={addFile.name}>{addFile.name}</p>
                    <p className="text-xs text-slate-500">{(addFile.size / 1024).toFixed(1)} KB — click to change</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-1">
                    <Upload className="w-8 h-8 text-slate-400" />
                    <p className="text-sm text-slate-600"><span className="text-teal-600 font-semibold">Browse</span> or drag & drop</p>
                    <p className="text-xs text-slate-400">CSV files only</p>
                  </div>
                )}
                <input id="add-dataset-file" type="file" accept=".csv" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setAddFile(f); }} />
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-slate-200">
              <button onClick={() => { setShowAddDataset(false); setAddFile(null); setAddDatasetName(''); setAddDatasetDescription(''); }}
                className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition text-sm font-medium">
                Cancel
              </button>
              <button onClick={handleAddDataset} disabled={!addFile || !addDatasetName.trim() || isAdding}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg hover:from-teal-700 hover:to-emerald-700 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                {isAdding
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Uploading...</span></>
                  : <><Upload className="w-4 h-4" /><span>Upload Dataset</span></>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
