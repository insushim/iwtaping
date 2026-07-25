/**
 * Node 25는 `--localstorage-file` 없이 실행되면 메서드가 없는 localStorage 스텁을 전역에
 * 주입한다(`localStorage.setItem is not a function`). jsdom 것도 이 스텁에 가려진다.
 * 진행도·통계 스토어는 localStorage를 진실원으로 쓰므로, 동작하는 구현을 깔아준다.
 */
function installLocalStorage() {
  const usable =
    typeof globalThis.localStorage === 'object' &&
    globalThis.localStorage !== null &&
    typeof globalThis.localStorage.setItem === 'function';
  if (usable) return;

  const store = new Map<string, string>();
  const impl: Storage = {
    get length() { return store.size; },
    key: (i: number) => [...store.keys()][i] ?? null,
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(String(k), String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: impl,
    configurable: true,
    writable: true,
  });
}

installLocalStorage();

// 폴리필이 워커 단위로 재사용되므로 테스트 간 상태가 새지 않도록 매번 비운다.
// (이전에는 Node의 깨진 스텁이 즉시 throw해서 오염이 불가능했다 — 이제는 조용히 남는다)
if (typeof afterEach === 'function') {
  afterEach(() => {
    try {
      globalThis.localStorage?.clear();
    } catch { /* ignore */ }
  });
}
