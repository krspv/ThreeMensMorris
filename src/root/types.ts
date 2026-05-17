import * as PIXI from "pixi.js";
import { Howl } from "howler";


interface IGame {
  app: PIXI.Application;
  atlas: PIXI.Spritesheet;
  textures: Record<string, PIXI.Texture>;
  sound: Record<string, Howl>;
  screens: IGameScreen[];
  curScreen: IGameScreen | null;
  difficulty: 'Easy' | 'Medium' | 'Hard';

  init(): void;
  run(): void;
  destroy(): void;
  handleResize(): void;
  setScreen(idx: number): void;
}

interface IGameScreen {
  game: IGame;

  onStage(): void;
  onUpdate(ticker: PIXI.Ticker): void;
  onDismiss(): void;
  handleResize(): void;
}

type TButtonWithShadow = {
  container: PIXI.Container;
  button: PIXI.Sprite;
  state: { disabled: boolean };
};

class DragPieceData {
  constructor(
    public index: number = -1,
    public mouseStart: PIXI.Point = new PIXI.Point(0, 0),
    public offset: PIXI.Point = new PIXI.Point(0, 0),
  ) {}
};

type Slot = 'Empty' | 'Player' | 'Cpu';
type Move = { type: 'Placement' | 'Movement', from: number, to: number }

class GameState {
  public board: Slot[];
  public move: Move | null = null;

  constructor(board: Slot[] = ['Empty', 'Empty', 'Empty', 'Empty', 'Empty', 'Empty', 'Empty', 'Empty', 'Empty'] ) {
    this.board = [...board];
  }

  public reset(): void {
    this.board = ['Empty', 'Empty', 'Empty', 'Empty', 'Empty', 'Empty', 'Empty', 'Empty', 'Empty'];
  };

  public getSlot = (row: number, col: number): Slot => this.board[3*row + col];
  public getSlotIdx = (index: number): Slot => this.board[index];
  public setSlot = (row: number, col: number, value: Slot): void => { this.board[3*row + col] = value; };
  public setSlotIdx = (index: number, value: Slot): void => { this.board[index] = value; };

  public isWinner = (val: Slot): boolean =>
       (this.board[0] === val && this.board[1] === val && this.board[2] === val)
    || (this.board[3] === val && this.board[4] === val && this.board[5] === val)
    || (this.board[6] === val && this.board[7] === val && this.board[8] === val)
    || (this.board[0] === val && this.board[3] === val && this.board[6] === val)
    || (this.board[1] === val && this.board[4] === val && this.board[7] === val)
    || (this.board[2] === val && this.board[5] === val && this.board[8] === val)
    || (this.board[0] === val && this.board[4] === val && this.board[8] === val)
    || (this.board[2] === val && this.board[4] === val && this.board[6] === val);
};



export type {
  IGame,
  IGameScreen,
  TButtonWithShadow,
  Slot,
  Move,
};

export {
  DragPieceData,
  GameState,
};
