import { KeyboardLayoutData } from '@/types/keyboard';

export const layout: KeyboardLayoutData = {
  id: 'qwerty-en',
  name: 'QWERTY',
  language: 'en',
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
        { key: 'q', code: 'KeyQ', label: 'q', shiftLabel: 'Q', finger: 'left-pinky', row: 1 },
        { key: 'w', code: 'KeyW', label: 'w', shiftLabel: 'W', finger: 'left-ring', row: 1 },
        { key: 'e', code: 'KeyE', label: 'e', shiftLabel: 'E', finger: 'left-middle', row: 1 },
        { key: 'r', code: 'KeyR', label: 'r', shiftLabel: 'R', finger: 'left-index', row: 1 },
        { key: 't', code: 'KeyT', label: 't', shiftLabel: 'T', finger: 'left-index', row: 1 },
        { key: 'y', code: 'KeyY', label: 'y', shiftLabel: 'Y', finger: 'right-index', row: 1 },
        { key: 'u', code: 'KeyU', label: 'u', shiftLabel: 'U', finger: 'right-index', row: 1 },
        { key: 'i', code: 'KeyI', label: 'i', shiftLabel: 'I', finger: 'right-middle', row: 1 },
        { key: 'o', code: 'KeyO', label: 'o', shiftLabel: 'O', finger: 'right-ring', row: 1 },
        { key: 'p', code: 'KeyP', label: 'p', shiftLabel: 'P', finger: 'right-pinky', row: 1 },
        { key: '[', code: 'BracketLeft', label: '[', shiftLabel: '{', finger: 'right-pinky', row: 1 },
        { key: ']', code: 'BracketRight', label: ']', shiftLabel: '}', finger: 'right-pinky', row: 1 },
        { key: '\\', code: 'Backslash', label: '\\', shiftLabel: '|', finger: 'right-pinky', row: 1, width: 1.5 },
      ],
    },
    // Row 2: Home row (CapsLock row)
    {
      keys: [
        { key: 'CapsLock', code: 'CapsLock', label: 'CapsLock', finger: 'left-pinky', row: 2, width: 1.75 },
        { key: 'a', code: 'KeyA', label: 'a', shiftLabel: 'A', finger: 'left-pinky', row: 2 },
        { key: 's', code: 'KeyS', label: 's', shiftLabel: 'S', finger: 'left-ring', row: 2 },
        { key: 'd', code: 'KeyD', label: 'd', shiftLabel: 'D', finger: 'left-middle', row: 2 },
        { key: 'f', code: 'KeyF', label: 'f', shiftLabel: 'F', finger: 'left-index', row: 2 },
        { key: 'g', code: 'KeyG', label: 'g', shiftLabel: 'G', finger: 'left-index', row: 2 },
        { key: 'h', code: 'KeyH', label: 'h', shiftLabel: 'H', finger: 'right-index', row: 2 },
        { key: 'j', code: 'KeyJ', label: 'j', shiftLabel: 'J', finger: 'right-index', row: 2 },
        { key: 'k', code: 'KeyK', label: 'k', shiftLabel: 'K', finger: 'right-middle', row: 2 },
        { key: 'l', code: 'KeyL', label: 'l', shiftLabel: 'L', finger: 'right-ring', row: 2 },
        { key: ';', code: 'Semicolon', label: ';', shiftLabel: ':', finger: 'right-pinky', row: 2 },
        { key: "'", code: 'Quote', label: "'", shiftLabel: '"', finger: 'right-pinky', row: 2 },
        { key: 'Enter', code: 'Enter', label: 'Enter', finger: 'right-pinky', row: 2, width: 2.25 },
      ],
    },
    // Row 3: Bottom row (Shift row)
    {
      keys: [
        { key: 'Shift', code: 'ShiftLeft', label: 'Shift', finger: 'left-pinky', row: 3, width: 2.25 },
        { key: 'z', code: 'KeyZ', label: 'z', shiftLabel: 'Z', finger: 'left-pinky', row: 3 },
        { key: 'x', code: 'KeyX', label: 'x', shiftLabel: 'X', finger: 'left-ring', row: 3 },
        { key: 'c', code: 'KeyC', label: 'c', shiftLabel: 'C', finger: 'left-middle', row: 3 },
        { key: 'v', code: 'KeyV', label: 'v', shiftLabel: 'V', finger: 'left-index', row: 3 },
        { key: 'b', code: 'KeyB', label: 'b', shiftLabel: 'B', finger: 'left-index', row: 3 },
        { key: 'n', code: 'KeyN', label: 'n', shiftLabel: 'N', finger: 'right-index', row: 3 },
        { key: 'm', code: 'KeyM', label: 'm', shiftLabel: 'M', finger: 'right-index', row: 3 },
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
        { key: ' ', code: 'Space', label: 'Space', finger: 'thumb', row: 4, width: 6.25 },
        { key: 'Alt', code: 'AltRight', label: 'Alt', finger: 'right-pinky', row: 4, width: 1.25 },
        { key: 'Meta', code: 'MetaRight', label: 'Win', finger: 'right-pinky', row: 4, width: 1.25 },
        { key: 'ContextMenu', code: 'ContextMenu', label: 'Menu', finger: 'right-pinky', row: 4, width: 1.25 },
        { key: 'Control', code: 'ControlRight', label: 'Ctrl', finger: 'right-pinky', row: 4, width: 1.25 },
      ],
    },
  ],
};
