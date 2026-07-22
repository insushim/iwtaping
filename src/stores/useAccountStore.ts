'use client';
import { create } from 'zustand';
import { ApiUser, getCachedUser, getToken, register, restoreSession, clearAuth } from '@/lib/api/client';

/**
 * 서버 계정 상태.
 *
 * 백엔드가 없어도 앱은 완전히 동작해야 하므로, 여기서의 실패는 전부
 * "온라인 기능 없음(offline)"이라는 정상 상태로 취급한다.
 */
export type AccountStatus = 'idle' | 'checking' | 'online' | 'offline' | 'unregistered';

interface AccountStore {
  user: ApiUser | null;
  status: AccountStatus;
  /** 앱 진입 시 1회 — 이미 등록된 기기면 조용히 세션을 복구한다. */
  init: () => Promise<void>;
  createAccount: (nickname: string, avatar?: string, gradeBand?: string) => Promise<ApiUser | null>;
  signOut: () => void;
}

let initPromise: Promise<void> | null = null;

export const useAccountStore = create<AccountStore>((set, get) => ({
  user: null,
  status: 'idle',

  init: async () => {
    // 여러 컴포넌트가 동시에 불러도 요청은 한 번만 나간다
    if (initPromise) return initPromise;
    if (get().status !== 'idle') return;

    set({ status: 'checking', user: getCachedUser() });

    initPromise = (async () => {
      const restored = await restoreSession();
      if (restored) {
        set({ user: restored, status: 'online' });
        return;
      }
      // 토큰은 있는데 복구가 안 되면(밴·계정 삭제·시크릿 교체) 정리한다
      if (getToken()) clearAuth();
      set({ user: null, status: getCachedUser() ? 'offline' : 'unregistered' });
    })();

    try {
      await initPromise;
    } finally {
      initPromise = null;
    }
  },

  createAccount: async (nickname, avatar = 'cat', gradeBand) => {
    const user = await register(nickname, avatar, gradeBand);
    set(user ? { user, status: 'online' } : { status: 'offline' });
    return user;
  },

  signOut: () => {
    clearAuth();
    set({ user: null, status: 'unregistered' });
  },
}));
