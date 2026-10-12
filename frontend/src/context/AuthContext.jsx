import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('tpo_auth_token'));
  const [loading, setLoading] = useState(true);

  // Load and verify existing token on startup
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('tpo_auth_token');
      if (storedToken) {
        try {
          const response = await apiClient.get('/auth/me');
          setUser(response.data);
          setToken(storedToken);
        } catch (error) {
          console.warn('Session expired or token invalid:', error.message);
          localStorage.removeItem('tpo_auth_token');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { access_token, role, user_id, full_name } = response.data;
      
      localStorage.setItem('tpo_auth_token', access_token);
      setToken(access_token);
      
      const userData = {
        id: user_id,
        email,
        full_name,
        role,
        designation: response.data.designation || '',
        permissions: response.data.permissions || [],
      };
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      const message = error.response?.data?.detail || 'Login failed. Please check your credentials.';
      return { success: false, error: message };
    }
  };

  const register = async (registrationData) => {
    try {
      const response = await apiClient.post('/auth/register', registrationData);
      const { access_token, role, user_id, full_name, email } = response.data;
      
      localStorage.setItem('tpo_auth_token', access_token);
      setToken(access_token);
      
      const userData = {
        id: user_id,
        email,
        full_name,
        role,
        designation: response.data.designation || '',
        permissions: response.data.permissions || [],
      };
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      const message = error.response?.data?.detail || 'Registration failed. Please check your details.';
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('tpo_auth_token');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        isStudent: user?.role === 'student',
        isTpoAdmin: user?.role === 'tpo_admin' || user?.role === 'tpo_staff',
        isSuperAdmin: user?.role === 'tpo_admin',
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
