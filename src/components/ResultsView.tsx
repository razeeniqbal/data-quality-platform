import { useState, useEffect } from 'react';
import { Download, ArrowLeft, ChevronUp, CheckCircle, XCircle, Eye } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import type { QualityResult } from '../types/database';
import type { RowDetail } from './QualityConfiguration';

interface ResultWithDetails extends QualityResult {
  rowDetails?: RowDetail[];
}

interface ResultsViewProps {
  datasetId: string;
  initialResults?: any[] | null;
  onBack: () => void;
}

export default function ResultsView({ datasetId, initialResults, onBack }: ResultsViewProps) {
  const [results, setResults] = useState<ResultWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pass' | 'fail'>('all');
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const [detailFilter, setDetailFilter] = useState<'all' | 'pass' | 'fail'>('all');
  const [detailPage, setDetailPage] = useState(0);
  const ROWS_PER_PAGE = 20;

  useEffect(() => {
    loadResults();
  }, [datasetId]);

  async function loadResults() {
    try {
      if (initialResults && initialResults.length > 0) {
        setResults(initialResults as ResultWithDetails[]);
        setLoading(false);
        return;
      }

      const data = await apiClient.getQualityResults(datasetId) as ResultWithDetails[];
      setResults(data || []);
    } catch (error) {
      console.error('Error loading results:', error);
    } finally {
      setLoading(false);
    }
  }

  function getScoreColor(score: number) {
    if (score === 100) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  }

  function getScoreBg(score: number) {
    if (score === 100) return 'bg-green-500';
    if (score >= 75) return 'bg-yellow-500';
    if (score >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  }

  function getScoreRingColor(score: number) {
    if (score === 100) return 'border-green-500';
    if (score >= 75) return 'border-yellow-500';
    if (score >= 50) return 'border-orange-500';
    return 'border-red-500';
  }

  function handleExport() {
    const csvContent = [
      ['Column', 'Dimension', 'Passed', 'Failed', 'Total', 'Score'],
      ...results.map((result) => [
        result.column_name,
        result.dimension,
        result.passed_count,
        result.failed_count,
        result.total_count,
        `${result.score.toFixed(2)}%`,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quality-results.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleExpand(resultId: string) {
    if (expandedResult === resultId) {
      setExpandedResult(null);
    } else {
      setExpandedResult(resultId);
      setDetailFilter('all');
      setDetailPage(0);
    }
  }

  const filteredResults = results.filter((result) => {
    if (filterStatus === 'pass' && result.score < 100) return false;
    if (filterStatus === 'fail' && result.score === 100) return false;
    return true;
  });

  const overallScore =
    results.length > 0
      ? results.reduce((sum, r) => sum + r.score, 0) / results.length
      : 0;

  const totalPassed = results.reduce((sum, r) => sum + r.passed_count, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed_count, 0);
  const totalChecks = totalPassed + totalFailed;

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full mx-auto"></div>
        <p className="text-slate-600 mt-4">Loading results...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Configuration</span>
        </button>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button className="px-6 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg hover:from-teal-700 hover:to-emerald-700 transition font-medium">
            Publish
          </button>
        </div>
      </div>

      {/* Score Overview */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-8">
            {/* Score Circle */}
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="52" fill="none"
                  stroke={overallScore === 100 ? '#22c55e' : overallScore >= 75 ? '#eab308' : overallScore >= 50 ? '#f97316' : '#ef4444'}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(overallScore / 100) * 327} 327`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-3xl font-bold ${getScoreColor(overallScore)}`}>
                  {overallScore.toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-slate-800">Quality Score</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center px-4 py-2 bg-slate-50 rounded-lg">
                  <div className="text-2xl font-bold text-slate-800">{totalChecks.toLocaleString()}</div>
                  <div className="text-xs text-slate-500 font-medium">Total Checks</div>
                </div>
                <div className="text-center px-4 py-2 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{totalPassed.toLocaleString()}</div>
                  <div className="text-xs text-green-600 font-medium">Passed</div>
                </div>
                <div className="text-center px-4 py-2 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{totalFailed.toLocaleString()}</div>
                  <div className="text-xs text-red-600 font-medium">Failed</div>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex space-x-2">
            {(['all', 'pass', 'fail'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg transition text-sm font-medium ${
                  filterStatus === status
                    ? status === 'all' ? 'bg-teal-600 text-white'
                      : status === 'pass' ? 'bg-green-600 text-white'
                      : 'bg-red-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {status === 'all' ? 'All' : status === 'pass' ? 'Passed' : 'Failed'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dimension Score Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {['completeness', 'uniqueness', 'consistency', 'validity'].map((dimension) => {
          const dimensionResults = results.filter(r => r.dimension === dimension);
          const dimScore = dimensionResults.length > 0
            ? dimensionResults.reduce((sum, r) => sum + r.score, 0) / dimensionResults.length
            : -1;

          return (
            <div key={dimension} className="bg-white rounded-lg shadow-md p-4 text-center">
              <h3 className="font-semibold text-slate-600 text-sm uppercase tracking-wide mb-3 capitalize">{dimension}</h3>
              {dimScore >= 0 ? (
                <>
                  <div className={`text-3xl font-bold ${getScoreColor(dimScore)}`}>
                    {dimScore.toFixed(0)}%
                  </div>
                  <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getScoreBg(dimScore)}`}
                      style={{ width: `${dimScore}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    {dimensionResults.length} attribute{dimensionResults.length !== 1 ? 's' : ''} checked
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-400 py-4">Not configured</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detailed Results Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-800">Detailed Results</h3>
          <p className="text-sm text-slate-500 mt-1">Click on any row to view per-record details</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Column</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Dimension</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Score</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Passed</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Failed</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            {filteredResults.map((result) => {
                const isExpanded = expandedResult === result.id;
                const hasDetails = result.rowDetails && result.rowDetails.length > 0;

                const filteredDetails = (result.rowDetails || []).filter(d => {
                  if (detailFilter === 'pass') return d.passed;
                  if (detailFilter === 'fail') return !d.passed;
                  return true;
                });

                const totalPages = Math.ceil(filteredDetails.length / ROWS_PER_PAGE);
                const paginatedDetails = filteredDetails.slice(
                  detailPage * ROWS_PER_PAGE,
                  (detailPage + 1) * ROWS_PER_PAGE
                );

                return (
                  <tbody key={result.id}>
                    <tr
                      className={`border-b border-slate-100 transition cursor-pointer ${
                        isExpanded ? 'bg-teal-50' : 'hover:bg-slate-50'
                      }`}
                      onClick={() => hasDetails && toggleExpand(result.id)}
                    >
                      <td className="px-6 py-4">
                        <span className="font-medium text-slate-800">{result.column_name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="capitalize text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">
                          {result.dimension}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <div className={`w-10 h-10 rounded-full border-4 ${getScoreRingColor(result.score)} flex items-center justify-center`}>
                            <span className={`text-xs font-bold ${getScoreColor(result.score)}`}>
                              {result.score.toFixed(0)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-green-600 font-medium">{result.passed_count.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-medium ${result.failed_count > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                          {result.failed_count.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-slate-600">{result.total_count.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {hasDetails ? (
                          <button className="text-teal-600 hover:text-teal-800 transition">
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 mx-auto" />
                            ) : (
                              <Eye className="w-5 h-5 mx-auto" />
                            )}
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs">N/A</span>
                        )}
                      </td>
                    </tr>

                    {/* Expanded Row Details */}
                    {isExpanded && hasDetails && (
                      <tr>
                        <td colSpan={7} className="px-0 py-0">
                          <div className="bg-slate-50 border-t-2 border-b-2 border-teal-200">
                            {/* Detail Header */}
                            <div className="px-6 py-3 flex items-center justify-between bg-teal-50 border-b border-teal-100">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-semibold text-teal-800">
                                  Row-Level Details: {result.column_name} ({result.dimension})
                                </span>
                                <span className="text-xs text-teal-600">
                                  Showing {filteredDetails.length} of {result.rowDetails!.length} rows
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                {(['all', 'pass', 'fail'] as const).map((f) => (
                                  <button
                                    key={f}
                                    onClick={(e) => { e.stopPropagation(); setDetailFilter(f); setDetailPage(0); }}
                                    className={`px-3 py-1 rounded text-xs font-medium transition ${
                                      detailFilter === f
                                        ? f === 'all' ? 'bg-teal-600 text-white'
                                          : f === 'pass' ? 'bg-green-600 text-white'
                                          : 'bg-red-600 text-white'
                                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                    }`}
                                  >
                                    {f === 'all' ? 'All' : f === 'pass' ? 'Passed' : 'Failed'}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Detail Table */}
                            <div className="max-h-96 overflow-y-auto">
                              <table className="w-full">
                                <thead className="sticky top-0 bg-slate-100">
                                  <tr>
                                    <th className="text-left px-6 py-2 text-xs font-semibold text-slate-500 w-20">Row #</th>
                                    <th className="text-left px-6 py-2 text-xs font-semibold text-slate-500">Value</th>
                                    <th className="text-center px-6 py-2 text-xs font-semibold text-slate-500 w-24">Status</th>
                                    <th className="text-left px-6 py-2 text-xs font-semibold text-slate-500">Reason</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {paginatedDetails.map((detail) => (
                                    <tr
                                      key={detail.rowIndex}
                                      className={`border-b border-slate-100 ${
                                        detail.passed ? 'bg-white' : 'bg-red-50'
                                      }`}
                                    >
                                      <td className="px-6 py-2 text-sm text-slate-500 font-mono">
                                        {detail.rowIndex + 1}
                                      </td>
                                      <td className="px-6 py-2 text-sm text-slate-700 font-medium max-w-xs truncate">
                                        {detail.value !== null && detail.value !== undefined
                                          ? String(detail.value)
                                          : <span className="text-slate-400 italic">null</span>
                                        }
                                      </td>
                                      <td className="px-6 py-2 text-center">
                                        {detail.passed ? (
                                          <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                                        ) : (
                                          <XCircle className="w-5 h-5 text-red-500 mx-auto" />
                                        )}
                                      </td>
                                      <td className="px-6 py-2 text-xs text-slate-500">
                                        {detail.reason || '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                              <div className="px-6 py-3 flex items-center justify-between border-t border-slate-200 bg-white">
                                <span className="text-xs text-slate-500">
                                  Page {detailPage + 1} of {totalPages}
                                </span>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setDetailPage(Math.max(0, detailPage - 1)); }}
                                    disabled={detailPage === 0}
                                    className="px-3 py-1 text-xs bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                  >
                                    Previous
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setDetailPage(Math.min(totalPages - 1, detailPage + 1)); }}
                                    disabled={detailPage >= totalPages - 1}
                                    className="px-3 py-1 text-xs bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                  >
                                    Next
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                );
              })}
          </table>
        </div>

        {filteredResults.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <p className="font-medium">No results match the current filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
