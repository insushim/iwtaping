'use client';

import { useEffect, useState, memo } from 'react';
import { KeyboardLayoutData, KeyData } from '@/types/keyboard';
import { getFingerColor } from '@/lib/typing/finger-mapper';

interface VirtualKeyboardProps {
  layout: KeyboardLayoutData;
  activeKeys?: Set<string>;
  targetKey?: string;
  errorKey?: string;
  showFingerGuide?: boolean;
  className?: string;
}

const KeyComponent = memo(function KeyComponent({
  keyData,
  isActive,
  isTarget,
  isError,
  showFinger,
}: {
  keyData: KeyData;
  isActive: boolean;
  isTarget: boolean;
  isError: boolean;
  showFinger: boolean;
}) {
  const width = keyData.width || 1;
  const fingerColor = getFingerColor(keyData.finger);

  let stateClass = '';
  if (isError) stateClass = 'error';
  else if (isActive) stateClass = 'active';
  else if (isTarget) stateClass = 'target';

  return (
    <div
      className={`vk-key ${stateClass}`}
      style={{
        flex: `${width} 0 0%`,
        borderBottomColor: showFinger ? fingerColor : undefined,
        borderBottomWidth: showFinger ? '3px' : undefined,
      }}
    >
      <div className="flex flex-col items-center">
        {keyData.shiftLabel && (
          <span className="text-[9px] opacity-50 leading-none">{keyData.shiftLabel}</span>
        )}
        <span className="leading-none">{keyData.label}</span>
      </div>
    </div>
  );
});

export const VirtualKeyboard = memo(function VirtualKeyboard({
  layout,
  activeKeys = new Set(),
  targetKey,
  errorKey,
  showFingerGuide = true,
  className = '',
}: VirtualKeyboardProps) {
  return (
    <div className={`w-full max-w-[720px] mx-auto ${className}`}>
      <div className="flex flex-col gap-1">
        {layout.rows.map((row, rowIdx) => (
          <div key={rowIdx} className="flex gap-1" style={{ paddingLeft: `${rowIdx * 8}px` }}>
            {row.keys.map((keyData) => (
              <KeyComponent
                key={keyData.code}
                keyData={keyData}
                isActive={activeKeys.has(keyData.code)}
                isTarget={targetKey === keyData.code}
                isError={errorKey === keyData.code}
                showFinger={showFingerGuide}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
});
