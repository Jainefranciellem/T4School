import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiFetch } from '@/lib/api';
import { getAccessToken, setTokens, clearTokens } from '@/lib/auth-storage';

interface User {
  id: string;
  email: string;
  nome: string;
  role: 'admin' | 'student';
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    nome: string;
    role: 'ADMIN' | 'INSTRUTOR';
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem('T4School_user');
    if (storedUser && getAccessToken()) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('T4School_user');
      }
    } else {
      localStorage.removeItem('T4School_user');
      clearTokens();
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    try {
      const response = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      const loggedInUser: User = {
        id: response.user.id,
        email: response.user.email,
        nome: response.user.nome,
        role: response.user.role === 'ADMIN' ? 'admin' : 'student',
      };

      setTokens(response.accessToken, response.refreshToken);
      setUser(loggedInUser);
      localStorage.setItem('T4School_user', JSON.stringify(loggedInUser));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email ou senha incorretos',
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('T4School_user');
    clearTokens();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
