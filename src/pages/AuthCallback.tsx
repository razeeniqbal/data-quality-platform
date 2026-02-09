import { useEffect } from 'react';

interface AuthCallbackProps {
  onAuthComplete: () => void;
}

export default function AuthCallback({ onAuthComplete }: AuthCallbackProps) {
  useEffect(() => {
    // Handle OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code && state) {
      // If you have an OAuth flow, process the code here
      console.log('Auth callback with code:', code);

      // For now, just complete the auth and navigate to dashboard
      setTimeout(() => {
        onAuthComplete();
      }, 1000);
    } else {
      // No callback parameters, go to dashboard
      onAuthComplete();
    }
  }, [onAuthComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-600 font-medium">Processing authentication...</p>
      </div>
    </div>
  );
}
