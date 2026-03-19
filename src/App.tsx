/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, Download, Image as ImageIcon, Palette, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Separator } from '@/src/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/src/components/ui/tooltip';

const GRID_SIZE = 16;
const CELL_SIZE = 20;

export default function App() {
  const [grid, setGrid] = useState<boolean[][]>([]);
  const [color, setColor] = useState('#F97316');
  const [bgColor, setBgColor] = useState('transparent');
  const [generateCount, setGenerateCount] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateRandom = useCallback(() => {
    const newGrid: boolean[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false));
    const halfWidth = Math.ceil(GRID_SIZE / 2);

    const headWidth = 4 + Math.floor(Math.random() * 3);
    const headHeight = 4 + Math.floor(Math.random() * 3);
    const headStartY = 1 + Math.floor(Math.random() * 2);

    const bodyWidth = 3 + Math.floor(Math.random() * 4);
    const bodyHeight = 4 + Math.floor(Math.random() * 4);
    const bodyStartY = headStartY + headHeight + (Math.random() < 0.4 ? 1 : 0);

    for (let y = headStartY; y < headStartY + headHeight; y++) {
      for (let x = halfWidth - headWidth; x < halfWidth; x++) {
        newGrid[y][x] = true;
      }
    }

    for (let y = bodyStartY; y < bodyStartY + bodyHeight; y++) {
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

    for (let ey = 0; ey < eyeSizeH; ey++) {
      for (let ex = 0; ex < eyeSizeW; ex++) {
        const curY = eyeY + ey;
        const curX = eyeX - ex;
        if (curY < GRID_SIZE && curX >= 0) {
          newGrid[curY][curX] = false;
        }
      }
    }

    const legType = Math.floor(Math.random() * 5);
    const bodyEndY = bodyStartY + bodyHeight;
    const legHeight = 2 + Math.floor(Math.random() * 3);

    for (let y = bodyEndY; y < Math.min(bodyEndY + legHeight, GRID_SIZE); y++) {
      if (legType === 0) {
        newGrid[y][halfWidth - bodyWidth + 1] = true;
        newGrid[y][halfWidth - 2] = true;
      } else if (legType === 1) {
        for (let x = halfWidth - bodyWidth + 1; x < halfWidth - 1; x++) {
          newGrid[y][x] = true;
        }
      } else if (legType === 2) {
        const offset = y - bodyEndY;
        newGrid[y][halfWidth - bodyWidth + 1 + offset] = true;
      } else if (legType === 3) {
        newGrid[y][halfWidth - 1] = true;
      } else {
        newGrid[y][halfWidth - bodyWidth] = true;
        newGrid[y][halfWidth - 2] = true;
      }
    }

    const sideDetailType = Math.floor(Math.random() * 6);
    if (sideDetailType > 0) {
      const sideY = bodyStartY + 1;
      const startX = halfWidth - Math.max(headWidth, bodyWidth) - 1;

      if (sideDetailType === 1) {
        newGrid[headStartY][halfWidth - headWidth - 1] = true;
        newGrid[headStartY - 1][halfWidth - headWidth - 1] = true;
      } else if (sideDetailType === 2) {
        for (let x = startX; x > startX - 2; x--) {
          if (x >= 0) newGrid[sideY + 1][x] = true;
        }
      } else if (sideDetailType === 3) {
        for (let dy = 0; dy < 3; dy++) {
          if (startX >= 0) newGrid[sideY + dy][startX] = true;
        }
      } else if (sideDetailType === 4) {
        if (startX >= 0) {
          newGrid[sideY][startX] = true;
          newGrid[sideY + 2][startX] = true;
        }
      } else if (sideDetailType === 5) {
        newGrid[bodyStartY][halfWidth - bodyWidth - 1] = true;
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

    setGrid(newGrid);
    setGenerateCount(c => c + 1);

    const hue = Math.floor(Math.random() * 360);
    setColor(`hsl(${hue}, 80%, 60%)`);
  }, []);

  useEffect(() => {
    generateRandom();
  }, [generateRandom]);

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
    ctx.fillStyle = color;
    grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) ctx.fillRect(x * scale, y * scale, scale, scale);
      });
    });
  }, [grid, color, bgColor]);

  const downloadSVG = () => {
    const svgContent = `<svg width="${GRID_SIZE * CELL_SIZE}" height="${GRID_SIZE * CELL_SIZE}" viewBox="0 0 ${GRID_SIZE} ${GRID_SIZE}" xmlns="http://www.w3.org/2000/svg">
  ${bgColor !== 'transparent' ? `<rect width="100%" height="100%" fill="${bgColor}" />` : ''}
  ${grid.map((row, y) => row.map((cell, x) => cell ? `<rect x="${x}" y="${y}" width="1" height="1" fill="${color}" />` : '').join('')).join('')}
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
    ctx.fillStyle = color;
    grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) ctx.fillRect(x * scale, y * scale, scale, scale);
      });
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
        className="w-full max-w-sm space-y-4"
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
        <Card className="overflow-hidden gap-0 py-0">
          <div className="relative">
            <motion.div
              layout
              className="aspect-square w-full p-8 flex items-center justify-center relative"
              style={{
                backgroundColor: bgColor === 'transparent' ? 'hsl(var(--card) / 1)' : bgColor,
                backgroundImage: bgColor === 'transparent'
                  ? 'radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 0)'
                  : 'none',
                backgroundSize: '24px 24px',
              }}
            >
              <div
                className="grid gap-0"
                style={{
                  gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                  width: '100%',
                  maxWidth: '280px',
                  aspectRatio: '1/1',
                }}
              >
                <AnimatePresence mode="popLayout">
                  {grid.map((row, y) =>
                    row.map((cell, x) => (
                      <motion.div
                        key={`${x}-${y}-${generateCount}`}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{
                          type: 'spring',
                          stiffness: 300,
                          damping: 20,
                          delay: (x + y) * 0.002,
                        }}
                        className="w-full h-full"
                        style={{ backgroundColor: cell ? color : 'transparent' }}
                      />
                    ))
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

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
