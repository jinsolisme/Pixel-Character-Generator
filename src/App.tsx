/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AnimationType, buildIdleFrames, buildWalkFrames, buildJumpFrames, buildHiFrames, buildLaptopFrames, buildErrorFrames, buildErrorFlagAnchors } from './animations';
import { getMotionFrameDy, MOTION_FPS } from './motion-config';
import { RefreshCw, Download, Image as ImageIcon, Palette, Sparkles, Glasses, Crown, Flame, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Separator } from '@/src/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/src/components/ui/tooltip';
import { CharacterPreview } from '@/src/components/CharacterPreview';

const GRID_SIZE = 16;
const GLASSES_GRID_SIZE = 32;
const CELL_SIZE = 20;

type PixelCell = { x: number; y: number; fill: string };
type FinePixelCell = { x: number; y: number; fill: string };
type StarPoint = [number, number];
type HatStar = { points: StarPoint[]; fill: string };
const BUBBLE_ROWS = [
  { y: 0, start: 2, end: 9 },
  { y: 1, start: 1, end: 10 },
  { y: 2, start: 0, end: 11 },
  { y: 3, start: 0, end: 11 },
  { y: 4, start: 0, end: 11 },
  { y: 5, start: 0, end: 10 },
  { y: 6, start: 2, end: 9 },
  { y: 7, start: 4, end: 5 },
  { y: 8, start: 4, end: 4 },
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function pushPixel(map: Map<string, PixelCell>, x: number, y: number, fill: string) {
  if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;
  map.set(`${x},${y}`, { x, y, fill });
}

function pushRow(map: Map<string, PixelCell>, y: number, startX: number, endX: number, fill: string) {
  for (let x = startX; x <= endX; x++) pushPixel(map, x, y, fill);
}

function pushFinePixel(map: Map<string, FinePixelCell>, x: number, y: number, fill: string) {
  if (x < 0 || x >= GLASSES_GRID_SIZE || y < 0 || y >= GLASSES_GRID_SIZE) return;
  map.set(`${x},${y}`, { x, y, fill });
}

function pushFineRow(map: Map<string, FinePixelCell>, y: number, startX: number, endX: number, fill: string) {
  for (let x = startX; x <= endX; x++) pushFinePixel(map, x, y, fill);
}

function buildFourPointStarPoints(cx: number, cy: number, outerR: number, innerR: number): StarPoint[] {
  return Array.from({ length: 8 }, (_, index) => {
    const angle = (-90 + index * 45) * (Math.PI / 180);
    const radius = index % 2 === 0 ? outerR : innerR;
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
  });
}

function pointsToSvg(points: StarPoint[]) {
  return points.map(([x, y]) => `${x},${y}`).join(' ');
}

function translatePoints(points: StarPoint[], dx: number, dy: number): StarPoint[] {
  return points.map(([x, y]) => [x + dx, y + dy]);
}

function findOccupiedBounds(grid: boolean[][]) {
  let minX = GRID_SIZE - 1;
  let maxX = 0;
  let minY = GRID_SIZE - 1;
  let maxY = 0;
  let hasPixel = false;

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (!grid[y][x]) continue;
      hasPixel = true;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }

  return hasPixel ? { minX, maxX, minY, maxY } : null;
}

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  points: StarPoint[],
  scale: number,
  fill: string
) {
  if (points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(points[0][0] * scale, points[0][1] * scale);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0] * scale, points[i][1] * scale);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

