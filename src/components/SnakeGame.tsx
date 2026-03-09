import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, RotateCcw, Pause, Keyboard, Zap } from 'lucide-react';
import { Point, Direction, GameStatus, GameState } from '../types';

const GRID_SIZE = 20;
const INITIAL_SPEED = 150;
const MIN_SPEED = 60;
const SPEED_INCREMENT = 2;

export const SnakeGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>({
    snake: [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }],
    food: { x: 5, y: 5 },
    direction: 'UP',
    score: 0,
    highScore: parseInt(localStorage.getItem('snakeHighScore') || '0'),
    status: 'START',
    speed: INITIAL_SPEED,
  });

  const directionRef = useRef<Direction>('UP');
  const lastProcessedDirectionRef = useRef<Direction>('UP');
  const gameLoopRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  const generateFood = useCallback((snake: Point[]): Point => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      const isOnSnake = snake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
      if (!isOnSnake) break;
    }
    return newFood;
  }, []);

  const resetGame = () => {
    const initialSnake = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
    setGameState({
      snake: initialSnake,
      food: generateFood(initialSnake),
      direction: 'UP',
      score: 0,
      highScore: parseInt(localStorage.getItem('snakeHighScore') || '0'),
      status: 'PLAYING',
      speed: INITIAL_SPEED,
    });
    directionRef.current = 'UP';
    lastProcessedDirectionRef.current = 'UP';
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const key = e.key;
    const currentDir = directionRef.current;

    if (key === 'ArrowUp' || key === 'w' || key === 'W') {
      if (lastProcessedDirectionRef.current !== 'DOWN') directionRef.current = 'UP';
    } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
      if (lastProcessedDirectionRef.current !== 'UP') directionRef.current = 'DOWN';
    } else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
      if (lastProcessedDirectionRef.current !== 'RIGHT') directionRef.current = 'LEFT';
    } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
      if (lastProcessedDirectionRef.current !== 'LEFT') directionRef.current = 'RIGHT';
    } else if (key === 'r' || key === 'R') {
      if (gameState.status === 'GAMEOVER' || gameState.status === 'START') {
        resetGame();
      }
    } else if (key === ' ') {
      setGameState(prev => ({
        ...prev,
        status: prev.status === 'PLAYING' ? 'PAUSED' : prev.status === 'PAUSED' ? 'PLAYING' : prev.status
      }));
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const update = useCallback((time: number) => {
    if (gameState.status !== 'PLAYING') return;

    if (time - lastUpdateTimeRef.current < gameState.speed) {
      gameLoopRef.current = requestAnimationFrame(update);
      return;
    }

    lastUpdateTimeRef.current = time;
    lastProcessedDirectionRef.current = directionRef.current;

    setGameState(prev => {
      const head = prev.snake[0];
      const newHead = { ...head };

      switch (directionRef.current) {
        case 'UP': newHead.y -= 1; break;
        case 'DOWN': newHead.y += 1; break;
        case 'LEFT': newHead.x -= 1; break;
        case 'RIGHT': newHead.x += 1; break;
      }

      // Wall collision
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        if (prev.score > prev.highScore) {
          localStorage.setItem('snakeHighScore', prev.score.toString());
        }
        return { ...prev, status: 'GAMEOVER', highScore: Math.max(prev.score, prev.highScore) };
      }

      // Self collision
      if (prev.snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        if (prev.score > prev.highScore) {
          localStorage.setItem('snakeHighScore', prev.score.toString());
        }
        return { ...prev, status: 'GAMEOVER', highScore: Math.max(prev.score, prev.highScore) };
      }

      const newSnake = [newHead, ...prev.snake];
      let newFood = prev.food;
      let newScore = prev.score;
      let newSpeed = prev.speed;

      // Food collision
      if (newHead.x === prev.food.x && newHead.y === prev.food.y) {
        newFood = generateFood(newSnake);
        newScore += 10;
        newSpeed = Math.max(MIN_SPEED, INITIAL_SPEED - Math.floor(newScore / 20) * SPEED_INCREMENT);
      } else {
        newSnake.pop();
      }

      return {
        ...prev,
        snake: newSnake,
        food: newFood,
        score: newScore,
        speed: newSpeed,
      };
    });

    gameLoopRef.current = requestAnimationFrame(update);
  }, [gameState.status, gameState.speed, generateFood]);

  useEffect(() => {
    if (gameState.status === 'PLAYING') {
      gameLoopRef.current = requestAnimationFrame(update);
    } else {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    }
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameState.status, update]);

  // Render logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = canvas.width / GRID_SIZE;

    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid (Subtle)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvas.width, i * cellSize);
      ctx.stroke();
    }

    // Draw Food
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff4e00';
    ctx.fillStyle = '#ff4e00';
    ctx.beginPath();
    ctx.arc(
      gameState.food.x * cellSize + cellSize / 2,
      gameState.food.y * cellSize + cellSize / 2,
      cellSize / 3,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw Snake
    gameState.snake.forEach((segment, index) => {
      const isHead = index === 0;
      ctx.fillStyle = isHead ? '#00ff88' : `rgba(0, 255, 136, ${0.8 - (index / gameState.snake.length) * 0.5})`;
      
      if (isHead) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00ff88';
      }

      // Rounded rectangle for segments
      const x = segment.x * cellSize + 2;
      const y = segment.y * cellSize + 2;
      const size = cellSize - 4;
      const radius = isHead ? 6 : 4;

      ctx.beginPath();
      ctx.roundRect(x, y, size, size, radius);
      ctx.fill();
      
      ctx.shadowBlur = 0;
    });

  }, [gameState]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#050505]">
      {/* HUD */}
      <div className="w-full max-w-[500px] flex items-center justify-between mb-6 px-2">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-white/40 font-mono">Current Score</span>
          <span className="text-3xl font-bold font-mono text-[#00ff88]">{gameState.score.toString().padStart(4, '0')}</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-white/40 font-mono">System Speed</span>
            <span className="text-xl font-bold font-mono text-[#00ffee]">
              {Math.round((INITIAL_SPEED / gameState.speed) * 100)}%
            </span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-white/40 font-mono flex items-center gap-1">
              <Trophy size={10} /> High Score
            </span>
            <span className="text-xl font-bold font-mono text-white/80">{gameState.highScore.toString().padStart(4, '0')}</span>
          </div>
        </div>
      </div>

      {/* Game Container */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-[#00ff88] to-[#00ffee] rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
        <div className="relative bg-[#0a0a0a] rounded-lg border border-white/10 overflow-hidden shadow-2xl">
          <canvas
            ref={canvasRef}
            width={500}
            height={500}
            className="max-w-full h-auto block"
          />

          {/* Overlays */}
          <AnimatePresence>
            {gameState.status === 'START' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
              >
                <motion.h1 
                  initial={{ y: 20 }}
                  animate={{ y: 0 }}
                  className="text-5xl font-bold mb-2 tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-white/50"
                >
                  NEON SNAKE
                </motion.h1>
                <p className="text-white/40 text-sm mb-8 font-mono tracking-wide uppercase">Professional Web Edition</p>
                
                <div className="grid grid-cols-2 gap-4 mb-8 w-full max-w-xs">
                  <div className="bg-white/5 border border-white/10 p-3 rounded-lg flex flex-col items-center">
                    <Keyboard className="text-[#00ff88] mb-2" size={20} />
                    <span className="text-[10px] text-white/40 uppercase">Arrows / WASD</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-3 rounded-lg flex flex-col items-center">
                    <Zap className="text-[#ff4e00] mb-2" size={20} />
                    <span className="text-[10px] text-white/40 uppercase">Speed Scaling</span>
                  </div>
                </div>

                <button
                  onClick={resetGame}
                  className="group relative px-8 py-3 bg-white text-black font-bold rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Play size={18} fill="currentColor" /> START MISSION
                  </span>
                </button>
              </motion.div>
            )}

            {gameState.status === 'PAUSED' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center"
              >
                <h2 className="text-4xl font-bold mb-6 tracking-widest text-white">PAUSED</h2>
                <button
                  onClick={() => setGameState(prev => ({ ...prev, status: 'PLAYING' }))}
                  className="p-4 bg-[#00ff88] text-black rounded-full hover:scale-110 transition-transform"
                >
                  <Play size={32} fill="currentColor" />
                </button>
                <p className="mt-4 text-white/40 font-mono text-xs uppercase tracking-widest">Press Space to Resume</p>
              </motion.div>
            )}

            {gameState.status === 'GAMEOVER' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#ff4e00]/10 backdrop-blur-md flex flex-col items-center justify-center p-8 border-4 border-[#ff4e00]/20"
              >
                <h2 className="text-6xl font-black mb-2 tracking-tighter text-[#ff4e00]">GAME OVER</h2>
                <div className="h-px w-32 bg-[#ff4e00]/40 mb-6" />
                
                <div className="flex flex-col items-center mb-8">
                  <span className="text-white/40 text-xs uppercase tracking-widest mb-1">Final Score</span>
                  <span className="text-5xl font-mono font-bold text-white">{gameState.score}</span>
                </div>

                <button
                  onClick={resetGame}
                  className="flex items-center gap-3 px-10 py-4 bg-white text-black font-black rounded-xl hover:bg-[#00ff88] hover:scale-105 transition-all shadow-xl"
                >
                  <RotateCcw size={24} /> REBOOT SYSTEM
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer / Controls Info */}
      <div className="mt-8 flex items-center gap-8 text-white/20 font-mono text-[10px] uppercase tracking-[0.2em]">
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 border border-white/20 rounded">SPACE</span>
          <span>Pause</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 border border-white/20 rounded">WASD</span>
          <span>Move</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 border border-white/20 rounded">R</span>
          <span>Restart</span>
        </div>
      </div>
    </div>
  );
};
