/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, Download, Image as ImageIcon, Palette, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const GRID_SIZE = 16;
const CELL_SIZE = 20;

export default function App() {
  const [grid, setGrid] = useState<boolean[][]>([]);
  const [color, setColor] = useState('#F97316'); // Default orange
  const [bgColor, setBgColor] = useState('transparent'); // Default transparent
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate a random symmetric character with a face structure
  const generateRandom = useCallback(() => {
    const newGrid: boolean[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false));
    const halfWidth = Math.ceil(GRID_SIZE / 2);

    // 1. Randomize Head/Body Dimensions - Segmented for more character
    const headWidth = 4 + Math.floor(Math.random() * 3); // 4 to 6
    const headHeight = 4 + Math.floor(Math.random() * 3); // 4 to 6
    const headStartY = 1 + Math.floor(Math.random() * 2);
    
    const bodyWidth = 3 + Math.floor(Math.random() * 4); // 3 to 6
    const bodyHeight = 4 + Math.floor(Math.random() * 4); // 4 to 7
    const bodyStartY = headStartY + headHeight + (Math.random() < 0.4 ? 1 : 0); // Optional neck gap

    // 2. Fill the Head
    for (let y = headStartY; y < headStartY + headHeight; y++) {
      for (let x = halfWidth - headWidth; x < halfWidth; x++) {
        newGrid[y][x] = true;
      }
    }

    // 3. Fill the Body
    for (let y = bodyStartY; y < bodyStartY + bodyHeight; y++) {
      for (let x = halfWidth - bodyWidth; x < halfWidth; x++) {
        newGrid[y][x] = true;
      }
    }

    // 4. Define Dynamic "Eyes"
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

    // 5. Diverse Leg Structures
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
        newGrid[y][halfWidth - 1] = true; // Single center leg
      } else {
        newGrid[y][halfWidth - bodyWidth] = true;
        newGrid[y][halfWidth - 2] = true;
      }
    }

    // 8. Diverse Side Details
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
        // Shoulder pads
        newGrid[bodyStartY][halfWidth - bodyWidth - 1] = true;
      }
    }

    // 6. Top Details (Antennae/Horns)
    if (Math.random() < 0.4) {
      const topX = halfWidth - headWidth + 1;
      if (headStartY - 1 >= 0) {
        newGrid[headStartY - 1][topX] = true;
        if (Math.random() < 0.5 && headStartY - 2 >= 0) {
          newGrid[headStartY - 2][topX - 1 >= 0 ? topX - 1 : topX] = true;
        }
      }
    }

    // Mirror to right half
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = halfWidth; x < GRID_SIZE; x++) {
        newGrid[y][x] = newGrid[y][GRID_SIZE - 1 - x];
      }
    }

    setGrid(newGrid);
    
    // Random vibrant color
    const hue = Math.floor(Math.random() * 360);
    setColor(`hsl(${hue}, 80%, 60%)`);
  }, []);

  // Initialize with a random character
  useEffect(() => {
    generateRandom();
  }, [generateRandom]);

  // Export as SVG
  const downloadSVG = () => {
    const svgContent = `
      <svg width="${GRID_SIZE * CELL_SIZE}" height="${GRID_SIZE * CELL_SIZE}" viewBox="0 0 ${GRID_SIZE} ${GRID_SIZE}" xmlns="http://www.w3.org/2000/svg">
        ${bgColor !== 'transparent' ? `<rect width="100%" height="100%" fill="${bgColor}" />` : ''}
        ${grid.map((row, y) => 
          row.map((cell, x) => 
            cell ? `<rect x="${x}" y="${y}" width="1" height="1" fill="${color}" />` : ''
          ).join('')
        ).join('')}
      </svg>
    `;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pixel-character.svg';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export as PNG
  const downloadPNG = (scale = 64) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = GRID_SIZE * scale;
    canvas.height = GRID_SIZE * scale;

    // Background
    if (bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Character
    ctx.fillStyle = color;
    grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      });
    });

    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `pixel-character-${scale === 1 ? '16px' : '1024px'}.png`;
    link.click();
  };

  // Export as WebP
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
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col items-center justify-center p-4 font-sans selection:bg-orange-500/30">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black tracking-tighter uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-500">
            Pixel Character
          </h1>
          <p className="text-slate-400 text-sm font-medium tracking-widest uppercase">
            Random 16-Bit Generator
          </p>
        </div>

        {/* Character Display */}
        <div className="relative group">
          <motion.div 
            layout
            className="aspect-square w-full rounded-3xl overflow-hidden shadow-2xl shadow-orange-500/10 border border-slate-800 p-8 flex items-center justify-center relative"
            style={{ 
              backgroundColor: bgColor === 'transparent' ? '#0F172A' : bgColor,
              backgroundImage: bgColor === 'transparent' ? 'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)' : 'none',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
            }}
          >
            <div 
              className="grid gap-0"
              style={{ 
                gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                width: '100%',
                maxWidth: '320px',
                aspectRatio: '1/1'
              }}
            >
              <AnimatePresence mode="popLayout">
                {grid.map((row, y) => 
                  row.map((cell, x) => (
                    <motion.div
                      key={`${x}-${y}-${cell}`}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ 
                        type: 'spring', 
                        stiffness: 300, 
                        damping: 20,
                        delay: (x + y) * 0.002 
                      }}
                      className="w-full h-full"
                      style={{ 
                        backgroundColor: cell ? color : 'transparent',
                      }}
                    />
                  ))
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Floating Action */}
          <button 
            onClick={generateRandom}
            className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-white text-black p-4 rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all group"
          >
            <RefreshCw className="w-6 h-6 group-hover:rotate-180 transition-transform duration-500" />
          </button>
        </div>

        {/* Controls */}
        <div className="pt-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Color Picker */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Palette className="w-3 h-3" /> Character Color
              </label>
              <div className="flex items-center gap-3 bg-slate-900/50 border border-slate-800 p-2 rounded-xl">
                <input 
                  type="color" 
                  value={color} 
                  onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none"
                />
                <span className="font-mono text-xs uppercase text-slate-400">{color}</span>
              </div>
            </div>

            {/* Background Picker */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <ImageIcon className="w-3 h-3" /> Background
              </label>
              <div className="flex items-center gap-3 bg-slate-900/50 border border-slate-800 p-2 rounded-xl">
                <input 
                  type="color" 
                  value={bgColor === 'transparent' ? '#000000' : bgColor} 
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none"
                  disabled={bgColor === 'transparent'}
                />
                <button 
                  onClick={() => setBgColor(bgColor === 'transparent' ? '#0F172A' : 'transparent')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                    bgColor === 'transparent' 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {bgColor === 'transparent' ? 'Transparent' : 'Solid'}
                </button>
                <span className="font-mono text-xs uppercase text-slate-400">
                  {bgColor === 'transparent' ? 'None' : bgColor}
                </span>
              </div>
            </div>
          </div>

          {/* Download Buttons */}
          <div className="space-y-3">
            <div className="flex gap-3">
              <button 
                onClick={downloadSVG}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold text-xs transition-colors border border-slate-700"
              >
                <Copy className="w-3.5 h-3.5" /> SVG (Vector)
              </button>
              <button 
                onClick={() => downloadPNG(1)}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold text-xs transition-colors border border-slate-700"
              >
                <ImageIcon className="w-3.5 h-3.5" /> PNG (16px)
              </button>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={downloadWebP}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold text-xs transition-colors border border-slate-700"
              >
                <Download className="w-3.5 h-3.5" /> WebP
              </button>
              <button 
                onClick={() => downloadPNG(64)}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-400 hover:to-rose-400 text-white py-3 rounded-xl font-bold text-xs transition-all shadow-lg shadow-orange-500/20"
              >
                <Download className="w-3.5 h-3.5" /> PNG (HD)
              </button>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <p className="text-center text-slate-600 text-[10px] font-medium uppercase tracking-[0.2em]">
          Procedural 16x16 Symmetry Engine
        </p>
      </motion.div>

      {/* Hidden Canvas for PNG Export */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
