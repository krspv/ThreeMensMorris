import * as PIXI from "pixi.js";
import { IGame, IGameScreen } from "../types.ts";
import { G_Tex } from "../constants.ts";
import Utils from "../utils.ts";


class ScrHome implements IGameScreen {
  game: IGame;

  private readonly sprBackground: PIXI.Sprite;
  private readonly sprMusic: PIXI.Sprite;
  private readonly sprClose: PIXI.Sprite;
  private bCommonsInitialized: boolean = false;

  constructor(game: IGame) {
    this.game = game;
    this.sprBackground = new PIXI.Sprite(game.atlas.textures[G_Tex.Background]);

    this.sprMusic = new PIXI.Sprite(game.atlas.textures[G_Tex.Music]);
    Utils.centralPivot(this.sprMusic);
    this.sprMusic.position.set(game.app.screen.width * 0.97, game.app.screen.height * 0.05);
    this.sprMusic.interactive = true;
    this.sprMusic.cursor = 'pointer';

    this.sprClose = new PIXI.Sprite(game.atlas.textures[G_Tex.Close]);
    Utils.centralPivot(this.sprClose);
    this.sprClose.position = this.sprMusic.position;
    this.sprClose.scale.set(0.87);
    this.sprClose.tint = 0x770000;
  }

  onStage(): void {
    if (!this.bCommonsInitialized) {
      this.bCommonsInitialized = true;

      this.game.app.stage.addChild(this.sprBackground);
      this.game.app.stage.addChild(this.sprMusic);
      this.game.app.stage.addChild(this.sprClose);
    }
  }

  onUpdate(/*ticker: Ticker*/): void {
  }

  onDismiss(): void {
  }

  handleResize(): void {
  }
}


export default ScrHome;
