import { create } from 'zustand';

export const useCampaignStore = create((set) => ({
  campaigns: [],
  isLoading: false,
  
  setCampaigns: (campaigns) => set({ campaigns }),
  addCampaign: (campaign) => set((state) => ({ campaigns: [campaign, ...state.campaigns] })),
  setLoading: (status) => set({ isLoading: status })
}));