import { create } from 'zustand';

// This replaces useAuth() hook gradually. It manages User Login State globally.
export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user')) || null,
  token: localStorage.getItem('token') || null,
  
  login: (userData, tokenData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', tokenData);
    set({ user: userData, token: tokenData });
  },
  
  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    set({ user: null, token: null });
    window.location.href = '/login';
  },
  
  updateUser: (updatedData) => set((state) => {
    const newUser = { ...state.user, ...updatedData };
    localStorage.setItem('user', JSON.stringify(newUser));
    return { user: newUser };
  }),
  
  isOwner: () => set((state) => state.user?.role === 'owner' || state.user?.role === 'superadmin')
}));