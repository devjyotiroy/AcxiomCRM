import React, { createContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

// create the context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // check if user is already logged in when the app loads
  useEffect(() => {
    checkLoggedInUser();
  }, []);

  const checkLoggedInUser = async () => {
    try {
      const data = await authService.getMe();
      if (data.success && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      // for error
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // login handler
  const login = async (email, password) => {
    const data = await authService.login({ email, password });
    if (data.success && data.user) {
      setUser(data.user);
    }
    return data;
  };

  // register handler
  const register = async (formData) => {
    const data = await authService.register(formData);
    if (data.success && data.user) {
      setUser(data.user);
    }
    return data;
  };

  // logout handler
  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkLoggedInUser }}>
      {children}
    </AuthContext.Provider>
  );
};

