import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import DimensionConfig from './pages/DimensionConfig';
import ProjectView from './pages/ProjectView';
import { LayoutGrid, Network, Layers, Settings } from 'lucide-react';

type Page = 'dashboard' | 'config' | 'records' | 'osdu' | 'upcoming';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  function navigateToRecords(projectId: string) {
    setSelectedProjectId(projectId);
    setCurrentPage('records');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      <header className="bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-500 text-white shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded flex items-center justify-center">
                <span className="text-teal-700 font-bold text-xl">G</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">Governance Plus</h1>
              </div>
            </div>
            <div className="text-sm text-right">
              <div className="text-teal-50">DEVELOPMENT v1.0.00</div>
              <div className="text-xs text-teal-100">AEM ENERGY SOLUTION</div>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-gradient-to-r from-slate-700 to-slate-600 shadow-md">
        <div className="container mx-auto px-6">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className={`flex items-center space-x-2 px-4 py-3 transition border-b-2 ${
                currentPage === 'dashboard'
                  ? 'border-teal-400 text-white bg-slate-600'
                  : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-600'
              }`}
            >
              <LayoutGrid className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </button>
            <button
              onClick={() => setCurrentPage('config')}
              className={`flex items-center space-x-2 px-4 py-3 transition border-b-2 ${
                currentPage === 'config'
                  ? 'border-teal-400 text-white bg-slate-600'
                  : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-600'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="font-medium">Configuration</span>
            </button>
            <button
              onClick={() => setCurrentPage('osdu')}
              className={`flex items-center space-x-2 px-4 py-3 transition border-b-2 ${
                currentPage === 'osdu'
                  ? 'border-teal-400 text-white bg-slate-600'
                  : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-600'
              }`}
            >
              <Network className="w-5 h-5" />
              <span className="font-medium">OSDU Matching</span>
            </button>
            <button
              onClick={() => setCurrentPage('upcoming')}
              className={`flex items-center space-x-2 px-4 py-3 transition border-b-2 ${
                currentPage === 'upcoming'
                  ? 'border-teal-400 text-white bg-slate-600'
                  : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-600'
              }`}
            >
              <Layers className="w-5 h-5" />
              <span className="font-medium">Upcoming Module</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-8 flex-1">
        {currentPage === 'dashboard' && (
          <Dashboard
            onNavigateToRecords={navigateToRecords}
          />
        )}
        {currentPage === 'config' && <DimensionConfig />}
        {currentPage === 'records' && selectedProjectId && (
          <ProjectView
            projectId={selectedProjectId}
            initialTab="records"
            onBack={() => setCurrentPage('dashboard')}
          />
        )}
        {currentPage === 'osdu' && (
          <div className="text-center py-20">
            <Network className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-slate-700">OSDU Matching</h2>
            <p className="text-slate-500 mt-2">Coming soon</p>
          </div>
        )}
        {currentPage === 'upcoming' && (
          <div className="text-center py-20">
            <Layers className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-slate-700">Upcoming Module</h2>
            <p className="text-slate-500 mt-2">Coming soon</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default AppContent;
