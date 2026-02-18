import { useState } from 'react';
import { X, Plus, CheckCircle, AlertCircle, Settings, Info } from 'lucide-react';
import type { QualityDimension } from '../types/database';

interface QualityDimensionCardProps {
  title: string;
  dimension: QualityDimension;
  columns: string[];
  availableColumns: string[];
  onAddColumn: (dimension: QualityDimension, column: string) => void;
  onRemoveColumn: (dimension: QualityDimension, column: string) => void;
  onConfigure?: (dimension: QualityDimension, column: string) => void;
  isReadyType: boolean;
  configuredColumns?: Set<string>;
  logicDescription?: string;
}

export default function QualityDimensionCard({
  title,
  dimension,
  columns,
  availableColumns,
  onAddColumn,
  onRemoveColumn,
  onConfigure,
  isReadyType,
  configuredColumns = new Set(),
  logicDescription = '',
}: QualityDimensionCardProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLogicTooltip, setShowLogicTooltip] = useState(false);

  const hasColumns = columns.length > 0;
  const allConfigured = !isReadyType ? columns.every(col => configuredColumns.has(col)) : true;
  const statusColor = hasColumns ? (isReadyType || allConfigured ? 'green' : 'red') : 'slate';

  const statusClasses = {
    green: {
      bg: 'bg-green-50',
      border: 'border-green-300',
      text: 'text-green-800',
      chip: 'bg-green-600 text-white',
      headerBg: 'bg-green-100',
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      text: 'text-red-800',
      chip: 'bg-red-600 text-white',
      headerBg: 'bg-red-100',
    },
    slate: {
      bg: 'bg-slate-50',
      border: 'border-slate-300',
      text: 'text-slate-800',
      chip: 'bg-slate-600 text-white',
      headerBg: 'bg-slate-100',
    },
  };

  const classes = statusClasses[statusColor];

  function handleSelectColumn(column: string) {
    onAddColumn(dimension, column);
    setShowDropdown(false);
  }

  return (
    <div className={`${classes.bg} ${classes.border} border-2 rounded-lg min-h-[400px] flex flex-col transition-all`}>
      <div className={`${classes.headerBg} px-4 py-3 border-b-2 ${classes.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className={`font-bold ${classes.text} text-lg`}>{title}</h3>
            {logicDescription && (
              <div className="relative">
                <button
                  onMouseEnter={() => setShowLogicTooltip(true)}
                  onMouseLeave={() => setShowLogicTooltip(false)}
                  className="hover:bg-white/30 p-1 rounded transition"
                >
                  <Info className="w-4 h-4 text-slate-600" />
                </button>
                {showLogicTooltip && (
                  <div className="absolute left-0 top-full mt-2 w-72 bg-slate-800 text-white text-xs rounded-lg p-3 shadow-xl z-50">
                    <div className="font-semibold mb-1">Logic:</div>
                    <div className="text-slate-200">{logicDescription}</div>
                    <div className="absolute -top-1 left-4 w-2 h-2 bg-slate-800 transform rotate-45"></div>
                  </div>
                )}
              </div>
            )}
            {hasColumns && (
              <>
                {isReadyType || allConfigured ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
              </>
            )}
          </div>
          {hasColumns && (
            <span className={`text-xs font-semibold px-2 py-1 rounded ${classes.chip}`}>
              {isReadyType || allConfigured ? 'READY' : 'NEEDS CONFIG'}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-center mb-4">
          <div className="relative w-full">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-full text-sm bg-white border-2 border-dashed border-slate-300 hover:border-teal-500 text-slate-600 hover:text-teal-600 font-medium py-2 px-3 rounded-lg transition flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Attributes</span>
            </button>
            {showDropdown && availableColumns.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 bg-white border-2 border-slate-300 rounded-lg shadow-xl z-10 max-h-64 overflow-y-auto">
                <div className="p-2">
                  <div className="text-xs font-semibold text-slate-600 mb-2 px-2">
                    Available Attributes
                  </div>
                  {availableColumns.map((column) => (
                    <button
                      key={column}
                      onClick={() => handleSelectColumn(column)}
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-teal-50 hover:text-teal-800 rounded transition flex items-center justify-between group"
                    >
                      <span>{column}</span>
                      <Plus className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {showDropdown && availableColumns.length === 0 && (
              <div className="absolute left-0 right-0 mt-2 bg-white border-2 border-slate-300 rounded-lg shadow-xl z-10 p-4">
                <p className="text-xs text-slate-500 text-center">No more attributes available</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto">
          {columns.map((column) => {
            const isConfigured = isReadyType || configuredColumns.has(column);
            return (
              <div
                key={column}
                className={`${classes.chip} px-3 py-2 rounded-lg flex items-center justify-between text-sm font-medium shadow-md ${
                  !isReadyType && !isConfigured ? 'ring-2 ring-yellow-400' : ''
                }`}
              >
                <span className="truncate flex-1">{column}</span>
                <div className="flex items-center space-x-1 flex-shrink-0">
                  {!isReadyType && onConfigure && (
                    <button
                      onClick={() => onConfigure(dimension, column)}
                      className={`p-1 rounded transition ${
                        isConfigured
                          ? 'hover:bg-white/20 text-white'
                          : 'bg-yellow-400 hover:bg-yellow-500 text-yellow-900'
                      }`}
                      title={isConfigured ? 'Reconfigure' : 'Configure required'}
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onRemoveColumn(dimension, column)}
                    className="hover:bg-white/20 p-1 rounded transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {columns.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">
              <div className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <Plus className="w-8 h-8 text-slate-300" />
              </div>
              <p>No attributes added yet</p>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t-2 border-slate-200">
          <div className="flex items-center justify-between text-sm">
            <span className={`font-medium ${classes.text}`}>
              {columns.length} attribute{columns.length !== 1 ? 's' : ''}
            </span>
            {hasColumns && (
              <span className={`text-xs font-semibold ${isReadyType || allConfigured ? 'text-green-600' : 'text-red-600'}`}>
                {isReadyType || allConfigured ? '✓ Ready to execute' : '⚠ Configuration needed'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
