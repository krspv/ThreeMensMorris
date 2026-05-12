import * as PIXI from "pixi.js";
import gsap from 'gsap';
import { IGame, IGameScreen, TButtonWithShadow } from "../types.ts";
import {G_Description, G_Fonts, G_Sound, G_Tex} from "../constants.ts";
import Utils from "../utils.ts";


type TState = 'ShowingUp' | 'Regular' | 'TransitionToRules' | 'Rules' | 'TransitionFromRules';

class ScrHome implements IGameScreen {
  game: IGame;

  // These will be visible also in ScrGame
  private readonly sprBackground: PIXI.Sprite;
  private readonly sprMusic: PIXI.Sprite;
  private readonly sprClose: PIXI.Sprite;
  private bCommonsInitialized: boolean = false;
  private bMusicMuted: boolean = false;
  // Local data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private dynamics: Record<string, any> = {};
  private state!: TState;
  private readonly mainContainer: PIXI.Container;
  private readonly txtTitle: PIXI.Text;
  private readonly btnRules: TButtonWithShadow;
  private readonly btnPlay: TButtonWithShadow;
  private readonly sprPirate: PIXI.Sprite;
  private readonly rulesBubble: PIXI.Graphics;
  private readonly txtRules01: PIXI.Text;
  private readonly sprMiniature: PIXI.Sprite;
  private readonly txtRules02: PIXI.Text;
  private readonly txtRules03: PIXI.Text;
  private readonly txtRules04: PIXI.Text;
  private readonly txtRules05: PIXI.Text;
  private readonly txtRules06: PIXI.Text;
  private readonly btnClose: TButtonWithShadow;

  constructor(game: IGame) {
    this.game = game;
    this.sprBackground = new PIXI.Sprite(game.atlas.textures[G_Tex.Background]);

    this.sprMusic = new PIXI.Sprite(game.atlas.textures[G_Tex.Music]);
    Utils.centralPivot(this.sprMusic);
    this.sprMusic.position.set(game.app.screen.width * 0.97, game.app.screen.height * 0.05);
    this.sprMusic.interactive = true;
    this.sprMusic.cursor = 'pointer';
    this.sprMusic.on('click', this.onMusicClick);
    this.sprMusic.on('tap', this.onMusicClick);

    this.sprClose = new PIXI.Sprite(game.atlas.textures[G_Tex.Close]);
    Utils.centralPivot(this.sprClose);
    this.sprClose.position = this.sprMusic.position;
    this.sprClose.scale.set(0.75);
    this.sprClose.visible = false;

    this.mainContainer = new PIXI.Container();

    let style = new PIXI.TextStyle({
      dropShadow: {
        alpha: 0.4,
        angle: 1,
        blur: 11,
        distance: 8,
        color: '#88AAFF',
      },
      fill: 'yellow',
      fontFamily: G_Fonts.Gradzy,
      fontSize: 96,
      fontWeight: '400',
      letterSpacing: 3,
      stroke: {
        color: '#4757cd',
        width: 4,
      },
    });

    const { width, height } = this.game.app.screen;
    this.txtTitle = new PIXI.Text({text: 'Three Men’s Morris', style});
    Utils.centralPivot(this.txtTitle);
    this.txtTitle.position.set(width * 0.5, height * 0.14);

    this.btnRules = Utils.createButton(this.game.atlas.textures[G_Tex.Button], { label: 'Rules' });
    Utils.centralPivot(this.btnRules.container);
    this.btnRules.container.position.set(width * 0.5, height * 0.5);
    this.btnRules.button.on('click', this.onBtnRulesClick);
    this.btnRules.button.on('tap', this.onBtnRulesClick);

    this.btnPlay = Utils.createButton(this.game.atlas.textures[G_Tex.Button], { label: 'Play' });
    Utils.centralPivot(this.btnPlay.container);
    this.btnPlay.container.position.set(width * 0.5, height * 0.8);
    this.btnPlay.button.on('click', this.onBtnPlayClick);
    this.btnPlay.button.on('tap', this.onBtnPlayClick);

    this.sprPirate = new PIXI.Sprite(game.atlas.textures[G_Tex.Pirate]);
    Utils.centralPivot(this.sprPirate);

    this.rulesBubble = new PIXI.Graphics;

    style = new PIXI.TextStyle({
      dropShadow: {
        alpha: 0.8,
        angle: 1,
        blur: 9,
        distance: 3,
        color: '#ee9933',
      },
      fill: '#0a0a85',
      fontFamily: G_Fonts.Gradzy,
      fontSize: 26,
      fontWeight: '400',
      letterSpacing: 2,
      wordWrap: true,
      wordWrapWidth: 730,
      breakWords: false,
      align: 'left',
    });
    this.txtRules01 = new PIXI.Text({text: '', style});
    this.txtRules01.position.set(76, 60);

    this.sprMiniature = new PIXI.Sprite(game.atlas.textures[G_Tex.Miniature]);
    Utils.centralPivot(this.sprPirate);
    this.sprMiniature.position.set(320, 250);

    this.txtRules02 = new PIXI.Text({text: '', style});
    this.txtRules02.position.set(76, 480);

    this.txtRules04 = new PIXI.Text({text: '', style});
    this.txtRules04.position.set(76, 561);

    this.txtRules06 = new PIXI.Text({text: '', style});
    this.txtRules06.position.set(76, 673);

    style = new PIXI.TextStyle({
      dropShadow: {
        alpha: 0.8,
        angle: 1,
        blur: 9,
        distance: 3,
        color: '#c4e888',
      },
      fill: '#264202',
      fontFamily: G_Fonts.Gradzy,
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: 2,
      wordWrap: true,
      wordWrapWidth: 730,
      breakWords: false,
      align: 'left',
    });

    this.txtRules03 = new PIXI.Text({text: '', style});
    this.txtRules03.position.set(95, 518);

    this.txtRules05 = new PIXI.Text({text: '', style});
    this.txtRules05.position.set(95, 629);

    this.btnClose = Utils.createButton(this.game.atlas.textures[G_Tex.Button], { label: 'Close' });
    Utils.centralPivot(this.btnClose.container);
    this.btnClose.container.position.set(width * 0.27, height * 0.88);
    this.btnClose.button.on('click', this.onBtnCloseClick);
    this.btnClose.button.on('tap', this.onBtnCloseClick);
  }

