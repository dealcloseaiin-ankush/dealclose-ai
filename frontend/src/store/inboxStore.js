import { create } from 'zustand';

// Manages global chat notifications and unread messages
export const useInboxStore = create((set) => ({
  unreadCount: 0,
  activeChatId: null,
  
  setUnreadCount: (count) => set({ unreadCount: count }),
  incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  clearUnread: () => set({ unreadCount: 0 }),
  
  setActiveChat: (chatId) => set({ activeChatId: chatId }),
  
  // Utility to play notification sound
  playNotificationSound: () => {
    // const audio = new Audio('/notification.mp3'); audio.play();
  }
}));