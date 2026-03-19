import {
  ERROR_ARM_MOTION,
  HI_ARM_MOTION,
  LAPTOP_RIGHT_ARM_MOTION,
  MOTION_DY_FRAMES,
  type MotionName,
} from './motion-config';

export type AnimationType = MotionName | null;

export function cloneGrid(g: boolean[][]): boolean[][] {
  return g.map(row => [...row]);
}

export function shiftGridVertically(g: boolean[][], dy: number): boolean[][] {
  const result = Array(16).fill(null).map(() => Array(16).fill(false));
  for (let y = 0; y < 16; y++) {
    const srcY = y - dy;
    if (srcY >= 0 && srcY < 16) result[y] = [...g[srcY]];
  }
  return result;
}

function findBottomRow(g: boolean[][]): number {
  for (let y = 15; y >= 0; y--) if (g[y].some(Boolean)) return y;
  return 15;
}

function findTopRow(g: boolean[][]): number {
  for (let y = 0; y < 16; y++) if (g[y].some(Boolean)) return y;
  return 0;
}

type WalkLegPose = 'plant' | 'neutral' | 'swing';

export const IDLE_DY_FRAMES = MOTION_DY_FRAMES.idle;
export const WALK_DY_FRAMES = MOTION_DY_FRAMES.walk;
export const JUMP_DY_FRAMES = MOTION_DY_FRAMES.jump;
export const LAPTOP_DY_FRAMES = MOTION_DY_FRAMES.laptop;
export const ERROR_DY_FRAMES = MOTION_DY_FRAMES.error;

function buildBounceFrames(base: boolean[][], shifts: number[], showBottom: boolean[]): boolean[][][] {
  const bottomY = findBottomRow(base);
  return shifts.map((dy, index) => {
    const g = shiftGridVertically(base, dy);
    if (!showBottom[index]) {
      const shiftedBottom = bottomY + dy;
      if (shiftedBottom >= 0 && shiftedBottom < 16) {
        g[shiftedBottom] = Array(16).fill(false);
      }
    }
    return g;
  });
}

function shiftLegRows(
  legCells: Array<[number, number]>,
  pose: WalkLegPose,
  sideDirection: -1 | 1,
  baseDy: number
): Array<[number, number]> {
  if (legCells.length === 0) return [];

  const uniqueLegCells = Array.from(
    new Map(legCells.map(([y, x]) => [`${y},${x}`, [y, x] as [number, number]])).values()
  );

  const topY = Math.min(...uniqueLegCells.map(([y]) => y));
  const bottomY = Math.max(...uniqueLegCells.map(([y]) => y));
  const height = Math.max(1, bottomY - topY);
  const isSingleRowLeg = topY === bottomY;
  const rows = new Map<number, number[]>();

  uniqueLegCells.forEach(([y, x]) => {
    const row = rows.get(y) ?? [];
    row.push(x);
    rows.set(y, row);
  });

  const shifted = new Map<string, [number, number]>();

  [...rows.entries()]
    .sort((a, b) => a[0] - b[0])
    .forEach(([y, xs]) => {
      const depth = (y - topY) / height;
      let rowDx = 0;

      if (!isSingleRowLeg) {
        if (pose === 'plant') {
          if (depth >= 0.55) rowDx = sideDirection;
        } else if (pose === 'swing') {
          if (depth >= 0.55) rowDx = -sideDirection;
        }
      }

      xs.forEach(x => {
        const nextY = y + baseDy;
        const nextX = x + rowDx;
        if (nextY < 0 || nextY >= 16 || nextX < 0 || nextX >= 16) return;
        shifted.set(`${nextY},${nextX}`, [nextY, nextX]);

        if (isSingleRowLeg && pose === 'plant') {
          const extendedY = nextY + 1;
          if (extendedY >= 0 && extendedY < 16) {
            shifted.set(`${extendedY},${nextX}`, [extendedY, nextX]);
          } else {
            const footX = nextX + sideDirection;
            if (footX >= 0 && footX < 16) {
              shifted.set(`${nextY},${footX}`, [nextY, footX]);
            }
          }
        }
      });
    });

  return Array.from(shifted.values());
}

