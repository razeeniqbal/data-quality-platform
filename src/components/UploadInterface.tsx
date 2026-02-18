import { useState, useRef } from 'react';
import { Upload, FileText, Database, Key } from 'lucide-react';
import { apiClient } from '../lib/api-client';

interface UploadInterfaceProps {
  onDataUploaded: (data: any, datasetId: string) => void;
}

export default function UploadInterface({ onDataUploaded }: UploadInterfaceProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [datasetTitle, setDatasetTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!target.contains(relatedTarget)) {
      setIsDragging(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find((file) => file.name.toLowerCase().endsWith('.csv'));

    if (csvFile) {
      processFile(csvFile);
    } else {
      alert('Please upload a CSV file');
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }

  function parseCSV(text: string) {
    const lines = text.trim().split('\n');
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    function parseLine(line: string): string[] {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    }

    const headers = parseLine(lines[0]).filter(h => h.length > 0);
    if (headers.length === 0) {
      throw new Error('No headers found in CSV file');
    }

    const rows = lines.slice(1)
      .filter(line => line.trim().length > 0)
      .map((line) => {
        const values = parseLine(line);
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });

    if (rows.length === 0) {
      throw new Error('No data rows found in CSV file');
    }

    return { headers, rows };
  }

  async function processFile(file: File) {
    setIsProcessing(true);

    try {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        throw new Error('Please upload a CSV file');
      }

      const text = await file.text();
      const { headers, rows } = parseCSV(text);

      const projectName = datasetTitle.trim() || file.name.replace(/\.csv$/i, '');

      // Create project via API
      const projectData = await apiClient.createProject(
        projectName,
        `Imported from ${file.name}`
      ) as any;

      // Upload dataset via API
      const datasetData = await apiClient.uploadDataset(projectData.id, file) as any;

      onDataUploaded({ headers, rows }, datasetData.id);
    } catch (error: any) {
      console.error('Error processing file:', error);
      alert(error.message || 'Error processing file. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      {/* Dataset Title Input */}
      <div className="mb-6">
        <label htmlFor="dataset-title" className="block text-sm font-medium text-slate-700 mb-2">
          Dataset Title
        </label>
        <input
          id="dataset-title"
          type="text"
          placeholder="Enter dataset title (optional, defaults to filename)"
          value={datasetTitle}
          onChange={(e) => setDatasetTitle(e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
        />
      </div>

      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-16 text-center transition ${
          isDragging
            ? 'border-teal-500 bg-teal-50'
            : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        {isProcessing ? (
          <div>
            <div className="animate-spin w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-600 font-medium">Processing your file...</p>
          </div>
        ) : (
          <>
            <Upload className="w-16 h-16 text-teal-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-teal-600 hover:text-teal-700 font-bold underline"
              >
                Browse
              </button>{' '}
              or Drag & Drop (CSV files)
            </h2>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </>
        )}
      </div>

      <div className="mt-8 pt-8 border-t border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center space-x-2">
          <Database className="w-5 h-5 text-teal-600" />
          <span>Establish Connection</span>
          <span className="text-slate-500 font-normal text-sm">(API or SQL Credential)</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => alert('API Connection feature coming soon. For now, please use CSV file upload.')}
            className="flex items-center justify-center space-x-2 bg-slate-100 text-slate-600 px-6 py-4 rounded-lg hover:bg-slate-200 transition border border-slate-300"
          >
            <Key className="w-5 h-5" />
            <span className="font-medium">API Connection</span>
          </button>
          <button
            onClick={() => alert('SQL Credential feature coming soon. For now, please use CSV file upload.')}
            className="flex items-center justify-center space-x-2 bg-slate-100 text-slate-600 px-6 py-4 rounded-lg hover:bg-slate-200 transition border border-slate-300"
          >
            <FileText className="w-5 h-5" />
            <span className="font-medium">SQL Credential</span>
          </button>
        </div>
      </div>
    </div>
  );
}
