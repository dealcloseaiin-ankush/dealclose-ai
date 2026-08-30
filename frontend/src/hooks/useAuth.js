import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { supabase } from '../lib/supabase';

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

  const [loading, setLoading] = useState(() => {
    return !localStorage.getItem('token') && !localStorage.getItem('user');
  });

  const clearSupabaseStorage = () => {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {}
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
    clearSupabaseStorage();
    try {
      if (supabase?.auth) {
        await Promise.race([
          supabase.auth.signOut({ scope: 'global' }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
        ]);
      }
    } catch (error) {
      console.warn('Supabase logout skipped or failed:', error.message);
    } finally {
      clearLocalAuth();
      clearSupabaseStorage();
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    let isMounted = true;

    const syncSupabaseSession = async (session) => {
      if (!session?.user) return;
      try {
        const { data } = await api.post('/users/supabase-auth', {
          email: session.user.email,
          supabaseId: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email,
        });

        if (isMounted && data?.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          setUser(data.user);
          api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        }
      } catch (err) {
        console.warn('Supabase session backend sync skipped:', err.message);
      }
    };

    let authSubscription = null;
    try {
      if (supabase?.auth?.onAuthStateChange) {
        const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
          try {
            if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
              await syncSupabaseSession(session);
            } else if (event === 'SIGNED_OUT') {
              clearLocalAuth();
            }
          } catch (e) {
            console.warn('Auth state change error ignored:', e.message);
          } finally {
            if (isMounted) setLoading(false);
          }
        });
        authSubscription = data?.subscription;
      }
    } catch (sbErr) {
      console.warn('Supabase listener disabled:', sbErr.message);
      clearSupabaseStorage();
      if (isMounted) setLoading(false);
    }

    const checkInitialSession = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          api.get('/users/profile')
            .then(({ data }) => {
              const verifiedUser = data.user || data.data || data;
              if (isMounted && verifiedUser) {
                setUser(verifiedUser);
                localStorage.setItem('user', JSON.stringify(verifiedUser));
              }
            })
            .catch(profileErr => {
              if (profileErr.response?.status === 401) {
                console.warn('Token expired.');
                clearLocalAuth();
              }
            });
        }

        if (supabase?.auth?.getSession) {
          const sessionPromise = supabase.auth.getSession();
          const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ data: { session: null } }), 1200));
          const { data } = await Promise.race([sessionPromise, timeoutPromise]);
          if (data?.session) {
            await syncSupabaseSession(data.session);
          }
        }
      } catch (error) {
        console.warn('Initial session check caught error:', error.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkInitialSession();

    return () => {
      isMounted = false;
      if (authSubscription?.unsubscribe) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  // Dual mode login: supports login(email, password) OR login(token, userData)
  const login = async (emailOrToken, passwordOrUserData) => {
    if (typeof emailOrToken === 'string' && typeof passwordOrUserData === 'string') {
      const { data } = await api.post('/users/login', {
        email: emailOrToken,
        password: passwordOrUserData
      });
      const token = data.token;
      const userData = data.user || data.data || data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(userData);
      setLoading(false);
      return data;
    } else {
      localStorage.setItem('token', emailOrToken);
      localStorage.setItem('user', JSON.stringify(passwordOrUserData));
      api.defaults.headers.common['Authorization'] = `Bearer ${emailOrToken}`;
      setUser(passwordOrUserData);
      setLoading(false);
    }
  };

  const resetPassword = async (email, password) => {
    const { data } = await api.post('/users/reset-password', { email, password });
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      setUser(data.user);
      setLoading(false);
    }
    return data;
  };

  const register = async (regPayload) => {
    const { data } = await api.post('/users/register', regPayload);
    const token = data.token;
    const userData = data.user || data.data || data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
    setLoading(false);
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, resetPassword, logout, clearLocalAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
