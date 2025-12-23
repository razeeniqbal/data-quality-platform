import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Score from './pages/Score';
import DimensionConfig from './pages/DimensionConfig';
import { LayoutGrid, Target, Network, Layers, Bell, AlertTriangle, User, Settings } from 'lucide-react';

type Page = 'dashboard' | 'score' | 'config' | 'osdu' | 'upcoming';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  function navigateToScore(projectId?: string) {
    setSelectedProjectId(projectId || null);
    setCurrentPage('score');
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
            <div className="flex items-center space-x-6">
              <div className="text-sm text-right">
                <div className="text-teal-50">PRODUCTION v1.0.00</div>
                <div className="text-xs text-teal-100">AEM ENERGY SOLUTION</div>
              </div>
              <div className="flex items-center space-x-3">
                <button className="p-2 hover:bg-teal-600 rounded-lg transition">
                  <AlertTriangle className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-teal-600 rounded-lg transition">
                  <Bell className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-teal-600 rounded-lg transition">
                  <User className="w-5 h-5" />
                </button>
              </div>
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
              onClick={() => setCurrentPage('score')}
              className={`flex items-center space-x-2 px-4 py-3 transition border-b-2 ${
                currentPage === 'score'
                  ? 'border-teal-400 text-white bg-slate-600'
                  : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-600'
              }`}
            >
              <Target className="w-5 h-5" />
              <span className="font-medium">Score</span>
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
        {currentPage === 'dashboard' && <Dashboard onNavigateToScore={navigateToScore} />}
        {currentPage === 'score' && <Score projectId={selectedProjectId} />}
        {currentPage === 'config' && <DimensionConfig />}
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

      <footer className="bg-gradient-to-r from-teal-700 to-emerald-600 text-white py-4 mt-12">
        <div className="container mx-auto px-6 text-center text-sm">
          Copyright © 2024 AEM Enersol. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default App;