  onStage(): void {
    if (!this.bCommonsInitialized) {
      this.bCommonsInitialized = true;

      this.game.app.stage.addChild(this.sprBackground);
      this.game.app.stage.addChild(this.sprMusic);
      this.game.app.stage.addChild(this.sprClose);

      if (!this.game.sound[G_Sound.BkMusic01].playing() && !this.game.sound[G_Sound.BkMusic02].playing()) { // Prevents multiple music playing when vite reloads
        const id = this.game.sound[G_Sound.BkMusic01].play();
        this.game.sound[G_Sound.BkMusic01].volume(.6, id);
      }
    }

    this.game.app.stage.addChild(this.mainContainer);
    this.txtTitle.alpha = 0;
    this.mainContainer.addChild(this.txtTitle);
    this.btnRules.container.alpha = 0;
    this.btnRules.container.scale = .1;
    this.btnRules.state.disabled = true;
    this.mainContainer.addChild(this.btnRules.container);
    this.btnPlay.container.alpha = 0;
    this.btnPlay.container.scale = .1;
    this.btnPlay.state.disabled = true;
    this.mainContainer.addChild(this.btnPlay.container);
    this.state = 'ShowingUp';

    this.dynamics.tmlShow = gsap.timeline({ onComplete: () => {
        this.state = 'Regular';
        this.btnRules.state.disabled = false;
        this.btnPlay.state.disabled = false;
    }});
    this.dynamics.tmlShow.to(this.txtTitle, { alpha: 1, duration: 1.7, ease: 'power2.out' });
    this.dynamics.tmlShow.to(this.btnRules.container, { alpha: 1, duration: .8, ease: 'power2.out' }, .5);
    this.dynamics.tmlShow.to(this.btnRules.container, { scale: 1, duration: 1.5, ease: 'elastic.out' }, .5);
    this.dynamics.tmlShow.to(this.btnPlay.container, { alpha: 1, duration: .8, ease: 'power2.out' }, .75);
    this.dynamics.tmlShow.to(this.btnPlay.container, { scale: 1, duration: 1.5, ease: 'elastic.out' }, .75);
  }

  onUpdate(/*ticker: Ticker*/): void {
  }

  onDismiss(): void {
    if (this.dynamics.tmlShow) {
      this.dynamics.tmlShow.kill();
      this.dynamics.tmlShow = null;
      delete this.dynamics.tmlShow;
    }
    if (this.dynamics.tmlToRules) {
      this.dynamics.tmlToRules.kill();
      this.dynamics.tmlToRules = null;
      delete this.dynamics.tmlToRules;
    }

    this.mainContainer.removeChildren();
    this.game.app.stage.removeChild(this.mainContainer);
  }

  handleResize(): void {
  }

  private onMusicClick = () => {
    if (this.bMusicMuted) {
      this.bMusicMuted = false;
      this.sprClose.visible = false;
      this.sprMusic.alpha = 1;
      this.game.sound[G_Sound.BkMusic01].mute(false);
      this.game.sound[G_Sound.BkMusic02].mute(false);
    } else {
      this.bMusicMuted = true;
      this.sprClose.visible = true;
      this.sprMusic.alpha = .65;
      this.game.sound[G_Sound.BkMusic01].mute(true);
      this.game.sound[G_Sound.BkMusic02].mute(true);
    }
  };

