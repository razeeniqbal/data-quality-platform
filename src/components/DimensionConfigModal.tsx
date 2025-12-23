import { useState } from 'react';
import { X, Save, AlertCircle, Upload, FileText, CheckCircle } from 'lucide-react';
import type { QualityDimension } from '../types/database';

interface DimensionConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  dimension: QualityDimension;
  dimensionName: string;
  column: string;
  existingConfig?: {
    config_data: Record<string, any>;
    is_configured: boolean;
  };
  onSave: (config: Record<string, any>, referenceFile?: File) => void;
}

export default function DimensionConfigModal({
  isOpen,
  onClose,
  dimension,
  dimensionName,
  column,
  existingConfig,
  onSave,
}: DimensionConfigModalProps) {
  const [config, setConfig] = useState<Record<string, any>>(
    existingConfig?.config_data || {}
  );
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<{
    fileName: string;
    rowCount: number;
    columns: string[];
  } | null>(null);

  if (!isOpen) return null;

  function handleSave() {
    onSave(config, referenceFile || undefined);
    onClose();
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    setReferenceFile(file);

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());

    setFilePreview({
      fileName: file.name,
      rowCount: lines.length - 1,
      columns: headers,
    });

    setConfig({
      ...config,
      referenceFileName: file.name,
      referenceColumns: headers,
    });
  }

  function renderConfigFields() {
    switch (dimension) {
      case 'validity':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Validation Type
              </label>
              <select
                value={config.validationType || 'pattern'}
                onChange={(e) =>
                  setConfig({ ...config, validationType: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
              >
                <option value="pattern">Pattern (Regex)</option>
                <option value="range">Range</option>
                <option value="list">Allowed Values List</option>
                <option value="datatype">Data Type</option>
              </select>
            </div>

            {config.validationType === 'pattern' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Regex Pattern
                </label>
                <input
                  type="text"
                  value={config.pattern || ''}
                  onChange={(e) =>
                    setConfig({ ...config, pattern: e.target.value })
                  }
                  placeholder="e.g., ^[A-Z]{2}[0-9]{4}$"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Enter a regular expression pattern to validate values
                </p>
              </div>
            )}

            {config.validationType === 'range' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Min Value
                  </label>
                  <input
                    type="number"
                    value={config.minValue || ''}
                    onChange={(e) =>
                      setConfig({ ...config, minValue: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Max Value
                  </label>
                  <input
                    type="number"
                    value={config.maxValue || ''}
                    onChange={(e) =>
                      setConfig({ ...config, maxValue: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>
            )}

            {config.validationType === 'list' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Allowed Values (comma-separated)
                </label>
                <textarea
                  value={config.allowedValues || ''}
                  onChange={(e) =>
                    setConfig({ ...config, allowedValues: e.target.value })
                  }
                  placeholder="e.g., Active, Inactive, Pending"
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
            )}

            {config.validationType === 'datatype' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Expected Data Type
                </label>
                <select
                  value={config.dataType || 'string'}
                  onChange={(e) =>
                    setConfig({ ...config, dataType: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="email">Email</option>
                  <option value="url">URL</option>
                </select>
              </div>
            )}
          </div>
        );

      case 'consistency':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Consistency Check Type
              </label>
              <select
                value={config.consistencyType || 'format'}
                onChange={(e) =>
                  setConfig({ ...config, consistencyType: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
              >
                <option value="format">Format Consistency</option>
                <option value="cross-field">Cross-Field Validation</option>
                <option value="reference">Reference Data</option>
              </select>
            </div>

            {config.consistencyType === 'format' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Expected Format Pattern
                </label>
                <input
                  type="text"
                  value={config.formatPattern || ''}
                  onChange={(e) =>
                    setConfig({ ...config, formatPattern: e.target.value })
                  }
                  placeholder="e.g., YYYY-MM-DD"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
            )}

            {config.consistencyType === 'cross-field' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Related Field for Validation
                </label>
                <input
                  type="text"
                  value={config.relatedField || ''}
                  onChange={(e) =>
                    setConfig({ ...config, relatedField: e.target.value })
                  }
                  placeholder="e.g., end_date"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Specify another column to validate against
                </p>
              </div>
            )}

            {config.consistencyType === 'reference' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Reference Data Source
                  </label>
                  <select
                    value={config.referenceSource || 'manual'}
                    onChange={(e) =>
                      setConfig({ ...config, referenceSource: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                  >
                    <option value="manual">Manual Entry</option>
                    <option value="csv">Upload CSV File</option>
                  </select>
                </div>

                {config.referenceSource === 'manual' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Reference Values (comma-separated)
                    </label>
                    <textarea
                      value={config.referenceValues || ''}
                      onChange={(e) =>
                        setConfig({ ...config, referenceValues: e.target.value })
                      }
                      placeholder="e.g., USD, EUR, GBP"
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                )}

                {config.referenceSource === 'csv' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Upload Master CSV
                    </label>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-teal-500 transition">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="csv-upload"
                      />
                      <label
                        htmlFor="csv-upload"
                        className="cursor-pointer flex flex-col items-center"
                      >
                        {filePreview ? (
                          <>
                            <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
                            <p className="text-sm font-medium text-slate-700 mb-1">
                              {filePreview.fileName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {filePreview.rowCount} rows, {filePreview.columns.length} columns
                            </p>
                            <p className="text-xs text-slate-400 mt-2">
                              Columns: {filePreview.columns.join(', ')}
                            </p>
                            <button
                              type="button"
                              className="mt-3 text-xs text-teal-600 hover:text-teal-700"
                            >
                              Click to change file
                            </button>
                          </>
                        ) : (
                          <>
                            <Upload className="w-12 h-12 text-slate-400 mb-3" />
                            <p className="text-sm font-medium text-slate-700 mb-1">
                              Click to upload master CSV
                            </p>
                            <p className="text-xs text-slate-500">
                              CSV file containing reference data for validation
                            </p>
                          </>
                        )}
                      </label>
                    </div>

                    {filePreview && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Match Column (from reference file)
                        </label>
                        <select
                          value={config.referenceMatchColumn || ''}
                          onChange={(e) =>
                            setConfig({ ...config, referenceMatchColumn: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                        >
                          <option value="">Select column to match against</option>
                          {filePreview.columns.map((col) => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-1">
                          Select which column from the reference file to validate against
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'accuracy':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Accuracy Check Method
              </label>
              <select
                value={config.accuracyMethod || 'reference'}
                onChange={(e) =>
                  setConfig({ ...config, accuracyMethod: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
              >
                <option value="reference">Compare to Reference Data</option>
                <option value="calculation">Calculation Verification</option>
                <option value="threshold">Threshold Check</option>
              </select>
            </div>

            {config.accuracyMethod === 'reference' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Upload Master CSV for Comparison
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-teal-500 transition">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="csv-upload-accuracy"
                  />
                  <label
                    htmlFor="csv-upload-accuracy"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    {filePreview ? (
                      <>
                        <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
                        <p className="text-sm font-medium text-slate-700 mb-1">
                          {filePreview.fileName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {filePreview.rowCount} rows, {filePreview.columns.length} columns
                        </p>
                        <p className="text-xs text-slate-400 mt-2">
                          Columns: {filePreview.columns.join(', ')}
                        </p>
                        <button
                          type="button"
                          className="mt-3 text-xs text-teal-600 hover:text-teal-700"
                        >
                          Click to change file
                        </button>
                      </>
                    ) : (
                      <>
                        <Upload className="w-12 h-12 text-slate-400 mb-3" />
                        <p className="text-sm font-medium text-slate-700 mb-1">
                          Click to upload master CSV
                        </p>
                        <p className="text-xs text-slate-500">
                          Reference file with correct/expected values
                        </p>
                      </>
                    )}
                  </label>
                </div>

                {filePreview && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Match Column (from reference file)
                    </label>
                    <select
                      value={config.referenceMatchColumn || ''}
                      onChange={(e) =>
                        setConfig({ ...config, referenceMatchColumn: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                    >
                      <option value="">Select column to compare</option>
                      {filePreview.columns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Accuracy Threshold (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={config.threshold || '95'}
                onChange={(e) =>
                  setConfig({ ...config, threshold: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">
                Minimum percentage of values that must match the reference data
              </p>
            </div>
          </div>
        );

      case 'timeliness':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Maximum Age (days)
              </label>
              <input
                type="number"
                min="0"
                value={config.maxAgeDays || '30'}
                onChange={(e) =>
                  setConfig({ ...config, maxAgeDays: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">
                Data older than this will be flagged
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Expected Update Frequency
              </label>
              <select
                value={config.updateFrequency || 'daily'}
                onChange={(e) =>
                  setConfig({ ...config, updateFrequency: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8 text-slate-500">
            No additional configuration needed for this dimension
          </div>
        );
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold">Configure {dimensionName}</h2>
            <p className="text-sm text-teal-50">Column: {column}</p>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-2 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">Configuration Required</p>
              <p>
                This dimension needs additional rules to properly validate your data.
                Configure the settings below to enable quality checking.
              </p>
            </div>
          </div>

          {renderConfigFields()}

          <div className="flex items-center justify-end mt-6 pt-6 border-t">
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg hover:from-teal-700 hover:to-emerald-700 transition flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
