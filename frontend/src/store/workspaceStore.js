import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useWorkspaceStore = create(
  persist(
    (set) => ({
      activeWorkspaceId: 'main',
      setActiveWorkspaceId: (workspaceId) => set({ activeWorkspaceId: workspaceId }),
    }),
    { name: 'workspace-storage', storage: createJSONStorage(() => localStorage) }
  )
);

export default useWorkspaceStore;