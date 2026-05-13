import * as PIXI from "pixi.js";
import HowlerLoaderParser from '../howler-loader-parser.ts';
import gsap from "gsap";
import { PixiPlugin } from 'gsap/PixiPlugin';
import { Howl } from "howler";
import ScrHome from "./scr-home.ts";
import ScrGame from "./scr-game.ts";
import { IGame, IGameScreen, TButtonWithShadow } from "../types.ts";
import { G_Fonts, G_Screens, G_Sound, G_Tex } from "../constants.ts";
import Utils from "../utils.ts";


class ScrLoader implements IGameScreen {
  game: IGame;
  private loadState: number = 0;
  private readonly txt1: PIXI.Text;
  private readonly progressBar: PIXI.Container;
  private readonly progressMask: PIXI.Graphics;
  private btnStart!: TButtonWithShadow;

  constructor(game: IGame) {
    this.game = game;

    // The loading text
    const style = new PIXI.TextStyle({
      dropShadow: {
        alpha: 0.4,
        angle: 1,
        blur: 11,
        distance: 8,
        color: '#88AAFF',
      },
      fill: 'white',
      fontFamily: G_Fonts.AstroSpace,
      fontSize: 128,
      fontWeight: '700',
      stroke: {
        color: '#CE6906',
        width: 6,
      },
    });

    const { width, height } = this.game.app.screen;

    // Create the loading text
    this.txt1 = new PIXI.Text({text: 'Loading', style});
    Utils.centralPivot(this.txt1);
    this.txt1.position.set(width * 0.5, height * 0.3);

    // Create the loading bar
    this.progressBar = new PIXI.Container();

    const border = new PIXI.Graphics()
      .setStrokeStyle({ width: 10, color: 'white' })
      .roundRect(0, 0, 850, 70, 20)
      .stroke();
    this.progressBar.addChild(border);
    Utils.centralPivot(this.progressBar);
    this.progressBar.position.set(width * 0.5, height * 0.66);

    const inner = new PIXI.Graphics()
      .setFillStyle({ color: 'red' })
      .roundRect(10, 10, 830, 50, 12)
      .fill();

    for (let i = 0; i < 14; i++)
      inner.setFillStyle({ color: '#10280C' }).rect(56 + i * 56, 8, 10, 54).fill();

    this.progressBar.addChild(inner);

    this.progressMask = new PIXI.Graphics();
    this.setProgressMask(0);

    this.progressBar.addChild(this.progressMask);
    inner.mask = this.progressMask;

    // register the PIXI plugin for gsap
    gsap.registerPlugin(PixiPlugin);
    // give the plugin a reference to the PIXI object
    PixiPlugin.registerPIXI(PIXI);

    // Howler loader extension
    PIXI.extensions.add(HowlerLoaderParser);
  }

  private setProgressMask = (progress: number) => {
    this.progressMask
      .clear()
      .setFillStyle({ color: 'white' })
      .rect(0, 0, 850 * progress, 70)
      .fill();
  };

  private onProgress = (progress: number) => {
    this.setProgressMask(progress);
    if (progress >= 1)
      this.loadState = 1;
  };

  onStage = () => {
    const { stage } = this.game.app;
    stage.addChild(this.txt1);
    stage.addChild(this.progressBar);

    PIXI.Assets.add({ alias: G_Tex.Atlas, src: 'images/atlas.json' });
    PIXI.Assets.add({ alias: G_Tex.Dialog, src: 'images/dialog.png' });
    PIXI.Assets.add({ alias: G_Sound.BkMusic01, src: 'sound/bk-music-01.aac' });
    PIXI.Assets.add({ alias: G_Sound.BkMusic02, src: 'sound/bk-music-02.aac' });
    PIXI.Assets.add({ alias: G_Sound.ButtonClick, src: 'sound/button-click.aac' });

    const allAliases = [G_Tex.Atlas, G_Tex.Dialog, G_Sound.BkMusic01, G_Sound.BkMusic02, G_Sound.ButtonClick];
    PIXI.Assets.load(allAliases, this.onProgress);
  };

  onUpdate = (/*ticker: PIXI.Ticker*/) => {
    if (this.loadState === 1) {
      // Initialize the game object with all of the loaded data
      this.game.atlas = PIXI.Assets.get(G_Tex.Atlas) as PIXI.Spritesheet;
      this.game.textures[G_Tex.Dialog] = PIXI.Assets.get(G_Tex.Dialog) as PIXI.Texture;

      this.game.screens.push(new ScrHome(this.game));
      this.game.screens.push(new ScrGame(this.game));

      this.game.sound[G_Sound.BkMusic01] = PIXI.Assets.get(G_Sound.BkMusic01) as Howl;
      this.game.sound[G_Sound.BkMusic02] = PIXI.Assets.get(G_Sound.BkMusic02) as Howl;
      this.game.sound[G_Sound.BkMusic01].on('end', () => {
        const id = this.game.sound[G_Sound.BkMusic02].play();
        this.game.sound[G_Sound.BkMusic02].volume(.35, id);
      });
      this.game.sound[G_Sound.BkMusic02].on('end', () => {
        const id = this.game.sound[G_Sound.BkMusic01].play();
        this.game.sound[G_Sound.BkMusic01].volume(.6, id);
      });
      this.game.sound[G_Sound.ButtonClick] = PIXI.Assets.get(G_Sound.ButtonClick) as Howl;

      // Create the start button
      this.btnStart = Utils.createButton(this.game.atlas.textures[G_Tex.Button], { label: 'Start' });
      Utils.centralPivot(this.btnStart.container);
      this.btnStart.button.on('click', this.onBtnStartClick);
      this.btnStart.button.on('tap', this.onBtnStartClick);
      this.btnStart.container.position.set(this.game.app.screen.width * 0.5, this.game.app.screen.height * 0.9);
      this.game.app.stage.addChild(this.btnStart.container);

      this.loadState = 2;
    }
  };

  onDismiss = () => {
    this.game.app.stage.removeChildren();
  };

  handleResize = () => {
  };

  private onBtnStartClick = () => {
    if (this.loadState === 2) {
      this.loadState = 3;
      this.game.setScreen(G_Screens.Home);
      this.game.sound[G_Sound.ButtonClick].play();
    }
  };
}


export default ScrLoader;