export function buildWalkFrames(
  base: boolean[][],
  leftLegCells: Array<[number, number]>,
  rightLegCells: Array<[number, number]>
): boolean[][][] {
  if (leftLegCells.length === 0 || rightLegCells.length === 0) {
    return WALK_DY_FRAMES.map(dy => shiftGridVertically(base, dy));
  }

  const poses: Array<{ left: WalkLegPose; right: WalkLegPose }> = [
    { left: 'plant', right: 'swing' },
    { left: 'neutral', right: 'neutral' },
    { left: 'swing', right: 'plant' },
    { left: 'neutral', right: 'neutral' },
  ];

  return poses.map((pose, index) => {
    const dy = WALK_DY_FRAMES[index] ?? 0;
    const g = shiftGridVertically(base, dy);

    [...leftLegCells, ...rightLegCells].forEach(([y, x]) => {
      const shiftedY = y + dy;
      if (shiftedY >= 0 && shiftedY < 16) g[shiftedY][x] = false;
    });

    const walkedLeft = shiftLegRows(leftLegCells, pose.left, -1, dy);
    const walkedRight = shiftLegRows(rightLegCells, pose.right, 1, dy);

    [...walkedLeft, ...walkedRight].forEach(([y, x]) => {
      g[y][x] = true;
    });

    return g;
  });
}

export function buildIdleFrames(base: boolean[][], eyeCells: Array<[number, number]>): boolean[][][] {
  const blinkFrames = new Set([3, 7, 17, 21]);
  return IDLE_DY_FRAMES.map((dy, index) => {
    const g = shiftGridVertically(base, dy);
    if (blinkFrames.has(index)) {
      eyeCells.forEach(([y, x]) => {
        const shiftedY = y + dy;
        if (shiftedY >= 0 && shiftedY < 16) g[shiftedY][x] = true;
      });
    }
    return g;
  });
}

export function buildJumpFrames(base: boolean[][]): boolean[][][] {
  return buildBounceFrames(base, JUMP_DY_FRAMES, [true, false, true, false]);
}

function buildAnimatedArmFrames(
  base: boolean[][],
  shoulder: [number, number],
  armCells: Array<[number, number]>,
  tipOffsets: [number, number][],
  fallbackFrames: Array<[number, number][]>
): boolean[][][] {
  const armCellFrames = buildAnimatedArmCellFrames(shoulder, armCells, tipOffsets, fallbackFrames);

  return armCellFrames.map(cells => {
    const g = cloneGrid(base);
    armCells.forEach(([y, x]) => {
      if (y >= 0 && y < 16 && x >= 0 && x < 16) g[y][x] = false;
    });
    cells.forEach(([y, x]) => setCell(g, y, x));
    return g;
  });
}

function buildAnimatedArmCellFrames(
  shoulder: [number, number],
  armCells: Array<[number, number]>,
  tipOffsets: [number, number][],
  fallbackFrames: Array<[number, number][]>
): Array<Array<[number, number]>> {
  if (armCells.length === 1) {
    const [[anchorY, anchorX]] = armCells;
    return tipOffsets.map(([tipDy, tipDx]) => {
      const nextY = anchorY + tipDy;
      const nextX = anchorX + tipDx;
      return nextY >= 0 && nextY < 16 && nextX >= 0 && nextX < 16 ? [[nextY, nextX]] : [];
    });
  }

  if (armCells.length > 1) {
    const [sy, sx] = shoulder;
    const pivot = armCells.reduce((best, cell) => {
      const d = (cell[0] - sy) ** 2 + (cell[1] - sx) ** 2;
      return d < (best[0] - sy) ** 2 + (best[1] - sx) ** 2 ? cell : best;
    }, armCells[0]);

    const [py, px] = pivot;
    const sortedCells = [...armCells].sort((a, b) => {
      const da = Math.abs(a[0] - py) + Math.abs(a[1] - px);
      const db = Math.abs(b[0] - py) + Math.abs(b[1] - px);
      return da - db;
    });

    const maxDist = sortedCells.reduce(
      (m, [y, x]) => Math.max(m, Math.abs(y - py) + Math.abs(x - px)),
      0
    );

    const maxArmX = armCells.reduce((m, [, x]) => Math.max(m, x), 0);
    const dxRoom = 15 - maxArmX;
    const normalizedOffsets = tipOffsets.map(([dy, dx]) => [dy, dx > 0 ? Math.min(dx, dxRoom) : dx] as [number, number]);

    return normalizedOffsets.map(([tipDy, tipDx]) => {
      const idealPositions: [number, number][] = sortedCells.map(([y, x]) => {
        const dist = Math.abs(y - py) + Math.abs(x - px);
        const t = maxDist === 0 ? 1 : dist / maxDist;
        return [Math.round(y + tipDy * t), Math.round(x + tipDx * t)];
      });

      const chainPositions: [number, number][] = [idealPositions[0]];
      for (let i = 1; i < idealPositions.length; i++) {
        const prev = chainPositions[i - 1];
        const ideal = idealPositions[i];
        if (Math.abs(ideal[0] - prev[0]) <= 1 && Math.abs(ideal[1] - prev[1]) <= 1) {
          chainPositions.push(ideal);
        } else {
          const stepY = Math.sign(ideal[0] - prev[0]);
          const stepX = Math.sign(ideal[1] - prev[1]);
          chainPositions.push([prev[0] + stepY, prev[1] + stepX]);
        }
      }

      return chainPositions.filter(([y, x]) => y >= 0 && y < 16 && x >= 0 && x < 16);
    });
  }

  return fallbackFrames.map(cells => cells.filter(([y, x]) => y >= 0 && y < 16 && x >= 0 && x < 16));
}

