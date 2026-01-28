import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, ArrowLeft } from 'lucide-react';

interface RecordData {
  id: string;
  region: string;
  location: string;
  location_information: string;
  contract_name: string;
  operator_name: string;
  date: string;
  derived_date: string;
  crude_bbls: number;
  quality_score?: number;
  [key: string]: any;
}

interface RecordsProps {
  projectId: string;
  onBack: () => void;
}

export default function Records({ projectId, onBack }: RecordsProps) {
  const [records, setRecords] = useState<RecordData[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<RecordData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [projectName, setProjectName] = useState('');

  // Filter states
  const [regionFilter, setRegionFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [contractFilter, setContractFilter] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadRecords();
  }, [projectId]);

  useEffect(() => {
    applyFilters();
  }, [records, regionFilter, locationFilter, contractFilter, operatorFilter, searchQuery]);

  async function loadRecords() {
    setLoading(true);
    try {
      // Load project details
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      setProjectName(project?.name || '');

      // Load datasets with their quality results for this project
      const { data: datasets, error: datasetError } = await supabase
        .from('datasets')
        .select(`
          *,
          quality_results (
            result_data,
            overall_score
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (datasetError) throw datasetError;

      // Transform the data into records with quality scores
      const transformedRecords: RecordData[] = [];
      datasets?.forEach((dataset) => {
        const fileData = dataset.file_data || [];
        const qualityResults = dataset.quality_results?.[0];
        const overallScore = qualityResults?.overall_score || 0;

        fileData.forEach((row: any, index: number) => {
          transformedRecords.push({
            id: `${dataset.id}-${index}`,
            region: row.Region || row.region || '',
            location: row.Location || row.location || '',
            location_information: row['Location Information'] || row.location_information || '',
            contract_name: row['Contract Name'] || row.contract_name || '',
            operator_name: row['Operator Name'] || row.operator_name || '',
            date: row.Date || row.date || '',
            derived_date: row['Derived Date'] || row.derived_date || '',
            crude_bbls: parseFloat(row['Crude BBLS'] || row.crude_bbls || 0),
            quality_score: overallScore,
            ...row
          });
        });
      });

      setRecords(transformedRecords);
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    let filtered = [...records];

    if (regionFilter) {
      filtered = filtered.filter(r =>
        r.region?.toLowerCase().includes(regionFilter.toLowerCase())
      );
    }

    if (locationFilter) {
      filtered = filtered.filter(r =>
        r.location?.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    if (contractFilter) {
      filtered = filtered.filter(r =>
        r.contract_name?.toLowerCase().includes(contractFilter.toLowerCase())
      );
    }

    if (operatorFilter) {
      filtered = filtered.filter(r =>
        r.operator_name?.toLowerCase().includes(operatorFilter.toLowerCase())
      );
    }

    if (searchQuery) {
      filtered = filtered.filter(r =>
        Object.values(r).some(val =>
          String(val).toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    setFilteredRecords(filtered);
    setCurrentPage(1);
  }

  function clearFilters() {
    setRegionFilter('');
    setLocationFilter('');
    setContractFilter('');
    setOperatorFilter('');
    setSearchQuery('');
  }

  function exportToCSV() {
    const headers = ['Region', 'Location', 'Location Information', 'Contract Name', 'Operator Name', 'Date', 'Derived Date', 'Crude BBLS', 'Quality Score'];
    const csvData = filteredRecords.map(record => [
      record.region,
      record.location,
      record.location_information,
      record.contract_name,
      record.operator_name,
      record.date,
      record.derived_date,
      record.crude_bbls,
      record.quality_score || 0
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `records_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRecords = filteredRecords.slice(startIndex, endIndex);

  function getQualityScoreColor(score: number) {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  }

  if (loading) {
    return (
      <div className="text-center py-20 bg-white rounded-lg shadow-md">
        <div className="animate-spin w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-600 font-medium">Loading records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-200 rounded-lg transition"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-6 h-6 text-slate-700" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">{projectName}</h1>
            <p className="text-sm text-slate-500 mt-1">Data Records</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={exportToCSV}
            className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
          >
            <Filter className="w-4 h-4" />
            <span>{showFilters ? 'Hide' : 'Show'} Filters</span>
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Region</label>
              <input
                type="text"
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                placeholder="Filter by region..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
              <input
                type="text"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                placeholder="Filter by location..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Contract Name</label>
              <input
                type="text"
                value={contractFilter}
                onChange={(e) => setContractFilter(e.target.value)}
                placeholder="Filter by contract..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Operator Name</label>
              <input
                type="text"
                value={operatorFilter}
                onChange={(e) => setOperatorFilter(e.target.value)}
                placeholder="Filter by operator..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search all fields..."
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <button
              onClick={clearFilters}
              className="ml-4 px-4 py-2 text-sm text-slate-600 hover:text-slate-800 underline"
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Region</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Location Info</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Contract Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Operator Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Derived Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Crude BBLS</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">Quality Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {currentRecords.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 text-sm text-slate-700">{record.region}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{record.location}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{record.location_information}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{record.contract_name}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{record.operator_name}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{record.date}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{record.derived_date}</td>
                  <td className="px-4 py-3 text-sm text-slate-700 text-right">{record.crude_bbls.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getQualityScoreColor(record.quality_score || 0)}`}>
                      {record.quality_score?.toFixed(1) || '0.0'}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRecords.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500">No records found</p>
          </div>
        )}

        {filteredRecords.length > 0 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600">
                Showing {startIndex + 1} - {Math.min(endIndex, filteredRecords.length)} of {filteredRecords.length}
              </span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-slate-600 px-4">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
