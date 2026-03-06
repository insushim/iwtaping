'use client';
import { create } from 'zustand';
import { TypingState, TypingResult, TypingMode, PracticeSession } from '@/types/typing';
import { nanoid } from 'nanoid';

interface TypingStore {
  currentText: string;
  mode: TypingMode;
  userInput: string;
  currentIndex: number;
  status: 'idle' | 'ready' | 'typing' | 'paused' | 'finished';
  startTime: number | null;
  endTime: number | null;
  isComposing: boolean;
  composingText: string;
  combo: number;
  maxCombo: number;
  result: TypingResult | null;
  sessions: PracticeSession[];

  setText: (text: string) => void;
  setMode: (mode: TypingMode) => void;
  setStatus: (status: TypingStore['status']) => void;
  setUserInput: (input: string) => void;
  setCurrentIndex: (index: number) => void;
  setStartTime: (time: number) => void;
  setEndTime: (time: number) => void;
  setIsComposing: (composing: boolean) => void;
  setComposingText: (text: string) => void;
  incrementCombo: () => void;
  resetCombo: () => void;
  setResult: (result: TypingResult) => void;
  addSession: (session: Omit<PracticeSession, 'id'>) => void;
  reset: () => void;
  loadSessions: () => void;
}

const SESSIONS_KEY = 'typingverse-sessions';

export const useTypingStore = create<TypingStore>((set, get) => ({
  currentText: '',
  mode: 'word',
  userInput: '',
  currentIndex: 0,
  status: 'idle',
  startTime: null,
  endTime: null,
  isComposing: false,
  composingText: '',
  combo: 0,
  maxCombo: 0,
  result: null,
  sessions: [],

  setText: (text) => set({ currentText: text, status: 'ready', userInput: '', currentIndex: 0, combo: 0, maxCombo: 0, result: null, startTime: null, endTime: null }),
  setMode: (mode) => set({ mode }),
  setStatus: (status) => set({ status }),
  setUserInput: (input) => set({ userInput: input }),
  setCurrentIndex: (index) => set({ currentIndex: index }),
  setStartTime: (time) => set({ startTime: time }),
  setEndTime: (time) => set({ endTime: time }),
  setIsComposing: (composing) => set({ isComposing: composing }),
  setComposingText: (text) => set({ composingText: text }),
  incrementCombo: () => {
    const { combo, maxCombo } = get();
    const newCombo = combo + 1;
    set({ combo: newCombo, maxCombo: Math.max(maxCombo, newCombo) });
  },
  resetCombo: () => set({ combo: 0 }),
  setResult: (result) => set({ result }),
  addSession: (session) => {
    const newSession = { ...session, id: nanoid() };
    const sessions = [...get().sessions, newSession];
    set({ sessions });
    if (typeof window !== 'undefined') {
      try {
        const existing = JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]');
        existing.push(newSession);
        if (existing.length > 1000) existing.splice(0, existing.length - 1000);
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(existing));
      } catch { /* ignore */ }
    }
  },
  reset: () => set({
    userInput: '', currentIndex: 0, status: 'ready', startTime: null, endTime: null,
    isComposing: false, composingText: '', combo: 0, maxCombo: 0, result: null,
  }),
  loadSessions: () => {
    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]');
        set({ sessions: saved });
      } catch { /* ignore */ }
    }
  },
}));
