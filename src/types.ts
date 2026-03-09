export type Point = {
  x: number;
  y: number;
};

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type GameStatus = 'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

export interface GameState {
  snake: Point[];
  food: Point;
  direction: Direction;
  score: number;
  highScore: number;
  status: GameStatus;
  speed: number;
}
