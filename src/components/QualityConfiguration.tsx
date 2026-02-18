import { useState, useEffect } from 'react';
import { AlertCircle, Save, Play } from 'lucide-react';
import type { QualityDimension, QualityDimensionConfig, Template } from '../types/database';
import QualityDimensionCard from './QualityDimensionCard';
import DimensionConfigModal from './DimensionConfigModal';
import { apiClient } from '../lib/api-client';

interface QualityConfigurationProps {
  data: {
    headers: string[];
    rows: Array<Record<string, string | number | boolean | null>>;
  };
  datasetId: string;
  onExecute: (results: QualityCheckResult[]) => void;
}

export interface RowDetail {
  rowIndex: number;
  value: string | number | boolean | null;
  passed: boolean;
  reason?: string;
}

export interface QualityCheckResult {
  id: string;
  column_name: string;
  dimension: QualityDimension;
  passed_count: number;
  failed_count: number;
  total_count: number;
  score: number;
  rowDetails?: RowDetail[];
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
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [loadingDimensions, setLoadingDimensions] = useState(true);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [hasTemplateAction, setHasTemplateAction] = useState(false);
  const [configuredColumns, setConfiguredColumns] = useState<Map<string, Set<string>>>(new Map());
  const [columnConfigs, setColumnConfigs] = useState<Map<string, Record<string, any>>>(new Map());
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
    loadTemplates();
  }, []);

  async function loadDimensions() {
    try {
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

  async function loadTemplates() {
    try {
      const dbTemplates = await apiClient.getTemplates(datasetId) as any[];
      if (dbTemplates && dbTemplates.length > 0) {
        const mapped: Template[] = dbTemplates.map((t: any) => ({
          id: t.id,
          name: t.name,
          rules: t.template_data,
          created_at: t.created_at,
        }));
        setTemplates(mapped);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
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
    setColumnConfigs(new Map());
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

  async function handleSaveConfiguration(config: Record<string, string | number | boolean>, referenceFile?: File) {
    if (!configModal.dimension || !configModal.column) return;

    try {
      // Mark as configured locally
      const newConfiguredColumns = new Map(configuredColumns);
      if (!newConfiguredColumns.has(configModal.dimension)) {
        newConfiguredColumns.set(configModal.dimension, new Set());
      }
      newConfiguredColumns.get(configModal.dimension)!.add(configModal.column);
      setConfiguredColumns(newConfiguredColumns);

      // Store the config data for use during execution
      const configKey = `${configModal.dimension}:${configModal.column}`;
      const configToStore: Record<string, any> = { ...config };

      // If consistency with CSV, parse and store the reference values from the file
      if (configModal.dimension === 'consistency' && config.referenceSource === 'csv' && referenceFile) {
        const text = await referenceFile.text();
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        const matchCol = config.referenceMatchColumn as string;
        const colIndex = headers.indexOf(matchCol);

        if (colIndex >= 0) {
          const refValues = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            return values[colIndex] || '';
          }).filter(v => v !== '');
          configToStore.parsedReferenceValues = refValues;
        }
      }

      const newColumnConfigs = new Map(columnConfigs);
      newColumnConfigs.set(configKey, configToStore);
      setColumnConfigs(newColumnConfigs);

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
      const templateData = {
        dimensionRules,
        configuredColumns: Object.fromEntries(
          Array.from(configuredColumns.entries()).map(([key, set]) => [key, Array.from(set)])
        ),
      };

      const saved = await apiClient.saveTemplate(templateName, templateData, datasetId);

      const newTemplate: Template = {
        id: saved.id,
        name: templateName,
        rules: templateData,
        created_at: saved.created_at,
      };

      setTemplates([...templates, newTemplate]);
      setSelectedTemplate(saved.id);
      setHasTemplateAction(true);
      alert('Template saved successfully!');
      setTemplateName('');
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
          const result = await executeRule(dimension.key, column, data.rows);
          results.push(result);
        }
      }

      // Save results to database
      try {
        await apiClient.saveQualityResults(datasetId, results);
      } catch (saveError) {
        console.error('Error saving results to database:', saveError);
      }

      onExecute(results);
    } catch (error) {
      console.error('Error executing rules:', error);
      alert('Error executing quality checks. Please try again.');
    } finally {
      setIsExecuting(false);
    }
  }

  async function executeRule(dimensionKey: string, columnName: string, rows: Array<Record<string, string | number | boolean | null>>): Promise<QualityCheckResult> {
    let passedCount = 0;
    let failedCount = 0;
    const rowDetails: RowDetail[] = [];

    if (dimensionKey === 'completeness') {
      rows.forEach((row, i) => {
        const value = row[columnName];
        const passed = !!(value && String(value).trim() !== '');
        if (passed) passedCount++; else failedCount++;
        rowDetails.push({ rowIndex: i, value, passed, reason: passed ? undefined : 'Value is empty or null' });
      });
    } else if (dimensionKey === 'uniqueness') {
      const values = new Set();
      rows.forEach((row, i) => {
        const value = row[columnName];
        const passed = !!(value && !values.has(value));
        if (passed) { values.add(value); passedCount++; } else { failedCount++; }
        rowDetails.push({ rowIndex: i, value, passed, reason: passed ? undefined : 'Duplicate value' });
      });
    } else if (dimensionKey === 'validity') {
      const configKey = `${dimensionKey}:${columnName}`;
      const colConfig = columnConfigs.get(configKey);

      if (colConfig?.validationType === 'sign') {
        const expectPositive = colConfig.expectedSign !== 'negative';
        rows.forEach((row, i) => {
          const value = row[columnName];
          const num = Number(value);
          let passed = false;
          let reason = '';
          if (value === null || value === '' || isNaN(num)) {
            reason = 'Not a valid number';
          } else if (expectPositive ? num >= 0 : num < 0) {
            passed = true;
          } else {
            reason = expectPositive ? 'Expected positive value' : 'Expected negative value';
          }
          if (passed) passedCount++; else failedCount++;
          rowDetails.push({ rowIndex: i, value, passed, reason: passed ? undefined : reason });
        });
      } else if (colConfig?.validationType === 'pattern') {
        const regex = new RegExp(colConfig.pattern as string);
        rows.forEach((row, i) => {
          const value = String(row[columnName] ?? '');
          const passed = regex.test(value);
          if (passed) passedCount++; else failedCount++;
          rowDetails.push({ rowIndex: i, value: row[columnName], passed, reason: passed ? undefined : `Does not match pattern: ${colConfig.pattern}` });
        });
      } else if (colConfig?.validationType === 'range') {
        const min = Number(colConfig.minValue);
        const max = Number(colConfig.maxValue);
        rows.forEach((row, i) => {
          const num = Number(row[columnName]);
          const passed = !isNaN(num) && num >= min && num <= max;
          if (passed) passedCount++; else failedCount++;
          rowDetails.push({ rowIndex: i, value: row[columnName], passed, reason: passed ? undefined : `Value out of range [${min}, ${max}]` });
        });
      } else if (colConfig?.validationType === 'list') {
        const allowed = String(colConfig.allowedValues || '').split(',').map(v => v.trim());
        rows.forEach((row, i) => {
          const value = String(row[columnName] ?? '').trim();
          const passed = allowed.includes(value);
          if (passed) passedCount++; else failedCount++;
          rowDetails.push({ rowIndex: i, value: row[columnName], passed, reason: passed ? undefined : 'Value not in allowed list' });
        });
      } else if (colConfig?.validationType === 'datatype') {
        rows.forEach((row, i) => {
          const value = row[columnName];
          let passed = false;
          switch (colConfig.dataType) {
            case 'number': passed = value !== null && value !== '' && !isNaN(Number(value)); break;
            case 'email': passed = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? '')); break;
            case 'url': passed = /^https?:\/\/.+/.test(String(value ?? '')); break;
            case 'date': passed = !isNaN(Date.parse(String(value ?? ''))); break;
            default: passed = value !== null && value !== '';
          }
          if (passed) passedCount++; else failedCount++;
          rowDetails.push({ rowIndex: i, value, passed, reason: passed ? undefined : `Invalid ${colConfig.dataType}` });
        });
      } else {
        passedCount = rows.length;
        rows.forEach((row, i) => {
          rowDetails.push({ rowIndex: i, value: row[columnName], passed: true });
        });
      }
    } else if (dimensionKey === 'consistency') {
      const configKey = `${dimensionKey}:${columnName}`;
      const colConfig = columnConfigs.get(configKey);

      let referenceValues: Set<string> = new Set();

      if (colConfig?.referenceSource === 'csv' && colConfig.parsedReferenceValues) {
        referenceValues = new Set((colConfig.parsedReferenceValues as string[]).map(v => String(v).trim().toLowerCase()));
      } else if (colConfig?.referenceSource === 'database' && colConfig.referenceDatasetId && colConfig.referenceDbColumn) {
        try {
          const refRows = await apiClient.previewDataset(colConfig.referenceDatasetId as string, 100000) as Record<string, any>[];
          const refCol = colConfig.referenceDbColumn as string;
          for (const refRow of refRows) {
            const val = refRow[refCol];
            if (val !== null && val !== undefined && String(val).trim() !== '') {
              referenceValues.add(String(val).trim().toLowerCase());
            }
          }
        } catch (error) {
          console.error('Error fetching reference dataset:', error);
          failedCount = rows.length;
          rows.forEach((row, i) => {
            rowDetails.push({ rowIndex: i, value: row[columnName], passed: false, reason: 'Reference data fetch failed' });
          });
        }
      }

      if (referenceValues.size > 0) {
        rows.forEach((row, i) => {
          const value = row[columnName];
          let passed = false;
          if (value !== null && value !== undefined && String(value).trim() !== '') {
            passed = referenceValues.has(String(value).trim().toLowerCase());
          }
          if (passed) passedCount++; else failedCount++;
          rowDetails.push({ rowIndex: i, value, passed, reason: passed ? undefined : 'Value not found in reference data' });
        });
      } else if (failedCount === 0) {
        passedCount = rows.length;
        rows.forEach((row, i) => {
          rowDetails.push({ rowIndex: i, value: row[columnName], passed: true });
        });
      }
    } else {
      passedCount = rows.length;
      rows.forEach((row, i) => {
        rowDetails.push({ rowIndex: i, value: row[columnName], passed: true });
      });
    }

    const totalCount = passedCount + failedCount;
    const score = totalCount > 0 ? (passedCount / totalCount) * 100 : 0;

    return {
      id: `${dimensionKey}-${columnName}`,
      column_name: columnName,
      dimension: dimensionKey as QualityDimension,
      passed_count: passedCount,
      failed_count: failedCount,
      total_count: totalCount,
      score: score,
      rowDetails,
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
      consistency: 'Checks values against reference data from an uploaded CSV or an existing database dataset.',
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
        <div className="relative group">
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
          {!hasTemplateAction && totalConfigured > 0 && (
            <div className="absolute bottom-full right-0 mb-2 w-64 bg-slate-800 text-white text-xs rounded-lg p-3 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              Please save or select a template before executing quality checks.
              <div className="absolute -bottom-1 right-6 w-2 h-2 bg-slate-800 transform rotate-45"></div>
            </div>
          )}
        </div>
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
