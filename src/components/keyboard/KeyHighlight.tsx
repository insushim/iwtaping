'use client';

import { useEffect, useState } from 'react';

interface KeyHighlightProps {
  className?: string;
}

export function useKeyHighlight() {
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [targetKey, setTargetKey] = useState<string | undefined>();
  const [errorKey, setErrorKey] = useState<string | undefined>();

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      setActiveKeys((prev) => new Set(prev).add(e.code));
    };
    const onUp = (e: KeyboardEvent) => {
      setActiveKeys((prev) => {
        const next = new Set(prev);
        next.delete(e.code);
        return next;
      });
      setErrorKey(undefined);
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  return { activeKeys, targetKey, setTargetKey, errorKey, setErrorKey };
}
