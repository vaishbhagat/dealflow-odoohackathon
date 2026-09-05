import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const demoAccounts = {
    ADMIN: { email: 'admin@gadaelectronics.com', role: 'ADMIN', name: 'Jethalal Gada' },
    SALES_MANAGER: { email: 'manager@gadaelectronics.com', role: 'SALES_MANAGER', name: 'Natu Kaka' },
    FINANCE_OPERATIONS: { email: 'finance@gadaelectronics.com', role: 'FINANCE_OPERATIONS', name: 'Chandar' },
    SALES_REP: { email: 'rep@gadaelectronics.com', role: 'SALES_REP', name: 'Bhagha' },
    CUSTOMER: { email: 'customer@metrooffice.com', role: 'CUSTOMER', name: 'Krish (Metro Office Systems)' },
  };

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = localStorage.getItem('dealflow_token');
      if (!token) {
        setLoading(false);
        return;
      }
      const data = await api.get('/auth/me');
      if (data.success && data.user) {
        setUser(data.user);
      } else {
        localStorage.removeItem('dealflow_token');
      }
    } catch (err) {
      console.warn('User load failed:', err.message);
      localStorage.removeItem('dealflow_token');
    } finally {
      setLoading(false);
    }
  };

  const loginWithCredentials = async (email, password) => {
    setLoading(true);
    try {
      const data = await api.post('/auth/login', { email, password });
      if (data.success) {
        localStorage.setItem('dealflow_token', data.token);
        setUser(data.user);
        return { success: true, user: data.user };
      }
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: error.error || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const signupUser = async ({ name, email, password, role, salesTeamId }) => {
    setLoading(true);
    try {
      const data = await api.post('/auth/signup', { name, email, password, role, salesTeamId });
      if (data.success) {
        localStorage.setItem('dealflow_token', data.token);
        setUser(data.user);
        return { success: true, user: data.user };
      }
    } catch (error) {
      console.error('Signup failed:', error);
      return { success: false, error: error.error || 'Signup failed' };
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (credentialResponse) => {
    setLoading(true);
    try {
      const data = await api.post('/auth/google', { credential: credentialResponse.credential });
      if (data.success) {
        localStorage.setItem('dealflow_token', data.token);
        setUser(data.user);
        return { success: true, user: data.user };
      }
    } catch (error) {
      console.error('Google login failed:', error);
      return { success: false, error: error.error || error.message || 'Google login failed' };
    } finally {
      setLoading(false);
    }
  };

  const magicLogin = async ({ email, quoteId }) => {
    setLoading(true);
    try {
      const data = await api.post('/auth/magic-link-login', { email, quoteId });
      if (data.success) {
        localStorage.setItem('dealflow_token', data.token);
        setUser(data.user);
        return { success: true, user: data.user, targetUrl: data.targetUrl };
      }
    } catch (error) {
      console.error('Magic link failed:', error);
      return { success: false, error: error.error || 'Magic link login failed' };
    } finally {
      setLoading(false);
    }
  };

  const loginAsGuest = async () => {
    setLoading(true);
    try {
      const data = await api.post('/auth/guest');
      if (data.success) {
        localStorage.setItem('dealflow_token', data.token);
        setUser(data.user);
        return { success: true, user: data.user };
      }
    } catch (error) {
      console.error('Guest login failed:', error);
      const fallbackGuest = {
        id: 999999,
        name: 'Guest User',
        email: 'guest@gadaelectronics.com',
        role: 'GUEST',
        active: true,
      };
      setUser(fallbackGuest);
      return { success: true, user: fallbackGuest };
    } finally {
      setLoading(false);
    }
  };

  const switchRole = async (targetRole) => {
    if (targetRole === 'GUEST') {
      return await loginAsGuest();
    }
    const demo = demoAccounts[targetRole];
    if (demo) {
      return await loginWithCredentials(demo.email, 'password123');
    }
  };

  const logout = () => {
    localStorage.removeItem('dealflow_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isGuest: user?.role === 'GUEST',
        loading,
        login: loginWithCredentials,
        loginAsGuest,
        signup: signupUser,
        loginWithGoogle,
        magicLogin,
        logout,
        switchRole,
        demoAccounts,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
