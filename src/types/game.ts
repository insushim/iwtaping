export type GameType = 'rain' | 'space' | 'race' | 'defense' | 'zombie' | 'puzzle';

export type GameStatus = 'menu' | 'countdown' | 'playing' | 'paused' | 'gameover' | 'victory';

export interface GameBase {
  type: GameType;
  status: GameStatus;
  score: number;
  level: number;
  combo: number;
  maxCombo: number;
  startTime: number | null;
  elapsedTime: number;
}

export interface RainWord {
  id: string;
  text: string;
  x: number;
  y: number;
  speed: number;
  typed: string;
  isSpecial?: 'heal' | 'freeze' | 'bomb' | 'danger' | 'star';
}

export interface RainGameState extends GameBase {
  type: 'rain';
  words: RainWord[];
  ph: number;
  lives: number;
  wordsCleared: number;
  input: string;
}

export interface SpaceEnemy {
  id: string;
  text: string;
  x: number;
  y: number;
  speed: number;
  hp: number;
  maxHp: number;
  typed: string;
  enemyType: 'normal' | 'fast' | 'tank' | 'stealth' | 'split' | 'boss';
  angle: number;
}

export interface SpaceGameState extends GameBase {
  type: 'space';
  enemies: SpaceEnemy[];
  shield: number;
  maxShield: number;
  bombs: number;
  targetEnemy: string | null;
  input: string;
}

export interface RaceCar {
  id: string;
  name: string;
  progress: number;
  speed: number;
  isPlayer: boolean;
  color: string;
}

export interface RaceGameState extends GameBase {
  type: 'race';
  text: string;
  cars: RaceCar[];
  playerInput: string;
  playerProgress: number;
  currentIndex: number;
}

export interface DefenseEnemy {
  id: string;
  text: string;
  x: number;
  y: number;
  speed: number;
  hp: number;
  maxHp: number;
  typed: string;
  enemyType: 'goblin' | 'orc' | 'troll' | 'wizard' | 'dragon';
}

export interface Tower {
  id: string;
  type: 'basic' | 'fire' | 'ice' | 'lightning';
  x: number;
  y: number;
  level: number;
  damage: number;
  range: number;
}

export interface DefenseGameState extends GameBase {
  type: 'defense';
  enemies: DefenseEnemy[];
  towers: Tower[];
  castleHp: number;
  maxCastleHp: number;
  gold: number;
  wave: number;
  maxWave: number;
  input: string;
}

export interface Zombie {
  id: string;
  text: string;
  x: number;
  y: number;
  speed: number;
  hp: number;
  maxHp: number;
  typed: string;
  zombieType: 'normal' | 'runner' | 'tanker' | 'exploder' | 'boss';
  angle: number;
}

export interface ZombieGameState extends GameBase {
  type: 'zombie';
  zombies: Zombie[];
  playerHp: number;
  maxPlayerHp: number;
  weapon: 'pistol' | 'shotgun';
  grenadeCount: number;
  grenadeCooldown: number;
  wave: number;
  input: string;
}

export interface PuzzleBlock {
  id: string;
  char: string;
  color: string;
  row: number;
  col: number;
  isSpecial?: 'star' | 'bomb' | 'time';
}

export interface PuzzleGameState extends GameBase {
  type: 'puzzle';
  grid: (PuzzleBlock | null)[][];
  words: string[];
  timeLeft: number;
  input: string;
  chainCombo: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  alpha: number;
}

export interface GameResult {
  gameType: GameType;
  score: number;
  level: number;
  maxCombo: number;
  accuracy: number;
  wordsTyped: number;
  elapsedTime: number;
  timestamp: number;
}
