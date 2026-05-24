import * as PIXI from 'pixi.js';
import { GlowFilter, DropShadowFilter } from 'pixi-filters';
import gsap from 'gsap';
import GameState, { Move } from '../game-state.ts';
import ConfettiSystem from '../confetti-system.ts';
import { IGame, IGameScreen, TButtonWithShadow, DragPieceData } from '../types.ts';
import { G_Fonts, G_Screens, G_Sound, G_Tex } from '../constants.ts';
import Utils from '../utils.ts';


const BOARD_SCALE = 0.85;
const PIECE_SCALE = 0.36;
const DROP_DISTSQ = 2_900;
const MOVE_DISTSQ = 15_000;
type TState = 'ShowingUp' | 'Playing' | 'To_Winner' | 'Winner' | 'To_Playing' | 'Quitting';
type TSubState = 'Idle' | 'Dragging_Piece' | 'Moving_Piece' | 'CpuMove' | 'CpuMove_Animation' | 'Init_To_Winner';


class ScrGame implements IGameScreen {
  game: IGame;

  private state!: TState;
  private readonly bTouchDevice: boolean;
  private readonly pieceRadius: number;
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
  private piecePositions: number[] = [];
  private bAllPiecesPlaced: boolean = false;
  private possibleMoves: { from: number, to: number }[] = [];
  private dragPiecePossibleMoves: number[] = [];
  private dragSoundPlayed: boolean = false;
  private bCanFadePiecesGroup: boolean = false;
  private gsapTimelines: Record<string, gsap.core.Timeline> = {};
  private winPositions: number[] | undefined = undefined;
  private winner: 'Player' | 'Cpu' = 'Player';
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
  private readonly sadPirate: PIXI.Sprite;
  private readonly happyPirate: PIXI.Sprite;
  private readonly btnPlayAgain: TButtonWithShadow;
  // Groups for reparenting pieces, so that the dragged piece is always on top of other pieces
  private readonly groupPiecesLow: PIXI.Container;
  private readonly groupPiecesHigh: PIXI.Container;
  private readonly confettiSystem: ConfettiSystem;

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
    this.btnQuit.button.on('click', this.onBtnQuitClick);
    this.btnQuit.button.on('tap', this.onBtnQuitClick);

    this.btnPlayAgain = Utils.createButton(this.game.atlas.textures[G_Tex.Button], { label: 'Play Again', fontSize: 48 });
    this.btnPlayAgain.container.position.set(width * 0.15, height * 0.88);
    this.btnPlayAgain.button.on('click', this.onBtnPlayAgainClick);
    this.btnPlayAgain.button.on('tap', this.onBtnPlayAgainClick);

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
    for (let i = 3; i < 6; i++)
      this.pieceSprites[i].anchor.set(0.5);

    this.pieceDropShadowFilter = new DropShadowFilter({
      blur: 4,           // blur strength (like CSS blur radius)
      color: 0x000000,   // shadow color
      alpha: .6,        // opacity
      offset: { x: 15, y: 15 },
    });

    this.groupPiecesLow = new PIXI.Container();
    this.groupPiecesHigh = new PIXI.Container();
    this.confettiSystem = new ConfettiSystem(game);

    this.rcOpponentPieces = new PIXI.Rectangle(40, 700, 385, 180);

    this.cmf = new PIXI.ColorMatrixFilter();
    this.cmf.brightness(1.1, false);

    this.sadPirate = new PIXI.Sprite({
      texture: game.atlas.textures[G_Tex.SadPirate],
      anchor: 0.5,
      visible: false,
      position: { x: width * 0.15, y: height * 0.45} });

    this.happyPirate = new PIXI.Sprite({
      texture: game.atlas.textures[G_Tex.HappyPirate],
      anchor: 0.5,
      visible: false,
      position: { x: width * 0.15, y: height * 0.4} });
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
    this.mainContainer.position.set(0, 0);
    this.lines.forEach(line => line.tint = 0xFFFFFF);
    this.pieceSprites.forEach(piece => piece.filters = []);

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

    this.btnPlayAgain.container.visible = false;
    this.btnPlayAgain.state.disabled = true;
    this.mainContainer.addChild(this.btnPlayAgain.container);