export default function App() {
  const [grid, setGrid] = useState<boolean[][]>([]);
  const [color, setColor] = useState('#F97316');
  const [bgColor, setBgColor] = useState('transparent');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeMotion, setActiveMotion] = useState<AnimationType>('idle');
  const [animFrame, setAnimFrame] = useState(0);
  const [eyeCells, setEyeCells] = useState<Array<[number, number]>>([]);
  const [shoulder, setShoulder] = useState<[number, number]>([6, 10]);
  const [armCells, setArmCells] = useState<Array<[number, number]>>([]);
  const [leftLegCells, setLeftLegCells] = useState<Array<[number, number]>>([]);
  const [rightLegCells, setRightLegCells] = useState<Array<[number, number]>>([]);
  const [showGlasses, setShowGlasses] = useState(false);
  const [glassesColor, setGlassesColor] = useState('#00BFFF');
  const [showHat, setShowHat] = useState(false);
  const [hatColor, setHatColor] = useState('#9B7FEA');
  const [showFire, setShowFire] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [fireFrame, setFireFrame] = useState(0);
  const [headInfo, setHeadInfo] = useState<{ topY: number; minX: number; maxX: number } | null>(null);
  const animIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generateRandom = useCallback(() => {
    const newGrid: boolean[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false));
    const halfWidth = Math.ceil(GRID_SIZE / 2);

    const headWidth = 4 + Math.floor(Math.random() * 3);
    const headHeight = 4 + Math.floor(Math.random() * 3);
    const headStartY = 3;

    const bodyWidth = 3 + Math.floor(Math.random() * 4);
    const bodyHeight = 4 + Math.floor(Math.random() * 4);
    const bodyStartY = headStartY + headHeight + (Math.random() < 0.4 ? 1 : 0);
    const minLegRows = 2;
    const maxBodyHeight = Math.max(1, GRID_SIZE - bodyStartY - minLegRows);
    const actualBodyHeight = Math.min(bodyHeight, maxBodyHeight);
    const bodyEndY = bodyStartY + actualBodyHeight;

    for (let y = headStartY; y < headStartY + headHeight; y++) {
      for (let x = halfWidth - headWidth; x < halfWidth; x++) {
        newGrid[y][x] = true;
      }
    }

    for (let y = bodyStartY; y < bodyEndY; y++) {
      for (let x = halfWidth - bodyWidth; x < halfWidth; x++) {
        newGrid[y][x] = true;
      }
    }

    let eyeSizeW = Math.random() < 0.5 ? 2 : 1;
    let eyeSizeH = Math.random() < 0.5 ? 2 : 1;
    if (eyeSizeW === 2 && eyeSizeH === 2) {
      if (Math.random() < 0.5) eyeSizeW = 1;
      else eyeSizeH = 1;
    }

    const eyeY = headStartY + 1 + Math.floor(Math.random() * (headHeight - 2));
    const eyeX = halfWidth - 2 - Math.floor(Math.random() * (headWidth - 3));

    const newEyeCells: Array<[number, number]> = [];
    for (let ey = 0; ey < eyeSizeH; ey++) {
      for (let ex = 0; ex < eyeSizeW; ex++) {
        const curY = eyeY + ey;
        const curX = eyeX - ex;
        if (curY < GRID_SIZE && curX >= 0) {
          newGrid[curY][curX] = false;
          newEyeCells.push([curY, curX]);
        }
      }
    }

    const legType = Math.floor(Math.random() * 5);
    const legHeight = 2 + Math.floor(Math.random() * 3);
    const newLeftLegCells: Array<[number, number]> = [];

    for (let y = bodyEndY; y < Math.min(bodyEndY + legHeight, GRID_SIZE); y++) {
      if (legType === 0) {
        newGrid[y][halfWidth - bodyWidth + 1] = true;
        newGrid[y][halfWidth - 2] = true;
        newLeftLegCells.push([y, halfWidth - bodyWidth + 1], [y, halfWidth - 2]);
      } else if (legType === 1) {
        for (let x = halfWidth - bodyWidth + 1; x < halfWidth - 1; x++) {
          newGrid[y][x] = true;
          newLeftLegCells.push([y, x]);
        }
      } else if (legType === 2) {
        const offset = y - bodyEndY;
        newGrid[y][halfWidth - bodyWidth + 1 + offset] = true;
        newLeftLegCells.push([y, halfWidth - bodyWidth + 1 + offset]);
      } else if (legType === 3) {
        newGrid[y][halfWidth - 1] = true;
        newLeftLegCells.push([y, halfWidth - 1]);
      } else {
        newGrid[y][halfWidth - bodyWidth] = true;
        newGrid[y][halfWidth - 2] = true;
        newLeftLegCells.push([y, halfWidth - bodyWidth], [y, halfWidth - 2]);
      }
    }

    const sideDetailType = Math.floor(Math.random() * 6);
    const newArmCells: Array<[number, number]> = [];
    if (sideDetailType > 0) {
      const sideY = bodyStartY + 1;
      const startX = halfWidth - Math.max(headWidth, bodyWidth) - 1;

      if (sideDetailType === 1) {
        newGrid[headStartY][halfWidth - headWidth - 1] = true;
        newGrid[headStartY - 1][halfWidth - headWidth - 1] = true;
      } else if (sideDetailType === 2) {
        for (let x = startX; x > startX - 2; x--) {
          if (x >= 0) { newGrid[sideY + 1][x] = true; newArmCells.push([sideY + 1, x]); }
        }
      } else if (sideDetailType === 3) {
        for (let dy2 = 0; dy2 < 3; dy2++) {
          if (startX >= 0) { newGrid[sideY + dy2][startX] = true; newArmCells.push([sideY + dy2, startX]); }
        }
      } else if (sideDetailType === 4) {
        if (startX >= 0) {
          newGrid[sideY][startX] = true;     newArmCells.push([sideY, startX]);
          newGrid[sideY + 2][startX] = true; newArmCells.push([sideY + 2, startX]);
        }
      } else if (sideDetailType === 5) {
        newGrid[bodyStartY][halfWidth - bodyWidth - 1] = true;
        newArmCells.push([bodyStartY, halfWidth - bodyWidth - 1]);
      }
    }

    if (Math.random() < 0.4) {
      const topX = halfWidth - headWidth + 1;
      if (headStartY - 1 >= 0) {
        newGrid[headStartY - 1][topX] = true;
        if (Math.random() < 0.5 && headStartY - 2 >= 0) {
          newGrid[headStartY - 2][topX - 1 >= 0 ? topX - 1 : topX] = true;
        }
      }
    }

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = halfWidth; x < GRID_SIZE; x++) {
        newGrid[y][x] = newGrid[y][GRID_SIZE - 1 - x];
      }
    }

    // 미러링된 오른쪽 눈 좌표 추가
    const mirroredEyes: Array<[number, number]> = newEyeCells.map(([y, x]) => [y, GRID_SIZE - 1 - x]);
    setEyeCells([...newEyeCells, ...mirroredEyes]);

    // 어깨: 미러링 후 오른쪽 몸통 가장자리 상단
    setShoulder([bodyStartY, GRID_SIZE - 1 - (halfWidth - bodyWidth)]);

    // 팔 픽셀: 오른쪽 미러 좌표 저장 (sideDetailType 2~5)
    const mirroredArm: Array<[number, number]> = newArmCells.map(([y, x]) => [y, GRID_SIZE - 1 - x]);
    setArmCells(mirroredArm);

    const mirroredRightLeg: Array<[number, number]> = newLeftLegCells.map(([y, x]) => [y, GRID_SIZE - 1 - x]);
    setLeftLegCells(newLeftLegCells);
    setRightLegCells(mirroredRightLeg);

    // 머리 위치: 미러링 후 전체 x 범위
    const headMinX = halfWidth - headWidth;
    const headMaxX = GRID_SIZE - 1 - headMinX;
    setHeadInfo({ topY: headStartY, minX: headMinX, maxX: headMaxX });

    setGrid(newGrid);
    setAnimFrame(0);

    const hue = Math.floor(Math.random() * 360);
    setColor(`hsl(${hue}, 80%, 60%)`);
    // 안경 색: 캐릭터 색상에서 120~240도 떨어진 랜덤 색
    const glassesHue = (hue + 120 + Math.floor(Math.random() * 120)) % 360;
    setGlassesColor(`hsl(${glassesHue}, 90%, 65%)`);
    // 모자 색: 캐릭터 색상에서 200~260도 떨어진 랜덤 색
    const hatHue = (hue + 200 + Math.floor(Math.random() * 60)) % 360;
    setHatColor(`hsl(${hatHue}, 70%, 62%)`);
  }, []);

  useEffect(() => {
    generateRandom();
  }, [generateRandom]);

  useEffect(() => {
    if (!showFire) {
      setFireFrame(0);
      return;
    }
    const interval = setInterval(() => {
      setFireFrame(frame => (frame + 1) % 4);
    }, 120);
    return () => clearInterval(interval);
  }, [showFire]);

  useEffect(() => {
    setAnimFrame(0);
  }, [activeMotion]);

  const animFrames = useMemo(() => {
    if (grid.length === 0) return null;
    if (activeMotion === null) return null;
    if (activeMotion === 'idle') return buildIdleFrames(grid, eyeCells);
    if (activeMotion === 'walk')  return buildWalkFrames(grid, leftLegCells, rightLegCells);
    if (activeMotion === 'jump')  return buildJumpFrames(grid);
    if (activeMotion === 'hi')    return buildHiFrames(grid, shoulder, armCells);
    if (activeMotion === 'laptop') return buildLaptopFrames(grid, shoulder, armCells);
    if (activeMotion === 'error') return buildErrorFrames(grid, shoulder, armCells);
    return null;
  }, [activeMotion, grid, eyeCells, shoulder, armCells, leftLegCells, rightLegCells]);

  const displayGrid = (animFrames && animFrames.length > 0)
    ? animFrames[animFrame % animFrames.length]
    : grid;

  const currentFrameDy = useMemo(() => {
    return getMotionFrameDy(activeMotion, animFrame);
  }, [activeMotion, animFrame]);

  const glassesPixels32 = useMemo(() => {
    if (!showGlasses || eyeCells.length === 0) return [] as FinePixelCell[];
    const mid = GRID_SIZE / 2;
    const leftEye = eyeCells.filter(([, x]) => x < mid);
    const rightEye = eyeCells.filter(([, x]) => x >= mid);
    if (leftEye.length === 0 || rightEye.length === 0) return [] as FinePixelCell[];
    const bbox = (cells: Array<[number, number]>) => ({
      minX: Math.min(...cells.map(([, x]) => x)),
      maxX: Math.max(...cells.map(([, x]) => x)),
      minY: Math.min(...cells.map(([y]) => y)),
      maxY: Math.max(...cells.map(([y]) => y)),
    });
    const left = bbox(leftEye);
    const right = bbox(rightEye);
    const dy = currentFrameDy * 2;
    const map = new Map<string, FinePixelCell>();
    const frameColor = glassesColor;

    const pad = 2;
    const leftWidth = (left.maxX - left.minX + 1) * 2 + pad * 2;
    const rightWidth = (right.maxX - right.minX + 1) * 2 + pad * 2;
    const leftCenterX32 = Math.round((left.minX + left.maxX + 1));
    const rightCenterX32 = Math.round((right.minX + right.maxX + 1));
    const leftMinX = clamp(Math.round(leftCenterX32 - leftWidth / 2), 0, GLASSES_GRID_SIZE - 1);
    const leftMaxX = clamp(leftMinX + leftWidth - 1, 0, GLASSES_GRID_SIZE - 1);
    const rightMinX = clamp(Math.round(rightCenterX32 - rightWidth / 2), 0, GLASSES_GRID_SIZE - 1);
    const rightMaxX = clamp(rightMinX + rightWidth - 1, 0, GLASSES_GRID_SIZE - 1);
    const leftMinY = clamp(left.minY * 2 - pad + dy, 0, GLASSES_GRID_SIZE - 1);
    const leftMaxY = clamp((left.maxY + 1) * 2 + pad - 1 + dy, 0, GLASSES_GRID_SIZE - 1);
    const rightMinY = clamp(right.minY * 2 - pad + dy, 0, GLASSES_GRID_SIZE - 1);
    const rightMaxY = clamp((right.maxY + 1) * 2 + pad - 1 + dy, 0, GLASSES_GRID_SIZE - 1);
    const leftMidY = clamp(Math.round((leftMinY + leftMaxY) / 2), 0, GLASSES_GRID_SIZE - 1);
    const rightMidY = clamp(Math.round((rightMinY + rightMaxY) / 2), 0, GLASSES_GRID_SIZE - 1);
    const bridgeY = clamp(Math.round((leftMidY + rightMidY) / 2), 0, GLASSES_GRID_SIZE - 1);

    pushFineRow(map, leftMinY, leftMinX, leftMaxX, frameColor);
    pushFineRow(map, leftMaxY, leftMinX, leftMaxX, frameColor);
    pushFineRow(map, rightMinY, rightMinX, rightMaxX, frameColor);
    pushFineRow(map, rightMaxY, rightMinX, rightMaxX, frameColor);

    for (let y = leftMinY + 1; y < leftMaxY; y++) {
      pushFinePixel(map, leftMinX, y, frameColor);
      pushFinePixel(map, leftMaxX, y, frameColor);
    }
    for (let y = rightMinY + 1; y < rightMaxY; y++) {
      pushFinePixel(map, rightMinX, y, frameColor);
      pushFinePixel(map, rightMaxX, y, frameColor);
    }

    for (let x = leftMaxX + 1; x < rightMinX; x++) {
      pushFinePixel(map, x, bridgeY, frameColor);
    }

    return Array.from(map.values());
  }, [showGlasses, eyeCells, glassesColor, currentFrameDy]);

  const hatPixels = useMemo(() => {
    if (!showHat || !headInfo) return [] as PixelCell[];
    const { topY, minX, maxX } = headInfo;
    const map = new Map<string, PixelCell>();
    const centerX = clamp(Math.round((minX + maxX + 1) / 2), 2, GRID_SIZE - 2);
    const baseY = clamp(topY - 1, 0, GRID_SIZE - 1);
    const topRowY = topY - 2;

    pushRow(map, baseY, centerX - 2, centerX + 1, hatColor);
    if (topRowY >= 0) pushRow(map, topRowY, centerX - 1, centerX, hatColor);

    return Array.from(map.values());
  }, [showHat, headInfo, hatColor]);

  const hatStar = useMemo(() => {
    if (!showHat || !headInfo) return null as HatStar | null;
    const { topY, minX, maxX } = headInfo;
    const centerX = clamp(Math.round((minX + maxX + 1) / 2), 2, GRID_SIZE - 2);
    const topRowY = topY - 2;
    const anchorY = topRowY >= 0 ? topRowY : topY - 1;
    const starCy = Math.max(0.36, anchorY - 0.72);
    return {
      points: buildFourPointStarPoints(centerX, starCy, 0.48, 0.18),
      fill: hatColor,
    };
  }, [showHat, headInfo, hatColor]);

  const bubblePixels32 = useMemo(() => {
    if (!showBubble || !headInfo) return [] as FinePixelCell[];
    const { topY, minX, maxX } = headInfo;
    const centerX32 = minX + maxX + 1;
    const bubbleWidth = 12;
    const bubbleOffsetX = 5;
    const originX = Math.round(centerX32 - bubbleWidth / 2 + bubbleOffsetX);
    const originY = Math.round(topY * 2 + currentFrameDy * 2 - 12);
    const map = new Map<string, FinePixelCell>();

    BUBBLE_ROWS.forEach(({ y, start, end }) => {
      const absoluteY = originY + y;
      for (let x = start; x <= end; x++) {
        const absoluteX = originX + x;
        map.set(`${absoluteX},${absoluteY}`, { x: absoluteX, y: absoluteY, fill: '#FFFFFF' });
      }
    });

    return Array.from(map.values());
  }, [showBubble, headInfo, currentFrameDy]);

  const laptopPixels32 = useMemo(() => {
    if (activeMotion !== 'laptop') return [] as FinePixelCell[];

    const bounds = findOccupiedBounds(grid);
    if (!bounds) return [] as FinePixelCell[];

    const map = new Map<string, FinePixelCell>();
    const shell = '#9CA3AF';
    const shellDark = '#6B7280';
    const shellLight = '#D1D5DB';
    const keys = '#4B5563';
    const typingGlow = animFrame % 8 < 4 ? shellLight : '#9CA3AF';
    const centerX = clamp(Math.round(bounds.minX + bounds.maxX + 1), 11, 21);
    const originX = centerX - 10;
    const originY = clamp((bounds.maxY - 5) * 2, Math.max(7, bounds.minY * 2 + 6), 16);

    const fillRect = (x: number, y: number, fill: string) => {
      pushFinePixel(map, originX + x, originY + y, fill);
    };

    for (let y = 0; y <= 7; y++) {
      for (let x = 6; x <= 18; x++) fillRect(x, y, shell);
    }

    const screenGlow = animFrame % 8 < 4 ? '#93C5FD' : shellLight;
    fillRect(11, 3, screenGlow);
    fillRect(12, 3, screenGlow);
    fillRect(11, 4, screenGlow);
    fillRect(12, 4, screenGlow);

    for (let x = 4; x <= 16; x++) {
      fillRect(x, 8, x % 2 === 0 ? shellLight : keys);
    }
    [17, 18].forEach(x => fillRect(x, 8, shell));

    [5, 9, 13].forEach(x => {
      fillRect(x, 8, typingGlow);
    });

    for (let x = 2; x <= 17; x++) {
      fillRect(x, 9, shellDark);
      fillRect(x, 10, shellDark);
    }

    return Array.from(map.values());
  }, [activeMotion, grid, animFrame]);

  const errorFlagPixels32 = useMemo(() => {
    if (activeMotion !== 'error') return [] as FinePixelCell[];

    const anchors = buildErrorFlagAnchors(shoulder, armCells);
    const [handY, handX] = anchors[animFrame % anchors.length] ?? [shoulder[0] - 1, shoulder[1] + 2];
    const map = new Map<string, FinePixelCell>();
    const pole = '#303540';
    const flagRed = '#EB4A47';
    const flagLight = '#FFCBCB';
    const phase = animFrame % 3;
    const originX = handX * 2 + 2;
    const originY = (handY - 10) * 2;

    const setFine = (dx: number, dy: number, fill: string) => {
      map.set(`${originX + dx},${originY + dy}`, { x: originX + dx, y: originY + dy, fill });
    };

    for (let y = 0; y <= 22; y++) {
      setFine(0, y, pole);
    }

    const flagShapes = [
      [
        [-2, 0, flagRed], [-3, 0, flagLight], [-4, 0, flagRed], [-5, 0, flagLight], [-6, 0, flagRed], [-7, 0, flagLight],
        [-2, 1, flagLight], [-3, 1, flagRed], [-4, 1, flagLight], [-5, 1, flagRed], [-6, 1, flagLight], [-7, 1, flagRed],
        [-2, 2, flagLight], [-3, 2, flagRed], [-4, 2, flagLight], [-5, 2, flagRed], [-6, 2, flagLight], [-7, 2, flagRed], [-8, 2, flagLight], [-9, 2, flagRed],
        [-2, 3, flagRed], [-3, 3, flagLight], [-4, 3, flagRed], [-5, 3, flagLight], [-6, 3, flagRed], [-7, 3, flagLight], [-8, 3, flagRed], [-9, 3, flagLight],
        [-2, 4, flagRed], [-3, 4, flagLight], [-4, 4, flagRed], [-5, 4, flagLight], [-6, 4, flagRed], [-7, 4, flagLight], [-8, 4, flagRed], [-9, 4, flagLight], [-10, 4, flagRed], [-11, 4, flagLight],
        [-2, 5, flagLight], [-3, 5, flagRed], [-4, 5, flagLight], [-5, 5, flagRed], [-6, 5, flagLight], [-7, 5, flagRed], [-8, 5, flagLight], [-9, 5, flagRed], [-10, 5, flagLight], [-11, 5, flagRed],
        [-2, 6, flagRed], [-3, 6, flagLight], [-4, 6, flagRed], [-5, 6, flagLight], [-6, 6, flagRed], [-7, 6, flagLight], [-8, 6, flagRed], [-9, 6, flagLight], [-10, 6, flagRed], [-11, 6, flagLight],
        [-2, 7, flagLight], [-3, 7, flagRed], [-4, 7, flagLight], [-5, 7, flagRed], [-6, 7, flagLight], [-7, 7, flagRed], [-8, 7, flagLight], [-9, 7, flagRed],
        [-2, 8, flagRed], [-3, 8, flagLight], [-4, 8, flagRed], [-5, 8, flagLight], [-6, 8, flagRed], [-7, 8, flagLight],
        [-2, 9, flagLight], [-3, 9, flagRed], [-4, 9, flagLight], [-5, 9, flagRed],
      ],
      [
        [-2, 0, flagLight], [-3, 0, flagRed], [-4, 0, flagLight], [-5, 0, flagRed],
        [-2, 1, flagRed], [-3, 1, flagLight], [-4, 1, flagRed], [-5, 1, flagLight], [-6, 1, flagRed], [-7, 1, flagLight],
        [-2, 2, flagRed], [-3, 2, flagLight], [-4, 2, flagRed], [-5, 2, flagLight], [-6, 2, flagRed], [-7, 2, flagLight], [-8, 2, flagRed], [-9, 2, flagLight],
        [-2, 3, flagLight], [-3, 3, flagRed], [-4, 3, flagLight], [-5, 3, flagRed], [-6, 3, flagLight], [-7, 3, flagRed], [-8, 3, flagLight], [-9, 3, flagRed],
        [-2, 4, flagLight], [-3, 4, flagRed], [-4, 4, flagLight], [-5, 4, flagRed], [-6, 4, flagLight], [-7, 4, flagRed], [-8, 4, flagLight], [-9, 4, flagRed], [-10, 4, flagLight], [-11, 4, flagRed],
        [-2, 5, flagRed], [-3, 5, flagLight], [-4, 5, flagRed], [-5, 5, flagLight], [-6, 5, flagRed], [-7, 5, flagLight], [-8, 5, flagRed], [-9, 5, flagLight], [-10, 5, flagRed], [-11, 5, flagLight],
        [-2, 6, flagLight], [-3, 6, flagRed], [-4, 6, flagLight], [-5, 6, flagRed], [-6, 6, flagLight], [-7, 6, flagRed], [-8, 6, flagLight], [-9, 6, flagRed],
        [-2, 7, flagRed], [-3, 7, flagLight], [-4, 7, flagRed], [-5, 7, flagLight], [-6, 7, flagRed], [-7, 7, flagLight],
        [-2, 8, flagLight], [-3, 8, flagRed], [-4, 8, flagLight], [-5, 8, flagRed],
        [-2, 9, flagRed], [-3, 9, flagLight],
      ],
      [
        [-2, 0, flagRed], [-3, 0, flagLight], [-4, 0, flagRed], [-5, 0, flagLight], [-6, 0, flagRed], [-7, 0, flagLight], [-8, 0, flagRed],
        [-2, 1, flagLight], [-3, 1, flagRed], [-4, 1, flagLight], [-5, 1, flagRed], [-6, 1, flagLight], [-7, 1, flagRed], [-8, 1, flagLight], [-9, 1, flagRed],
        [-2, 2, flagLight], [-3, 2, flagRed], [-4, 2, flagLight], [-5, 2, flagRed], [-6, 2, flagLight], [-7, 2, flagRed], [-8, 2, flagLight], [-9, 2, flagRed], [-10, 2, flagLight], [-11, 2, flagRed],
        [-2, 3, flagRed], [-3, 3, flagLight], [-4, 3, flagRed], [-5, 3, flagLight], [-6, 3, flagRed], [-7, 3, flagLight], [-8, 3, flagRed], [-9, 3, flagLight], [-10, 3, flagRed], [-11, 3, flagLight],
        [-2, 4, flagRed], [-3, 4, flagLight], [-4, 4, flagRed], [-5, 4, flagLight], [-6, 4, flagRed], [-7, 4, flagLight], [-8, 4, flagRed], [-9, 4, flagLight],
        [-2, 5, flagLight], [-3, 5, flagRed], [-4, 5, flagLight], [-5, 5, flagRed], [-6, 5, flagLight], [-7, 5, flagRed],
        [-2, 6, flagRed], [-3, 6, flagLight], [-4, 6, flagRed], [-5, 6, flagLight],
        [-2, 7, flagLight], [-3, 7, flagRed],
      ],
    ] as Array<Array<[number, number, string]>>;

    flagShapes[phase].forEach(([dx, dy, fill]) => {
      setFine(dx + 1, dy, fill);
    });

    return Array.from(map.values());
  }, [activeMotion, shoulder, armCells, animFrame]);

  const firePixels32 = useMemo(() => {
    if (!showFire) return [] as FinePixelCell[];
    if (!headInfo) return [] as FinePixelCell[];

    const map = new Map<string, FinePixelCell>();
    const ember = '#EF4444';
    const flame = '#F97316';
    const core = '#FDE047';
    const phase = fireFrame % 4;
    const centerX = clamp(Math.round(headInfo.minX + headInfo.maxX + 1), 6, 26);
    const topY = headInfo.topY * 2 - 8;
    const rows = 7;

    const outerHalf = [0, 0, 1, 2, 2, 2, 0];
    const innerHalf = [0, 0, 0, 1, 1, 2, 1];
    const coreHalf = [0, 0, 0, 0, 1, 1, 0];
    const setFinePixel = (x: number, y: number, fill: string) => {
      if (x < 0 || x >= GLASSES_GRID_SIZE) return;
      map.set(`${x},${y}`, { x, y, fill });
    };
    const setFineRow = (y: number, startX: number, endX: number, fill: string) => {
      for (let x = startX; x <= endX; x++) setFinePixel(x, y, fill);
    };

    for (let row = 0; row < rows; row++) {
      const y = topY + row;
      const sway = phase === 0 ? -1 : phase === 2 ? 1 : 0;
      const pulse = row === rows - 2 && phase % 2 === 0 ? 1 : 0;
      const rowCenter = centerX + (row < 3 ? sway : 0);

      setFineRow(y, rowCenter - outerHalf[row] - pulse, rowCenter + outerHalf[row] + pulse, ember);
      setFineRow(y, rowCenter - innerHalf[row], rowCenter + innerHalf[row], flame);
      if (coreHalf[row] > 0) setFineRow(y, rowCenter - coreHalf[row], rowCenter + coreHalf[row], core);
    }

    setFinePixel(centerX + (phase === 1 ? 1 : 0), topY, core);
    setFinePixel(centerX + (phase === 3 ? -1 : 0), topY + 1, flame);
    setFinePixel(centerX - 2, topY + 5, ember);
    setFinePixel(centerX + 2, topY + 5, ember);

    return Array.from(map.values());
  }, [showFire, headInfo, fireFrame]);

  const accessoryPixels = useMemo(
    () => [] as PixelCell[],
    []
  );

  const renderedPixels = useMemo(() => {
    const map = new Map<string, PixelCell>();
    displayGrid.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) pushPixel(map, x, y, color);
      });
    });
    accessoryPixels.forEach(pixel => {
      pushPixel(map, pixel.x, pixel.y, pixel.fill);
    });
    return Array.from(map.values());
  }, [displayGrid, accessoryPixels, color]);

  useEffect(() => {
    if (!animFrames) { setAnimFrame(0); return; }
    const fps = activeMotion ? MOTION_FPS[activeMotion] : 6;
    animIntervalRef.current = setInterval(() => {
      setAnimFrame(f => (f + 1) % animFrames.length);
    }, Math.round(1000 / fps));
    return () => { if (animIntervalRef.current) clearInterval(animIntervalRef.current); };
  }, [animFrames, activeMotion]);

  // Sync canvas for PNG exports
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || grid.length === 0) return;
    const scale = 64;
    canvas.width = GRID_SIZE * scale;
    canvas.height = GRID_SIZE * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    const fineScale = scale / 2;
    firePixels32.forEach(({ x, y, fill }) => {
      const shiftedY = y + currentFrameDy * 2;
      if (shiftedY < 0 || shiftedY >= GLASSES_GRID_SIZE) return;
      ctx.fillStyle = fill;
      ctx.fillRect(x * fineScale, shiftedY * fineScale, fineScale, fineScale);
    });
    renderedPixels.forEach(({ x, y, fill }) => {
      ctx.fillStyle = fill;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    });
    hatPixels.forEach(({ x, y, fill }) => {
      const shiftedY = y + currentFrameDy;
      if (shiftedY < 0 || shiftedY >= GRID_SIZE) return;
      ctx.fillStyle = fill;
      ctx.fillRect(x * scale, shiftedY * scale, scale, scale);
    });
    glassesPixels32.forEach(({ x, y, fill }) => {
      ctx.fillStyle = fill;
      ctx.fillRect(x * fineScale, y * fineScale, fineScale, fineScale);
    });
    laptopPixels32.forEach(({ x, y, fill }) => {
      ctx.fillStyle = fill;
      ctx.fillRect(x * fineScale, y * fineScale, fineScale, fineScale);
    });
    errorFlagPixels32.forEach(({ x, y, fill }) => {
      ctx.fillStyle = fill;
      ctx.fillRect(x * fineScale, y * fineScale, fineScale, fineScale);
    });
    if (hatStar) drawPolygon(ctx, translatePoints(hatStar.points, 0, currentFrameDy), scale, hatStar.fill);
    bubblePixels32.forEach(({ x, y, fill }) => {
      ctx.fillStyle = fill;
      ctx.fillRect(x * fineScale, y * fineScale, fineScale, fineScale);
    });
  }, [grid, firePixels32, renderedPixels, hatPixels, glassesPixels32, laptopPixels32, errorFlagPixels32, bgColor, hatStar, currentFrameDy, bubblePixels32]);

  const downloadSVG = () => {
    const svgContent = `<svg width="${GRID_SIZE * CELL_SIZE}" height="${GRID_SIZE * CELL_SIZE}" viewBox="0 0 ${GRID_SIZE} ${GRID_SIZE}" xmlns="http://www.w3.org/2000/svg">
  ${bgColor !== 'transparent' ? `<rect width="100%" height="100%" fill="${bgColor}" />` : ''}
  ${firePixels32.map(({ x, y, fill }) => {
    const shiftedY = y + currentFrameDy * 2;
    return shiftedY >= 0 && shiftedY < GLASSES_GRID_SIZE
      ? `<rect x="${x / 2}" y="${shiftedY / 2}" width="0.5" height="0.5" fill="${fill}" />`
      : '';
  }).join('')}
  ${renderedPixels.map(({ x, y, fill }) => `<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}" />`).join('')}
  ${hatPixels.map(({ x, y, fill }) => {
    const shiftedY = y + currentFrameDy;
    return shiftedY >= 0 && shiftedY < GRID_SIZE
      ? `<rect x="${x}" y="${shiftedY}" width="1" height="1" fill="${fill}" />`
      : '';
  }).join('')}
  ${glassesPixels32.map(({ x, y, fill }) => `<rect x="${x / 2}" y="${y / 2}" width="0.5" height="0.5" fill="${fill}" />`).join('')}
  ${laptopPixels32.map(({ x, y, fill }) => `<rect x="${x / 2}" y="${y / 2}" width="0.5" height="0.5" fill="${fill}" />`).join('')}
  ${errorFlagPixels32.map(({ x, y, fill }) => `<rect x="${x / 2}" y="${y / 2}" width="0.5" height="0.5" fill="${fill}" />`).join('')}
  ${hatStar ? `<polygon points="${pointsToSvg(translatePoints(hatStar.points, 0, currentFrameDy))}" fill="${hatStar.fill}" />` : ''}
  ${bubblePixels32.map(({ x, y, fill }) => `<rect x="${x / 2}" y="${y / 2}" width="0.5" height="0.5" fill="${fill}" />`).join('')}
