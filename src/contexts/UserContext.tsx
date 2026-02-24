import { createContext, useContext, useState } from 'react';
import { apiClient } from '../lib/api-client';

interface User {
  id: string;
  displayName: string;
  role: 'admin' | 'user';
}

interface UserContextValue {
  user: User | null;
  isLoggingIn: boolean;
  loginError: string | null;
  login: (displayName: string) => Promise<void>;
  logout: () => void;
}

const STORAGE_KEY = 'dq_current_user';

const UserContext = createContext<UserContextValue>({
  user: null,
  isLoggingIn: false,
  loginError: null,
  login: async () => {},
  logout: () => {},
});

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'id' in parsed &&
      'displayName' in parsed &&
      'role' in parsed &&
      typeof (parsed as Record<string, unknown>).id === 'string' &&
      typeof (parsed as Record<string, unknown>).displayName === 'string' &&
      ((parsed as Record<string, unknown>).role === 'admin' ||
        (parsed as Record<string, unknown>).role === 'user')
    ) {
      const p = parsed as Record<string, unknown>;
      return {
        id: p.id as string,
        displayName: p.displayName as string,
        role: p.role as 'admin' | 'user',
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  async function login(displayName: string) {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const row = await apiClient.loginOrCreateUser(displayName);
      const u: User = {
        id: row.id as string,
        displayName: row.display_name as string,
        role: (row.role as 'admin' | 'user') ?? 'user',
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      setUser(u);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Failed to connect. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setLoginError(null);
  }

  return (
    <UserContext.Provider value={{ user, isLoggingIn, loginError, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
