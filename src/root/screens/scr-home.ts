import * as PIXI from "pixi.js";
import gsap from 'gsap';
import { IGame, IGameScreen, TButtonWithShadow } from "../types.ts";
import { G_Description, G_Fonts, G_Screens, G_Sound, G_Tex } from "../constants.ts";
import Utils from "../utils.ts";


type TState = 'ShowingUp' | 'Regular' | 'TransitionToRules' | 'Rules' | 'TransitionFromRules'
  | 'TransitionToDifficultyDialog' | 'DifficultyDialog' | 'CancellingDifficultyDialog'
  | 'TransitionFromDifficultyDialogToGame';

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
  private readonly groupHelpBubble: PIXI.Container;
  private readonly rulesBubble: PIXI.Graphics;
  private readonly txtRules01: PIXI.Text;
  private readonly sprMiniature: PIXI.Sprite;
  private readonly txtRules02: PIXI.Text;
  private readonly txtRules03: PIXI.Text;
  private readonly txtRules04: PIXI.Text;
  private readonly txtRules05: PIXI.Text;
  private readonly txtRules06: PIXI.Text;
  private readonly btnClose: TButtonWithShadow;
  private readonly groupDialog: PIXI.Container;
  private readonly sprDialog: PIXI.Sprite;
  private readonly txtSelectDifficulty: PIXI.Text;
  private readonly btnEasyDfclt: TButtonWithShadow;
  private readonly btnMediumDfclt: TButtonWithShadow;
  private readonly btnHardDfclt: TButtonWithShadow;
  private readonly btnBack: TButtonWithShadow;

  constructor(game: IGame) {
    this.game = game;
    this.sprBackground = new PIXI.Sprite(game.atlas.textures[G_Tex.Background]);

    this.sprMusic = new PIXI.Sprite({ texture: game.atlas.textures[G_Tex.Music], anchor: 0.5 });
    this.sprMusic.position.set(game.app.screen.width * 0.97, game.app.screen.height * 0.05);
    this.sprMusic.interactive = true;
    this.sprMusic.cursor = 'pointer';
    this.sprMusic.on('click', this.onMusicClick);
    this.sprMusic.on('tap', this.onMusicClick);

    this.sprClose = new PIXI.Sprite({ texture: game.atlas.textures[G_Tex.Close], anchor: 0.5 });
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
    this.txtTitle = new PIXI.Text({text: 'Three Men’s Morris', style, anchor: 0.5});
    this.txtTitle.position.set(width * 0.5, height * 0.14);

    this.btnRules = Utils.createButton(this.game.atlas.textures[G_Tex.Button], { label: 'Rules' });
    this.btnRules.container.position.set(width * 0.5, height * 0.5);
    this.btnRules.button.on('click', this.onBtnRulesClick);
    this.btnRules.button.on('tap', this.onBtnRulesClick);

    this.btnPlay = Utils.createButton(this.game.atlas.textures[G_Tex.Button], { label: 'Play' });
    this.btnPlay.container.position.set(width * 0.5, height * 0.8);
    this.btnPlay.button.on('click', this.onBtnPlayClick);
    this.btnPlay.button.on('tap', this.onBtnPlayClick);

    this.sprPirate = new PIXI.Sprite({ texture: game.atlas.textures[G_Tex.Pirate], anchor: 0.5 });

    this.groupHelpBubble = new PIXI.Container();

    this.rulesBubble = new PIXI.Graphics;

    style = new PIXI.TextStyle({
      dropShadow: {
        alpha: 0.8,
        angle: 1,
        blur: 9,
        distance: 3,
        color: '#77AE1E',
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
        color: '#77AE1E',
      },
      fill: '#192B02',
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
    this.btnClose.container.position.set(width * 0.27, height * 0.88);
    this.btnClose.button.on('click', this.onBtnCloseClick);
    this.btnClose.button.on('tap', this.onBtnCloseClick);

    this.groupHelpBubble.addChild(this.rulesBubble);
    this.groupHelpBubble.addChild(this.txtRules01);
    this.groupHelpBubble.addChild(this.sprMiniature);
    this.groupHelpBubble.addChild(this.txtRules02);
    this.groupHelpBubble.addChild(this.txtRules03);
    this.groupHelpBubble.addChild(this.txtRules04);
    this.groupHelpBubble.addChild(this.txtRules05);
    this.groupHelpBubble.addChild(this.txtRules06);
    this.groupHelpBubble.addChild(this.btnClose.container);

    this.groupDialog = new PIXI.Container();
    this.groupDialog.position.set(width * 0.5, height * 0.57);

    this.sprDialog = new PIXI.Sprite({ texture: game.textures[G_Tex.Dialog], anchor: 0.5 });

    style = new PIXI.TextStyle({
      dropShadow: {
        alpha: 0.9,
        angle: 1,
        blur: 8,
        distance: 4,
        color: '#334B8A',
      },
      fill: '#EE7722',
      fontFamily: G_Fonts.Gradzy,
      fontSize: 48,
      fontWeight: '400',
      letterSpacing: 6,
      stroke: {
        color: '#60020A',
        width: 3,
      },
    });
    this.txtSelectDifficulty = new PIXI.Text({ text: 'Please Select Difficulty', style, anchor: 0.5 });
    this.txtSelectDifficulty.position.set(65, -151);

    this.btnEasyDfclt = Utils.createButton(game.atlas.textures[G_Tex.Button], { label: 'Easy' });
    this.btnEasyDfclt.container.position.set(0, -50);
    this.btnEasyDfclt.container.scale.set(0.75);
    this.btnEasyDfclt.button.on('click', this.onBtnEasyClick);
    this.btnEasyDfclt.button.on('tap', this.onBtnEasyClick);

    this.btnMediumDfclt = Utils.createButton(game.atlas.textures[G_Tex.Button], { label: 'Medium' });
    this.btnMediumDfclt.container.position.set(0, 55);
    this.btnMediumDfclt.container.scale.set(0.75);
    this.btnMediumDfclt.button.on('click', this.onBtnMediumClick);
    this.btnMediumDfclt.button.on('tap', this.onBtnMediumClick);

    this.btnHardDfclt = Utils.createButton(game.atlas.textures[G_Tex.Button], { label: 'Hard' });
    this.btnHardDfclt.container.position.set(0, 160);
    this.btnHardDfclt.container.scale.set(0.75);
    this.btnHardDfclt.button.on('click', this.onBtnHardClick);
    this.btnHardDfclt.button.on('tap', this.onBtnHardClick);

    this.btnBack = Utils.createButton(game.atlas.textures[G_Tex.Button], { label: 'Back' });
    this.btnBack.container.position.set(width * 0.91, height * 0.92);
    this.btnBack.container.scale.set(0.8);
    this.btnBack.button.on('click', this.onBtnBackClick);
    this.btnBack.button.on('tap', this.onBtnBackClick);

    this.groupDialog.addChild(this.sprDialog);
    this.groupDialog.addChild(this.txtSelectDifficulty);
    this.groupDialog.addChild(this.btnEasyDfclt.container);
    this.groupDialog.addChild(this.btnMediumDfclt.container);
    this.groupDialog.addChild(this.btnHardDfclt.container);
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
    this.btnRules.container.alpha = 0;
    this.btnRules.container.scale = .1;
    this.btnRules.state.disabled = true;
    this.mainContainer.addChild(this.btnRules.container);
    this.btnPlay.container.alpha = 0;
    this.btnPlay.container.scale = .1;
    this.btnPlay.state.disabled = true;
    this.mainContainer.addChild(this.btnPlay.container);
    this.groupDialog.visible = false;
    this.mainContainer.addChild(this.groupDialog);
    this.btnBack.container.visible = false;
    this.mainContainer.addChild(this.btnBack.container);
    this.txtTitle.alpha = 0;
    this.mainContainer.addChild(this.txtTitle);
    this.state = 'ShowingUp';

    this.dynamics.tmlShow = gsap.timeline({ onComplete: () => {
        this.state = 'Regular';
        Utils.destroyGsapTimeline(this.dynamics, 'tmlShow');
        this.btnRules.state.disabled = false;
        this.btnPlay.state.disabled = false;
        if (import.meta.env.VITE_STRAIGHT_TO_GAME === 'true')
          this.game.setScreen(G_Screens.Game);
    }});
    this.dynamics.tmlShow.to(this.txtTitle, { alpha: 1, duration: 1.7, ease: 'power2.out' });
    this.dynamics.tmlShow.to(this.btnRules.container, { alpha: 1, duration: .8, ease: 'power2.out' }, .5);
    this.dynamics.tmlShow.to(this.btnRules.container, { scale: 1, duration: 1.5, ease: 'elastic.out' }, .5);
    this.dynamics.tmlShow.to(this.btnPlay.container, { alpha: 1, duration: .8, ease: 'power2.out' }, .75);
    this.dynamics.tmlShow.to(this.btnPlay.container, { scale: 1, duration: 1.5, ease: 'elastic.out' }, .75);
    if (import.meta.env.VITE_STRAIGHT_TO_GAME === 'true')
      this.dynamics.tmlShow.timeScale(10);
  }

  onUpdate(/*ticker: Ticker*/): void {
  }

  onDismiss(): void {
    for (const key of Object.keys(this.dynamics))
      Utils.destroyGsapTimeline(this.dynamics, key);

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
    if (this.state === 'Regular') {
      this.game.sound[G_Sound.ButtonClick].play();
      this.state = 'TransitionToRules';
      this.btnRules.state.disabled = true;
      this.btnPlay.state.disabled = true;

      const { width, height } = this.game.app.screen;
      this.sprPirate.position.set(width * 1.5, height * 0.52);
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
      this.mainContainer.addChild(this.groupHelpBubble);
      this.sprPirate.alpha = 1;
      this.groupHelpBubble.alpha = 1;

      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this;

      this.dynamics.tmlToRules = gsap.timeline({ onComplete: () => {
        this.state = 'Rules';
        this.btnClose.state.disabled = false;
        Utils.destroyGsapTimeline(this.dynamics, 'tmlToRules');
      }})
        .to(this.txtTitle, { y: -80, duration: .8, delay: .15, ease: 'power2.inout' })
        .to(this.btnRules.container, { y: (0.5 + 1) * height, duration: .75, ease: 'power2.inout' }, .2)
        .to(this.btnPlay.container, { y: (0.8 + 1) * height, duration: .75, ease: 'power2.inout' }, .2)
        .to(this.sprPirate, { x: width * 0.75, duration: 1, ease: 'power2.out' }, .5)
        .to(bubbleData, {
          height: 864,
          duration: .6,
          ease: 'power2.inout',
          onUpdate: () => {
            this.rulesBubble
              .clear()
              .setFillStyle({ color: '#EDD973', alpha: .6 })
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
    if (this.state === 'Regular') {
      this.game.sound[G_Sound.ButtonClick].play();
      this.btnPlay.state.disabled = true;
      this.btnRules.state.disabled = true;
      this.btnEasyDfclt.state.disabled = true;
      this.btnMediumDfclt.state.disabled = true;
      this.btnHardDfclt.state.disabled = true;
      this.btnBack.state.disabled = true;
      this.btnBack.container.scale = 0.01;
      this.btnBack.container.visible = true;
      this.state = 'TransitionToDifficultyDialog';
      this.groupDialog.scale.set(0.01);
      this.groupDialog.visible = true;

      this.dynamics.tmlToDlg = gsap.timeline({ onComplete: () => {
          this.state = 'DifficultyDialog';
          Utils.destroyGsapTimeline(this.dynamics, 'tmlToDlg');
          this.btnEasyDfclt.state.disabled = false;
          this.btnMediumDfclt.state.disabled = false;
          this.btnHardDfclt.state.disabled = false;
          this.btnBack.state.disabled = false;
        }})
        .to(this.groupDialog.scale, { x: 1, y: 1, duration: .5, ease: 'power2.out' })
        .set([this.btnPlay.container, this.btnRules.container], { visible: false })
        .to(this.btnBack.container.scale, { x: .8, y: .8, duration: .5, ease: 'bounce.out' }, .4);
    }
  };

  private onBtnCloseClick = () => {
    if (this.state === 'Rules') {
      this.game.sound[G_Sound.ButtonClick].play();
      this.state = 'TransitionFromRules';
      this.btnClose.state.disabled = true;
      this.btnRules.state.disabled = true;
      this.btnPlay.state.disabled = true;

      const { height } = this.game.app.screen;

      this.dynamics.tmlFromRules = gsap.timeline({ onComplete: () => {
        this.state = 'Regular';
        Utils.destroyGsapTimeline(this.dynamics, 'tmlFromRules');
        this.mainContainer.removeChild(this.sprPirate);
        this.mainContainer.removeChild(this.groupHelpBubble);
        this.btnRules.state.disabled = false;
        this.btnPlay.state.disabled = false;
      }})
        .to([this.groupHelpBubble, this.sprPirate], { alpha: 0, duration: .65, ease: 'power2.out' })
        .to(this.txtTitle, { y: height * 0.14, duration: .8, ease: 'power2.out' })
        .to(this.btnRules.container, { y: height * 0.5, duration: .75, ease: 'power2.inout' }, .2)
        .to(this.btnPlay.container, { y: height * 0.8, duration: .75, ease: 'power2.inout' }, .2);
    }
  };

  private onBtnBackClick = () => {
    if (this.state === 'DifficultyDialog') {
      this.game.sound[G_Sound.ButtonClick].play();
      this.state = 'CancellingDifficultyDialog';
      this.btnEasyDfclt.state.disabled = true;
      this.btnMediumDfclt.state.disabled = true;
      this.btnHardDfclt.state.disabled = true;
      this.btnBack.state.disabled = true;
      this.btnPlay.container.visible = true;
      this.btnRules.container.visible = true;

      this.dynamics.tmlCancelDlg = gsap.timeline({ onComplete: () => {
        this.state = 'Regular';
        Utils.destroyGsapTimeline(this.dynamics, 'tmlCancelDlg');
        this.btnPlay.state.disabled = false;
        this.btnRules.state.disabled = false;
        this.btnBack.container.visible = false;
        this.groupDialog.visible = false;
      }})
        .to(this.groupDialog.scale, { x: 0.01, y: 0.01, duration: .5, ease: 'power2.in' })
        .set(this.groupDialog, { visible: false }, .5)
        .to(this.btnBack.container.scale, { x: 0.01, y: 0.01, duration: .4, ease: 'power2.in' }, .15);
    }
  };

  private onBtnEasyClick = () => {
    if (this.state === 'DifficultyDialog') {
      this.game.sound[G_Sound.ButtonClick].play();
      this.game.difficulty = 'Easy';
      this.transitionToGame();
    }
  };

  private onBtnMediumClick = () => {
    if (this.state === 'DifficultyDialog') {
      this.game.sound[G_Sound.ButtonClick].play();
      this.game.difficulty = 'Medium';
      this.transitionToGame();
    }
  };

  private onBtnHardClick = () => {
    if (this.state === 'DifficultyDialog') {
      this.game.sound[G_Sound.ButtonClick].play();
      this.game.difficulty = 'Hard';
      this.transitionToGame();
    }
  };

  private transitionToGame = () => {
    this.mainContainer.removeChild(this.btnPlay.container, this.btnRules.container);

    this.dynamics.tmlToGame = gsap.timeline({ onComplete: () => {
        this.state = 'Regular';
        Utils.destroyGsapTimeline(this.dynamics, 'tmlToGame');
        this.game.setScreen(G_Screens.Game);
      }})
      .to(this.groupDialog.scale, { x: 0.01, y: 0.01, duration: .5, ease: 'power2.in' })
      .set(this.groupDialog, { visible: false }, .5)
      .to(this.txtTitle, { y: -80, duration: .8, ease: 'power2.inout' }, .1)
      .to(this.btnBack.container.scale, { x: 0.01, y: 0.01, duration: .4, ease: 'power2.in' }, .15);
  };
}


export default ScrHome;
