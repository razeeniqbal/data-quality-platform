import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import DimensionConfig from './pages/DimensionConfig';
import ProjectView from './pages/ProjectView';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import { useUser } from './contexts/UserContext';
import { LayoutGrid, Network, Layers, Settings, LogOut, Shield } from 'lucide-react';

type Page = 'dashboard' | 'config' | 'records' | 'osdu' | 'upcoming' | 'admin';

function AppContent() {
  const { user, logout } = useUser();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  if (!user) return <LoginPage />;

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
                <p className="text-xs text-teal-100">AEM ENERGY SOLUTIONS</p>
              </div>
            </div>
            {/* User identity pill */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-white/10 rounded-xl px-3 py-2">
                <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-teal-700 font-bold text-sm">
                    {user.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-white">{user.displayName}</span>
              </div>
              <button
                onClick={() => { setCurrentPage('dashboard'); setSelectedProjectId(null); logout(); }}
                className="flex items-center space-x-1.5 px-3 py-2 text-teal-100 hover:text-white hover:bg-white/10 rounded-xl transition text-sm"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </button>
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
            <button
              onClick={() => setCurrentPage('admin')}
              className={`flex items-center space-x-2 px-4 py-3 transition border-b-2 ${
                currentPage === 'admin'
                  ? 'border-teal-400 text-white bg-slate-600'
                  : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-600'
              }`}
            >
              <Shield className="w-5 h-5" />
              <span className="font-medium">Admin</span>
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
        {currentPage === 'admin' && <AdminPage />}
      </main>
    </div>
  );
}

export default AppContent;
