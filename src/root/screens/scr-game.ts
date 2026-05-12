import { IGame, IGameScreen } from "../types.ts";

class ScrGame implements IGameScreen {
  game: IGame;

  constructor(game: IGame) {
    this.game = game;
  }

  onStage(): void {
  }

  onUpdate(/*ticker: Ticker*/): void {
  }

  onDismiss(): void {
  }

  handleResize(): void {
  }
}

export default ScrGame;
