import Utils from './utils.ts';


type Slot = 'Empty' | 'Player' | 'Cpu';
type Move = { type: 'Placement' | 'Movement', from: number, to: number, evaluation: number }


class GameState {
  public board: Slot[];
  public move: Move | null = null;

  private readonly winningPositions: number[][] = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  constructor(board: Slot[] = ['Empty', 'Empty', 'Empty', 'Empty', 'Empty', 'Empty', 'Empty', 'Empty', 'Empty'] ) {
    this.board = [...board];
  }

  public reset(): void {
    this.board = ['Empty', 'Empty', 'Empty', 'Empty', 'Empty', 'Empty', 'Empty', 'Empty', 'Empty'];
  };

  public cloneMove(): Move {
    return {
      type: this.move!.type,
      from: this.move!.from,
      to: this.move!.to,
      evaluation: this.move!.evaluation,
    };
  };

  public getSlot = (row: number, col: number): Slot => this.board[3*row + col];
  public getSlotIdx = (index: number): Slot => this.board[index];
  public setSlot = (row: number, col: number, value: Slot): void => { this.board[3*row + col] = value; };
  public setSlotIdx = (index: number, value: Slot): void => { this.board[index] = value; };

  public isWinner = (val: Slot): boolean => this.winningPositions.some(pos => pos.every(idx => this.board[idx] === val));
  public getWinnerPositions = (val: Slot): number[] | undefined => this.winningPositions.find(pos => pos.every(idx => this.board[idx] === val));

  public get emptySlotCount(): number {
    return this.board.reduce((acc: number, cur: Slot) => cur === 'Empty' ? acc + 1 : acc, 0);
  };

  private moveFromTo = (fromPos: number, toPos: number): number => {
    this.board[toPos] = this.board[fromPos];
    this.board[fromPos] = 'Empty';
    return toPos;
  };
  private canMoveRight = (pos: number): boolean => (pos !== 2 && pos !== 5 && pos !== 8 && this.getSlotIdx(pos + 1) === 'Empty');
  private moveRight = (pos: number): number => this.moveFromTo(pos, pos + 1);
  private canMoveLeft = (pos: number): boolean => (pos !== 0 && pos !== 3 && pos !== 6 && this.getSlotIdx(pos - 1) === 'Empty');
  private moveLeft = (pos: number): number => this.moveFromTo(pos, pos - 1);
  private canMoveUp = (pos: number): boolean => (pos > 2 && this.getSlotIdx(pos - 3) === 'Empty');
  private moveUp = (pos: number): number => this.moveFromTo(pos, pos - 3);
  private canMoveDown = (pos: number): boolean => (pos < 6 && this.getSlotIdx(pos + 3) === 'Empty');
  private moveDown = (pos: number): number => this.moveFromTo(pos, pos + 3);
  private canMoveUL = (pos: number): boolean => ((pos === 4 || pos === 8) && this.getSlotIdx(pos - 4) === 'Empty');
  private moveUL = (pos: number): number => this.moveFromTo(pos, pos - 4);
  private canMoveUR = (pos: number): boolean => ((pos === 4 || pos === 6) && this.getSlotIdx(pos - 2) === 'Empty');
  private moveUR = (pos: number): number => this.moveFromTo(pos, pos - 2);
  private canMoveDL = (pos: number): boolean => ((pos === 2 || pos === 4) && this.getSlotIdx(pos + 2) === 'Empty');
  private moveDL = (pos: number): number => this.moveFromTo(pos, pos + 2);
  private canMoveDR = (pos: number): boolean => ((pos === 0 || pos === 4) && this.getSlotIdx(pos + 4) === 'Empty');
  private moveDR = (pos: number): number => this.moveFromTo(pos, pos + 4);

