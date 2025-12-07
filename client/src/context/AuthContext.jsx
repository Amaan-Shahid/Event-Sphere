import { createContext, useContext, useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [societyMemberships, setSocietyMemberships] = useState([]);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('es_token');
    const savedUser = localStorage.getItem('es_user');
    const savedMemberships = localStorage.getItem('es_memberships');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setSocietyMemberships(savedMemberships ? JSON.parse(savedMemberships) : []);
    }

    setLoading(false);
  }, []);

  const login = async (email, password) => {
    // We'll implement fully in Day 2
    const res = await axiosClient.post('/auth/login', { email, password });
    const { token: jwt, user, societyMemberships } = res.data;

    setToken(jwt);
    setUser(user);
    setSocietyMemberships(societyMemberships || []);

    localStorage.setItem('es_token', jwt);
    localStorage.setItem('es_user', JSON.stringify(user));
    localStorage.setItem('es_memberships', JSON.stringify(societyMemberships || []));

    return { user, jwt };
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setSocietyMemberships([]);
    localStorage.removeItem('es_token');
    localStorage.removeItem('es_user');
    localStorage.removeItem('es_memberships');
  };

  const value = {
    user,
    token,
    societyMemberships,
    isAuthenticated: !!token,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
