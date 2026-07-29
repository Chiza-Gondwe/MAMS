/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useContext, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return { 
          username: payload.username, 
          role: payload.role,
          user_id: payload.user_id,
          member_id: payload.member_id,
          first_name: payload.first_name,
          last_name: payload.last_name,
          status: payload.status,
          is_temporary_password: payload.is_temporary_password,
          org_name: payload.org_name,
          org_type: payload.org_type
        };
      } catch (error) {
        console.error('Failed to restore authentication session:', error);
      }
    }
    return null;
  });
  const [loading] = useState(false);

  // Silently refresh profile data on mount/refresh
  useEffect(() => {
    if (user && user.username) {
      api.getCurrentUser()
        .then(data => {
          if (data && data.role) {
            setUser(prev => ({...prev, ...data}));
          }
        })
        .catch(err => console.error('Silent profile update failed', err));
    }
  }, []);

  const login = async (username, password) => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.access) {
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        const payload = JSON.parse(atob(data.access.split('.')[1]));
        setUser({ 
          username: payload.username, 
          role: payload.role,
          user_id: payload.user_id,
          member_id: payload.member_id,
          first_name: payload.first_name,
          last_name: payload.last_name,
          status: payload.status,
          is_temporary_password: payload.is_temporary_password,
          org_name: payload.org_name,
          org_type: payload.org_type
        });
        return { success: true };
      }
      return { success: false, error: data.detail || 'Invalid credentials' };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};