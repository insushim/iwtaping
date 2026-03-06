import { KeyboardLayoutData } from '@/types/keyboard';

export const layout: KeyboardLayoutData = {
  id: 'dvorak',
  name: 'Dvorak',
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
        { key: '[', code: 'Minus', label: '[', shiftLabel: '{', finger: 'right-pinky', row: 0 },
        { key: ']', code: 'Equal', label: ']', shiftLabel: '}', finger: 'right-pinky', row: 0 },
        { key: 'Backspace', code: 'Backspace', label: 'Backspace', finger: 'right-pinky', row: 0, width: 2 },
      ],
    },
    // Row 1: Top row (Tab row)
    {
      keys: [
        { key: 'Tab', code: 'Tab', label: 'Tab', finger: 'left-pinky', row: 1, width: 1.5 },
        { key: "'", code: 'KeyQ', label: "'", shiftLabel: '"', finger: 'left-pinky', row: 1 },
        { key: ',', code: 'KeyW', label: ',', shiftLabel: '<', finger: 'left-ring', row: 1 },
        { key: '.', code: 'KeyE', label: '.', shiftLabel: '>', finger: 'left-middle', row: 1 },
        { key: 'p', code: 'KeyR', label: 'p', shiftLabel: 'P', finger: 'left-index', row: 1 },
        { key: 'y', code: 'KeyT', label: 'y', shiftLabel: 'Y', finger: 'left-index', row: 1 },
        { key: 'f', code: 'KeyY', label: 'f', shiftLabel: 'F', finger: 'right-index', row: 1 },
        { key: 'g', code: 'KeyU', label: 'g', shiftLabel: 'G', finger: 'right-index', row: 1 },
        { key: 'c', code: 'KeyI', label: 'c', shiftLabel: 'C', finger: 'right-middle', row: 1 },
        { key: 'r', code: 'KeyO', label: 'r', shiftLabel: 'R', finger: 'right-ring', row: 1 },
        { key: 'l', code: 'KeyP', label: 'l', shiftLabel: 'L', finger: 'right-pinky', row: 1 },
        { key: '/', code: 'BracketLeft', label: '/', shiftLabel: '?', finger: 'right-pinky', row: 1 },
        { key: '=', code: 'BracketRight', label: '=', shiftLabel: '+', finger: 'right-pinky', row: 1 },
        { key: '\\', code: 'Backslash', label: '\\', shiftLabel: '|', finger: 'right-pinky', row: 1, width: 1.5 },
      ],
    },
    // Row 2: Home row (CapsLock row)
    {
      keys: [
        { key: 'CapsLock', code: 'CapsLock', label: 'CapsLock', finger: 'left-pinky', row: 2, width: 1.75 },
        { key: 'a', code: 'KeyA', label: 'a', shiftLabel: 'A', finger: 'left-pinky', row: 2 },
        { key: 'o', code: 'KeyS', label: 'o', shiftLabel: 'O', finger: 'left-ring', row: 2 },
        { key: 'e', code: 'KeyD', label: 'e', shiftLabel: 'E', finger: 'left-middle', row: 2 },
        { key: 'u', code: 'KeyF', label: 'u', shiftLabel: 'U', finger: 'left-index', row: 2 },
        { key: 'i', code: 'KeyG', label: 'i', shiftLabel: 'I', finger: 'left-index', row: 2 },
        { key: 'd', code: 'KeyH', label: 'd', shiftLabel: 'D', finger: 'right-index', row: 2 },
        { key: 'h', code: 'KeyJ', label: 'h', shiftLabel: 'H', finger: 'right-index', row: 2 },
        { key: 't', code: 'KeyK', label: 't', shiftLabel: 'T', finger: 'right-middle', row: 2 },
        { key: 'n', code: 'KeyL', label: 'n', shiftLabel: 'N', finger: 'right-ring', row: 2 },
        { key: 's', code: 'Semicolon', label: 's', shiftLabel: 'S', finger: 'right-pinky', row: 2 },
        { key: '-', code: 'Quote', label: '-', shiftLabel: '_', finger: 'right-pinky', row: 2 },
        { key: 'Enter', code: 'Enter', label: 'Enter', finger: 'right-pinky', row: 2, width: 2.25 },
      ],
    },
    // Row 3: Bottom row (Shift row)
    {
      keys: [
        { key: 'Shift', code: 'ShiftLeft', label: 'Shift', finger: 'left-pinky', row: 3, width: 2.25 },
        { key: ';', code: 'KeyZ', label: ';', shiftLabel: ':', finger: 'left-pinky', row: 3 },
        { key: 'q', code: 'KeyX', label: 'q', shiftLabel: 'Q', finger: 'left-ring', row: 3 },
        { key: 'j', code: 'KeyC', label: 'j', shiftLabel: 'J', finger: 'left-middle', row: 3 },
        { key: 'k', code: 'KeyV', label: 'k', shiftLabel: 'K', finger: 'left-index', row: 3 },
        { key: 'x', code: 'KeyB', label: 'x', shiftLabel: 'X', finger: 'left-index', row: 3 },
        { key: 'b', code: 'KeyN', label: 'b', shiftLabel: 'B', finger: 'right-index', row: 3 },
        { key: 'm', code: 'KeyM', label: 'm', shiftLabel: 'M', finger: 'right-index', row: 3 },
        { key: 'w', code: 'Comma', label: 'w', shiftLabel: 'W', finger: 'right-middle', row: 3 },
        { key: 'v', code: 'Period', label: 'v', shiftLabel: 'V', finger: 'right-ring', row: 3 },
        { key: 'z', code: 'Slash', label: 'z', shiftLabel: 'Z', finger: 'right-pinky', row: 3 },
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
