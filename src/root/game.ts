import * as PIXI from 'pixi.js';
import { Howl } from 'howler';
import { IGame, IGameScreen } from './types.ts';
import ScrLoader from './screens/scr-loader.ts';
import { G_Screens } from './constants.ts';



class Game implements IGame {
  app: PIXI.Application;
  atlas!: PIXI.Spritesheet;
  textures: Record<string, PIXI.Texture> = {};
  sound: Record<string, Howl> = {};
  screens!: IGameScreen[];
  curScreen: IGameScreen | null = null;
  difficulty: 'Easy' | 'Medium' | 'Hard' = 'Easy';

  constructor(app: PIXI.Application) {
    this.app = app;
  }

  init = async () => {
    await window.CrazyGames?.SDK.init();
  };

  run = () => {
    this.screens = [
      new ScrLoader(this),
    ];

    this.setScreen(G_Screens.Loading);

    const onUpdate = (ticker: PIXI.Ticker) => {
      this.curScreen!.onUpdate(ticker);
    };

    const ticker = PIXI.Ticker.shared;
    ticker.add(onUpdate);
  };

  destroy = () => {
  };

  handleResize = () => {
    if (this.curScreen != null)
      this.curScreen.handleResize();
  };

  setScreen = (idx: number) => {
    if (this.curScreen != null)
      this.curScreen.onDismiss();

    this.curScreen = this.screens[idx];

    this.curScreen.onStage();
  };
}


export default Game;
