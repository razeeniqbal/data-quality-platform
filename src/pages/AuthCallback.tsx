import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AuthCallbackProps {
  onAuthComplete: () => void;
}

export default function AuthCallback({ onAuthComplete }: AuthCallbackProps) {
  const { session } = useAuth();

  useEffect(() => {
    // Wait for session to be established
    if (session) {
      // Small delay to ensure everything is set up
      setTimeout(() => {
        onAuthComplete();
      }, 500);
    }
  }, [session, onAuthComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-600 font-medium">Completing sign in...</p>
      </div>
    </div>
  );
}
