// import { Slot, Move, GameState } from "./types.ts";


class Minimax {
  /*
  private gameState: GameState;

  public get move() { return this.gameState.move; }

  constructor(gameState: GameState) {
    this.gameState = new GameState(gameState.board);
  }

  private countEmptySlots = (): number => {
    let count = 0;
    for (let i = 0; i < 9; i++)
      if (this.gameState.board[i] === 'Empty')
        count++;
    return count;
  };

  private moveFromTo = (fromPos: number, toPos: number): GameState => {
    const ret = new GameState(this.gameState.board);
    const val: Slot = ret.getSlotIdx(fromPos);
    ret.setSlotIdx(fromPos, 'Empty');
    ret.setSlotIdx(toPos, val);
    ret.move = { type: 'Movement', from: fromPos, to: toPos };
    return ret;
  };

  private canMoveRight = (pos: number): boolean => (pos !== 2 && pos !== 5 && pos !== 8 && this.gameState.getSlotIdx(pos + 1) === 'Empty');
  private moveRight = (pos: number): GameState => this.moveFromTo(pos, pos + 1);
  private canMoveLeft = (pos: number): boolean => (pos !== 0 && pos !== 3 && pos !== 6 && this.gameState.getSlotIdx(pos - 1) === 'Empty');
  private moveLeft = (pos: number): GameState => this.moveFromTo(pos, pos - 1);
  private canMoveUp = (pos: number): boolean => (pos > 2 && this.gameState.getSlotIdx(pos - 3) === 'Empty');
  private moveUp = (pos: number): GameState  => this.moveFromTo(pos, pos - 3);
  private canMoveDown = (pos: number): boolean => (pos < 6 && this.gameState.getSlotIdx(pos + 3) === 'Empty');
  private moveDown = (pos: number): GameState  => this.moveFromTo(pos, pos + 3);
  private canMoveUL = (pos: number): boolean => ((pos === 4 || pos === 8) && this.gameState.getSlotIdx(pos - 4) === 'Empty');
  private moveUL = (pos: number): GameState  => this.moveFromTo(pos, pos - 4);
  private canMoveUR = (pos: number): boolean => ((pos === 4 || pos === 6) && this.gameState.getSlotIdx(pos - 2) === 'Empty');
  private moveUR = (pos: number): GameState  => this.moveFromTo(pos, pos - 2);
  private canMoveDL = (pos: number): boolean => ((pos === 2 || pos === 4) && this.gameState.getSlotIdx(pos + 2) === 'Empty');
  private moveDL = (pos: number): GameState  => this.moveFromTo(pos, pos + 2);
  private canMoveDR = (pos: number): boolean => ((pos === 0 || pos === 4) && this.gameState.getSlotIdx(pos + 4) === 'Empty');
  private moveDR = (pos: number): GameState  => this.moveFromTo(pos, pos + 4);

  public ponder(actor: 'Player' | 'Cpu'): GameState | GameState[] {
    const nEmptySlots = this.countEmptySlots();

    const nextStates: GameState[] = [];
    let gsWinner: GameState | null = null;

    if (nEmptySlots > 3) {
      for (let i = 0; i < 9; i++)
        if (this.gameState.getSlotIdx(i) === 'Empty') {
          const nextState = new GameState(this.gameState.board);
          nextState.setSlotIdx(i, actor);
          nextState.move = { type: 'Placement', from: -1, to: i };
          if (nEmptySlots < 6 && nextState.isWinner(actor)) {
            gsWinner = nextState;
            break;
          }
          nextStates.push(nextState);
        }
    } else {
      const tryMove = (canFn: (pos: number) => boolean, moveFn: (pos: number) => GameState, idx: number) => {
        if (canFn(idx)) {
          const next = moveFn(idx);
          if (next.isWinner(actor)) return next;
          nextStates.push(next);
        }
        return null;
      };

      for (let i = 0; i < 9; i++)
        if (this.gameState.getSlotIdx(i) === actor) {
          gsWinner = tryMove(this.canMoveRight, this.moveRight, i)
            ?? tryMove(this.canMoveLeft, this.moveLeft, i)
            ?? tryMove(this.canMoveUp, this.moveUp, i)
            ?? tryMove(this.canMoveDown, this.moveDown, i)
            ?? tryMove(this.canMoveUL, this.moveUL, i)
            ?? tryMove(this.canMoveUR, this.moveUR, i)
            ?? tryMove(this.canMoveDL, this.moveDL, i)
            ?? tryMove(this.canMoveDR, this.moveDR, i);
          if (gsWinner != null) break;
        }
    }

    return gsWinner ?? nextStates;
  }

  public think(depth: number): { move: Move, winner: Slot } {
    const ret = this.ponder('Cpu');
    if (ret instanceof GameState) return { move: ret.move!, winner: 'Cpu' };
    else {
      const valids = ret.reduce((acc: Minimax[], gs) => {
        const mm = new Minimax(gs);
        const retPL = mm.ponder('Player');
        if (!(retPL instanceof GameState))
          for (const nextGs of retPL) {
            const nextMM = new Minimax(nextGs);
            nextMM.gameState.move = gs.move;
            acc.push(nextMM);
          }
        return acc;
      }, []);

      if (valids.length === 0)
        return { move: ret[Math.floor(Math.random() * ret.length)].move!, winner: 'Player' }; // Random move cause player wins anyway

      if (depth === 0)
        return { move: valids[Math.floor(Math.random() * valids.length)].move!, winner: 'Empty' };

      const deeps = [];
      for (const mm of valids) {
        const deep = mm.think(depth - 1);
        if (deep.winner === 'Cpu')
          return deep;
        else if (deep.winner === 'Empty') {
          const item = deeps.find(item => item.winner === 'Empty' && item.move.type === deep.move.type && item.move.from === deep.move.from && item.move.to === deep.move.to);
          if (item == null)
            deeps.push(deep);
        }
      }

      return deeps[Math.floor(Math.random() * deeps.length)];
    }
  }
*/
}


export default Minimax;
