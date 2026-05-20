export const G_BaseSize = {
  Width: 1672,
  Height: 941,
} as const;

export const G_Fonts = {
  AstroSpace: 'Astro Space',
  Gradzy: 'Gradzy',
} as const;

export const G_Screens = {
  Loading: 0,
  Home: 1,
  Game: 2,
} as const;

export const G_Tex = {
  Atlas: 'Atlas',
  Background: 'background.png',
  PlayerPiece: 'player-piece.png',
  CpuPiece: 'cpu-piece.png',
  Pirate: 'pirate.png',
  Button: 'button.png',
  Music: 'music.png',
  Close: 'close.png',
  Miniature: 'miniature.png',
  Line: 'line.png',
  Empty: 'empty.png',
  Dialog: 'dialog.png',
} as const;

export const G_Sound = {
  BkMusic01: 'BackgroundMusic01',
  BkMusic02: 'BackgroundMusic02',
  ButtonClick: 'ButtonClick',
  PieceDrop: 'PieceDrop',
} as const;

export const G_Description = {
  text01: "Three Men's Morris is an abstract strategy game played on a three-by-three board, and is similar to tic-tac-toe.\n\n" +
    "The winner is the first player to align their three tokens on a line drawn on the board.",
  text02: 'The game consists of two phases:',
  text03: 'I. Phase: Placing Tokens',
  text04: 'The board starts empty. Players take turns placing their tokens on the board.',
  text05: 'II. Phase: Moving Tokens',
  text06: 'Once all pieces are placed, and there is no winner, players take turns moving one token to an adjacent empty linked position.'
} as const;