  private children = (actor: 'Player' | 'Cpu'): GameState[] => {
    const nEmptySlotCount = this.emptySlotCount;

    let ret: GameState[] = [];

    if (nEmptySlotCount > 3) {
      // Placement
      for (let i = 0; i < 9; ++i)
        if (this.getSlotIdx(i) === 'Empty' && (i !== 4 || nEmptySlotCount < 9)) { // Cannot place a piece in the center slot if the board is empty
          const nextState = new GameState(this.board);
          nextState.setSlotIdx(i, actor);
          nextState.move = {
            type: 'Placement',
            from: -1,
            to: i,
            evaluation: nextState.isWinner(actor) ? (actor === 'Cpu' ? 1 : -1) : 0,
          };
          ret.push(nextState);
        }
    } else {
      const tryNextState = (canFn: (pos: number) => boolean, moveFn: (state: GameState) => (pos: number) => number, idx: number): void => {
        if ((this.board[idx] === actor) && canFn(idx)) {
          const nextState = new GameState(this.board);
          nextState.move = {
            type: 'Movement',
            from: idx,
            to: moveFn(nextState)(idx),
            evaluation: nextState.isWinner(actor) ? (actor === 'Cpu' ? 1 : -1) : 0,
          };
          ret.push(nextState);
        }
      };

      // Movement
      for (let i = 0; i < 9; ++i) {
        tryNextState(this.canMoveRight, s => s.moveRight, i);
        tryNextState(this.canMoveLeft, s => s.moveLeft, i);
        tryNextState(this.canMoveUp, s => s.moveUp, i);
        tryNextState(this.canMoveDown, s => s.moveDown, i);
        tryNextState(this.canMoveUL, s => s.moveUL, i);
        tryNextState(this.canMoveUR, s => s.moveUR, i);
        tryNextState(this.canMoveDL, s => s.moveDL, i);
        tryNextState(this.canMoveDR, s => s.moveDR, i);
      }
    }

    ret.sort((lhs, rhs) => {
      if (lhs.move!.evaluation > rhs.move!.evaluation)
        return actor == 'Cpu' ? -1 : 1;
      else if (lhs.move!.evaluation < rhs.move!.evaluation)
        return actor == 'Cpu' ? 1 : -1;
      return 0;
    });

    const theEval = ret[0].move!.evaluation;
    if (theEval !== 0) {
      ret = ret.reduce((acc: GameState[], cur) => {
        if (cur.move!.evaluation === theEval)
          acc.push(cur);
        return acc;
      }, []);
    }

    Utils.shuffle(ret); // Randomize same-value moves

    if (import.meta.env.VITE_PRINT_MINIMAX_CHILDREN === 'true') {
      const str = ret.reduce((acc: string, cur) => {
        acc += cur.move!.evaluation > 0 ? 'C' : (cur.move!.evaluation < 0 ? 'P' : '-');
        return acc;
      }, (actor === 'Cpu' ? 'C:' : 'P:'));
      console.log(str);
    }

    return ret;
  };

  public miniMax(depth: number, alpha: number, beta: number, actor: 'Player' | 'Cpu'):Move {
    if ((depth === 0) || ((this.move != null) && (this.move.evaluation !== 0)))
      return this.move!;

    if (actor === 'Cpu') { // Maximizing player
      let maxEval: Move = { type: 'Placement', from: -1, to: -1, evaluation: -99 };
      const children = this.children(actor);
      for (const child of children) {
        const sub = child.miniMax(depth - 1, alpha, beta, 'Player');
        if (maxEval.evaluation < sub.evaluation) {
          maxEval = { ...child.move!, evaluation: sub.evaluation };
          alpha = Math.max(maxEval.evaluation, alpha);
          if (beta <= alpha)
            break;
        }
      }
      return maxEval;
    } else { // Minimizing player
      let minEval: Move = { type: 'Placement', from: -1, to: -1, evaluation: +99 };
      const children = this.children(actor);
      for (const child of children) {
        const sub = child.miniMax(depth - 1, alpha, beta, 'Cpu');
        if (minEval.evaluation > sub.evaluation) {
          minEval = { ...child.move!, evaluation: sub.evaluation };
          beta = Math.min(minEval.evaluation, beta);
          if (beta <= alpha)
            break;
        }
      }
      return minEval;
    }
  };
};


export type { Slot, Move };
export default GameState;
