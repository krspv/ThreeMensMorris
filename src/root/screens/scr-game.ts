import * as PIXI from "pixi.js";
import { GlowFilter } from "pixi-filters";
import gsap from "gsap";
import { IGame, IGameScreen, TButtonWithShadow } from "../types.ts";
import { G_Fonts, G_Tex } from "../constants.ts";
import Utils from "../utils.ts";


const BOARD_SCALE = 0.85;
const PIECE_SCALE = 0.36;
type TState = 'ShowingUp' | 'Playing';


class ScrGame implements IGameScreen {
  game: IGame;

  private state!: TState;
  // Game data
  private playerHasFirstMove!: boolean;
  private score: number[] = [0, 0];  // Scores [you, opponent]
  private bNextIsPlayer!: boolean;
  private timeStartGame!: number;
  private bNoMovement!: boolean; // For showing the hint
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private dynamics: Record<string, any> = {};
  // Rendering data
  private readonly mainContainer: PIXI.Container;
  private readonly board: PIXI.Container;
  private readonly lines: PIXI.Sprite[] = [];
  private readonly empties: PIXI.Sprite[] = [];
  private readonly positions: PIXI.Point[][];
  private readonly txtDifficulty: PIXI.Text;
  private readonly txtD: PIXI.Text;
  private readonly groupPieceBoxes: PIXI.Container;
  private readonly groupScore: PIXI.Container;
  private readonly pieceSprites: PIXI.Sprite[] = [];
  private readonly txtScoreYou: PIXI.Text;
  private readonly txtScoreOpponent: PIXI.Text;
  private readonly btnQuit: TButtonWithShadow;
  private readonly txtTurn: PIXI.Text;
  private readonly groupHint: PIXI.Container;
  // Groups for reparenting pieces, so that the dragged piece is always on top of other pieces
  private readonly groupPiecesLow: PIXI.Container;
  private readonly groupPiecesHigh: PIXI.Container;

