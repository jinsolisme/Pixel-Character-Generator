export type MotionName = 'idle' | 'walk' | 'jump' | 'hi' | 'laptop' | 'error';

type RelativeCell = [number, number];

export type ArmMotionConfig = {
  tipOffsets: Array<[number, number]>;
  fallbackFrames: RelativeCell[][];
};

export const MOTION_DY_FRAMES: Record<MotionName, number[]> = {
  idle: [0, 0, 0, 0, 0, 0, 0, 0, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  walk: [0, -1, 0, -1],
  jump: [0, -1, 0, 1],
  hi: [0, 0, 0, 0],
  laptop: [0, 0, 0, 0, 0, 0, 0, 0],
  error: [0, 0, 0, 0, 0, 0],
};

export const MOTION_FPS: Record<MotionName, number> = {
  idle: 5,
  walk: 6,
  jump: 8,
  hi: 8,
  laptop: 5,
  error: 8,
};

export const HI_ARM_MOTION: ArmMotionConfig = {
  tipOffsets: [[0, 0], [-1, 2], [-3, 2], [-1, 2]],
  fallbackFrames: [
    [[0, 1], [1, 2]],
    [[0, 1], [-1, 2]],
    [[0, 1], [-2, 1]],
    [[0, 1], [-1, 2]],
  ],
};

export const ERROR_ARM_MOTION: ArmMotionConfig = {
  tipOffsets: [
    [-2, 1],
    [-2, 1],
    [-2, 1],
    [-2, 1],
    [-2, 1],
    [-2, 1],
  ],
  fallbackFrames: [
    [[0, 1], [-1, 2]],
    [[0, 1], [-1, 2]],
    [[0, 1], [-1, 2]],
    [[0, 1], [-1, 2]],
    [[0, 1], [-1, 2]],
    [[0, 1], [-1, 2]],
  ],
};

export const LAPTOP_RIGHT_ARM_MOTION: ArmMotionConfig = {
  tipOffsets: [
    [0, 0],
    [0, -1],
    [0, 0],
    [0, -1],
    [0, 0],
    [0, -1],
    [0, 0],
    [0, -1],
  ],
  fallbackFrames: [
    [[0, 1], [1, 1]],
    [[0, 1], [1, 0]],
    [[0, 1], [1, 1]],
    [[0, 1], [1, 0]],
    [[0, 1], [1, 1]],
    [[0, 1], [1, 0]],
    [[0, 1], [1, 1]],
    [[0, 1], [1, 0]],
  ],
};

export function getMotionFrameDy(motion: MotionName | null, frame: number) {
  if (!motion) return 0;
  const dyFrames = MOTION_DY_FRAMES[motion];
  return dyFrames[frame % dyFrames.length] ?? 0;
}
