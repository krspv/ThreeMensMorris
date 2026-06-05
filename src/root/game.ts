import * as PIXI from 'pixi.js';
import { Howl, Howler } from 'howler';
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
  isAdActive: boolean = false;

  constructor(app: PIXI.Application) {
    this.app = app;
  }

  init = async () => {
    if (import.meta.env.VITE_DISABLE_CRAZYGAMES_SDK !== 'true') {
      await window.CrazyGames?.SDK.init();
      window.CrazyGames?.SDK.game.addSettingsChangeListener(this.onCrazyGamesSettingsChange);
      if (window.CrazyGames?.SDK.game.settings.muteAudio) // Handle initial mute
        Howler.mute(true);
    }
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
    if (import.meta.env.VITE_DISABLE_CRAZYGAMES_SDK !== 'true')
      window.CrazyGames?.SDK.game.removeSettingsChangeListener(this.onCrazyGamesSettingsChange);
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

  private onCrazyGamesSettingsChange = (newSettings: CrazyGamesGameSettings) => {
    if (this.isAdActive) return;

    if (newSettings.muteAudio) {
      Howler.mute(true);
    } else {
      Howler.mute(false);
    }
  };
}


export default Game;