  constructor(game: IGame) {
    this.game = game;
    const { width, height } = this.game.app.screen;

    this.mainContainer = new PIXI.Container();
    this.board = new PIXI.Container();
    this.board.position.set(width * 0.53, height * 0.5);

    for (let i = 0; i < 8; i++) {
      const line = new PIXI.Sprite(game.atlas.textures[G_Tex.Line]);
      Utils.centralPivot(line);
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
        const sprEmpty = new PIXI.Sprite(game.atlas.textures[G_Tex.Empty]);
        Utils.centralPivot(sprEmpty);
        sprEmpty.position.set(this.positions[r][c].x, this.positions[r][c].y);
        this.empties.push(sprEmpty);
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
    this.txtDifficulty = new PIXI.Text({text: 'Difficulty:', style});
    Utils.centralPivot(this.txtDifficulty);

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
    this.txtD = new PIXI.Text({text: '', style});

    this.groupPieceBoxes = this.createThePieceBoxesGroup();
    const scoreGroup = this.createTheScoreGroup();
    this.groupScore = scoreGroup.groupScore;
    this.txtScoreYou = scoreGroup.txtScoreYou;
    this.txtScoreOpponent = scoreGroup.txtScoreOpponent;

    this.btnQuit = Utils.createButton(this.game.atlas.textures[G_Tex.Button], { label: 'Quit' });
    Utils.centralPivot(this.btnQuit.container);
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
    this.txtTurn = new PIXI.Text({text: '', style});
    this.txtTurn.position.set(width * 0.155, height * 0.18);

    this.groupHint = this.CreateHint();

    this.pieceSprites.push(new PIXI.Sprite(game.atlas.textures[G_Tex.PlayerPiece]));
    this.pieceSprites.push(new PIXI.Sprite(game.atlas.textures[G_Tex.PlayerPiece]));
    this.pieceSprites.push(new PIXI.Sprite(game.atlas.textures[G_Tex.PlayerPiece]));
    this.pieceSprites.push(new PIXI.Sprite(game.atlas.textures[G_Tex.CpuPiece]));
    this.pieceSprites.push(new PIXI.Sprite(game.atlas.textures[G_Tex.CpuPiece]));
    this.pieceSprites.push(new PIXI.Sprite(game.atlas.textures[G_Tex.CpuPiece]));

    this.groupPiecesLow = new PIXI.Container();
    this.groupPiecesHigh = new PIXI.Container();
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
    const txtYou = new PIXI.Text({text: 'Your pieces:', style});
    Utils.centralPivot(txtYou, 0);
    txtYou.position.set(40, 10);
    ret.addChild(txtYou);

    const txtOpponent = new PIXI.Text({text: 'Opponent pieces:', style});
    Utils.centralPivot(txtOpponent, 0);
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
    const txtScore = new PIXI.Text({text: 'Score:', style});
    Utils.centralPivot(txtScore, 0);
    txtScore.position.set(40, 10);
    groupScore.addChild(txtScore);
    const txtYou = new PIXI.Text({text: 'You:', style});
    Utils.centralPivot(txtYou, 0);
    txtYou.position.set(50, 110);
    groupScore.addChild(txtYou);
    const txtOpponent = new PIXI.Text({text: 'Opponent:', style});
    Utils.centralPivot(txtOpponent, 0);
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
    const txtScoreYou = new PIXI.Text({text: this.score[0].toString(), style});
    Utils.centralPivot(txtScoreYou);
    txtScoreYou.position.set(170, 165);
    groupScore.addChild(txtScoreYou);
    const txtScoreOpponent = new PIXI.Text({text: this.score[1].toString(), style});
    Utils.centralPivot(txtScoreOpponent);
    txtScoreOpponent.position.set(170, 325);
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
    const txtHint = new PIXI.Text({text: 'Hint:', style});
    Utils.centralPivot(txtHint, 0);
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
    const txtAdvice = new PIXI.Text({text: 'Move your pieces onto the board', style});
    Utils.centralPivot(txtAdvice, 0);
    txtAdvice.position.set(0, 50);
    ret.addChild(txtAdvice);

    Utils.centralPivot(txtHint, 0);
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
    Utils.centralPivot(this.txtD, 0);
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
    this.mainContainer.addChild(this.groupPiecesHigh);

    for (let i = 0; i < 3; i++) {
      this.pieceSprites[i].scale.set(PIECE_SCALE);
      this.pieceSprites[i].position.set(width * 0.037 + i * 119, height * 0.52);
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

    this.dynamics.tmlShow = gsap.timeline({ onComplete: () => {
        Utils.destroyGsapTimeline(this.dynamics, 'tmlShow');

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
  }

  onUpdate(/*ticker: Ticker*/): void {
  }

  onDismiss(): void {
    for (const key of ['tmlShow', 'tmlTurn'])
      Utils.destroyGsapTimeline(this.dynamics, key);

    this.mainContainer.removeChildren();
    this.game.app.stage.removeChild(this.mainContainer);
  }

  handleResize(): void {
  }

  private newGame = () => {
    this.bNextIsPlayer = this.playerHasFirstMove;
    this.playerHasFirstMove = !this.playerHasFirstMove; // Next time switch turns

    // Animate the Turn text
    this.txtTurn.visible = true;
    this.txtTurn.text = this.bNextIsPlayer ? 'Your Turn' : "Opponent's Turn";
    Utils.centralPivot(this.txtTurn);

    this.txtTurn.alpha = 0;
    this.txtTurn.y += 20;
    this.txtTurn.scale.set(1);
    this.dynamics.tmlTurn = gsap.timeline({ onComplete: () => {
        Utils.destroyGsapTimeline(this.dynamics, 'tmlTurn');
      }})
      .to(this.txtTurn, { alpha: 1, duration: .45, ease: 'none' })
      .to(this.txtTurn, { y: '-=20', duration: .7, ease: 'power1.out' }, 0)
      .to(this.txtTurn.scale, { x: 1.1, y: 1.1, duration: .25, ease: 'power1.out' })
      .to(this.txtTurn.scale, { x: 1, y: 1, duration: .25, ease: 'power1.in' });
    this.dynamics.tmlTurn.timeScale(3);

    this.bNoMovement = true;
    this.timeStartGame = performance.now();
  };

  private onButQuitClick = () => {
    if (this.state === 'Playing') {
      console.log('Quit');
    }
  };
}

export default ScrGame;
