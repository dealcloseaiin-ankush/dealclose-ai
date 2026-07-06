import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { supabase } from '../lib/supabase'; // Supabase client import karein

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      try {
        const storedUser = localStorage.getItem('user');
        return storedUser ? JSON.parse(storedUser) : null;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true); // Initial loading state

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
    supabase.auth.signOut(); // Also sign out from Supabase
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // Google se login hone ke baad ye chalega
          const { data } = await api.post('/users/supabase-auth', {
            email: session.user.email,
            supabaseId: session.user.id,
            name: session.user.user_metadata.full_name,
          });
          // Humare backend se mila token aur user data save karein
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          setUser(data.user);
          api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        } else if (event === 'SIGNED_OUT') {
          logout();
        }
        setLoading(false);
      }
    );

    // Check initial session on load
    const checkInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && localStorage.getItem('token')) {
        // User has our token but not supabase's, probably email/pass login
        // We are already handling this in useState initial value
      }
      setLoading(false);
    };

    checkInitialSession();

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/users/login', { email, password });
    localStorage.setItem('token', data.token);
    // 🐛 FIX: Response se 'user' object ko use karein, na ki root 'data' ko
    const storedUser = data.user;
    if (storedUser) {
      localStorage.setItem('user', JSON.stringify(storedUser));
      setUser(storedUser);
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      return storedUser;
    }
    return null;
  };

  const register = async (fullName, email, password) => {
    const { data } = await api.post('/users/register', { fullName, email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    return data.user;
  };

  const value = { user, login, register, logout, loading };
  
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
