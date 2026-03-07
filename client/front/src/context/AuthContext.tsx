import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

interface ShippingAddress {
  fullName?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  area?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  avatarUrl?: string;
  shippingAddress?: ShippingAddress;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { name: string; email: string; password: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (payload: { token: string; password: string }) => Promise<void>;
  refreshAuth: () => Promise<void>;
  updateProfile: (payload: { name: string; phone?: string }) => Promise<void>;
  updatePassword: (payload: { currentPassword: string; nextPassword: string }) => Promise<void>;
  updateShipping: (payload: ShippingAddress) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = async () => {
    try {
      const payload = await apiRequest<AuthUser>('/auth/me');
      setUser(payload);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const payload = await apiRequest<{ user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    setUser(payload.user);
  };

  const register = async (payload: { name: string; email: string; password: string; phone?: string }) => {
    const result = await apiRequest<{ user: AuthUser }>('/auth/register', {
      method: 'POST',
      body: payload
    });
    setUser(result.user);
  };

  const logout = async () => {
    await apiRequest('/auth/logout', { method: 'POST' });
    setUser(null);
  };

  const requestPasswordReset = async (email: string) => {
    await apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: { email }
    });
  };

  const resetPassword = async (payload: { token: string; password: string }) => {
    await apiRequest('/auth/reset-password', {
      method: 'POST',
      body: payload
    });
  };

  const updateProfile = async (payload: { name: string; phone?: string }) => {
    const result = await apiRequest<AuthUser>('/users/me/profile', {
      method: 'PATCH',
      body: payload
    });
    setUser((current) => (current ? { ...current, ...result } : result));
  };

  const updatePassword = async (payload: { currentPassword: string; nextPassword: string }) => {
    await apiRequest('/users/me/password', {
      method: 'PATCH',
      body: payload
    });
  };

  const updateShipping = async (payload: ShippingAddress) => {
    const result = await apiRequest<ShippingAddress>('/users/me/shipping', {
      method: 'PATCH',
      body: payload
    });
    setUser((current) => (current ? { ...current, shippingAddress: result } : current));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        loading,
        login,
        register,
        logout,
        requestPasswordReset,
        resetPassword,
        refreshAuth,
        updateProfile,
        updatePassword,
        updateShipping
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
