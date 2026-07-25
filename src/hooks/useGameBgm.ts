'use client';

import { useEffect } from 'react';
import { soundManager, BgmTrack } from '@/lib/sound/sound-manager';

/**
 * 게임 진행 중에만 BGM을 재생한다.
 * active가 false가 되거나 페이지를 떠나면 페이드아웃 후 정지하고, 트랙 기억까지 지운다
 * (안 그러면 설정에서 BGM을 다시 켰을 때 게임 밖에서 음악이 되살아난다).
 */
export function useGameBgm(track: BgmTrack, active: boolean): void {
  useEffect(() => {
    if (!soundManager) return;
    if (active) soundManager.playBgm(track);
    else soundManager.stopBgm(500, true);
  }, [track, active]);

  useEffect(() => {
    return () => {
      soundManager?.stopBgm(300, true);
    };
  }, []);
}
