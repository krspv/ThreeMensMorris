import * as PIXI from "pixi.js";
import { Howl } from "howler";

interface IGame {
  app: PIXI.Application;
  atlas: PIXI.Spritesheet;
  sound: Record<string, Howl>;
  screens: IGameScreen[];
  curScreen: IGameScreen | null;

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

export type {
  IGame,
  IGameScreen,
  TButtonWithShadow,
};
