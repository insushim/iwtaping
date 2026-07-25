'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { soundManager } from '@/lib/sound/sound-manager';

/**
 * 설정값을 soundManager에 실제로 반영한다.
 * 이 배선이 없던 동안 설정 화면의 "효과음 / 게임 BGM" 토글은 저장만 되고 아무 소리도 바꾸지 못했다.
 * 또한 첫 사용자 제스처에서 AudioContext를 깨우고 CC0 효과음을 미리 디코드한다(첫 재생 지연 제거).
 */
export function AudioSettingsSync() {
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const sfx = useSettingsStore((s) => s.settings.sfx);
  const sfxVolume = useSettingsStore((s) => s.settings.sfxVolume);
  const gameBgm = useSettingsStore((s) => s.settings.gameBgm);
  const bgmVolume = useSettingsStore((s) => s.settings.bgmVolume);
  const keySoundVolume = useSettingsStore((s) => s.settings.keySoundVolume);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!soundManager) return;
    // 마스터는 1로 두고 채널별 볼륨(효과음·BGM·타건음)이 실제 조절값이 되게 한다.
    soundManager.setVolume(1);
    soundManager.setSfxEnabled(sfx);
    soundManager.setSfxVolume(sfxVolume);
    soundManager.setKeyVolume(keySoundVolume);
    soundManager.setBgmEnabled(gameBgm);
    soundManager.setBgmVolume(bgmVolume);
  }, [sfx, sfxVolume, gameBgm, bgmVolume, keySoundVolume]);

  useEffect(() => {
    if (!soundManager) return;
    const onFirstGesture = () => {
      soundManager?.resume();
      void soundManager?.preload();
    };
    window.addEventListener('pointerdown', onFirstGesture, { once: true });
    window.addEventListener('keydown', onFirstGesture, { once: true });
    return () => {
      window.removeEventListener('pointerdown', onFirstGesture);
      window.removeEventListener('keydown', onFirstGesture);
    };
  }, []);

  return null;
}
