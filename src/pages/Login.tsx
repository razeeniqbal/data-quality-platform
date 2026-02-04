import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, CheckCircle, LayoutGrid, Mail } from 'lucide-react';

export default function Login() {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  // Email/Password form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, fullName);
      }
    } catch (err: any) {
      setError(err.message || `Failed to ${mode === 'signin' ? 'sign in' : 'sign up'}`);
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-teal-700 to-emerald-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl">G</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-center text-slate-800 mb-2">
            Governance Plus
          </h1>
          <p className="text-center text-slate-600 mb-8">
            Data Quality Platform
          </p>

          {/* Features */}
          <div className="space-y-3 mb-8">
            <div className="flex items-center space-x-3 text-sm text-slate-600">
              <CheckCircle className="w-5 h-5 text-teal-600" />
              <span>Secure Authentication</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-slate-600">
              <LayoutGrid className="w-5 h-5 text-teal-600" />
              <span>Collaborative Data Quality Projects</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-slate-600">
              <Shield className="w-5 h-5 text-teal-600" />
              <span>Enterprise-Grade Security</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4 mb-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                  placeholder="John Doe"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-teal-700 hover:to-emerald-700 transition shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                  <span className="font-medium">{mode === 'signin' ? 'Signing in...' : 'Creating account...'}</span>
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  <span className="font-medium">{mode === 'signin' ? 'Sign In' : 'Sign Up'}</span>
                </>
              )}
            </button>
          </form>

          {/* Toggle Sign In/Sign Up */}
          <div className="text-center">
            <button
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Footer */}
          <p className="text-center text-xs text-slate-500 mt-8">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>

        <p className="text-center text-sm text-slate-600 mt-6">
          Copyright 2024 AEM Enersol. All rights reserved.
        </p>
      </div>
    </div>
  );
}
