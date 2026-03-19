import { AnimatePresence, motion } from 'motion/react';
import type { MotionName } from '@/src/motion-config';

const GRID_SIZE = 16;

type PixelCell = { x: number; y: number; fill: string };
type FinePixelCell = { x: number; y: number; fill: string };

type CharacterPreviewProps = {
  activeMotion: MotionName;
  bgColor: string;
  bubblePixels32: FinePixelCell[];
  currentFrameDy: number;
  firePixels32: FinePixelCell[];
  generateCount: number;
  glassesPixels32: FinePixelCell[];
  hatPixels: PixelCell[];
  hatStarFill: string | null;
  hatStarPoints: string | null;
  errorFlagPixels32: FinePixelCell[];
  laptopPixels32: FinePixelCell[];
  renderedPixelColorMap: Map<string, string>;
  showBubble: boolean;
  showFire: boolean;
  showGlasses: boolean;
  showHat: boolean;
};

export function CharacterPreview({
  activeMotion,
  bgColor,
  bubblePixels32,
  currentFrameDy,
  firePixels32,
  generateCount,
  glassesPixels32,
  hatPixels,
  hatStarFill,
  hatStarPoints,
  errorFlagPixels32,
  laptopPixels32,
  renderedPixelColorMap,
  showBubble,
  showFire,
  showGlasses,
  showHat,
}: CharacterPreviewProps) {
  return (
    <motion.div
      layout
      className="aspect-[1.12/1] md:aspect-[1.16/1] w-full pt-32 pb-8 px-6 md:px-8 flex items-center justify-center relative overflow-visible"
      style={{
        backgroundColor: bgColor === 'transparent' ? 'hsl(var(--card) / 1)' : bgColor,
        backgroundImage: bgColor === 'transparent'
          ? 'radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 0)'
          : 'none',
        backgroundSize: '24px 24px',
      }}
    >
      <div
        className="relative"
        style={{
          width: '100%',
          maxWidth: '320px',
          aspectRatio: '1/1',
          overflow: 'visible',
          top: '-22px',
        }}
      >
        {showFire && firePixels32.length > 0 && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 32 32"
            xmlns="http://www.w3.org/2000/svg"
            shapeRendering="crispEdges"
            style={{ overflow: 'visible' }}
          >
            <g transform={`translate(0 ${currentFrameDy * 2})`}>
              {firePixels32.map(({ x, y, fill }) => (
                <rect key={`fire-${x}-${y}`} x={x} y={y} width="1" height="1" fill={fill} />
              ))}
            </g>
          </svg>
        )}
        <div
          className="grid gap-0"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
            width: '100%',
            height: '100%',
          }}
        >
          <AnimatePresence mode="popLayout">
            {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
              const x = index % GRID_SIZE;
              const y = Math.floor(index / GRID_SIZE);
              const fill = renderedPixelColorMap.get(`${x},${y}`) ?? 'transparent';
              return (
                <motion.div
                  key={`${x}-${y}-${generateCount}-${activeMotion}-${showHat}-${showGlasses}-${showBubble}-${showFire}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0 }}
                  className="w-full h-full"
                  style={{ backgroundColor: fill }}
                />
              );
            })}
          </AnimatePresence>
        </div>
        {showHat && (hatPixels.length > 0 || hatStarPoints) && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 16 16"
            xmlns="http://www.w3.org/2000/svg"
            shapeRendering="crispEdges"
            style={{ overflow: 'visible' }}
          >
            <g transform={`translate(0 ${currentFrameDy})`}>
              {hatPixels.map(({ x, y, fill }) => (
                <rect key={`hat-${x}-${y}`} x={x} y={y} width="1" height="1" fill={fill} />
              ))}
              {hatStarPoints && hatStarFill && <polygon points={hatStarPoints} fill={hatStarFill} />}
            </g>
          </svg>
        )}
        {showGlasses && glassesPixels32.length > 0 && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 32 32"
            xmlns="http://www.w3.org/2000/svg"
            shapeRendering="crispEdges"
          >
            {glassesPixels32.map(({ x, y, fill }) => (
              <rect key={`glasses-${x}-${y}`} x={x} y={y} width="1" height="1" fill={fill} />
            ))}
          </svg>
        )}
        {showBubble && bubblePixels32.length > 0 && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 32 32"
            xmlns="http://www.w3.org/2000/svg"
            shapeRendering="crispEdges"
            style={{ overflow: 'visible' }}
          >
            {bubblePixels32.map(({ x, y, fill }) => (
              <rect key={`bubble-${x}-${y}`} x={x} y={y} width="1" height="1" fill={fill} />
            ))}
          </svg>
        )}
        {activeMotion === 'laptop' && laptopPixels32.length > 0 && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 32 32"
            xmlns="http://www.w3.org/2000/svg"
            shapeRendering="crispEdges"
          >
            {laptopPixels32.map(({ x, y, fill }) => (
              <rect key={`laptop-${x}-${y}`} x={x} y={y} width="1" height="1" fill={fill} />
            ))}
          </svg>
        )}
        {activeMotion === 'error' && errorFlagPixels32.length > 0 && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 32 32"
            xmlns="http://www.w3.org/2000/svg"
            shapeRendering="crispEdges"
            style={{ overflow: 'visible' }}
          >
            {errorFlagPixels32.map(({ x, y, fill }) => (
              <rect key={`error-flag-${x}-${y}`} x={x} y={y} width="1" height="1" fill={fill} />
            ))}
          </svg>
        )}
      </div>
    </motion.div>
  );
}
