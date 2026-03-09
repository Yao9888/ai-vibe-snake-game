import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, RotateCcw, Pause, Keyboard, Zap, Cloud, Sun, CloudRain, MapPin, Wind, Droplets } from 'lucide-react';
import { Point, Direction, GameStatus, GameState } from '../types';
import { WeatherBackground } from './WeatherBackground';

const GRID_SIZE = 20;
const INITIAL_SPEED = 150;
const MIN_SPEED = 60;
const SPEED_INCREMENT = 2;

export const SnakeGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>(() => {
    let highScore = 0;
    try {
      highScore = parseInt(localStorage.getItem('snakeHighScore') || '0');
    } catch (e) {
      console.warn('localStorage not available');
    }
    return {
      snake: [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }],
      food: { x: 5, y: 5 },
      direction: 'UP',
      score: 0,
      highScore,
      status: 'START',
      speed: INITIAL_SPEED,
    };
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
    } else if (key === 'r' || key === 'R' || key === 'Enter') {
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
        try {
          if (prev.score > prev.highScore) {
            localStorage.setItem('snakeHighScore', prev.score.toString());
          }
        } catch (e) {}
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
      if (ctx.roundRect) {
        ctx.roundRect(x, y, size, size, radius);
      } else {
        ctx.rect(x, y, size, size);
      }
      ctx.fill();
      
      ctx.shadowBlur = 0;
    });

  }, [gameState]);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-4 overflow-hidden">
      <WeatherBackground />

      {/* Stats Widget */}
      <div className="relative z-10 w-full max-w-[800px] grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-panel p-6 rounded-2xl flex flex-col justify-between"
        >
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[#00ff41]/40 text-[10px] uppercase tracking-[0.3em] block mb-1">Active Session</span>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-mono font-bold text-[#00ff41] drop-shadow-[0_0_8px_rgba(0,255,65,0.5)]">
                  {gameState.score.toString().padStart(4, '0')}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[#00ff41]/40 text-[10px] uppercase tracking-[0.3em] block mb-1">Personal Best</span>
              <span className="text-2xl font-mono text-[#00ff41]/80">{gameState.highScore.toString().padStart(4, '0')}</span>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-panel p-6 rounded-2xl flex flex-col justify-center"
        >
          <div className="flex flex-col">
            <span className="text-[10px] text-[#00ff41]/30 uppercase tracking-[0.3em] mb-2">System Load</span>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-1.5 bg-[#00ff41]/5 rounded-full overflow-hidden border border-[#00ff41]/10">
                <motion.div 
                  className="h-full bg-[#00ff41] shadow-[0_0_10px_rgba(0,255,65,0.8)]" 
                  animate={{ width: `${Math.min(100, (INITIAL_SPEED / gameState.speed) * 50)}%` }}
                />
              </div>
              <span className="text-[12px] font-mono text-[#00ff41]">{Math.round((INITIAL_SPEED / gameState.speed) * 100)}%</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Game Container */}
      <div className="relative z-10">
        <div className="glass-panel p-1 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <div className="rounded-lg overflow-hidden border border-[#00ff41]/20">
            <canvas
              ref={canvasRef}
              width={500}
              height={500}
              className="max-w-full h-auto block"
            />
          </div>

          {/* Overlays */}
          <AnimatePresence>
            {gameState.status === 'START' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-1 bg-black/80 backdrop-blur-md rounded-lg flex flex-col items-center justify-center p-8 text-center"
              >
                <motion.h1 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-6xl font-mono font-bold mb-2 tracking-tighter text-[#00ff41] drop-shadow-[0_0_15px_rgba(0,255,65,0.8)]"
                >
                  SNAKE.EXE
                </motion.h1>
                <p className="text-[#00ff41]/40 text-[10px] mb-12 font-mono tracking-[0.5em] uppercase">Terminal Interface v4.0</p>
                
                <button
                  onClick={resetGame}
                  className="group relative px-12 py-4 bg-[#00ff41] text-black font-bold rounded-sm overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(0,255,65,0.4)]"
                >
                  INITIALIZE_SYSTEM
                </button>
                <p className="mt-6 text-[#00ff41]/20 text-[9px] uppercase tracking-[0.4em]">Press Enter to Execute</p>
              </motion.div>
            )}

            {gameState.status === 'PAUSED' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-1 bg-black/40 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center"
              >
                <div className="glass-panel p-8 rounded-full border-[#00ff41]/40">
                  <button
                    onClick={() => setGameState(prev => ({ ...prev, status: 'PLAYING' }))}
                    className="text-[#00ff41] hover:scale-110 transition-transform drop-shadow-[0_0_10px_rgba(0,255,65,0.8)]"
                  >
                    <Play size={48} fill="currentColor" />
                  </button>
                </div>
                <p className="mt-6 text-[#00ff41]/40 font-mono text-[10px] uppercase tracking-[0.5em]">System_Halted</p>
              </motion.div>
            )}

            {gameState.status === 'GAMEOVER' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-1 bg-black/90 backdrop-blur-xl rounded-lg flex flex-col items-center justify-center p-8"
              >
                <div className="mb-8 text-center">
                  <h2 className="text-5xl font-mono font-bold mb-2 tracking-tighter text-[#ff4141] drop-shadow-[0_0_15px_rgba(255,65,65,0.5)]">CRITICAL_FAILURE</h2>
                  <div className="flex items-center justify-center gap-4 text-[#00ff41]/40 text-xs uppercase tracking-widest font-mono">
                    <span>Score: {gameState.score}</span>
                    <span>|</span>
                    <span>Best: {gameState.highScore}</span>
                  </div>
                </div>

                <button
                  onClick={resetGame}
                  className="flex items-center gap-3 px-12 py-4 bg-[#00ff41] text-black font-bold rounded-sm hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,255,65,0.3)]"
                >
                  REBOOT_KERNEL
                </button>
                <p className="mt-6 text-[#00ff41]/30 text-[9px] uppercase tracking-[0.4em]">Press Enter to Restart</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-12 flex items-center gap-12 text-[#00ff41]/10 font-mono text-[9px] uppercase tracking-[0.5em]">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-1.5 bg-[#00ff41]/20 rotate-45" />
          <span>WASD_NAV</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-1.5 bg-[#00ff41]/20 rotate-45" />
          <span>SPACE_PAUSE</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-1.5 bg-[#00ff41]/20 rotate-45" />
          <span>ENTER_REBOOT</span>
        </div>
      </div>
    </div>
  );

};
