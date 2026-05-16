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
    public spriteStartPos: PIXI.Point = new PIXI.Point(0, 0),
  ) {}
};


export type {
  IGame,
  IGameScreen,
  TButtonWithShadow,
};

export { DragPieceData };