function toAbsoluteFallbackFrames(
  shoulder: [number, number],
  frames: Array<Array<[number, number]>>
) {
  return frames.map(cells =>
    cells.map(([dy, dx]) => [shoulder[0] + dy, shoulder[1] + dx] as [number, number])
  );
}

function findArmTip(
  shoulder: [number, number],
  cells: Array<[number, number]>
): [number, number] {
  if (cells.length === 0) return [shoulder[0], shoulder[1] + 1];

  return cells.reduce((best, cell) => {
    const bestDist = Math.abs(best[0] - shoulder[0]) + Math.abs(best[1] - shoulder[1]);
    const cellDist = Math.abs(cell[0] - shoulder[0]) + Math.abs(cell[1] - shoulder[1]);
    return cellDist > bestDist ? cell : best;
  }, cells[0]);
}

export function buildLaptopFrames(
  base: boolean[][],
  shoulder: [number, number],
  armCells: Array<[number, number]>
): boolean[][][] {
  const [sy, sx] = shoulder;
  const leftShoulder: [number, number] = [sy, 15 - sx];
  const leftArmCells = armCells.map(([y, x]) => [y, 15 - x] as [number, number]);
  const rightTipOffsets = LAPTOP_RIGHT_ARM_MOTION.tipOffsets;
  const leftTipOffsets: [number, number][] = rightTipOffsets.map(([dy, dx]) => [dy, -dx]);
  const rightFallbackFrames = toAbsoluteFallbackFrames(shoulder, LAPTOP_RIGHT_ARM_MOTION.fallbackFrames);
  const leftFallbackFrames = LAPTOP_RIGHT_ARM_MOTION.fallbackFrames.map(cells =>
    cells.map(([dy, dx]) => [leftShoulder[0] + dy, leftShoulder[1] - dx] as [number, number])
  );

  const rightArmFrames = buildAnimatedArmCellFrames(shoulder, armCells, rightTipOffsets, rightFallbackFrames);
  const leftArmFrames = buildAnimatedArmCellFrames(leftShoulder, leftArmCells, leftTipOffsets, leftFallbackFrames);

  return LAPTOP_DY_FRAMES.map((_, index) => {
    const g = cloneGrid(base);
    [...armCells, ...leftArmCells].forEach(([y, x]) => {
      if (y >= 0 && y < 16 && x >= 0 && x < 16) g[y][x] = false;
    });
    [...(leftArmFrames[index] ?? []), ...(rightArmFrames[index] ?? [])].forEach(([y, x]) => setCell(g, y, x));
    return g;
  });
}

export function buildErrorFlagAnchors(
  shoulder: [number, number],
  armCells: Array<[number, number]>
): Array<[number, number]> {
  const armFrames = buildAnimatedArmCellFrames(
    shoulder,
    armCells,
    ERROR_ARM_MOTION.tipOffsets,
    toAbsoluteFallbackFrames(shoulder, ERROR_ARM_MOTION.fallbackFrames)
  );
  return armFrames.map(cells => findArmTip(shoulder, cells));
}

export function buildErrorFrames(
  base: boolean[][],
  shoulder: [number, number],
  armCells: Array<[number, number]>
): boolean[][][] {
  return buildAnimatedArmFrames(
    base,
    shoulder,
    armCells,
    ERROR_ARM_MOTION.tipOffsets,
    toAbsoluteFallbackFrames(shoulder, ERROR_ARM_MOTION.fallbackFrames)
  );
}

function setCell(g: boolean[][], y: number, x: number) {
  if (y >= 0 && y < 16 && x >= 0 && x < 16) g[y][x] = true;
}

// 팔 흔들기(Hi): 4프레임 @ 8fps
// armCells: sideDetailType 2~5에서 생성된 오른쪽 미러 픽셀 (있으면 직접 이동, 없으면 shoulder 기반 fallback)
export function buildHiFrames(
  base: boolean[][],
  shoulder: [number, number],
  armCells: Array<[number, number]>
): boolean[][][] {
  return buildAnimatedArmFrames(
    base,
    shoulder,
    armCells,
    HI_ARM_MOTION.tipOffsets,
    toAbsoluteFallbackFrames(shoulder, HI_ARM_MOTION.fallbackFrames)
  );
}
