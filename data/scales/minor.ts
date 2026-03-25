import type { ScalePattern } from '../scale-patterns';

export const minor: ScalePattern[] = [
  [
    [0, 'R', 0, 'x', 'x'],
    [0, 'x', 'x', 0, 'x'],
    ['x', 'x', 0, 'x', 0],
    [0, 'x', 0, 'R', 0],
    [0, 'x', 0, 'x', 'x'],
    [0, 'R', 0, 'x', 'x'],
  ],
  [
    ['x', 'x', 0, 'x'],
    [0, 'x', 0, 'R'],
    ['x', 0, 'x', 'x'],
    ['R', 0, 'x', 'x'],
    ['x', 'x', 0, 'x'],
    ['x', 'x', 0, 'x'],
  ],
];
