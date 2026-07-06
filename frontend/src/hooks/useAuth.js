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

  const clearSupabaseStorage = () => {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        localStorage.removeItem(key);
      }
    });
  };

  const clearLocalAuth = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
  };

  const logout = async () => {
    sessionStorage.setItem('auth_logout_requested', 'true');
    clearLocalAuth();
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
      console.warn('Supabase logout failed, clearing local session anyway:', error.message);
    } finally {
      clearLocalAuth();
      clearSupabaseStorage();
    }
  };

  useEffect(() => {
    const syncSupabaseSession = async (session) => {
      const { data } = await api.post('/users/supabase-auth', {
        email: session.user.email,
        supabaseId: session.user.id,
        name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email,
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          const logoutRequested = sessionStorage.getItem('auth_logout_requested') === 'true';
          if (logoutRequested) {
            clearLocalAuth();
            clearSupabaseStorage();
            if (session) {
              await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
            }
            if (event === 'SIGNED_OUT' || !session) {
              sessionStorage.removeItem('auth_logout_requested');
            }
            return;
          }

          if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
            // Google se login hone ke baad backend JWT create/sync karein.
            await syncSupabaseSession(session);
          } else if (event === 'SIGNED_OUT') {
            clearLocalAuth();
            clearSupabaseStorage();
            sessionStorage.removeItem('auth_logout_requested');
          }
        } catch (error) {
          console.error('Google login sync failed:', error.response?.data || error.message);
          clearLocalAuth();
        } finally {
          setLoading(false);
        }
      }
    );

    // Check initial session on load
    const checkInitialSession = async () => {
      try {
        const logoutRequested = sessionStorage.getItem('auth_logout_requested') === 'true';
        if (logoutRequested) {
          clearLocalAuth();
          clearSupabaseStorage();
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          sessionStorage.removeItem('auth_logout_requested');
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await syncSupabaseSession(session);
        }
      } catch (error) {
        console.error('Initial auth check failed:', error.response?.data || error.message);
        if (!localStorage.getItem('token')) clearLocalAuth();
      } finally {
        setLoading(false);
      }
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
