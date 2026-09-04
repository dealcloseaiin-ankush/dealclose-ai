import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const initialWorkspace = typeof window !== 'undefined' 
  ? (localStorage.getItem('dealclose_active_workspace') || localStorage.getItem('active_workspace_id') || 'main')
  : 'main';

const useWorkspaceStore = create(
  persist(
    (set) => ({
      activeWorkspaceId: initialWorkspace,
      setActiveWorkspaceId: (workspaceId) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('dealclose_active_workspace', workspaceId);
          localStorage.setItem('active_workspace_id', workspaceId);
        }
        set({ activeWorkspaceId: workspaceId });
      },
    }),
    { name: 'workspace-storage', storage: createJSONStorage(() => localStorage) }
  )
);

export default useWorkspaceStore;