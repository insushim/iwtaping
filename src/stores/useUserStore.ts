'use client';
import { create } from 'zustand';
import { UserProfile } from '@/types/user';

interface UserStore {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  loadUser: () => void;
}

const USER_KEY = 'typingverse-user';

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user) => {
    set({ user });
    if (typeof window !== 'undefined') {
      if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
      else localStorage.removeItem(USER_KEY);
    }
  },
  loadUser: () => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(USER_KEY);
        if (saved) set({ user: JSON.parse(saved) });
      } catch { /* ignore */ }
    }
  },
}));