  private onBtnRulesClick = () => {
    if (this.state == 'Regular') {
      this.game.sound[G_Sound.ButtonClick].play();
      this.state = 'TransitionToRules';

      const { width, height } = this.game.app.screen;
      this.sprPirate.position.set(width * 1.5, height * 0.5);
      this.rulesBubble.clear();
      const bubbleData = { height: 50 };
      this.sprMiniature.visible = false;
      this.txtRules01.text = '';
      this.txtRules02.text = '';
      this.txtRules03.text = '';
      this.txtRules04.text = '';
      this.txtRules05.text = '';
      this.txtRules06.text = '';
      this.btnClose.container.alpha = 0;
      this.btnClose.container.scale = 0.06;
      this.btnClose.state.disabled = true;
      this.mainContainer.addChild(this.sprPirate);
      this.mainContainer.addChild(this.rulesBubble);
      this.mainContainer.addChild(this.sprMiniature);
      this.mainContainer.addChild(this.txtRules01);
      this.mainContainer.addChild(this.txtRules02);
      this.mainContainer.addChild(this.txtRules03);
      this.mainContainer.addChild(this.txtRules04);
      this.mainContainer.addChild(this.txtRules05);
      this.mainContainer.addChild(this.txtRules06);
      this.mainContainer.addChild(this.btnClose.container);

      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this;

      this.dynamics.tmlToRules = gsap.timeline({ onComplete: () => {
        this.state = 'Rules';
        this.btnClose.state.disabled = false;
        this.dynamics.tmlToRules.kill();
        this.dynamics.tmlToRules = null;
        delete this.dynamics.tmlToRules;
      }})
        .to(this.txtTitle, { y: -80, duration: .8, ease: 'power2.inout' })
        .to(this.btnRules.container, { y: (0.5 + 1) * height, duration: .75, ease: 'power2.inout' }, .2)
        .to(this.btnPlay.container, { y: (0.8 + 1) * height, duration: .75, ease: 'power2.inout' }, .2)
        .to(this.sprPirate, { x: width * 0.76, duration: 1, ease: 'power2.out' }, .5)
        .to(bubbleData, {
          height: 864,
          duration: .6,
          ease: 'power2.inout',
          onUpdate: () => {
            this.rulesBubble
              .clear()
              .setFillStyle({ color: '#BDBD63' })
              .setStrokeStyle({ width: 20, color: '#A61D1D' })
              .roundRect(40, 40, 800, bubbleData.height, 25)
              .fill()
              .stroke();
          },
        }, 1.3)
        .to({}, { duration: 0.7, ease: 'none', onUpdate: function() {
          const progressLen = Math.floor(this.progress() * G_Description.text01.length);
          self.txtRules01.text = G_Description.text01.substring(0, progressLen);
        }})
        .set(this.sprMiniature, { visible: true })
        .to({}, { duration: .1, ease: 'none', onUpdate: function() {
          const progressLen = Math.floor(this.progress() * G_Description.text02.length);
          self.txtRules02.text = G_Description.text02.substring(0, progressLen);
        }}, "+=0.1")
        .to({}, { duration: .1, ease: 'none', onUpdate: function() {
          const progressLen = Math.floor(this.progress() * G_Description.text03.length);
          self.txtRules03.text = G_Description.text03.substring(0, progressLen);
        }}, "+=0.05")
        .to({}, { duration: .1, ease: 'none', onUpdate: function() {
          const progressLen = Math.floor(this.progress() * G_Description.text04.length);
          self.txtRules04.text = G_Description.text04.substring(0, progressLen);
        }}, "+=0.05")
        .to({}, { duration: .1, ease: 'none', onUpdate: function() {
          const progressLen = Math.floor(this.progress() * G_Description.text05.length);
          self.txtRules05.text = G_Description.text05.substring(0, progressLen);
        }}, "+=0.05")
        .to({}, { duration: .1, ease: 'none', onUpdate: function() {
          const progressLen = Math.floor(this.progress() * G_Description.text06.length);
          self.txtRules06.text = G_Description.text06.substring(0, progressLen);
        }}, "+=0.05")
        .to(this.btnClose.container, { alpha: 1, scale: .8, duration: .5, ease: 'elastic.out' });
    }
  };

  private onBtnPlayClick = () => {
    if (this.state == 'Regular') {
      this.game.sound[G_Sound.ButtonClick].play();
      console.log('Play Game');
    }
  };

  private onBtnCloseClick = () => {
    if (this.state == 'Rules') {
      this.game.sound[G_Sound.ButtonClick].play();
      console.log('Close Rules');
    }
  };
}


export default ScrHome;
