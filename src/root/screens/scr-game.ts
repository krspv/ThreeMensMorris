import * as PIXI from "pixi.js";
import { GlowFilter, DropShadowFilter } from 'pixi-filters';
import gsap from "gsap";
import { IGame, IGameScreen, TButtonWithShadow, DragPieceData, GameState } from "../types.ts";
import { G_Fonts, G_Tex } from "../constants.ts";
import Utils from "../utils.ts";


const BOARD_SCALE = 0.85;
const PIECE_SCALE = 0.36;
const DROP_DISTSQ = 2_900;
type TState = 'ShowingUp' | 'Playing';
type TSubState = 'Idle' | 'Dragging_Piece';


class ScrGame implements IGameScreen {
  game: IGame;

  private state!: TState;
  private readonly bTouchDevice: boolean;
  private readonly pieceRadius: number;
  // private tmpGrfx: PIXI.Graphics;
  private readonly rcOpponentPieces: PIXI.Rectangle;
  // Game data
  private playerHasFirstMove!: boolean;
  private score: number[] = [0, 0];  // Scores [you, opponent]
  private bNextIsPlayer!: boolean;
  private timeStartGame!: number;
  private bNoMovement!: boolean; // For showing the hint
  private subState!: TSubState;
  private mousePos: PIXI.Point = new PIXI.Point();
  private dragPieceData: DragPieceData = new DragPieceData();
  private gameState: GameState = new GameState();
  private tweenTarget = { alpha: 1, scale: 1 }; // For the empty slots
  private dropTarget: number = -1;
  private placedPieces: boolean[] = [];
  private gsapTimelines: Record<string, gsap.core.Timeline> = {};
  // Rendering data
  private readonly mainContainer: PIXI.Container;
  private readonly board: PIXI.Container;
  private readonly lines: PIXI.Sprite[] = [];
  private readonly empties: PIXI.Sprite[] = [];
  private readonly empties2: PIXI.Sprite[] = [];  // For animation over the empty fields
  private readonly positions: PIXI.Point[][];
  private readonly txtDifficulty: PIXI.Text;
  private readonly txtD: PIXI.Text;
  private readonly groupPieceBoxes: PIXI.Container;
  private readonly groupScore: PIXI.Container;
  private readonly pieceSprites: PIXI.Sprite[] = [];
  private readonly pieceDropShadowFilter: DropShadowFilter;
  private readonly txtScoreYou: PIXI.Text;
  private readonly txtScoreOpponent: PIXI.Text;
  private readonly btnQuit: TButtonWithShadow;
  private readonly txtTurn: PIXI.Text;
  private readonly groupHint: PIXI.Container;
  private readonly txtDontTouch: PIXI.Text;
  private readonly cmf: PIXI.ColorMatrixFilter;  // For glow on the dragged piece
  // Groups for reparenting pieces, so that the dragged piece is always on top of other pieces
  private readonly groupPiecesLow: PIXI.Container;
  private readonly groupPiecesHigh: PIXI.Container;

  constructor(game: IGame) {
    this.bTouchDevice = Utils.isTouchDevice();

    this.game = game;
    const { width, height } = this.game.app.screen;

    this.mainContainer = new PIXI.Container();
    this.board = new PIXI.Container();
    this.board.position.set(width * 0.53, height * 0.5);

    for (let i = 0; i < 8; i++) {
      const line = new PIXI.Sprite({ texture: game.atlas.textures[G_Tex.Line], anchor: 0.5 });
      line.alpha = 0.6;
      this.lines.push(line);
    }

    this.positions = [];
    this.positions.push([new PIXI.Point(0, 0), new PIXI.Point(0, 0), new PIXI.Point(0, 0)]);
    this.positions.push([new PIXI.Point(0, 0), new PIXI.Point(0, 0), new PIXI.Point(0, 0)]);
    this.positions.push([new PIXI.Point(0, 0), new PIXI.Point(0, 0), new PIXI.Point(0, 0)]);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++) {
        this.positions[r][c].set(400 * (c - 1), 400 * (r - 1));
        const sprEmpty = new PIXI.Sprite({ texture: game.atlas.textures[G_Tex.Empty], anchor: 0.5 });
        sprEmpty.position.set(this.positions[r][c].x, this.positions[r][c].y);
        this.empties.push(sprEmpty);
        const sprEmpty2 = new PIXI.Sprite({ texture: game.atlas.textures[G_Tex.Empty], anchor: 0.5 });
        sprEmpty2.position.set(this.positions[r][c].x, this.positions[r][c].y);
        sprEmpty2.visible = false;
        this.empties2.push(sprEmpty2);
      }

