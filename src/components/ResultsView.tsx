import { useState, useEffect } from 'react';
import { Download, ArrowLeft } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import type { QualityResult } from '../types/database';

interface ResultsViewProps {
  datasetId: string;
  onBack: () => void;
}

export default function ResultsView({ datasetId, onBack }: ResultsViewProps) {
  const [results, setResults] = useState<QualityResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pass' | 'fail'>('all');
  const [filterScore, setFilterScore] = useState<'all' | '100' | '75' | '50' | '0'>('all');

  useEffect(() => {
    loadResults();
  }, [datasetId]);

  async function loadResults() {
    try {
      const data = await apiClient.getQualityResults(datasetId) as QualityResult[];
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

  function getScoreBgColor(score: number) {
    if (score === 100) return 'bg-green-100 border-green-300';
    if (score >= 75) return 'bg-yellow-100 border-yellow-300';
    if (score >= 50) return 'bg-orange-100 border-orange-300';
    return 'bg-red-100 border-red-300';
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

  const filteredResults = results.filter((result) => {
    if (filterStatus === 'pass' && result.score < 100) return false;
    if (filterStatus === 'fail' && result.score === 100) return false;

    if (filterScore === '100' && result.score !== 100) return false;
    if (filterScore === '75' && (result.score < 75 || result.score >= 100)) return false;
    if (filterScore === '50' && (result.score < 50 || result.score >= 75)) return false;
    if (filterScore === '0' && result.score >= 50) return false;

    return true;
  });

  const groupedResults = filteredResults.reduce((acc, result) => {
    if (!acc[result.dimension]) {
      acc[result.dimension] = [];
    }
    acc[result.dimension].push(result);
    return acc;
  }, {} as Record<string, QualityResult[]>);

  const overallScore =
    results.length > 0
      ? results.reduce((sum, r) => sum + r.score, 0) / results.length
      : 0;

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

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Quality Score</h2>
            <div className={`text-5xl font-bold ${getScoreColor(overallScore)}`}>
              {overallScore.toFixed(0)}%
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg transition ${
                  filterStatus === 'all'
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus('pass')}
                className={`px-4 py-2 rounded-lg transition ${
                  filterStatus === 'pass'
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                Pass
              </button>
              <button
                onClick={() => setFilterStatus('fail')}
                className={`px-4 py-2 rounded-lg transition ${
                  filterStatus === 'fail'
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                Failed
              </button>
            </div>
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => setFilterScore('100')}
                className={`px-4 py-2 rounded-lg transition font-bold ${
                  filterScore === '100'
                    ? 'bg-green-600 text-white'
                    : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                }`}
              >
                100%
              </button>
              <button
                onClick={() => setFilterScore('75')}
                className={`px-4 py-2 rounded-lg transition font-bold ${
                  filterScore === '75'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-300'
                }`}
              >
                75%
              </button>
              <button
                onClick={() => setFilterScore('50')}
                className={`px-4 py-2 rounded-lg transition font-bold ${
                  filterScore === '50'
                    ? 'bg-orange-600 text-white'
                    : 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300'
                }`}
              >
                50%
              </button>
              <button
                onClick={() => setFilterScore('0')}
                className={`px-4 py-2 rounded-lg transition font-bold ${
                  filterScore === '0'
                    ? 'bg-red-600 text-white'
                    : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300'
                }`}
              >
                0%
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {['completeness', 'consistency', 'validity', 'uniqueness'].map((dimension) => {
          const dimensionResults = groupedResults[dimension] || [];

          return (
            <div key={dimension} className="bg-white rounded-lg shadow-md p-4">
              <h3 className="font-bold text-slate-800 mb-4 capitalize">{dimension}</h3>
              <div className="space-y-2">
                {dimensionResults.map((result) => (
                  <div
                    key={result.id}
                    className={`p-3 rounded-lg border ${getScoreBgColor(result.score)}`}
                  >
                    <div className="font-medium text-slate-800 text-sm mb-1">
                      {result.column_name}
                    </div>
                    <div className="text-xs text-slate-600">
                      {result.score.toFixed(0)}% completeness with {result.passed_count} records
                    </div>
                  </div>
                ))}
                {dimensionResults.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    No results
                  </div>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200 text-center text-sm text-slate-600">
                {dimensionResults.length} of {dimensionResults.length} attributes execute
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
