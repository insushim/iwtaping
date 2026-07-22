import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { getFingerForChar, getCodeForChar } from '@/lib/typing/finger-mapper';

/**
 * 회귀 방지 대상 (2026-07-22 교차검증 확정):
 * 오타 → 백스페이스 → 정정 시 분모가 "최대 도달 길이"로 고정되어
 * 최종 정확도가 100%로 세탁되던 버그.
 */
describe('useTypingEngine 정확도', () => {
  it('무결점 입력은 100%', () => {
    const { result } = renderHook(() => useTypingEngine({ text: 'abc', soundEnabled: false }));
    act(() => {
      result.current.handleInput('a', false);
      result.current.handleInput('ab', false);
      result.current.handleInput('abc', false);
    });
    expect(result.current.getResult().accuracy).toBe(100);
  });

  it('오타를 지우고 다시 쳐도 정확도가 100%로 세탁되지 않는다', () => {
    const { result } = renderHook(() => useTypingEngine({ text: 'abc', soundEnabled: false }));
    act(() => {
      result.current.handleInput('a', false);
      result.current.handleInput('ax', false); // 오타
      result.current.handleInput('a', false); // 백스페이스
      result.current.handleInput('ab', false); // 정정
      result.current.handleInput('abc', false);
    });
    const res = result.current.getResult();
    // 시도 4회(a, x, b, c) 중 3회 정답 = 75%
    expect(res.accuracy).toBeLessThan(100);
    expect(res.totalKeystrokes).toBe(4);
    expect(res.correctKeystrokes).toBe(3);
    expect(res.errorKeystrokes).toBe(1);
    expect(res.accuracy).toBeCloseTo(75, 5);
  });

  it('오타를 정정하지 않아도 정확도에 반영된다', () => {
    const { result } = renderHook(() => useTypingEngine({ text: 'abcd', soundEnabled: false }));
    act(() => {
      result.current.handleInput('a', false);
      result.current.handleInput('ax', false);
      result.current.handleInput('axc', false);
      result.current.handleInput('axcd', false);
    });
    expect(result.current.getResult().accuracy).toBeCloseTo(75, 5);
  });

  it('한글 입력도 시도 단위로 집계된다', () => {
    const { result } = renderHook(() => useTypingEngine({ text: '가나', soundEnabled: false }));
    act(() => {
      result.current.handleInput('가', false);
      result.current.handleInput('가다', false); // 오타
      result.current.handleInput('가', false);
      result.current.handleInput('가나', false); // 정정
    });
    const res = result.current.getResult();
    expect(res.totalKeystrokes).toBe(3);
    // calculateAccuracy는 소수 둘째 자리에서 반올림한다
    expect(res.accuracy).toBeCloseTo(66.67, 2);
  });

  it('손가락·키 통계가 실제로 수집된다 (빈 객체 반환 회귀 방지)', () => {
    const { result } = renderHook(() => useTypingEngine({ text: 'fj', soundEnabled: false }));
    act(() => {
      result.current.handleInput('f', false);
      result.current.handleInput('fj', false);
    });
    const res = result.current.getResult();
    expect(Object.keys(res.keyAccuracy).length).toBeGreaterThan(0);
    expect(res.fingerAccuracy['left-index']).toBe(100);
    expect(res.fingerAccuracy['right-index']).toBe(100);
  });

  it('반복 오타 키는 problemKeys로 잡힌다', () => {
    const { result } = renderHook(() => useTypingEngine({ text: 'jjjj', soundEnabled: false }));
    act(() => {
      // j 자리에 계속 다른 키를 침
      result.current.handleInput('k', false);
      result.current.handleInput('kk', false);
      result.current.handleInput('kkk', false);
      result.current.handleInput('kkkk', false);
    });
    expect(result.current.getResult().problemKeys).toContain('j');
  });
});

describe('손가락 매핑', () => {
  it('두벌식 자모를 물리 키 기준 손가락으로 매핑한다', () => {
    expect(getCodeForChar('ㄱ')).toBe('KeyR');
    expect(getFingerForChar('ㄱ')).toBe('left-index');
    expect(getFingerForChar('ㅏ')).toBe('right-middle'); // KeyK
    expect(getFingerForChar('f')).toBe('left-index');
    expect(getFingerForChar(' ')).toBe('thumb');
  });

  it('매핑 불가 문자는 null', () => {
    expect(getFingerForChar('★')).toBeNull();
  });
});
