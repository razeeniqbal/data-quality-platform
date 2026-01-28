import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import Score from './pages/Score';
import DimensionConfig from './pages/DimensionConfig';
import Records from './pages/Records';
import { LayoutGrid, Target, Network, Layers, Bell, Settings, LogOut } from 'lucide-react';

type Page = 'dashboard' | 'score' | 'config' | 'records' | 'osdu' | 'upcoming';

function AppContent() {
  const { user, profile, loading, signOut } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isAuthCallback, setIsAuthCallback] = useState(
    window.location.pathname === '/auth/callback'
  );

  function navigateToScore(projectId?: string) {
    setSelectedProjectId(projectId || null);
    setCurrentPage('score');
  }

  function navigateToRecords(projectId: string) {
    setSelectedProjectId(projectId);
    setCurrentPage('records');
  }

  async function handleSignOut() {
    try {
      await signOut();
      setShowUserMenu(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  function handleAuthComplete() {
    setIsAuthCallback(false);
    setCurrentPage('dashboard');
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Auth callback
  if (isAuthCallback) {
    return <AuthCallback onAuthComplete={handleAuthComplete} />;
  }

  // Not authenticated
  if (!user) {
    return <Login />;
  }

  // Authenticated - show main app
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
                  <Bell className="w-5 h-5" />
                </button>

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 p-2 hover:bg-teal-600 rounded-lg transition"
                  >
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.full_name || 'User'}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {profile?.full_name?.[0] || user.email?.[0] || 'U'}
                        </span>
                      </div>
                    )}
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl py-2 z-50">
                      <div className="px-4 py-3 border-b border-slate-200">
                        <p className="text-sm font-medium text-slate-800">
                          {profile?.full_name || 'User'}
                        </p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center space-x-2"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  )}
                </div>
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
        {currentPage === 'dashboard' && (
          <Dashboard
            onNavigateToScore={navigateToScore}
            onNavigateToRecords={navigateToRecords}
          />
        )}
        {currentPage === 'score' && <Score projectId={selectedProjectId} />}
        {currentPage === 'config' && <DimensionConfig />}
        {currentPage === 'records' && selectedProjectId && (
          <Records
            projectId={selectedProjectId}
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

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
