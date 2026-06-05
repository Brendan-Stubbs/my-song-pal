import type { ScalePattern } from '../scale-patterns';

export const major3NotesPerString: ScalePattern[] = [
  [
    [0, 0, 'x', 0, 'x', 0, 'x'],
    [0, 0, 'x', 0, 'x', 'x'],
    [0, 'x', 0, 'x', 'R'],
    [0, 'x', 'x', 0, 'x'],
    [0, 'x', 'R', 0, 'x'],
    ['x', 0, 'x', 0, 'x'],
  ],
  [
    [0, 0, 'x', 0, 'x', 'R', 0, 0],
    [0, 0, 'x', 'x', 0, 'x', 0, 0],
    [0, 'x', 'R', 0, 'x', 0, 0, 0],
    ['x', 0, 'x', 0, 'x', 0, 0, 0],
    ['R', 0, 'x', 0, 'x', 0, 0, 0],
    ['x', 0, 'x', 0, 'x', 0, 0, 0],
  ],
];
