import { describe, it, expect } from 'vitest';
import { resolveLabels, wordBubbleY, wordBubbleHeight, type LabelRequest, type LabelBox } from '@/lib/game/renderer';

/**
 * 단어 라벨이 몬스터를 가리면 무엇을 쳐야 하는지 보이지 않는다.
 * 실측(2026-07-25 브라우저): 킹덤 디펜스 병사 7마리 중 6마리가 가려졌고 최악은 97%였다.
 */
const overlap = (a: LabelBox, b: LabelBox) =>
  Math.max(0, Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2)) *
  Math.max(0, Math.min(a.y + a.h / 2, b.y + b.h / 2) - Math.max(a.y - a.h / 2, b.y - b.h / 2));

const req = (x: number, homeY: number, over: Partial<LabelRequest> = {}): LabelRequest => ({
  x, homeY, y: 0, w: 60, h: 28, dir: -1, offset: 0, ...over,
});

/** 게임이 실제로 그리는 상자 — y축은 homeY+offset, x축은 x+offset에 그린다. */
const drawn = (l: LabelRequest, axis: 'x' | 'y' = 'y'): LabelBox => ({
  x: axis === 'x' ? l.x + l.offset : l.x,
  y: axis === 'x' ? l.homeY : l.homeY + l.offset,
  w: l.w,
  h: l.h,
});

describe('말풍선 기본 위치', () => {
  it('스프라이트 위로 완전히 비켜난다', () => {
    const y = wordBubbleY({ spriteY: 200, spriteH: 50, fontSize: 13, gap: 8 });
    expect(y + wordBubbleHeight(13) / 2).toBeLessThanOrEqual(200 - 25); // 말풍선 아래끝 ≤ 몸통 위끝
  });

  it('위로 올리면 화면을 벗어날 때는 아래로 뒤집는다', () => {
    const y = wordBubbleY({ spriteY: 20, spriteH: 50, fontSize: 13, canvasH: 400 });
    expect(y).toBeGreaterThan(20);
  });

  it('아래 배치(우주)에서도 몸통 밖으로 나간다', () => {
    const y = wordBubbleY({ spriteY: 100, spriteH: 40, fontSize: 14, gap: 9, canvasH: 400, below: true });
    expect(y - wordBubbleHeight(14) / 2).toBeGreaterThanOrEqual(120);
  });
});

describe('라벨 겹침 해소', () => {
  it('몬스터 위에 겹치지 않는 자리를 찾는다', () => {
    // 라벨 기본 자리 한가운데에 다른 몬스터가 서 있는 상황
    const labels = [req(100, 100)];
    const sprites: LabelBox[] = [{ x: 100, y: 100, w: 40, h: 50 }];
    resolveLabels(labels, sprites, { canvasH: 500 });
    expect(overlap(drawn(labels[0]), sprites[0])).toBe(0);
  });

  it('빽빽하게 붙은 라벨끼리도 겹치지 않는다', () => {
    // 같은 x에 라벨 5개가 모두 같은 높이를 원하는 최악의 경우
    const labels = [0, 1, 2, 3, 4].map((i) => req(100, 300, { homeY: 300 + i }));
    resolveLabels(labels, [], { canvasH: 600 });
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const a = drawn(labels[i]);
        const b = drawn(labels[j]);
        expect(overlap(a, b), `${i}번과 ${j}번 라벨이 겹침`).toBe(0);
      }
    }
  });

  it('가로로만 밀어내는 축(산성비)에서는 y를 건드리지 않는다', () => {
    // 산성비의 y는 "얼마나 떨어졌나" = 게임 상태다. 옮기면 거짓 정보가 된다.
    const labels = [req(200, 150, { dir: 1 }), req(205, 150, { dir: 1 })];
    resolveLabels(labels, [], { canvasH: 500, canvasW: 800, axis: 'x' });
    expect(labels.every((l) => l.y === 150)).toBe(true);
    const a = drawn(labels[0], 'x');
    const b = drawn(labels[1], 'x');
    expect(overlap(a, b)).toBe(0);
  });

  it('자리가 빡빡해도 라벨은 몸통 곁을 떠나지 않는다', () => {
    // 라벨과 몸통을 잇는 연결선의 길이가 곧 이 이동량이다. 좀비 게임은 예전에
    // 230px까지 허용했는데, 그러면 단어가 자기 좀비와 반 화면 떨어져 풍선끈처럼
    // 보인다(실측 2026-07-27). 빠져나갈 자리가 아예 없어도 leash 안에 머물러야 한다.
    const wall: LabelBox[] = Array.from({ length: 20 }, (_, i) => ({ x: 100, y: 150 + i * 14, w: 200, h: 14 }));
    const labels = [req(100, 250)];
    resolveLabels(labels, wall, { canvasH: 600 });
    expect(Math.abs(labels[0].offset)).toBeLessThanOrEqual(72);
  });

  it('살짝 겹치는 가까운 자리가 멀리 떨어진 깨끗한 자리보다 낫다', () => {
    // 겹침을 px²로 재면 스치기만 해도 수백 점이라 거리 벌점을 압도한다 —
    // 그래서 라벨이 조금이라도 겹치면 무조건 멀리 도망갔다. 면적 비율로 환산해
    // "통째로 가릴 때 120px만큼 움직인다"는 교환비로 바꾼 것을 지키는 테스트.
    const labels = [req(100, 100)];
    const sprites: LabelBox[] = [{ x: 100, y: 70, w: 40, h: 20 }]; // 라벨 위끝에 2px만 걸침
    resolveLabels(labels, sprites, { canvasH: 500 });
    expect(Math.abs(labels[0].offset)).toBe(0);
  });

  it('자리가 없으면 라벨을 겹칠지언정 몬스터를 덮지 않는다', () => {
    // 위쪽이 몬스터로 꽉 막힌 상황: 라벨끼리 겹치는 쪽(가중치 1)이
    // 몬스터를 가리는 쪽(가중치 3)보다 낫다.
    const wall: LabelBox[] = Array.from({ length: 30 }, (_, i) => ({ x: 100, y: 300 - i * 10, w: 200, h: 12 }));
    const labels = [req(100, 300), req(100, 300)];
    resolveLabels(labels, wall, { canvasH: 400 });
    for (const l of labels) {
      const box = drawn(l);
      const covered = wall.reduce((sum, s) => sum + overlap(box, s), 0);
      expect(covered / (l.w * l.h)).toBeLessThan(0.5);
    }
  });
});
