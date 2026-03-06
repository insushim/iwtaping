import { KeyboardLayoutData } from '@/types/keyboard';

export const layout: KeyboardLayoutData = {
  id: 'sebeol-390',
  name: '세벌식 390',
  language: 'ko',
  rows: [
    // Row 0: Number row
    // 세벌식 390 number row: special characters on base, numbers on shift
    {
      keys: [
        { key: '*', code: 'Backquote', label: '*', shiftLabel: '~', finger: 'left-pinky', row: 0 },
        { key: 'ㅎ', code: 'Digit1', label: 'ㅎ', shiftLabel: '1', finger: 'left-pinky', row: 0 },
        { key: 'ㅆ', code: 'Digit2', label: 'ㅆ', shiftLabel: '2', finger: 'left-ring', row: 0 },
        { key: 'ㅂ', code: 'Digit3', label: 'ㅂ', shiftLabel: '3', finger: 'left-middle', row: 0 },
        { key: 'ㅛ', code: 'Digit4', label: 'ㅛ', shiftLabel: '4', finger: 'left-index', row: 0 },
        { key: 'ㅠ', code: 'Digit5', label: 'ㅠ', shiftLabel: '5', finger: 'left-index', row: 0 },
        { key: 'ㅜ', code: 'Digit6', label: 'ㅜ', shiftLabel: '6', finger: 'right-index', row: 0 },
        { key: 'ㅗ', code: 'Digit7', label: 'ㅗ', shiftLabel: '7', finger: 'right-index', row: 0 },
        { key: 'ㅑ', code: 'Digit8', label: 'ㅑ', shiftLabel: '8', finger: 'right-middle', row: 0 },
        { key: 'ㅐ', code: 'Digit9', label: 'ㅐ', shiftLabel: '9', finger: 'right-ring', row: 0 },
        { key: 'ㅔ', code: 'Digit0', label: 'ㅔ', shiftLabel: '0', finger: 'right-pinky', row: 0 },
        { key: '-', code: 'Minus', label: '-', shiftLabel: ')', finger: 'right-pinky', row: 0 },
        { key: '=', code: 'Equal', label: '=', shiftLabel: '>', finger: 'right-pinky', row: 0 },
        { key: 'Backspace', code: 'Backspace', label: 'Backspace', finger: 'right-pinky', row: 0, width: 2 },
      ],
    },
    // Row 1: Top row (Tab row)
    // 세벌식 390: 받침(종성) on left, 모음(중성) on right
    {
      keys: [
        { key: 'Tab', code: 'Tab', label: 'Tab', finger: 'left-pinky', row: 1, width: 1.5 },
        { key: 'ㅃ', code: 'KeyQ', label: 'ㅃ', shiftLabel: '/', finger: 'left-pinky', row: 1 },
        { key: 'ㅉ', code: 'KeyW', label: 'ㅉ', shiftLabel: "'", finger: 'left-ring', row: 1 },
        { key: 'ㄸ', code: 'KeyE', label: 'ㄸ', shiftLabel: '"', finger: 'left-middle', row: 1 },
        { key: 'ㄲ', code: 'KeyR', label: 'ㄲ', shiftLabel: '[', finger: 'left-index', row: 1 },
        { key: 'ㅆ', code: 'KeyT', label: 'ㅆ', shiftLabel: ']', finger: 'left-index', row: 1 },
        { key: 'ㅕ', code: 'KeyY', label: 'ㅕ', finger: 'right-index', row: 1 },
        { key: 'ㅑ', code: 'KeyU', label: 'ㅑ', finger: 'right-index', row: 1 },
        { key: 'ㅛ', code: 'KeyI', label: 'ㅛ', finger: 'right-middle', row: 1 },
        { key: 'ㅒ', code: 'KeyO', label: 'ㅒ', finger: 'right-ring', row: 1 },
        { key: 'ㅖ', code: 'KeyP', label: 'ㅖ', finger: 'right-pinky', row: 1 },
        { key: '\\', code: 'BracketLeft', label: '\\', finger: 'right-pinky', row: 1 },
        { key: '+', code: 'BracketRight', label: '+', finger: 'right-pinky', row: 1 },
        { key: '|', code: 'Backslash', label: '|', finger: 'right-pinky', row: 1, width: 1.5 },
      ],
    },
    // Row 2: Home row (CapsLock row)
    // 세벌식 390: 초성(left) + 중성(right)
    {
      keys: [
        { key: 'CapsLock', code: 'CapsLock', label: 'CapsLock', finger: 'left-pinky', row: 2, width: 1.75 },
        { key: 'ㅁ', code: 'KeyA', label: 'ㅁ', finger: 'left-pinky', row: 2 },
        { key: 'ㄴ', code: 'KeyS', label: 'ㄴ', finger: 'left-ring', row: 2 },
        { key: 'ㅇ', code: 'KeyD', label: 'ㅇ', finger: 'left-middle', row: 2 },
        { key: 'ㄹ', code: 'KeyF', label: 'ㄹ', finger: 'left-index', row: 2 },
        { key: 'ㅎ', code: 'KeyG', label: 'ㅎ', finger: 'left-index', row: 2 },
        { key: 'ㅓ', code: 'KeyH', label: 'ㅓ', finger: 'right-index', row: 2 },
        { key: 'ㅏ', code: 'KeyJ', label: 'ㅏ', finger: 'right-index', row: 2 },
        { key: 'ㅣ', code: 'KeyK', label: 'ㅣ', finger: 'right-middle', row: 2 },
        { key: 'ㅡ', code: 'KeyL', label: 'ㅡ', finger: 'right-ring', row: 2 },
        { key: ';', code: 'Semicolon', label: ';', shiftLabel: ':', finger: 'right-pinky', row: 2 },
        { key: "'", code: 'Quote', label: "'", shiftLabel: '"', finger: 'right-pinky', row: 2 },
        { key: 'Enter', code: 'Enter', label: 'Enter', finger: 'right-pinky', row: 2, width: 2.25 },
      ],
    },
    // Row 3: Bottom row (Shift row)
    // 세벌식 390: 종성(받침) on left, 중성/기호 on right
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
