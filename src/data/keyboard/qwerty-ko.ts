import { KeyboardLayoutData } from '@/types/keyboard';

export const layout: KeyboardLayoutData = {
  id: 'qwerty-ko',
  name: '두벌식',
  language: 'ko',
  rows: [
    // Row 0: Number row
    {
      keys: [
        { key: '`', code: 'Backquote', label: '`', shiftLabel: '~', finger: 'left-pinky', row: 0 },
        { key: '1', code: 'Digit1', label: '1', shiftLabel: '!', finger: 'left-pinky', row: 0 },
        { key: '2', code: 'Digit2', label: '2', shiftLabel: '@', finger: 'left-ring', row: 0 },
        { key: '3', code: 'Digit3', label: '3', shiftLabel: '#', finger: 'left-middle', row: 0 },
        { key: '4', code: 'Digit4', label: '4', shiftLabel: '$', finger: 'left-index', row: 0 },
        { key: '5', code: 'Digit5', label: '5', shiftLabel: '%', finger: 'left-index', row: 0 },
        { key: '6', code: 'Digit6', label: '6', shiftLabel: '^', finger: 'right-index', row: 0 },
        { key: '7', code: 'Digit7', label: '7', shiftLabel: '&', finger: 'right-index', row: 0 },
        { key: '8', code: 'Digit8', label: '8', shiftLabel: '*', finger: 'right-middle', row: 0 },
        { key: '9', code: 'Digit9', label: '9', shiftLabel: '(', finger: 'right-ring', row: 0 },
        { key: '0', code: 'Digit0', label: '0', shiftLabel: ')', finger: 'right-pinky', row: 0 },
        { key: '-', code: 'Minus', label: '-', shiftLabel: '_', finger: 'right-pinky', row: 0 },
        { key: '=', code: 'Equal', label: '=', shiftLabel: '+', finger: 'right-pinky', row: 0 },
        { key: 'Backspace', code: 'Backspace', label: 'Backspace', finger: 'right-pinky', row: 0, width: 2 },
      ],
    },
    // Row 1: Top row (Tab row)
    {
      keys: [
        { key: 'Tab', code: 'Tab', label: 'Tab', finger: 'left-pinky', row: 1, width: 1.5 },
        { key: 'ㅂ', code: 'KeyQ', label: 'ㅂ', shiftLabel: 'ㅃ', finger: 'left-pinky', row: 1 },
        { key: 'ㅈ', code: 'KeyW', label: 'ㅈ', shiftLabel: 'ㅉ', finger: 'left-ring', row: 1 },
        { key: 'ㄷ', code: 'KeyE', label: 'ㄷ', shiftLabel: 'ㄸ', finger: 'left-middle', row: 1 },
        { key: 'ㄱ', code: 'KeyR', label: 'ㄱ', shiftLabel: 'ㄲ', finger: 'left-index', row: 1 },
        { key: 'ㅅ', code: 'KeyT', label: 'ㅅ', shiftLabel: 'ㅆ', finger: 'left-index', row: 1 },
        { key: 'ㅛ', code: 'KeyY', label: 'ㅛ', finger: 'right-index', row: 1 },
        { key: 'ㅕ', code: 'KeyU', label: 'ㅕ', finger: 'right-index', row: 1 },
        { key: 'ㅑ', code: 'KeyI', label: 'ㅑ', finger: 'right-middle', row: 1 },
        { key: 'ㅐ', code: 'KeyO', label: 'ㅐ', shiftLabel: 'ㅒ', finger: 'right-ring', row: 1 },
        { key: 'ㅔ', code: 'KeyP', label: 'ㅔ', shiftLabel: 'ㅖ', finger: 'right-pinky', row: 1 },
        { key: '[', code: 'BracketLeft', label: '[', shiftLabel: '{', finger: 'right-pinky', row: 1 },
        { key: ']', code: 'BracketRight', label: ']', shiftLabel: '}', finger: 'right-pinky', row: 1 },
        { key: '\\', code: 'Backslash', label: '\\', shiftLabel: '|', finger: 'right-pinky', row: 1, width: 1.5 },
      ],
    },
    // Row 2: Home row (CapsLock row)
    {
      keys: [
        { key: 'CapsLock', code: 'CapsLock', label: 'CapsLock', finger: 'left-pinky', row: 2, width: 1.75 },
        { key: 'ㅁ', code: 'KeyA', label: 'ㅁ', finger: 'left-pinky', row: 2 },
        { key: 'ㄴ', code: 'KeyS', label: 'ㄴ', finger: 'left-ring', row: 2 },
        { key: 'ㅇ', code: 'KeyD', label: 'ㅇ', finger: 'left-middle', row: 2 },
        { key: 'ㄹ', code: 'KeyF', label: 'ㄹ', finger: 'left-index', row: 2 },
        { key: 'ㅎ', code: 'KeyG', label: 'ㅎ', finger: 'left-index', row: 2 },
        { key: 'ㅗ', code: 'KeyH', label: 'ㅗ', finger: 'right-index', row: 2 },
        { key: 'ㅓ', code: 'KeyJ', label: 'ㅓ', finger: 'right-index', row: 2 },
        { key: 'ㅏ', code: 'KeyK', label: 'ㅏ', finger: 'right-middle', row: 2 },
        { key: 'ㅣ', code: 'KeyL', label: 'ㅣ', finger: 'right-ring', row: 2 },
        { key: ';', code: 'Semicolon', label: ';', shiftLabel: ':', finger: 'right-pinky', row: 2 },
        { key: "'", code: 'Quote', label: "'", shiftLabel: '"', finger: 'right-pinky', row: 2 },
        { key: 'Enter', code: 'Enter', label: 'Enter', finger: 'right-pinky', row: 2, width: 2.25 },
      ],
    },
    // Row 3: Bottom row (Shift row)
    {
      keys: [
        { key: 'Shift', code: 'ShiftLeft', label: 'Shift', finger: 'left-pinky', row: 3, width: 2.25 },
        { key: 'ㅋ', code: 'KeyZ', label: 'ㅋ', finger: 'left-pinky', row: 3 },
        { key: 'ㅌ', code: 'KeyX', label: 'ㅌ', finger: 'left-ring', row: 3 },
        { key: 'ㅊ', code: 'KeyC', label: 'ㅊ', finger: 'left-middle', row: 3 },
        { key: 'ㅍ', code: 'KeyV', label: 'ㅍ', finger: 'left-index', row: 3 },
        { key: 'ㅠ', code: 'KeyB', label: 'ㅠ', finger: 'left-index', row: 3 },
        { key: 'ㅜ', code: 'KeyN', label: 'ㅜ', finger: 'right-index', row: 3 },
        { key: 'ㅡ', code: 'KeyM', label: 'ㅡ', finger: 'right-index', row: 3 },
        { key: ',', code: 'Comma', label: ',', shiftLabel: '<', finger: 'right-middle', row: 3 },
        { key: '.', code: 'Period', label: '.', shiftLabel: '>', finger: 'right-ring', row: 3 },
        { key: '/', code: 'Slash', label: '/', shiftLabel: '?', finger: 'right-pinky', row: 3 },
        { key: 'Shift', code: 'ShiftRight', label: 'Shift', finger: 'right-pinky', row: 3, width: 2.75 },
      ],
    },
    // Row 4: Space row
    {
      keys: [
        { key: 'Control', code: 'ControlLeft', label: 'Ctrl', finger: 'left-pinky', row: 4, width: 1.25 },
        { key: 'Meta', code: 'MetaLeft', label: 'Win', finger: 'left-pinky', row: 4, width: 1.25 },
        { key: 'Alt', code: 'AltLeft', label: 'Alt', finger: 'left-pinky', row: 4, width: 1.25 },
        { key: 'HanEng', code: 'Lang2', label: '한/영', finger: 'thumb', row: 4, width: 1.25 },
        { key: ' ', code: 'Space', label: 'Space', finger: 'thumb', row: 4, width: 6.25 },
        { key: 'Hanja', code: 'Lang1', label: '한자', finger: 'thumb', row: 4, width: 1.25 },
        { key: 'Alt', code: 'AltRight', label: 'Alt', finger: 'right-pinky', row: 4, width: 1.25 },
        { key: 'Meta', code: 'MetaRight', label: 'Win', finger: 'right-pinky', row: 4, width: 1.25 },
        { key: 'Control', code: 'ControlRight', label: 'Ctrl', finger: 'right-pinky', row: 4, width: 1.25 },
      ],
    },
  ],
};
