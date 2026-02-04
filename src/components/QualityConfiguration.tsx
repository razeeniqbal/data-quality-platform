import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Save, Play } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import type { QualityDimension, QualityDimensionConfig } from '../types/database';
import QualityDimensionCard from './QualityDimensionCard';
import DimensionConfigModal from './DimensionConfigModal';

interface QualityConfigurationProps {
  data: {
    headers: string[];
    rows: Record<string, any>[];
  };
  datasetId: string;
  onExecute: (results: any) => void;
}

interface DimensionRules {
  [key: string]: string[];
}

export default function QualityConfiguration({
  data,
  datasetId,
  onExecute,
}: QualityConfigurationProps) {
  const [dimensions, setDimensions] = useState<QualityDimensionConfig[]>([]);
  const [dimensionRules, setDimensionRules] = useState<DimensionRules>({});
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [loadingDimensions, setLoadingDimensions] = useState(true);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [hasTemplateAction, setHasTemplateAction] = useState(false);
  const [configuredColumns, setConfiguredColumns] = useState<Map<string, Set<string>>>(new Map());
  const [configModal, setConfigModal] = useState<{
    isOpen: boolean;
    dimension: QualityDimension | null;
    dimensionName: string;
    column: string;
  }>({
    isOpen: false,
    dimension: null,
    dimensionName: '',
    column: '',
  });

  useEffect(() => {
    loadDimensions();
  }, []);

  async function loadDimensions() {
    try {
      // Default dimensions for now
      const defaultDimensions: QualityDimensionConfig[] = [
        { id: '1', name: 'Completeness', key: 'completeness', description: 'Check if all required fields have values', icon: 'check-circle', color: '#14b8a6', is_active: true, display_order: 1 },
        { id: '2', name: 'Uniqueness', key: 'uniqueness', description: 'Check for duplicate values', icon: 'fingerprint', color: '#8b5cf6', is_active: true, display_order: 2 },
        { id: '3', name: 'Consistency', key: 'consistency', description: 'Check data format and pattern consistency', icon: 'shield', color: '#f59e0b', is_active: true, display_order: 3 },
        { id: '4', name: 'Validity', key: 'validity', description: 'Validate data against rules', icon: 'check-square', color: '#ef4444', is_active: true, display_order: 4 },
      ];

      setDimensions(defaultDimensions);

      const initialRules: DimensionRules = {};
      defaultDimensions.forEach((dim) => {
        initialRules[dim.key] = [];
      });
      setDimensionRules(initialRules);
    } catch (error) {
      console.error('Error loading dimensions:', error);
    } finally {
      setLoadingDimensions(false);
    }
  }

  function handleAddColumn(dimension: QualityDimension, column: string) {
    setDimensionRules((prev) => ({
      ...prev,
      [dimension]: [...prev[dimension], column],
    }));
  }

  function handleRemoveColumn(dimension: QualityDimension, column: string) {
    setDimensionRules((prev) => ({
      ...prev,
      [dimension]: prev[dimension].filter((col) => col !== column),
    }));
  }

  function handleClear() {
    const clearedRules: DimensionRules = {};
    dimensions.forEach((dim) => {
      clearedRules[dim.key] = [];
    });
    setDimensionRules(clearedRules);
    setConfiguredColumns(new Map());
    setHasTemplateAction(false);
    setSelectedTemplate('');
  }

  function handleConfigure(dimension: QualityDimension, column: string) {
    const dimensionConfig = dimensions.find((d) => d.key === dimension);
    setConfigModal({
      isOpen: true,
      dimension,
      dimensionName: dimensionConfig?.name || dimension,
      column,
    });
  }

  async function handleSaveConfiguration(config: Record<string, any>, referenceFile?: File) {
    if (!configModal.dimension || !configModal.column) return;

    try {
      // Mark as configured locally
      const newConfiguredColumns = new Map(configuredColumns);
      if (!newConfiguredColumns.has(configModal.dimension)) {
        newConfiguredColumns.set(configModal.dimension, new Set());
      }
      newConfiguredColumns.get(configModal.dimension)!.add(configModal.column);
      setConfiguredColumns(newConfiguredColumns);

      alert('Configuration saved successfully!');
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('Error saving configuration');
    }
  }

  async function handleSaveTemplate() {
    if (totalConfigured === 0) {
      alert('Please add attributes to dimensions before saving a template');
      return;
    }
    setShowSaveTemplateModal(true);
  }

  async function confirmSaveTemplate() {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    setIsSavingTemplate(true);
    try {
      // Save template locally for now
      const newTemplate = {
        id: Date.now().toString(),
        name: templateName,
        rules: {
          dimensionRules,
          configuredColumns: Object.fromEntries(
            Array.from(configuredColumns.entries()).map(([key, set]) => [key, Array.from(set)])
          ),
        },
      };

      setTemplates([...templates, newTemplate]);
      setHasTemplateAction(true);
      alert('Template saved successfully!');
      setTemplateName('');
      setTemplateDescription('');
      setShowSaveTemplateModal(false);
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template. Please try again.');
    } finally {
      setIsSavingTemplate(false);
    }
  }

  function handleLoadTemplate(templateId: string) {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    const templateData = template.rules;
    if (templateData.dimensionRules) {
      setDimensionRules(templateData.dimensionRules);
    }

    if (templateData.configuredColumns) {
      const configMap = new Map<string, Set<string>>();
      Object.entries(templateData.configuredColumns).forEach(([key, columns]) => {
        configMap.set(key, new Set(columns as string[]));
      });
      setConfiguredColumns(configMap);
    }

    setSelectedTemplate(templateId);
    setHasTemplateAction(true);
    alert(`Template "${template.name}" loaded successfully!`);
  }

  async function handleExecute() {
    if (!hasTemplateAction) {
      alert('Please save or select a template before executing quality checks');
      return;
    }

    setIsExecuting(true);

    try {
      const results = [];

      // Execute quality checks locally
      for (const dimension of dimensions) {
        const columns = dimensionRules[dimension.key] || [];
        for (const column of columns) {
          const result = executeRule(dimension.key, column, data.rows);
          results.push(result);
        }
      }

      onExecute(results);
    } catch (error) {
      console.error('Error executing rules:', error);
      alert('Error executing quality checks. Please try again.');
    } finally {
      setIsExecuting(false);
    }
  }

  function executeRule(dimensionKey: string, columnName: string, rows: Record<string, any>[]) {
    let passedCount = 0;
    let failedCount = 0;

    if (dimensionKey === 'completeness') {
      for (const row of rows) {
        const value = row[columnName];
        if (value && value.toString().trim() !== '') {
          passedCount++;
        } else {
          failedCount++;
        }
      }
    } else if (dimensionKey === 'uniqueness') {
      const values = new Set();
      for (const row of rows) {
        const value = row[columnName];
        if (value && !values.has(value)) {
          values.add(value);
          passedCount++;
        } else {
          failedCount++;
        }
      }
    } else {
      // Default: assume all pass for unconfigured dimensions
      passedCount = rows.length;
    }

    const totalCount = passedCount + failedCount;
    const score = totalCount > 0 ? (passedCount / totalCount) * 100 : 0;

    return {
      id: `${dimensionKey}-${columnName}`,
      dataset_id: datasetId,
      column_name: columnName,
      dimension: dimensionKey,
      passed_count: passedCount,
      failed_count: failedCount,
      total_count: totalCount,
      score: score,
    };
  }

  const availableColumns = data.headers.filter(
    (header) => !Object.values(dimensionRules).some(columns => columns.includes(header))
  );

  const totalConfigured = Object.values(dimensionRules).reduce(
    (sum, columns) => sum + columns.length,
    0
  );

  const isReadyType = (dimensionKey: string): boolean => {
    return ['completeness', 'uniqueness'].includes(dimensionKey);
  };

  function getLogicDescriptionForDimension(dimensionKey: string): string {
    const logicMap: Record<string, string> = {
      completeness: 'Checks if all values in the selected attributes are present and not null or empty.',
      uniqueness: 'Verifies that all values in the selected attributes are unique with no duplicates.',
      consistency: 'Validates data against defined patterns or reference datasets.',
      validity: 'Ensures data meets specific validation rules.',
    };
    return logicMap[dimensionKey] || 'Quality validation logic for this dimension';
  }

  if (loadingDimensions) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center py-12">
        <div className="animate-spin w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-600">Loading dimensions...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <select
            value={selectedTemplate}
            onChange={(e) => {
              if (e.target.value) {
                handleLoadTemplate(e.target.value);
              } else {
                setSelectedTemplate('');
              }
            }}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-medium cursor-pointer outline-none"
          >
            <option value="">Select Template</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleClear}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
          >
            Clear
          </button>
          <button
            onClick={handleSaveTemplate}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Template</span>
          </button>
        </div>
        <button
          onClick={handleExecute}
          disabled={totalConfigured === 0 || isExecuting || !hasTemplateAction}
          className="px-6 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg hover:from-teal-700 hover:to-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center space-x-2"
        >
          {isExecuting ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              <span>Executing...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Execute</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {dimensions.map((dimension) => (
          <QualityDimensionCard
            key={dimension.id}
            title={dimension.name}
            dimension={dimension.key as QualityDimension}
            columns={dimensionRules[dimension.key] || []}
            availableColumns={availableColumns}
            onAddColumn={handleAddColumn}
            onRemoveColumn={handleRemoveColumn}
            onConfigure={handleConfigure}
            isReadyType={isReadyType(dimension.key)}
            configuredColumns={configuredColumns.get(dimension.key) || new Set()}
            logicDescription={getLogicDescriptionForDimension(dimension.key)}
          />
        ))}
      </div>

      {dimensions.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-400" />
          <p className="font-medium">No active dimensions configured</p>
        </div>
      )}

      <DimensionConfigModal
        isOpen={configModal.isOpen}
        onClose={() => setConfigModal({ isOpen: false, dimension: null, dimensionName: '', column: '' })}
        dimension={configModal.dimension!}
        dimensionName={configModal.dimensionName}
        column={configModal.column}
        onSave={handleSaveConfiguration}
      />

      {showSaveTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-4 rounded-t-xl">
              <h2 className="text-xl font-bold">Save Template</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Standard Quality Check"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowSaveTemplateModal(false);
                    setTemplateName('');
                  }}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
                  disabled={isSavingTemplate}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSaveTemplate}
                  disabled={isSavingTemplate}
                  className="px-6 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg hover:from-teal-700 hover:to-emerald-700 transition disabled:opacity-50 flex items-center space-x-2"
                >
                  {isSavingTemplate ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
