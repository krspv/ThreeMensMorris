interface CrazyGamesSDK {
  init(): Promise<void>;
  ad: {
    requestAd(type: 'midgame' | 'rewarded', callbacks?: {
      adStarted?: () => void;
      adFinished?: () => void;
      adError?: (error: unknown) => void;
    }): void;
  };
  game: {
    inviteLink(params?: Record<string, string>): string;
    gameplayStart(): void;
    gameplayStop(): void;
    loadingStart(): void;
    loadingStop(): void;
    happytime(): void;
  };
}

interface Window {
  CrazyGames?: {
    SDK: CrazyGamesSDK;
  };
}