    this.lines[0].position = this.positions[0][1].clone();
    this.lines[1].position = this.positions[1][1].clone();
    this.lines[2].position = this.positions[2][1].clone();
    this.lines[3].position = this.positions[1][0].clone();
    this.lines[3].rotation = Math.PI / 2;
    this.lines[4].position = this.positions[1][1].clone();
    this.lines[4].rotation = Math.PI / 2;
    this.lines[5].position = this.positions[1][2].clone();
    this.lines[5].rotation = Math.PI / 2;
    this.lines[6].position = this.positions[1][1].clone();
    this.lines[6].scale.x = 1.39;
    this.lines[6].rotation = Math.PI / 4;
    this.lines[7].position = this.positions[1][1].clone();
    this.lines[7].scale.x = 1.39;
    this.lines[7].rotation = -Math.PI / 4;

    this.lines.forEach(line => this.board.addChild(line));
    this.empties.forEach(empty => this.board.addChild(empty));
    this.empties2.forEach(empty => this.board.addChild(empty));

    let style = new PIXI.TextStyle({
      dropShadow: {
        alpha: 1,
        angle: 1,
        blur: 12,
        distance: 8,
        color: 'black',
      },
      fill: 'white',
      fontFamily: G_Fonts.Gradzy,
      fontSize: 32,
      fontWeight: '400',
      letterSpacing: 3,
      stroke: {
        color: '#780404',
        width: 2,
      },
    });
    this.txtDifficulty = new PIXI.Text({text: 'Difficulty:', style, anchor: 0.5 });

    style = new PIXI.TextStyle({
      dropShadow: {
        alpha: 1,
        angle: 1,
        blur: 12,
        distance: 8,
        color: 'black',
      },
      fill: '#ffffbb',
      fontFamily: G_Fonts.Gradzy,
      fontSize: 38,
      fontWeight: '400',
      letterSpacing: 3,
      stroke: {
        color: '#780404',
        width: 2,
      },
    });
    this.txtD = new PIXI.Text({text: '', style, anchor: { x: 0, y: 0.5 }});

    this.groupPieceBoxes = this.createThePieceBoxesGroup();
    const scoreGroup = this.createTheScoreGroup();
    this.groupScore = scoreGroup.groupScore;
    this.txtScoreYou = scoreGroup.txtScoreYou;
    this.txtScoreOpponent = scoreGroup.txtScoreOpponent;

    this.btnQuit = Utils.createButton(this.game.atlas.textures[G_Tex.Button], { label: 'Quit' });
    this.btnQuit.container.position.set(width * 0.893, height * 0.88);
    this.btnQuit.button.on('click', this.onButQuitClick);
    this.btnQuit.button.on('tap', this.onButQuitClick);

    style = new PIXI.TextStyle({
      dropShadow: {
        alpha: 1,
        angle: 1,
        blur: 12,
        distance: 8,
        color: 'black',
      },
      fill: 'white',
      fontFamily: G_Fonts.Gradzy,
      fontSize: 48,
      fontWeight: '400',
      letterSpacing: 3,
      stroke: {
        color: '#780404',
        width: 2,
      },
    });
    this.txtTurn = new PIXI.Text({text: '', style, anchor: 0.5});
    this.txtTurn.position.set(width * 0.155, height * 0.18);

    this.groupHint = this.CreateHint();
    this.txtDontTouch = this.createDontTouchText();

    this.pieceRadius = PIECE_SCALE * this.game.atlas.textures[G_Tex.PlayerPiece].width * 0.5;

    this.pieceSprites.push(new PIXI.Sprite(game.atlas.textures[G_Tex.PlayerPiece]));
    this.pieceSprites.push(new PIXI.Sprite(game.atlas.textures[G_Tex.PlayerPiece]));
    this.pieceSprites.push(new PIXI.Sprite(game.atlas.textures[G_Tex.PlayerPiece]));
    this.pieceSprites.push(new PIXI.Sprite(game.atlas.textures[G_Tex.CpuPiece]));
    this.pieceSprites.push(new PIXI.Sprite(game.atlas.textures[G_Tex.CpuPiece]));
    this.pieceSprites.push(new PIXI.Sprite(game.atlas.textures[G_Tex.CpuPiece]));
    for (let i = 0; i < 3; i++) {
      this.pieceSprites[i].anchor.set(0.5);
      this.pieceSprites[i].cursor = 'pointer';
      this.pieceSprites[i].interactive = true;
      this.pieceSprites[i].hitArea = new PIXI.Circle(0, 0, this.game.atlas.textures[G_Tex.PlayerPiece].width * 0.5);
    }

