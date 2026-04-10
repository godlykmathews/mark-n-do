import { create } from 'zustand';

interface AppState {
  currentFolderId: string | null;
  setCurrentFolderId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentFolderId: null,
  setCurrentFolderId: (id) => set({ currentFolderId: id }),
}));