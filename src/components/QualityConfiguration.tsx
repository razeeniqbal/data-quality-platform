import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Save, Play } from 'lucide-react';
import { supabase } from '../lib/supabase';
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
  const [referenceDataInfo, setReferenceDataInfo] = useState<Map<string, { fileName: string; rowCount: number }>>(new Map());
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

  useEffect(() => {
    if (datasetId) {
      loadConfiguredColumns();
    }
  }, [datasetId]);

  async function loadDimensions() {
    try {
      const { data: dimData, error } = await supabase
        .from('quality_dimension_config')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      const loadedDimensions = dimData || [];
      setDimensions(loadedDimensions);

      const initialRules: DimensionRules = {};
      loadedDimensions.forEach((dim) => {
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
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
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

      const { error } = await supabase
        .from('templates')
        .insert({
          name: templateName,
          rules: templateData,
        });

      if (error) throw error;

      setHasTemplateAction(true);
      alert('Template saved successfully!');
      setTemplateName('');
      setTemplateDescription('');
      setShowSaveTemplateModal(false);
      await loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template. Please try again.');
    } finally {
      setIsSavingTemplate(false);
    }
  }

  async function handleLoadTemplate(templateId: string) {
    try {
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
    } catch (error) {
      console.error('Error loading template:', error);
      alert('Error loading template');
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

  async function loadConfiguredColumns() {
    try {
      const { data: configs, error } = await supabase
        .from('dimension_configurations')
        .select('id, dimension_key, column_name, is_configured')
        .eq('dataset_id', datasetId)
        .eq('is_configured', true);

      if (error) throw error;

      const configMap = new Map<string, Set<string>>();
      const configIds: string[] = [];

      configs?.forEach((config) => {
        if (!configMap.has(config.dimension_key)) {
          configMap.set(config.dimension_key, new Set());
        }
        configMap.get(config.dimension_key)!.add(config.column_name);
        configIds.push(config.id);
      });

      setConfiguredColumns(configMap);

      if (configIds.length > 0) {
        const { data: refFiles, error: refError } = await supabase
          .from('reference_data_files')
          .select('config_id, file_name, row_count')
          .in('config_id', configIds);

        if (!refError && refFiles) {
          const refMap = new Map<string, { fileName: string; rowCount: number }>();
          refFiles.forEach((file) => {
            refMap.set(file.config_id, {
              fileName: file.file_name,
              rowCount: file.row_count,
            });
          });
          setReferenceDataInfo(refMap);
        }
      }
    } catch (error) {
      console.error('Error loading configurations:', error);
    }
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
      const { data: configData, error: configError } = await supabase
        .from('dimension_configurations')
        .upsert(
          {
            dataset_id: datasetId,
            dimension_key: configModal.dimension,
            column_name: configModal.column,
            config_data: config,
            is_configured: true,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'dataset_id,dimension_key,column_name',
          }
        )
        .select()
        .single();

      if (configError) {
        console.error('Config error:', configError);
        throw configError;
      }

      if (referenceFile && configData) {
        try {
          const text = await referenceFile.text();
          const lines = text.split('\n').filter(line => line.trim());

          if (lines.length === 0) {
            throw new Error('CSV file is empty');
          }

          const headers = lines[0].split(',').map(h => h.trim());

          const parsedData = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            const row: Record<string, string> = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            return row;
          });

          const { error: fileError } = await supabase
            .from('reference_data_files')
            .upsert(
              {
                config_id: configData.id,
                dataset_id: datasetId,
                file_name: referenceFile.name,
                column_names: headers,
                data: parsedData,
                row_count: parsedData.length,
                updated_at: new Date().toISOString(),
              },
              {
                onConflict: 'config_id',
              }
            );

          if (fileError) {
            console.error('File error:', fileError);
            throw fileError;
          }
        } catch (parseError) {
          console.error('CSV parsing error:', parseError);
          throw new Error(`Failed to parse CSV: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        }
      }

      await loadConfiguredColumns();
      alert('Configuration saved successfully!');
    } catch (error) {
      console.error('Error saving configuration:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error saving configuration: ${errorMessage}`);
    }
  }

  function getRuleTypeForDimension(dimensionKey: string): string {
    const ruleTypeMap: Record<string, string> = {
      completeness: 'must_be_present',
      uniqueness: 'must_be_unique',
      consistency: 'define_rule',
      validity: 'define_rule',
    };
    return ruleTypeMap[dimensionKey] || 'define_rule';
  }

  function getDescriptionForDimension(dimensionKey: string): string {
    const descriptionMap: Record<string, string> = {
      completeness: 'Data must be present',
      uniqueness: 'Data must be unique',
      consistency: 'Define Rule Description',
      validity: 'Define Rule Description',
    };
    return descriptionMap[dimensionKey] || 'Quality check';
  }

  async function handleExecute() {
    if (!hasTemplateAction) {
      alert('Please save or select a template before executing quality checks');
      return;
    }

    const unconfiguredItems: string[] = [];

    dimensions.forEach((dimension) => {
      if (!isReadyType(dimension.key)) {
        const columns = dimensionRules[dimension.key] || [];
        const configured = configuredColumns.get(dimension.key) || new Set();
        columns.forEach((col) => {
          if (!configured.has(col)) {
            unconfiguredItems.push(`${dimension.name} - ${col}`);
          }
        });
      }
    });

    if (unconfiguredItems.length > 0) {
      alert(
        `Please configure the following before executing:\n\n${unconfiguredItems.join('\n')}\n\nClick the yellow gear icon to configure each attribute.`
      );
      return;
    }

    setIsExecuting(true);

    try {
      await supabase
        .from('quality_rules')
        .delete()
        .eq('dataset_id', datasetId);

      await supabase
        .from('quality_results')
        .delete()
        .eq('dataset_id', datasetId);

      const allRules = [];

      dimensions.forEach((dimension) => {
        const columns = dimensionRules[dimension.key] || [];
        columns.forEach((column) => {
          allRules.push({
            dataset_id: datasetId,
            column_name: column,
            dimension: dimension.key,
            rule_type: getRuleTypeForDimension(dimension.key),
            rule_config: {},
            status: 'ready',
            description: getDescriptionForDimension(dimension.key),
          });
        });
      });

      const { data: rulesData, error: rulesError } = await supabase
        .from('quality_rules')
        .insert(allRules)
        .select();

      if (rulesError) throw rulesError;

      const results = [];
      for (const rule of rulesData) {
        if (rule.status === 'ready') {
          const result = await executeRule(rule, data.rows);
          results.push(result);
        }
      }

      const { error: resultsError } = await supabase
        .from('quality_results')
        .insert(results);

      if (resultsError) throw resultsError;

      onExecute(results);
    } catch (error) {
      console.error('Error executing rules:', error);
      alert('Error executing quality checks. Please try again.');
    } finally {
      setIsExecuting(false);
    }
  }

  function executeRule(rule: any, rows: Record<string, any>[]) {
    let passedCount = 0;
    let failedCount = 0;

    if (rule.rule_type === 'must_be_present') {
      for (const row of rows) {
        const value = row[rule.column_name];
        if (value && value.toString().trim() !== '') {
          passedCount++;
        } else {
          failedCount++;
        }
      }
    } else if (rule.rule_type === 'must_be_unique') {
      const values = new Set();
      for (const row of rows) {
        const value = row[rule.column_name];
        if (value && !values.has(value)) {
          values.add(value);
          passedCount++;
        } else {
          failedCount++;
        }
      }
    }

    const totalCount = passedCount + failedCount;
    const score = totalCount > 0 ? (passedCount / totalCount) * 100 : 0;

    return {
      dataset_id: datasetId,
      rule_id: rule.id,
      column_name: rule.column_name,
      dimension: rule.dimension,
      passed_count: passedCount,
      failed_count: failedCount,
      total_count: totalCount,
      score: score,
    };
  }

  const availableColumns = data.headers.filter(
    (header) => {
      return !Object.values(dimensionRules).some(columns => columns.includes(header));
    }
  );

  const totalConfigured = Object.values(dimensionRules).reduce(
    (sum, columns) => sum + columns.length,
    0
  );

  const isReadyType = (dimensionKey: string): boolean => {
    const readyDimensions = ['completeness', 'uniqueness'];
    return readyDimensions.includes(dimensionKey);
  };

  function getLogicDescriptionForDimension(dimensionKey: string): string {
    const logicMap: Record<string, string> = {
      completeness: 'Checks if all values in the selected attributes are present and not null or empty. Each row is examined to ensure data exists.',
      uniqueness: 'Verifies that all values in the selected attributes are unique with no duplicates. Each value must appear only once across all rows.',
      consistency: 'Validates data against defined patterns or reference datasets. Can check format consistency, cross-field validation, or match against master data files.',
      validity: 'Ensures data meets specific validation rules such as regex patterns, value ranges, allowed lists, or data type requirements.',
      accuracy: 'Compares data against reference sources or expected values to measure correctness. Can verify calculations or match against master datasets.',
      timeliness: 'Checks if data meets freshness requirements by validating age and update frequency against configured thresholds.',
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
          title={!hasTemplateAction ? 'Please save or select a template first' : ''}
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

      <div className={`grid grid-cols-1 gap-4 ${dimensions.length <= 2 ? 'lg:grid-cols-2' : dimensions.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
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
          <p className="text-sm">Go to Configuration to set up quality dimensions</p>
        </div>
      )}

      <DimensionConfigModal
        isOpen={configModal.isOpen}
        onClose={() =>
          setConfigModal({
            isOpen: false,
            dimension: null,
            dimensionName: '',
            column: '',
          })
        }
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Describe this template..."
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowSaveTemplateModal(false);
                    setTemplateName('');
                    setTemplateDescription('');
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