    this.pieceDropShadowFilter = new DropShadowFilter({
      blur: 4,           // blur strength (like CSS blur radius)
      color: 0x000000,   // shadow color
      alpha: .6,        // opacity
      offset: { x: 15, y: 15 },
    });

    this.groupPiecesLow = new PIXI.Container();
    this.groupPiecesHigh = new PIXI.Container();

    this.rcOpponentPieces = new PIXI.Rectangle(40, 700, 385, 180);

    this.cmf = new PIXI.ColorMatrixFilter();
    this.cmf.brightness(1.1, false);
  }

  private createThePieceBoxesGroup = () => {
    const ret = new PIXI.Container();

    const grfx = new PIXI.Graphics();
    grfx.setStrokeStyle({ width: 10, color: '#edd0af', alpha: 0.25 })
      .roundRect(10, 10, 400, 200, 25)
      .stroke()
      .roundRect(10, 260, 400, 200, 25)
      .stroke();

    const grfxMask = new PIXI.Graphics();
    grfxMask.setFillStyle({ color: 'white' })
      .rect(0, 0, 450, 600)
      .fill()
      .rect(32, 0, 256, 100)
      .cut()
      .rect(32, 250, 348, 100)
      .cut();
    grfx.mask = grfxMask;
    ret.addChild(grfxMask);

    ret.addChild(grfx);

    const style = new PIXI.TextStyle({
      dropShadow: {
        alpha: 1,
        angle: 1,
        blur: 12,
        distance: 8,
        color: 'black',
      },
      fill: 'white',
      fontFamily: G_Fonts.Gradzy,
      fontSize: 32,
      fontWeight: '400',
      letterSpacing: 3,
      stroke: {
        color: '#780404',
        width: 2,
      },
    });
    const txtYou = new PIXI.Text({text: 'Your pieces:', style, anchor: { x: 0, y: 0.5 }});
    txtYou.position.set(40, 10);
    ret.addChild(txtYou);

    const txtOpponent = new PIXI.Text({text: 'Opponent pieces:', style, anchor: { x: 0, y: 0.5 }});
    txtOpponent.position.set(40, 260);
    ret.addChild(txtOpponent);

    Utils.centralPivot(ret);
    ret.position.set(230, 670);

    return ret;
  };

  private createTheScoreGroup = () => {
    const groupScore = new PIXI.Container();

    const grfx = new PIXI.Graphics();
    grfx.setStrokeStyle({ width: 10, color: '#edd0af', alpha: 0.25 })
      .roundRect(10, 10, 300, 400, 25)
      .stroke();

    const grfxMask = new PIXI.Graphics();
    grfxMask.setFillStyle({ color: 'white' })
      .rect(0, 0, 350, 450)
      .fill()
      .rect(32, 0, 137, 100)
      .cut();
    grfx.mask = grfxMask;
    groupScore.addChild(grfxMask);

    groupScore.addChild(grfx);

    let style = new PIXI.TextStyle({
      dropShadow: {
        alpha: 1,
        angle: 1,
        blur: 12,
        distance: 8,
        color: 'black',
      },
      fill: 'white',
      fontFamily: G_Fonts.Gradzy,
      fontSize: 32,
      fontWeight: '400',
      letterSpacing: 3,
      stroke: {
        color: '#780404',
        width: 2,
      },
    });
    const txtScore = new PIXI.Text({text: 'Score:', style, anchor: { x: 0, y: 0.5 }});
    txtScore.position.set(40, 10);
    groupScore.addChild(txtScore);
    const txtYou = new PIXI.Text({text: 'You:', style, anchor: { x: 0, y: 0.5 }});
    txtYou.position.set(50, 110);
    groupScore.addChild(txtYou);
    const txtOpponent = new PIXI.Text({text: 'Opponent:', style, anchor: { x: 0, y: 0.5 }});
    txtOpponent.position.set(50, 270);
    groupScore.addChild(txtOpponent);

    style = new PIXI.TextStyle({
      dropShadow: {
        alpha: 1,
        angle: 1,
        blur: 12,
        distance: 8,
        color: 'black',
      },
      fill: '#BCAD9D',
      fontFamily: G_Fonts.AstroSpace,
      fontSize: 52,
      fontWeight: '400',
      letterSpacing: 3,
      stroke: {
        color: '#780404',
        width: 2,
      },
    });
    const txtScoreYou = new PIXI.Text({text: this.score[0].toString(), style, anchor: 0.5});
    txtScoreYou.position.set(160, 165);
    groupScore.addChild(txtScoreYou);
    const txtScoreOpponent = new PIXI.Text({text: this.score[1].toString(), style, anchor: 0.5});
    txtScoreOpponent.position.set(160, 325);
    groupScore.addChild(txtScoreOpponent);

    Utils.centralPivot(groupScore);
    groupScore.position.set(1485, 470);

    return { groupScore, txtScoreYou, txtScoreOpponent } as const;
  };

  private CreateHint = () => {
    const ret = new PIXI.Container();

    let style = new PIXI.TextStyle({
      dropShadow: {
        alpha: .8,
        angle: 1,
        blur: 12,
        distance: 8,
        color: 'maroon',
      },
      fill: '#DFDF73',
      fontFamily: G_Fonts.Gradzy,
      fontSize: 28,
      fontWeight: '400',
      letterSpacing: 3,
      stroke: {
        color: '#780404',
        width: 1,
      },
    });
    const txtHint = new PIXI.Text({text: 'Hint:', style, anchor: { x: 0, y: 0.5 }});
    txtHint.position.set(0, 0);
    ret.addChild(txtHint);

    style = new PIXI.TextStyle({
      dropShadow: {
        alpha: 1,
        angle: 1,
        blur: 12,
        distance: 8,
        color: 'black',
      },
      fill: 'white',
      fontFamily: G_Fonts.Gradzy,
      fontSize: 24,
      fontWeight: '400',
      letterSpacing: 3,
      stroke: {
        color: '#780404',
        width: 1,
      },
      wordWrap: true,
      wordWrapWidth: 400,
      breakWords: false,
      align: 'left',
    });
    const txtAdvice = new PIXI.Text({text: 'Move your pieces onto the board', style, anchor: { x: 0, y: 0.5 }});
    txtAdvice.position.set(0, 50);
    ret.addChild(txtAdvice);

    txtHint.position.set(0, 0);
    ret.addChild(txtHint);

    const { width, height } = this.game.app.screen;
    Utils.centralPivot(ret);
    ret.position.set(width * 0.15, height * 0.37);

    ret.filters = [
      new GlowFilter({ distance: 60, outerStrength: 2, color: '#AAFFAA', alpha: 0.3 }),
    ];

    return ret;
  };

  private createDontTouchText = () => {
    const style = new PIXI.TextStyle({
      dropShadow: {
        alpha: 1,
        angle: 1,
        blur: 12,
        distance: 8,
        color: 'black',
      },
      fill: '#aaff91',
      fontFamily: G_Fonts.Gradzy,
      fontSize: 56,
      fontWeight: '400',
      letterSpacing: 3,
      stroke: {
        color: '#d54040',
        width: 2,
      },
      wordWrap: true,
      wordWrapWidth: 400,
      breakWords: false,
      align: 'center',
    });
    const ret = new PIXI.Text({text: "Don't touch my pieces!", style, anchor: 0.5});
    ret.filters = [
      new GlowFilter({ distance: 50, outerStrength: 3, color: '#d85151', alpha: 0.5 }),
    ];
    const { width, height } = this.game.app.screen;
    ret.position.set(width * 0.14, height * 0.84);

    return ret;
  };

  onStage(): void {
    this.game.app.stage.addChild(this.mainContainer);

    this.mainContainer.addChild(this.board);
    this.board.scale.set(BOARD_SCALE);

    this.state = 'ShowingUp';
    this.playerHasFirstMove = true;

    const { width, height } = this.game.app.screen;
    this.txtDifficulty.position.set(width * 0.08, height * 0.05 - 100);
    this.mainContainer.addChild(this.txtDifficulty);

    this.txtD.text = this.game.difficulty;
    this.txtD.position.set(width * 0.145, height * 0.05 - 100);
    this.mainContainer.addChild(this.txtD);

    this.groupPieceBoxes.alpha = 0;
    this.groupScore.alpha = 0;
    this.mainContainer.addChild(this.groupPieceBoxes);
    this.mainContainer.addChild(this.groupScore);

    this.btnQuit.container.alpha = 0;
    this.btnQuit.container.scale = 0.01;
    this.btnQuit.state.disabled = true;
    this.mainContainer.addChild(this.btnQuit.container);

    this.txtTurn.visible = false;
    this.mainContainer.addChild(this.txtTurn);

    this.groupHint.visible = false;
    this.mainContainer.addChild(this.groupHint);

    this.mainContainer.addChild(this.groupPiecesLow);
    this.txtDontTouch.alpha = 0;
    this.mainContainer.addChild(this.txtDontTouch);
    this.mainContainer.addChild(this.groupPiecesHigh);

    for (let i = 0; i < 3; i++) {
      this.pieceSprites[i].scale.set(PIECE_SCALE);
      this.pieceSprites[i].position = this.calcPlayerPieceStartPos(i);
      this.pieceSprites[i].visible = false;
      this.groupPiecesLow.addChild(this.pieceSprites[i]);
      const k = i + 3;
      this.pieceSprites[k].scale.set(PIECE_SCALE);
      this.pieceSprites[k].position.set(width * 0.037 + i * 119, height * 0.79);
      this.pieceSprites[k].visible = false;
      this.groupPiecesLow.addChild(this.pieceSprites[k]);
    }

    this.score = [0, 0];
    this.txtScoreYou.text = '0';
    this.txtScoreOpponent.text = '0';

    this.gsapTimelines.tmlShow = gsap.timeline({ onComplete: () => {
        Utils.destroyGsapTimeline(this.gsapTimelines, 'tmlShow');

        this.state = 'Playing';
        this.btnQuit.state.disabled = false;
        this.newGame();
      }})
      .to(this.txtDifficulty.position, { y: '+=100', duration: .4, ease: 'power2.out' })
      .to(this.txtD.position, { y: '+=100', duration: .4, ease: 'power2.out' }, .1)
      .to([this.groupPieceBoxes, this.groupScore], { alpha: 1, duration: 1, ease: 'none' }, .1)
      .set(this.pieceSprites, { visible: true, stagger: 0.1 }, 1.1)
      .to(this.btnQuit.container, { alpha: 1, duration: .3, ease: 'power2.out' }, .2)
      .to(this.btnQuit.container, { scale: .8, duration: .6, ease: 'power3.out' }, .4);

    document.addEventListener('mousedown', this.onDocMouseDown, { capture: true, passive: true });
    document.addEventListener('mousemove', this.onDocMouseMove, { capture: true, passive: true });
    document.addEventListener('mouseup', this.onDocMouseUp, { capture: true, passive: true });
    if (this.bTouchDevice) {
      document.addEventListener('touchstart', this.onDocTouchStart, { capture: true, passive: true });
      document.addEventListener('touchmove', this.onDocTouchMove, { capture: true, passive: true });
      document.addEventListener('touchend', this.onDocTouchEnd, { capture: true, passive: true });
      document.addEventListener('touchcancel', this.onDocTouchEnd, { capture: true, passive: true });
    }

    // this.tmpGrfx = new PIXI.Graphics();
    // this.mainContainer.addChild(this.tmpGrfx);
  }

  onUpdate(ticker: PIXI.Ticker): void {
    if (this.state === 'Playing') {
      if (this.bNoMovement && !this.groupHint.visible) {
        const now = performance.now();
        if (now - this.timeStartGame > 9_000) {
          this.groupHint.alpha = 0;
          this.groupHint.visible = true;

          this.gsapTimelines.tmlShowHint = gsap.timeline({ onComplete: () => {
              Utils.destroyGsapTimeline(this.gsapTimelines, 'tmlShowHint');
            }})
            .to(this.groupHint, { alpha: 1, duration: 1.2, ease: 'none' }, .1);
        }
      }
      if (!this.bNoMovement && this.groupHint.visible) {
        Utils.destroyGsapTimeline(this.gsapTimelines, 'tmlShowHint');
        this.groupHint.visible = false;
      }
    }

    let deltaAlpha: number;
    if (this.state === 'Playing' && this.subState === 'Idle' && this.rcOpponentPieces.contains(this.mousePos.x, this.mousePos.y))
      deltaAlpha = ticker.elapsedMS * 0.001;
    else
      deltaAlpha= -ticker.elapsedMS * 0.003;
    this.txtDontTouch.alpha = Utils.clamp(this.txtDontTouch.alpha + deltaAlpha, 0, 1);

    if (this.state === 'Playing' && this.subState === 'Dragging_Piece') {
      // Find a drop target
      this.dropTarget = -1;
      const sprDrag = this.pieceSprites[this.dragPieceData.index];
      sprDrag.filters = [this.pieceDropShadowFilter];
      for (let i = 0; i < this.empties.length; i++) {
        if (this.empties2[i].visible) {
          const emptyGlobalPos = this.empties2[i].toGlobal({ x: 0, y: 0 });
          const dx = emptyGlobalPos.x - sprDrag.x;
          const dy = emptyGlobalPos.y - sprDrag.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < DROP_DISTSQ) {
            this.dropTarget = i;
            sprDrag.filters = [this.cmf, this.pieceDropShadowFilter];
            break;
          }
        }
      }

      // Blink the empty spots
      this.empties2.forEach(empty => {
        if (empty.visible) {
          empty.alpha = this.tweenTarget.alpha;
          empty.scale = this.tweenTarget.scale;
        }
      });
    }
  }

  onDismiss(): void {
    for (const key of Object.keys(this.gsapTimelines))
      Utils.destroyGsapTimeline(this.gsapTimelines, key);

    this.mainContainer.removeChildren();
    this.game.app.stage.removeChild(this.mainContainer);
  }

  handleResize(): void {
  }

  private newGame = () => {
    this.bNextIsPlayer = this.playerHasFirstMove;
    this.playerHasFirstMove = !this.playerHasFirstMove; // Next time switch turns

    // Animate the Turn text
    this.animateTurnText();

    this.bNoMovement = true;
    this.timeStartGame = performance.now();
    this.groupHint.visible = false;
    this.txtDontTouch.alpha = 0;

    this.subState = 'Idle';
    this.gameState.reset();
    this.placedPieces = [false, false, false];
  };

  private animateTurnText = () => {
    Utils.destroyGsapTimeline(this.gsapTimelines, 'tmlTurn');

    const { height } = this.game.app.screen;

    this.txtTurn.visible = true;
    this.txtTurn.text = this.bNextIsPlayer ? 'Your Turn' : "Opponent's Turn";
    this.txtTurn.alpha = 0;
    this.txtTurn.y = height * 0.18 + 20;
    this.txtTurn.scale.set(1);
    this.gsapTimelines.tmlTurn = gsap.timeline({ onComplete: () => {
        Utils.destroyGsapTimeline(this.gsapTimelines, 'tmlTurn');
      }})
      .to(this.txtTurn, { alpha: 1, duration: .45, ease: 'none' })
      .to(this.txtTurn, { y: '-=20', duration: .7, ease: 'power1.out' }, 0)
      .to(this.txtTurn.scale, { x: 1.1, y: 1.1, duration: .25, ease: 'power1.out' })
      .to(this.txtTurn.scale, { x: 1, y: 1, duration: .25, ease: 'power1.in' });
    this.gsapTimelines.tmlTurn.timeScale(3);
  };

  private onButQuitClick = () => {
    if (this.state === 'Playing') {
      console.log('Quit');
    }
  };

  private saveMousePos(clientX: number, clientY: number) {
    const { width, height } = this.game.app.screen;
    const rcCanvas = this.game.app.canvas.getBoundingClientRect();
    let xPos = (clientX - rcCanvas.left) / rcCanvas.width * width;
    let yPos = (clientY - rcCanvas.top) / rcCanvas.height * height;
    xPos = Utils.clamp(xPos, 0, width);
    yPos = Utils.clamp(yPos, 0, height);
    this.mousePos.set(xPos, yPos);
  }

  private onDocMouseDown = (evt: MouseEvent) => {
    this.saveMousePos(evt.clientX, evt.clientY);
    this.startDrag();
  };

  private onDocMouseMove = (evt: MouseEvent) => {
    this.saveMousePos(evt.clientX, evt.clientY);
    this.moveDrag();
  };

  private onDocMouseUp = () => {
    this.mousePos.set(-1000, -1000);
    this.endDrag();
  };

  private onDocTouchStart = (evt: TouchEvent) => {
    this.saveMousePos(evt.touches[0].clientX, evt.touches[0].clientY);
    this.startDrag();
  };

  private onDocTouchMove = (evt: TouchEvent) => {
    this.saveMousePos(evt.touches[0].clientX, evt.touches[0].clientY);
    this.moveDrag();
  };

  private onDocTouchEnd = () => {
    this.mousePos.set(-1000, -1000);
    this.endDrag();
  };

  private startDrag = () => {
    if (this.state === 'Playing' && this.subState === 'Idle') {
      for (let i = 0; i < 3; i++) {
        const local = this.pieceSprites[i].toLocal(this.mousePos);
        if (this.pieceSprites[i].hitArea!.contains(local.x, local.y) && !this.placedPieces[i]) {

          Utils.destroyGsapTimeline(this.gsapTimelines, `travel${i}`);

          const dx = this.pieceSprites[i].x - this.mousePos.x;
          const dy = this.pieceSprites[i].y - this.mousePos.y;
          this.subState = 'Dragging_Piece';
          if (this.pieceSprites[i].parent !== this.groupPiecesHigh)
            this.groupPiecesHigh.reparentChild(this.pieceSprites[i]);
          this.pieceSprites[i].scale.set(PIECE_SCALE * 1.2);
          this.pieceSprites[i].filters = [this.pieceDropShadowFilter];
          this.dragPieceData.index = i;
          this.dragPieceData.mouseStart = this.mousePos.clone();
          this.dragPieceData.offset.set(dx, dy);
          this.empties2.forEach((empty, idx) => {
            if (this.gameState.board[idx] === 'Empty') {
              empty.visible = true;
              empty.alpha = 1;
              empty.scale = 1;
            } else
              empty.visible = false;
          });
          this.tweenTarget = { alpha: .9, scale: 1 };
          this.gsapTimelines.tmlSpotBlink = gsap.timeline({ repeat: -1})
            .to(this.tweenTarget, { duration: .5, ease: 'none', alpha: 0 })
            .to(this.tweenTarget, { duration: .6, ease: 'none', scale: 2.2 }, 0)
            .to(this.tweenTarget, { duration: 0.5 });
          return;
        }
      }
    }
  };

  private calcPlayerPieceStartPos(index: number):PIXI.Point {
    const { width, height } = this.game.app.screen;
    return new PIXI.Point(width * 0.037 + index * 119 + this.pieceRadius, height * 0.52 + this.pieceRadius);
  };

  private moveDrag = () => {
    if (this.state === 'Playing' && this.subState === 'Dragging_Piece') {
      this.pieceSprites[this.dragPieceData.index].position.set(this.mousePos.x + this.dragPieceData.offset.x, this.mousePos.y + this.dragPieceData.offset.y);
    }
  };

  private endDrag = () => {
    if (this.state === 'Playing' && this.subState === 'Dragging_Piece') {
      this.subState = 'Idle';
      this.empties2.forEach(empty => empty.visible = false);
      Utils.destroyGsapTimeline(this.gsapTimelines, 'tmlSpotBlink');
      const sprDrag = this.pieceSprites[this.dragPieceData.index];

      if (this.dropTarget !== -1) {
        // Drop the piece
        this.groupPiecesLow.reparentChild(sprDrag);
        sprDrag.scale.set(PIECE_SCALE);
        sprDrag.filters = [];
        this.empties2[this.dropTarget].toGlobal({ x: 0, y: 0 }, sprDrag.position);

        const row = Math.floor(this.dropTarget / 3);
        const col = this.dropTarget % 3;
        this.gameState.setSlot(row, col, 'Player');

        this.placedPieces[this.dragPieceData.index] = true;

        this.bNextIsPlayer = !this.bNextIsPlayer;
        this.animateTurnText();

        this.bNoMovement = false;
      } else {
        // Travel the piece back to its original position
        const ptTo = this.calcPlayerPieceStartPos(this.dragPieceData.index);
        const travelTimelineName = `travel${this.dragPieceData.index}`;
        const dx = ptTo.x - sprDrag.x;
        const dy = ptTo.y - sprDrag.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const duration = Math.max(dist / 2_000, 0.05);
        this.gsapTimelines[travelTimelineName] = gsap.timeline({ onComplete: () => {
            this.groupPiecesLow.reparentChild(sprDrag);
            sprDrag.scale.set(PIECE_SCALE);
            sprDrag.filters = [];
            Utils.destroyGsapTimeline(this.gsapTimelines, travelTimelineName);
          }})
          .to(sprDrag.position, { x: ptTo.x, y: ptTo.y, duration, ease: 'power2.out' });
      }
    }
  };
}

export default ScrGame;