</svg>`;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pixel-character.svg';
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPNG = (scale = 64) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = GRID_SIZE * scale;
    canvas.height = GRID_SIZE * scale;
    if (bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    const fineScale = scale / 2;
    firePixels32.forEach(({ x, y, fill }) => {
      const shiftedY = y + currentFrameDy * 2;
      if (shiftedY < 0 || shiftedY >= GLASSES_GRID_SIZE) return;
      ctx.fillStyle = fill;
      ctx.fillRect(x * fineScale, shiftedY * fineScale, fineScale, fineScale);
    });
    renderedPixels.forEach(({ x, y, fill }) => {
      ctx.fillStyle = fill;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    });
    hatPixels.forEach(({ x, y, fill }) => {
      const shiftedY = y + currentFrameDy;
      if (shiftedY < 0 || shiftedY >= GRID_SIZE) return;
      ctx.fillStyle = fill;
      ctx.fillRect(x * scale, shiftedY * scale, scale, scale);
    });
    glassesPixels32.forEach(({ x, y, fill }) => {
      ctx.fillStyle = fill;
      ctx.fillRect(x * fineScale, y * fineScale, fineScale, fineScale);
    });
    laptopPixels32.forEach(({ x, y, fill }) => {
      ctx.fillStyle = fill;
      ctx.fillRect(x * fineScale, y * fineScale, fineScale, fineScale);
    });
    errorFlagPixels32.forEach(({ x, y, fill }) => {
      ctx.fillStyle = fill;
      ctx.fillRect(x * fineScale, y * fineScale, fineScale, fineScale);
    });
    if (hatStar) drawPolygon(ctx, translatePoints(hatStar.points, 0, currentFrameDy), scale, hatStar.fill);
    bubblePixels32.forEach(({ x, y, fill }) => {
      ctx.fillStyle = fill;
      ctx.fillRect(x * fineScale, y * fineScale, fineScale, fineScale);
    });
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `pixel-character-${scale === 1 ? '16px' : '1024px'}.png`;
    link.click();
  };

  const downloadWebP = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/webp', 0.8);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pixel-character.webp';
    link.click();
  };

  return (
    <div className="dark min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-8 selection:bg-primary/30">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md md:max-w-lg space-y-4"
      >
        {/* Header */}
        <div className="text-center space-y-2 pb-2">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Badge variant="secondary" className="gap-1 text-[10px] tracking-widest uppercase px-2 py-0.5">
              <Sparkles className="size-2.5" />
              16×16 Pixel Art
            </Badge>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            Pixel Character
          </h1>
          <p className="text-muted-foreground text-sm">
            Procedural sprite generator with symmetric rendering
          </p>
        </div>

        {/* Preview Card */}
        <Card className="overflow-visible gap-0 py-0">
          <div className="relative">
            <CharacterPreview
              activeMotion={activeMotion ?? 'idle'}
              bgColor={bgColor}
              bubblePixels32={bubblePixels32}
              currentFrameDy={currentFrameDy}
              firePixels32={firePixels32}
              glassesPixels32={glassesPixels32}
              hatPixels={hatPixels}
              hatStarFill={hatStar?.fill ?? null}
              hatStarPoints={hatStar ? pointsToSvg(hatStar.points) : null}
              errorFlagPixels32={errorFlagPixels32}
              laptopPixels32={laptopPixels32}
              renderedPixels={renderedPixels}
              showBubble={showBubble}
              showFire={showFire}
              showGlasses={showGlasses}
              showHat={showHat}
            />

            {/* Generate button overlay */}
            <div className="absolute bottom-4 right-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    onClick={generateRandom}
                    className="rounded-full size-10 shadow-lg"
                  >
                    <RefreshCw className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Generate new character</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <Separator />

          {/* Animate Controls */}
          <CardContent className="py-4 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Motion
            </p>
            <div className="grid grid-cols-3 gap-2">
              {([
                ['idle', 'Idle'],
                ['walk', 'Walk'],
                ['hi', 'Hi'],
                ['laptop', 'Laptop'],
                ['error', 'Error'],
                ['jump', 'Jump'],
              ] as const).map(([motion, label]) => (
                <Button
                  key={motion}
                  variant={activeMotion === motion ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveMotion(current => current === motion ? null : motion)}
                  className="text-[11px] font-semibold"
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={showBubble ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowBubble(v => !v)}
                className="gap-2 text-[11px] font-semibold"
                style={showBubble ? { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF', color: '#111827' } : {}}
              >
                <MessageCircle className="size-3.5" />
                Bubble
              </Button>
              <Button
                variant={showFire ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowFire(v => !v)}
                className="gap-2 text-xs font-semibold"
                style={showFire ? { backgroundColor: '#F97316', borderColor: '#F97316', color: '#000' } : {}}
              >
                <Flame className="size-3.5" />
                Fire
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                {
                  key: 'glasses',
                  active: showGlasses,
                  label: 'Glasses',
                  onClick: () => setShowGlasses(v => !v),
                  style: showGlasses ? { backgroundColor: glassesColor, borderColor: glassesColor, color: '#000' } : {},
                  icon: <Glasses className="size-3.5" />,
                },
                {
                  key: 'hat',
                  active: showHat,
                  label: 'Hat',
                  onClick: () => setShowHat(v => !v),
                  style: showHat ? { backgroundColor: hatColor, borderColor: hatColor, color: '#000' } : {},
                  icon: <Crown className="size-3.5" />,
                },
              ].map(item => (
                <Button
                  key={item.key}
                  variant={item.active ? 'default' : 'outline'}
                  size="sm"
                  onClick={item.onClick}
                  className="gap-2 text-xs font-semibold"
                  style={item.style}
                >
                  {item.icon}
                  {item.label}
                </Button>
              ))}
            </div>
          </CardContent>

          <Separator />

          {/* Color Controls */}
          <CardContent className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Character Color */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Palette className="size-3" />
                  Character
                </label>
                <label className="flex items-center gap-2.5 rounded-lg border bg-input/30 px-3 py-2 cursor-pointer hover:bg-accent/50 transition-colors">
                  <span
                    className="size-5 rounded-md ring-1 ring-border shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <input
                    type="color"
                    value={color.startsWith('hsl') ? '#F97316' : color}
                    onChange={(e) => setColor(e.target.value)}
                    className="sr-only"
                  />
                  <span className="font-mono text-[10px] text-muted-foreground truncate">
                    {color.startsWith('hsl') ? 'Custom' : color.toUpperCase()}
                  </span>
                </label>
              </div>

              {/* Background Color */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <ImageIcon className="size-3" />
                  Background
                </label>
                <div className="flex gap-1.5">
                  <label className={`flex-1 flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${bgColor === 'transparent' ? 'opacity-50' : 'bg-input/30 hover:bg-accent/50'}`}>
                    {bgColor === 'transparent' ? (
                      <span className="size-5 rounded-md ring-1 ring-border shrink-0 bg-[repeating-conic-gradient(#808080_0%_25%,transparent_0%_50%)] bg-[length:10px_10px]" />
                    ) : (
                      <span
                        className="size-5 rounded-md ring-1 ring-border shrink-0"
                        style={{ backgroundColor: bgColor }}
                      />
                    )}
                    <input
                      type="color"
                      value={bgColor === 'transparent' ? '#0F172A' : bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      disabled={bgColor === 'transparent'}
                      className="sr-only"
                    />
                    <span className="font-mono text-[10px] text-muted-foreground truncate">
                      {bgColor === 'transparent' ? 'None' : bgColor.toUpperCase()}
                    </span>
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={bgColor === 'transparent' ? 'default' : 'outline'}
                        size="icon"
                        className="size-9 shrink-0"
                        onClick={() => setBgColor(bgColor === 'transparent' ? '#0F172A' : 'transparent')}
                      >
                        <ImageIcon className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {bgColor === 'transparent' ? 'Add background' : 'Remove background'}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </CardContent>

          <Separator />

          {/* Download Section */}
          <CardContent className="py-4 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Download className="size-3" />
              Export
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={downloadSVG} className="gap-2 text-xs font-semibold">
                <Download className="size-3.5" />
                SVG Vector
              </Button>
              <Button variant="outline" size="sm" onClick={() => downloadPNG(1)} className="gap-2 text-xs font-semibold">
                <Download className="size-3.5" />
                PNG 16px
              </Button>
              <Button variant="outline" size="sm" onClick={downloadWebP} className="gap-2 text-xs font-semibold">
                <Download className="size-3.5" />
                WebP
              </Button>
              <Button variant="outline" size="sm" onClick={() => downloadPNG(64)} className="gap-2 text-xs font-semibold">
                <Download className="size-3.5" />
                PNG 1024px
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-muted-foreground/40 text-[10px] uppercase tracking-[0.2em] pb-2">
          Symmetry Engine · 16×16 Grid
        </p>
      </motion.div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
