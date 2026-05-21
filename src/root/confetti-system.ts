import * as PIXI from "pixi.js";
import { IGame } from "./types.ts";
import { G_BaseSize } from "./constants.ts";
import Utils from "./utils.ts";


const Tints = ['0xFF0000', '0x00FF00', '0x0000FF', '0xFF00FF', '0xFFFF00', '0xFF8800', '0x00FFFF'];
const TotalConfetti = 300;

class ConfettiParticle {
  public readonly particle: PIXI.Particle;
  public wobble: number;
  public readonly wobbleFactor: number;
  public tilt: number;
  public readonly tiltFactor: number;
  public readonly accel: PIXI.Point;
  public readonly vel: PIXI.Point;
  public readonly alphaFactor: number;

  constructor(tex: PIXI.Texture, bLeft: boolean) {
    this.particle = new PIXI.Particle({
      texture: tex,
      x: (bLeft ? -30 : G_BaseSize.Width + 30) + 60 * (Math.random() - 0.5),
      y: G_BaseSize.Height * 0.8 + 60 * (Math.random() - 0.5),
      tint: Utils.randomFrom(Tints),
      alpha: 1,
      rotation: Math.random() * Math.PI * 2,
      scaleX: .5 + .5 * Math.random(),
      scaleY: .5 + .5 * Math.random(),
    });
    this.wobble = Math.random() * 0.05;
    this.wobbleFactor = 0.008 + 0.004 * Math.random();
    this.tilt = Math.random() * 0.05;
    this.tiltFactor = Math.random() * 0.05;
    this.vel = new PIXI.Point(1.1 + 3.6*Math.random(), 3.5 + 2.5*Math.random());
    this.accel = new PIXI.Point(0.01, 0.02);
    this.alphaFactor = 0.00015 + 0.00043 * Math.random();
  };
}

class ConfettiSystem {
  private readonly groupConfetti: PIXI.ParticleContainer;
  private readonly texConfetti: PIXI.Texture;
  private readonly particles: ConfettiParticle[] = [];

  public get group() { return this.groupConfetti; }

  constructor(game: IGame) {
    const tempGraphics = new PIXI.Graphics();
    const skew = 5, w = 12, h = 8;
    tempGraphics
      .poly([
        skew, 0,
        w + skew, 0,
        w, h,
        0, h
      ])
      .fill(0xFFFFFF);
    this.texConfetti = game.app.renderer.generateTexture(tempGraphics);
    tempGraphics.destroy();

    this.groupConfetti = new PIXI.ParticleContainer({
      dynamicProperties: {
        position: true,
        rotation: true,
        scale: true,
        alpha: true,
        vertex: false,
        uvs: false,
        tint: false,
      },
    });
  }

  public fire = () => {
    this.groupConfetti.removeParticles();

    this.particles.length = 0;
    for (let i = 0; i < TotalConfetti; i++) {
      const cp = new ConfettiParticle(this.texConfetti, i < TotalConfetti / 2);
      this.particles.push(cp);
      this.groupConfetti.addParticle(cp.particle);
    }
  };

  public update = (ticker: PIXI.Ticker) => {
    if (this.particles.length === 0) return;

    let bAllAlphasZero = true;
    this.particles.forEach((particle, idx) => {
      const bLeft = idx < TotalConfetti / 2;
      if (particle.particle.alpha > 0) {
        bAllAlphasZero = false;
        particle.wobble += particle.wobbleFactor * ticker.elapsedMS;
        particle.tilt += particle.tiltFactor * ticker.elapsedMS;
        if (particle.wobble > Math.PI * 2) particle.wobble -= Math.PI * 2;
        if (particle.tilt > Math.PI * 2) particle.tilt -= Math.PI * 2;

        particle.particle.rotation += Math.sin(particle.tilt) * 0.15;
        particle.particle.scaleY = Math.cos(particle.wobble);
        particle.particle.scaleX = 0.7 + 0.3 * Math.abs(Math.sin(particle.wobble));
        const deltaX = particle.vel.x * ticker.elapsedMS * (bLeft ? 1 : -1);
        particle.particle.x += deltaX;
        particle.particle.y -= particle.vel.y * ticker.elapsedMS;
        if (particle.vel.x > 0) {
          particle.vel.x -= particle.accel.x * ticker.elapsedMS;
          particle.vel.x = Math.max(particle.vel.x, 0.025);
        }
        particle.vel.y -= particle.accel.y * ticker.elapsedMS;
        if (particle.particle.y > G_BaseSize.Height + 15)
          particle.particle.alpha = 0;
        else if (particle.vel.y < 0) {
          particle.particle.alpha = Utils.clamp(particle.particle.alpha - ticker.elapsedMS * particle.alphaFactor, 0, 1);
          particle.vel.y = Math.max(particle.vel.y, -.25);
        }
      }
    });
    if (bAllAlphasZero)
      this.destroy();
    else
      this.groupConfetti.update();
  };

  public destroy = () => {
    this.particles.length = 0;
    this.groupConfetti.removeParticles();
  };
}


export default ConfettiSystem;