    this.txtTurn.visible = false;
    this.mainContainer.addChild(this.txtTurn);

    this.groupHint.visible = false;
    this.mainContainer.addChild(this.groupHint);

    this.sadPirate.visible = false;
    this.mainContainer.addChild(this.sadPirate);
    this.happyPirate.visible = false;
    this.mainContainer.addChild(this.happyPirate);

    this.mainContainer.addChild(this.groupPiecesLow);
    this.txtDontTouch.alpha = 0;
    this.mainContainer.addChild(this.txtDontTouch);
    this.mainContainer.addChild(this.groupPiecesHigh);
    this.mainContainer.addChild(this.confettiSystem.group);

    for (let i = 0; i < 3; i++) {
      this.pieceSprites[i].scale.set(PIECE_SCALE);
      this.pieceSprites[i].position = this.calcPlayerPieceStartPos(i);
      this.pieceSprites[i].visible = false;
      this.groupPiecesLow.addChild(this.pieceSprites[i]);
      const k = i + 3;
      this.pieceSprites[k].scale.set(PIECE_SCALE);
      this.pieceSprites[k].position.set(this.pieceSprites[i].x, this.pieceSprites[i].y + 250);
      this.pieceSprites[k].visible = false;
      this.groupPiecesLow.addChild(this.pieceSprites[k]);
    }

    this.score = [0, 0];
    this.txtScoreYou.text = '0';
    this.txtScoreOpponent.text = '0';

    this.gsapTimelines.tmlShow = gsap.timeline({ onComplete: () => {
        Utils.destroyGsapTimeline(this.gsapTimelines, 'tmlShow');

        this.state = 'Playing';
        this.btnQuit.container.alpha = 1;
        this.btnQuit.state.disabled = false;
        this.newGame();

        if (import.meta.env.VITE_STRAIGHT_TO_WIN === 'Player' || import.meta.env.VITE_STRAIGHT_TO_WIN === 'Cpu') {
          setTimeout(() => {
            const _W = import.meta.env.VITE_STRAIGHT_TO_WIN;
            const _L = (_W === 'Player') ? 'Cpu' : 'Player';
            this.state = 'To_Winner';
            this.winner = _W;
            this.subState = 'Init_To_Winner';
            this.bCanFadePiecesGroup = true;
            this.animateTurnText();
            this.gameState.board = [_W, _W, _W, 'Empty', _L, 'Empty', 'Empty', 'Empty', _L];
            this.placedPieces = [false, false, false, false, false, false];
            let placement;
            if (_W === 'Player') {
              placement = [0, 1, 2, 3, 4];
            } else {
              placement = [3, 4, 5, 0, 1];
            }
            placement.forEach((place, idx) => {
              this.placedPieces[place] = true;
              const k = idx < 3 ? idx : (idx < 4 ? 4 : 8);
              this.empties2[k].toGlobal({ x: 0, y: 0 }, this.pieceSprites[place]);
            });
          }, 50);
        }
      }})
      .to(this.txtDifficulty.position, { y: '+=100', duration: .4, ease: 'power2.out' })
      .to(this.txtD.position, { y: '+=100', duration: .4, ease: 'power2.out' }, .1)
      .to([this.groupPieceBoxes, this.groupScore], { alpha: 1, duration: 1, ease: 'none' }, .1)
      .set(this.pieceSprites, { visible: true, stagger: 0.1 }, 1.1)
      .to(this.btnQuit.container, { alpha: .4, duration: .3, ease: 'power2.out' }, .2)
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
    if (this.state === 'Playing' && this.subState === 'Idle' && !this.placedPieces[5] && this.rcOpponentPieces.contains(this.mousePos.x, this.mousePos.y))
      deltaAlpha = ticker.elapsedMS * 0.001;
    else
      deltaAlpha = -ticker.elapsedMS * 0.003;
    this.txtDontTouch.alpha = Utils.clamp(this.txtDontTouch.alpha + deltaAlpha, 0, 1);

