import * as PIXI from "pixi.js";
import { DropShadowFilter } from 'pixi-filters';
import { G_Fonts } from "./constants.ts";
import { TButtonWithShadow } from "./types.ts";


class Utils {
  static centralPivot = (obj: PIXI.Container, factorX: number = 0.5, factorY: number = 0.5): void => {
    obj.pivot.x = obj.width * factorX;
    obj.pivot.y = obj.height * factorY;
  };

  static isTouchDevice = (): boolean => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  static clamp = (val: number, min: number, max: number): number => Math.max(min, Math.min(max, val));

  static createButton = (tex: PIXI.Texture, { label = '', fontSize = 64, pivot = 0.5 }: {
    label?: string;
    fontSize?: number;
    pivot?: number | PIXI.Point;
  } = {}): TButtonWithShadow => {
    const btnContainer = new PIXI.Container();

    const buttonSprite = new PIXI.Sprite(tex);
    let text: PIXI.Text | null = null;
    btnContainer.addChild(buttonSprite);

    const shadow = new DropShadowFilter({
      blur: 2,           // blur strength (like CSS blur radius)
      color: 0x000000,   // shadow color
      alpha: .7,        // opacity
      offset: { x: 10, y: 10 },
    });

    const filters = [shadow as unknown as PIXI.Filter];
    buttonSprite.filters = filters;
    buttonSprite.interactive = true;
    buttonSprite.cursor = 'pointer';

    if (label) {
      const txtStyle = new PIXI.TextStyle({
        fill: 'white',
        fontFamily: G_Fonts.Gradzy,
        fontSize,
      });
      text = new PIXI.Text({ text: label, style: txtStyle, anchor: 0.5 });
      btnContainer.addChild(text);
      text.position.set(buttonSprite.width * 0.5, buttonSprite.height * 0.5);
    }

    const state = { disabled: false };
    const onDown = () => {
      if (state.disabled) return;
      buttonSprite.position.set(10, 10);
      if (text) text.position.set(buttonSprite.width * 0.5 + 10, buttonSprite.height * 0.5 + 10);
      buttonSprite.filters = [];
    };
    const onUp = () => {
      if (state.disabled) return;
      buttonSprite.position.set(0, 0);
      if (text) text.position.set(buttonSprite.width * 0.5, buttonSprite.height * 0.5);
      buttonSprite.filters = filters;
    };

    buttonSprite.on('mousedown', onDown);
    buttonSprite.on('touchstart', onDown);
    buttonSprite.on('mouseup', onUp);
    buttonSprite.on('touchend', onUp);
    buttonSprite.on('mouseupoutside', onUp);
    buttonSprite.on('touchendoutside', onUp);

    const thePivot = pivot instanceof PIXI.Point ? pivot : new PIXI.Point(pivot, pivot);
    Utils.centralPivot(btnContainer, thePivot.x, thePivot.y);

    return { container: btnContainer, button: buttonSprite, state };
  };

  static destroyGsapTimeline = (timelines: { [x: string]: gsap.core.Timeline; }, strTimeline: string) => {
    if (strTimeline in timelines) {
      timelines[strTimeline].kill();
      delete timelines[strTimeline];
    }
  };

  static assert(condition: boolean, message?: string): asserts condition {
    if (import.meta.env.VITE_ASSERT && !condition)
      throw new Error(message || 'Assertion failed');
  };
}


export default Utils;
