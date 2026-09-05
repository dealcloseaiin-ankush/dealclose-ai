import { create } from 'zustand';

// Manages global chat notifications and unread messages without screen-blocking popups
export const useInboxStore = create((set) => ({
  unreadCount: 0,
  activeChatId: null,
  recentNotifications: [],
  
  setUnreadCount: (count) => set({ unreadCount: count }),
  incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  clearUnread: () => set({ unreadCount: 0 }),
  
  addNotification: (notif) => set((state) => {
    // Avoid duplicate notifications by ID
    const exists = state.recentNotifications.some(n => (n._id && n._id === notif._id) || (n.id && n.id === notif.id));
    if (exists) return state;
    const updated = [notif, ...state.recentNotifications].slice(0, 30);
    return {
      recentNotifications: updated,
      unreadCount: state.unreadCount + 1
    };
  }),

  setNotifications: (list, count) => set({
    recentNotifications: list || [],
    unreadCount: count !== undefined ? count : (list ? list.length : 0)
  }),

  clearNotifications: () => set({
    recentNotifications: [],
    unreadCount: 0
  }),
  
  setActiveChat: (chatId) => set({ activeChatId: chatId }),
  
  // Discreet audio notification
  playNotificationSound: () => {
    try {
      const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
      audio.play().catch(() => {});
    } catch (e) {}
  }
}));