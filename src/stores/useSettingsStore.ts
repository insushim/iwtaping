'use client';
import { create } from 'zustand';
import { UserSettings, defaultSettings } from '@/types/user';

interface SettingsStore {
  settings: UserSettings;
  setSettings: (partial: Partial<UserSettings>) => void;
  resetSettings: () => void;
  loadSettings: () => void;
}

const STORAGE_KEY = 'typingverse-settings';

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: defaultSettings,

  setSettings: (partial) => {
    const newSettings = { ...get().settings, ...partial };
    set({ settings: newSettings });
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    }
  },

  resetSettings: () => {
    set({ settings: defaultSettings });
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  },

  loadSettings: () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          set({ settings: { ...defaultSettings, ...parsed } });
        } catch {
          // ignore
        }
      }
    }
  },
}));
