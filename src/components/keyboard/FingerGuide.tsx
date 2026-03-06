'use client';

import { FingerType } from '@/types/typing';
import { getFingerColor, getFingerName } from '@/lib/typing/finger-mapper';

const fingers: FingerType[] = [
  'left-pinky', 'left-ring', 'left-middle', 'left-index',
  'right-index', 'right-middle', 'right-ring', 'right-pinky',
];

export function FingerGuide({ activeFinger }: { activeFinger?: FingerType }) {
  return (
    <div className="flex items-center justify-center gap-1 mt-2">
      {fingers.map((finger) => (
        <div
          key={finger}
          className="flex flex-col items-center"
          style={{ opacity: activeFinger === finger ? 1 : 0.3 }}
        >
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: getFingerColor(finger) }}
          />
          <span className="text-[8px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {getFingerName(finger).replace('왼손 ', '').replace('오른손 ', '')}
          </span>
        </div>
      ))}
    </div>
  );
}