    if (this.bCanFadePiecesGroup && this.groupPieceBoxes.alpha > 0) {
      const speedFactor = this.state === 'To_Winner' ? 0.01 : 0.00072;
      this.groupPieceBoxes.alpha = Utils.clamp(this.groupPieceBoxes.alpha - ticker.elapsedMS * speedFactor, 0, 1);
    }

    if (this.state === 'Playing' && (this.subState === 'Dragging_Piece' || this.subState === 'Moving_Piece')) {
      // Find a drop target
      const bSetFilter = this.subState === 'Dragging_Piece';
      this.dropTarget = -1;
      const sprDrag = this.pieceSprites[this.dragPieceData.index];
      if (bSetFilter) sprDrag.filters = [this.pieceDropShadowFilter];
      for (let i = 0; i < this.empties.length; i++) {
        if (this.empties2[i].visible) {
          const emptyGlobalPos = this.empties2[i].toGlobal({ x: 0, y: 0 });
          const distSq = Utils.distSq(emptyGlobalPos, sprDrag.position);
          const MIN_DISTSQ = this.subState === 'Dragging_Piece' ? DROP_DISTSQ : MOVE_DISTSQ;
          if (distSq < MIN_DISTSQ) {
            this.dropTarget = i;
            if (bSetFilter) sprDrag.filters = [this.cmf, this.pieceDropShadowFilter];
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

    if (this.state === 'Playing' && this.subState === 'CpuMove') {
      const theMove = this.nextMove();
      this.subState = 'CpuMove_Animation';

      if (theMove.type === 'Placement') {
        // Grab the next available piece
        let i = 3;
        while (this.placedPieces[i]) ++i;
        this.placedPieces[i] = true;
        this.piecePositions[i] = theMove.to;
        const sprMove = this.pieceSprites[i];
        this.bAllPiecesPlaced = this.placedPieces.every(v => v);

        // Move it on top
        if (sprMove.parent !== this.groupPiecesHigh)
          this.groupPiecesHigh.reparentChild(sprMove);

        // Pick it up
        sprMove.scale.set(PIECE_SCALE * 1.2);
        sprMove.filters = [this.pieceDropShadowFilter];

        // Move the piece
        const targetPt: PIXI.Point = this.empties2[theMove.to].toGlobal({ x: 0, y: 0 });
        const dx = sprMove.x - targetPt.x;
        const dy = sprMove.y - targetPt.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const duration = Math.max(dist / 800, 0.05);
        this.gsapTimelines.tmlMove = gsap.timeline({ onComplete: () => {
            Utils.destroyGsapTimeline(this.gsapTimelines, 'tmlMove');

            this.game.sound[G_Sound.PieceDrop].play();

            if (this.bAllPiecesPlaced)
              this.bCanFadePiecesGroup = true;

            this.groupPiecesLow.reparentChild(sprMove);
            sprMove.scale.set(PIECE_SCALE);
            sprMove.filters = [];
            sprMove.position.set(targetPt.x, targetPt.y);

            this.gameState.setSlotIdx(theMove.to, 'Cpu');

            this.estimateWinState('Cpu');
          }})
          .to(sprMove.position, { x: targetPt.x, y: targetPt.y, duration, ease: 'power2.inout' });
      } else {
        const from = this.piecePositions.findIndex(v => v === theMove.from);
        const sprMove = this.pieceSprites[from];
        this.piecePositions[from] = theMove.to;
        const idSnd = this.game.sound[G_Sound.PieceMove].play();
        this.game.sound[G_Sound.PieceMove].volume(.45, idSnd);

        // Move the piece
        const targetPt: PIXI.Point = this.empties2[theMove.to].toGlobal({ x: 0, y: 0 });
        const dx = sprMove.x - targetPt.x;
        const dy = sprMove.y - targetPt.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const duration = Math.max(dist / 800, 0.05);
        this.gsapTimelines.tmlMove = gsap.timeline({ onComplete: () => {
            Utils.destroyGsapTimeline(this.gsapTimelines, 'tmlMove');

            sprMove.position.set(targetPt.x, targetPt.y);
            this.gameState.setSlotIdx(theMove.to, 'Cpu');
            this.gameState.setSlotIdx(theMove.from, 'Empty');

            this.estimateWinState('Cpu');
          }})
          .to(sprMove.position, { x: targetPt.x, y: targetPt.y, duration, ease: 'power2.inout' });
      }
    }

    if (this.state === 'To_Winner' && this.subState === 'Init_To_Winner') {
      this.subState = 'Idle';
      Utils.destroyGsapTimeline(this.gsapTimelines, 'tmlToWinner');
      const winLineIndex = this.gameState.getWinnerLine(this.winner);
      let txtScore: PIXI.Text, sprPirate: PIXI.Sprite;
      if (this.winner === 'Cpu') {
        // Play the lose sound
        const idSnd = this.game.sound[G_Sound.GameLost].play();
        this.game.sound[G_Sound.GameLost].volume(.6, idSnd);
        // Update the score
        this.score[1] += 1;
        this.txtScoreOpponent.text = this.score[1].toString();
        txtScore = this.txtScoreOpponent;

        sprPirate = this.sadPirate;

        // Highlight the pieces
        for (let i = 3; i < 6; i++)
          this.pieceSprites[i].filters = [
            new GlowFilter({ distance: 60, outerStrength: 4, color: '#FF8888', alpha: 0.5 }),
          ];
        this.lines[winLineIndex].tint = 0xFFBABA;
      } else {
        // Play the win sound
        const idSnd = this.game.sound[G_Sound.GameWon].play();
        this.game.sound[G_Sound.GameWon].volume(.7, idSnd);
        // Update the score
        this.score[0] += 1;
        this.txtScoreYou.text = this.score[0].toString();
        txtScore = this.txtScoreYou;
        // Fire confetti
        this.confettiSystem.fire();

        sprPirate = this.happyPirate;

        // Highlight the pieces
        for (let i = 0; i < 3; i++)
          this.pieceSprites[i].filters = [
            new GlowFilter({ distance: 60, outerStrength: 4, color: '#88CC88', alpha: 0.5 }),
          ];
        this.lines[winLineIndex].tint = 0xBAFFBA;
      }
      // Hide unplaced pieces
      this.placedPieces.forEach((val, idx) => this.pieceSprites[idx].visible = val);
      // Animate to 'Winner' state
      sprPirate.alpha = 0;
      sprPirate.visible = true;
      this.btnPlayAgain.container.alpha = 0;
      this.btnPlayAgain.container.scale = 0.01;
      this.btnPlayAgain.container.visible = true;
      this.btnPlayAgain.state.disabled = true;
      this.gsapTimelines.tmlToWinner = gsap.timeline({ onComplete: () => {
          this.state = 'Winner';
          this.btnPlayAgain.state.disabled = false;
        }})
        .to(txtScore.scale, { x: 1.3, y: 1.3, duration: .25, ease: 'power3.out' })
        .to(txtScore.scale, { x: 1, y: 1, duration: .25, ease: 'power3.in' })
        .to(sprPirate, { alpha: 1, duration: .7, ease: 'power2.out' }, 0)
        .to(this.btnPlayAgain.container, { alpha: 1, duration: .2, ease: 'power2.out' }, .2)
        .to(this.btnPlayAgain.container, { scale: 1, duration: .4, ease: 'power3.out' }, .3);
    }
    this.confettiSystem.update(ticker);
  }

  onDismiss(): void {
    for (const key of Object.keys(this.gsapTimelines))
      Utils.destroyGsapTimeline(this.gsapTimelines, key);

    this.groupPiecesLow.removeChildren();
    this.groupPiecesHigh.removeChildren();
    this.confettiSystem.destroy();
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

    this.subState = this.bNextIsPlayer ? 'Idle' : 'CpuMove';
    this.gameState.reset();
    this.placedPieces = [false, false, false, false, false, false];
    this.piecePositions = [-1, -1, -1, -1, -1, -1];
    this.bAllPiecesPlaced = false;
    this.bCanFadePiecesGroup = false;
  };

  private animateTurnText = () => {
    Utils.destroyGsapTimeline(this.gsapTimelines, 'tmlTurn');

    const { height } = this.game.app.screen;

    this.txtTurn.visible = true;
    if (this.state === 'To_Winner') {
      this.txtTurn.text = this.winner === 'Player' ? 'You Won!' : 'You Lost!';
      this.txtTurn.tint = this.winner === 'Player' ? 0xBBFFBB : 0xFFBBBB;
    } else {
      this.txtTurn.text = this.bNextIsPlayer ? 'Your Turn' : "Opponent's Turn";
      this.txtTurn.tint = 0xFFFFFF;
    }
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

  private onBtnQuitClick = () => {
    if (this.state === 'Playing' || this.state === 'Winner') {
      // Split the stage
      for (const key of Object.keys(this.gsapTimelines))
        Utils.destroyGsapTimeline(this.gsapTimelines, key);

      this.state = 'Quitting';

      const right = new PIXI.Container();
      this.game.app.stage.addChild(right);
      right.reparentChild(this.groupScore);
      right.reparentChild(this.btnQuit.container);

      this.gsapTimelines.splitStage = gsap.timeline({ onComplete: () => {
          Utils.destroyGsapTimeline(this.gsapTimelines, 'splitStage');
          right.removeChildren();
          this.game.setScreen(G_Screens.Home);
      }})
        .to(this.mainContainer.position, { x: -1350, duration: .7, ease: 'power2.out' })
        .to(right, { x: 400, duration: .6, ease: 'power2.out' }, 0);
    }
  };

  private onBtnPlayAgainClick = () => {
    if (this.state === 'Winner') {
      Utils.destroyGsapTimeline(this.gsapTimelines, 'tmlToWinner'); // In case it's still running

      this.pieceSprites.forEach(piece => {
        piece.filters = [];
        piece.visible = true;
      });
      this.lines.forEach(line => line.tint = 0xFFFFFF);

      this.state = 'To_Playing';
      const sprPirate = this.winner === 'Player' ? this.happyPirate : this.sadPirate;
      this.btnQuit.state.disabled = true;
      this.btnQuit.container.alpha = 0.2;
      this.gsapTimelines.tmlPlayAgain = gsap.timeline({ onComplete: () => {
          Utils.destroyGsapTimeline(this.gsapTimelines, 'tmlPlayAgain');
          this.state = 'Playing';
          this.btnQuit.state.disabled = false;
          this.btnQuit.container.alpha = 1;
          sprPirate.visible = false;
          this.newGame();
        }})
        .to(sprPirate, { alpha: 0, duration: .5, ease: 'power2.out' })
        .to(this.groupPieceBoxes, { alpha: 1, duration: .5, ease: 'none' }, .1)
        .to(this.btnPlayAgain.container, { alpha: 0, duration: .5, ease: 'none'}, 0)
        .to(this.btnPlayAgain.container.scale, { x: 0.01, y: 0.01, duration: 0.45, ease: 'power2.out'}, 0);
      for (let i = 0; i < this.pieceSprites.length; ++i) {
        const targetPos = this.calcPlayerPieceStartPos(i % 3);
        if (i > 2) targetPos.y += 250;
        this.gsapTimelines.tmlPlayAgain.to(this.pieceSprites[i].position, { x: targetPos.x, y: targetPos.y, duration: 0.5, ease: 'power2.out' }, i*0.1);
      }
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
        if (this.pieceSprites[i].hitArea!.contains(local.x, local.y)) {
          if (!this.placedPieces[i]) {
            // Placing a piece
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
            const bBoardEmpty = this.gameState.emptySlotCount === 9;
            this.empties2.forEach((empty, idx) => {
              if (this.gameState.board[idx] === 'Empty' && (idx !== 4 || !bBoardEmpty)) { // Cannot place a piece in the center slot if the board is empty
                empty.visible = true;
                empty.alpha = 1;
                empty.scale = 1;
              } else
                empty.visible = false;
            });
            this.startEmptySpotBlink();
          } else if (this.bAllPiecesPlaced) {
            Utils.destroyGsapTimeline(this.gsapTimelines, `travel${i}`);

            // Moving a piece
            const piecePossibleMoves = this.possibleMoves.reduce((acc: number[], cur) => {
              if (cur.from === this.piecePositions[i])
                acc.push(cur.to);
              return acc;
            }, []);
            if (piecePossibleMoves.length > 0) {
              const dx = this.pieceSprites[i].x - this.mousePos.x;
              const dy = this.pieceSprites[i].y - this.mousePos.y;
              this.subState = 'Moving_Piece';
              this.dragPieceData.index = i;
              this.dragPieceData.mouseStart = this.mousePos.clone();
              this.dragPieceData.offset.set(dx, dy);
              piecePossibleMoves.forEach(idx => {
                this.empties2[idx].visible = true;
                this.empties2[idx].alpha = 1;
                this.empties2[idx].scale = 1;
              });
              this.startEmptySpotBlink();
              this.dragPiecePossibleMoves = piecePossibleMoves;
              this.dragSoundPlayed = false;
            }
          }
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
    } else if (this.state === 'Playing' && this.subState === 'Moving_Piece') {
      Utils.assert(this.dragPiecePossibleMoves.length > 0);
      const pieceWouldBePos = new PIXI.Point(this.mousePos.x + this.dragPieceData.offset.x, this.mousePos.y + this.dragPieceData.offset.y);
      const boardPos = this.board.toLocal(pieceWouldBePos);
      const from = this.piecePositions[this.dragPieceData.index];
      const ptsOnLines = this.dragPiecePossibleMoves.reduce((acc: PIXI.Point[], cur) => [Utils.closestPointOnSection(this.empties2[from].position, this.empties2[cur].position, boardPos), ...acc], []);
      let ptBest = ptsOnLines[0];
      if (ptsOnLines.length > 1) {
        let bestDist = Utils.distSq(ptBest, boardPos);
        for (let i = 1; i < ptsOnLines.length; i++) {
          const dist = Utils.distSq(ptsOnLines[i], boardPos);
          if (dist < bestDist) {
            bestDist = dist;
            ptBest = ptsOnLines[i];
          }
        }
      }
      ptBest = this.board.toGlobal(ptBest);
      this.pieceSprites[this.dragPieceData.index].position.set(ptBest.x, ptBest.y);

      if (!this.dragSoundPlayed) {
        this.dragSoundPlayed = true;
        const idSnd = this.game.sound[G_Sound.PieceMove].play();
        this.game.sound[G_Sound.PieceMove].volume(.45, idSnd);
      }
    }
  };

  private endDrag = () => {
    if (this.state === 'Playing' && this.subState === 'Dragging_Piece') {
      this.subState = 'Idle';
      this.endEmptySpotBlink();
      const sprDrag = this.pieceSprites[this.dragPieceData.index];

      if (this.dropTarget !== -1) {
        // Drop the piece
        this.groupPiecesLow.reparentChild(sprDrag);
        sprDrag.scale.set(PIECE_SCALE);
        sprDrag.filters = [];
        this.empties2[this.dropTarget].toGlobal({ x: 0, y: 0 }, sprDrag.position);

        this.gameState.setSlotIdx(this.dropTarget, 'Player');

        this.placedPieces[this.dragPieceData.index] = true;
        this.piecePositions[this.dragPieceData.index] = this.dropTarget;
        this.bAllPiecesPlaced = this.placedPieces.every(v => v);

        this.game.sound[G_Sound.PieceDrop].play();

        this.bNoMovement = false;
        this.estimateWinState('Player');
      } else {
        // Travel the piece back to its original position
        this.travelPieceBack(sprDrag);
      }
    } else if (this.state === 'Playing' && this.subState === 'Moving_Piece') {
      this.subState = 'Idle';
      this.endEmptySpotBlink();
      const sprDrag = this.pieceSprites[this.dragPieceData.index];

      if (this.dropTarget !== -1) {
        // Move the piece
        this.empties2[this.dropTarget].toGlobal({ x: 0, y: 0 }, sprDrag.position);
        this.gameState.setSlotIdx(this.dropTarget, 'Player');
        this.gameState.setSlotIdx(this.piecePositions[this.dragPieceData.index], 'Empty');
        this.piecePositions[this.dragPieceData.index] = this.dropTarget;
        this.estimateWinState('Player');
      } else {
        // Travel the piece back to where it started
        this.travelPieceBack_OnBoard(sprDrag);
      }
    }
  };

  private travelPieceBack = (sprDrag: PIXI.Sprite) => {
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
  };

  private travelPieceBack_OnBoard = (sprDrag: PIXI.Sprite) => {
    // Travel the piece back to where it started
    const from = this.piecePositions[this.dragPieceData.index];
    const ptTo = this.empties2[from].toGlobal({ x: 0, y: 0 });
    const travelTimelineName = `travel${this.dragPieceData.index}`;
    const dx = ptTo.x - sprDrag.x;
    const dy = ptTo.y - sprDrag.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const duration = Math.max(dist / 2_000, 0.05);
    this.gsapTimelines[travelTimelineName] = gsap.timeline({ onComplete: () => {
        Utils.destroyGsapTimeline(this.gsapTimelines, travelTimelineName);
      }})
      .to(sprDrag.position, { x: ptTo.x, y: ptTo.y, duration, ease: 'power2.out' });
  };

  private estimateWinState = (lastMoveActor: 'Player' | 'Cpu') => {
    this.winPositions = this.gameState.getWinnerPositions(lastMoveActor);
    if (this.winPositions !== undefined) {
      this.state = 'To_Winner';
      this.winner = lastMoveActor;
      this.subState = 'Init_To_Winner';
      this.bCanFadePiecesGroup = true;
    } else {
      if (lastMoveActor === 'Cpu' && this.bAllPiecesPlaced)
        this.determineAvailableMovesForActor('Player');

      this.bNextIsPlayer = !this.bNextIsPlayer;
      this.subState = (lastMoveActor === 'Cpu') ? 'Idle' : 'CpuMove';
    }
    this.animateTurnText();
  };

  private determineAvailableMovesForActor = (actor: 'Player' | 'Cpu') => {
    this.possibleMoves = [];
    for (let i = 0; i < 9; i++) {
      if (this.gameState.board[i] === actor) {
        if (this.gameState.canMoveRight(i)) this.possibleMoves.push({ from: i, to: i + GameState.moveInc.Right });
        if (this.gameState.canMoveLeft(i)) this.possibleMoves.push({ from: i, to: i + GameState.moveInc.Left });
        if (this.gameState.canMoveUp(i)) this.possibleMoves.push({ from: i, to: i + GameState.moveInc.Up });
        if (this.gameState.canMoveDown(i)) this.possibleMoves.push({ from: i, to: i + GameState.moveInc.Down });
        if (this.gameState.canMoveUL(i)) this.possibleMoves.push({ from: i, to: i + GameState.moveInc.UL });
        if (this.gameState.canMoveUR(i)) this.possibleMoves.push({ from: i, to: i + GameState.moveInc.UR });
        if (this.gameState.canMoveDL(i)) this.possibleMoves.push({ from: i, to: i + GameState.moveInc.DL });
        if (this.gameState.canMoveDR(i)) this.possibleMoves.push({ from: i, to: i + GameState.moveInc.DR });
      }
    }
  };

  private startEmptySpotBlink = () => {
    this.tweenTarget = { alpha: .9, scale: 1 };
    this.gsapTimelines.tmlSpotBlink = gsap.timeline({ repeat: -1 })
      .to(this.tweenTarget, { duration: .5, ease: 'none', alpha: 0 })
      .to(this.tweenTarget, { duration: .6, ease: 'none', scale: 2.2 }, 0)
      .to(this.tweenTarget, { duration: 0.5 });
  };

  private endEmptySpotBlink = () => {
    this.empties2.forEach(empty => empty.visible = false);
    Utils.destroyGsapTimeline(this.gsapTimelines, 'tmlSpotBlink');
  };

  private nextMove = ():Move => {
    let bMakeRandomMove = false;
    let minimaxDepth = 0;
    switch (this.game.difficulty) {
      case 'Easy':
        bMakeRandomMove = Math.random() < .37;
        minimaxDepth = 3;
        break;
      case 'Medium':
        bMakeRandomMove = Math.random() < .15;
        minimaxDepth = 5;
        break;
      case 'Hard':
        bMakeRandomMove = Math.random() < .001;
        minimaxDepth = 9;
        break;
    }

    return bMakeRandomMove
      ? this.gameState.randomMove()
      : this.gameState.miniMax(minimaxDepth, -999, 999, 'Cpu');
  };
}


export default ScrGame;
