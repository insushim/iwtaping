'use client';

import { useEffect } from 'react';
import { LevelUpOverlay } from './LevelUpOverlay';
import { CelebrationOverlay } from './CelebrationOverlay';
import { useProgressStore } from '@/stores/useProgressStore';
import { useMascotStore } from '@/stores/useMascotStore';

export function GlobalOverlays() {
  const { loadProgress, checkStreak } = useProgressStore();
  const { loadMascot } = useMascotStore();

  useEffect(() => {
    loadProgress();
    loadMascot();
    checkStreak();
  }, [loadProgress, loadMascot, checkStreak]);

  return (
    <>
      <LevelUpOverlay />
      <CelebrationOverlay />
    </>
  );
}
