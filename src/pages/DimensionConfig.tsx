import { useState, useEffect } from 'react';
import { Plus, Save, Trash2, Settings, AlertCircle, Info } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import type { QualityDimensionConfig } from '../types/database';

export default function DimensionConfig() {
  const [dimensions, setDimensions] = useState<QualityDimensionConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [hoveredDimension, setHoveredDimension] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    key: '',
    description: '',
    icon: 'target',
    is_active: true,
  });

  useEffect(() => {
    loadDimensions();
  }, []);

  async function loadDimensions() {
    try {
      setDimensions([
        { id: '1', name: 'Completeness', key: 'completeness', description: 'Check if all required fields have values', icon: 'check-circle', color: '#14b8a6', is_active: true, display_order: 1 },
        { id: '2', name: 'Uniqueness', key: 'uniqueness', description: 'Check for duplicate values', icon: 'fingerprint', color: '#8b5cf6', is_active: true, display_order: 2 },
        { id: '3', name: 'Consistency', key: 'consistency', description: 'Check data format and pattern consistency', icon: 'shield', color: '#f59e0b', is_active: true, display_order: 3 },
        { id: '4', name: 'Validity', key: 'validity', description: 'Validate data against rules', icon: 'check-square', color: '#ef4444', is_active: true, display_order: 4 },
      ]);
    } catch (error) {
      console.error('Error loading dimensions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!formData.name || !formData.key) {
      alert('Name and Key are required');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await apiClient.updateQualityDimension(editingId, {
          name: formData.name,
          description: formData.description,
          icon: formData.icon,
          is_active: formData.is_active,
        });
      } else {
        await apiClient.createQualityDimension({
          name: formData.name,
          key: formData.key,
          description: formData.description,
          icon: formData.icon,
          is_active: formData.is_active,
        });
      }

      setFormData({
        name: '',
        key: '',
        description: '',
        icon: 'target',
        is_active: true,
      });
      setEditingId(null);
      setShowAddForm(false);
      await loadDimensions();
    } catch (error) {
      console.error('Error saving dimension:', error);
      alert('Error saving dimension. The key might already exist.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this dimension?')) return;

    try {
      await apiClient.deleteQualityDimension(id);
      await loadDimensions();
    } catch (error) {
      console.error('Error deleting dimension:', error);
      alert('Error deleting dimension');
    }
  }

  async function handleToggleActive(dimension: QualityDimensionConfig) {
    try {
      await apiClient.updateQualityDimension(dimension.id, {
        is_active: !dimension.is_active,
      });
      await loadDimensions();
    } catch (error) {
      console.error('Error toggling dimension:', error);
    }
  }

  function handleEdit(dimension: QualityDimensionConfig) {
    setFormData({
      name: dimension.name,
      key: dimension.key,
      description: dimension.description,
      icon: dimension.icon,
      is_active: dimension.is_active,
    });
    setEditingId(dimension.id);
    setShowAddForm(true);
  }

  function handleCancel() {
    setFormData({
      name: '',
      key: '',
      description: '',
      icon: 'target',
      is_active: true,
    });
    setEditingId(null);
    setShowAddForm(false);
  }

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

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-600">Loading dimensions...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Quality Dimensions Configuration</h1>
          <p className="text-slate-600">Configure and manage quality checking dimensions</p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-teal-700 hover:to-emerald-700 transition shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Add Dimension</span>
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">
            {editingId ? 'Edit Dimension' : 'New Dimension'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                placeholder="e.g., Completeness"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Key * <span className="text-xs text-slate-500">(lowercase, no spaces)</span>
              </label>
              <input
                type="text"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                placeholder="e.g., completeness"
                disabled={!!editingId}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                rows={3}
                placeholder="Describe what this dimension measures"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Icon Name <span className="text-xs text-slate-500">(lucide-react)</span>
              </label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                placeholder="e.g., check-circle"
              />
            </div>
          </div>
          <div className="flex items-center space-x-3 mb-4">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
              Active
            </label>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleCancel}
              className="px-6 py-2 text-slate-600 hover:text-slate-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-2 rounded-lg hover:from-teal-700 hover:to-emerald-700 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-lg p-4 mb-6 border border-blue-200">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-2">Workflow Color System:</p>
            <div className="space-y-2 text-blue-700 mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-600 rounded"></div>
                <span><strong>Green</strong> - Attributes are configured and ready to execute</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-600 rounded"></div>
                <span><strong>Red</strong> - Attributes placed but need additional configuration</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-slate-400 rounded"></div>
                <span><strong>Gray</strong> - No attributes added yet</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {dimensions.map((dimension) => (
          <div
            key={dimension.id}
            className={`bg-white rounded-lg shadow-md p-6 transition ${
              dimension.is_active ? 'border-l-4' : 'opacity-60'
            }`}
            style={{ borderColor: dimension.is_active ? dimension.color : undefined }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: dimension.color }}
                >
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-slate-800 text-lg">{dimension.name}</h3>
                    <div className="relative">
                      <button
                        onMouseEnter={() => setHoveredDimension(dimension.id)}
                        onMouseLeave={() => setHoveredDimension(null)}
                        className="hover:bg-slate-200 p-1 rounded transition"
                      >
                        <Info className="w-4 h-4 text-slate-500" />
                      </button>
                      {hoveredDimension === dimension.id && (
                        <div className="absolute left-0 top-full mt-2 w-80 bg-slate-800 text-white text-xs rounded-lg p-3 shadow-xl z-50">
                          <div className="font-semibold mb-1">Logic:</div>
                          <div className="text-slate-200">{getLogicDescriptionForDimension(dimension.key)}</div>
                          <div className="absolute -top-1 left-4 w-2 h-2 bg-slate-800 transform rotate-45"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">{dimension.key}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleToggleActive(dimension)}
                  className={`px-3 py-1 text-xs font-medium rounded ${
                    dimension.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {dimension.is_active ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-4 min-h-[3rem]">
              {dimension.description || 'No description provided'}
            </p>
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <div className="flex items-center space-x-4 text-xs text-slate-500">
                <span>Icon: {dimension.icon}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleEdit(dimension)}
                  className="px-3 py-1 text-sm bg-teal-100 text-teal-700 rounded hover:bg-teal-200 transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(dimension.id)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {dimensions.length === 0 && (
        <div className="text-center py-20 bg-white rounded-lg shadow-md">
          <Settings className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-600 mb-2">No Dimensions Configured</h2>
          <p className="text-slate-500 mb-6">Get started by adding your first quality dimension</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-teal-700 hover:to-emerald-700 transition inline-flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add Dimension</span>
          </button>
        </div>
      )}
    </div>
  );
}
