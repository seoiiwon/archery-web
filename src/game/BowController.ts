import { CONFIG } from "./config";
export class BowController {
  drawing = false;
  elapsed = 0;
  draw = 0;
  yaw = 0;
  pitch = 0;
  fatigue = 0;
  begin() {
    this.drawing = true;
    this.elapsed = 0;
    this.draw = 0;
  }
  cancel() {
    this.drawing = false;
    this.draw = 0;
    this.elapsed = 0;
    this.fatigue = 0;
  }
  update(dt: number) {
    if (!this.drawing) return;
    this.elapsed += dt;
    this.fatigue = Math.min(
      1,
      Math.max(
        0,
        (this.elapsed - CONFIG.bow.fatigueAfter) / CONFIG.bow.fatigueRamp,
      ),
    );
    this.draw =
      Math.min(1, this.elapsed / CONFIG.bow.drawSeconds) *
      (1 - this.fatigue * CONFIG.bow.maxFatigueLoss);
  }
  move(dx: number, dy: number, sensitivity = 1) {
    this.yaw = Math.max(
      -CONFIG.aim.yawLimit,
      Math.min(
        CONFIG.aim.yawLimit,
        this.yaw - dx * CONFIG.aim.sensitivity * sensitivity,
      ),
    );
    this.pitch = Math.max(
      -CONFIG.aim.pitchLimit,
      Math.min(
        CONFIG.aim.pitchLimit,
        this.pitch - dy * CONFIG.aim.sensitivity * sensitivity,
      ),
    );
  }
  sway(time: number) {
    const amount = CONFIG.aim.baseSway + this.fatigue * CONFIG.aim.fatigueSway;
    return {
      x: (Math.sin(time * 2.7) + 0.4 * Math.sin(time * 6.3)) * amount,
      y: (Math.cos(time * 2.2) + 0.3 * Math.cos(time * 5.4)) * amount,
    };
  }
  static energy(draw: number) {
    const q = Math.max(0, Math.min(1, draw));
    // Integral of F(q)=Fmax*(0.55q+0.45q²) across the draw length.
    return (
      CONFIG.bow.drawWeight *
      CONFIG.bow.maxDrawLength *
      (0.275 * q * q + 0.15 * q * q * q) *
      CONFIG.bow.efficiency
    );
  }
  static speed(draw: number) {
    return Math.sqrt((2 * BowController.energy(draw)) / CONFIG.arrow.mass);
  }
  get force() {
    return (
      CONFIG.bow.drawWeight * (0.55 * this.draw + 0.45 * this.draw * this.draw)
    );
  }
  release() {
    const draw = this.draw;
    this.cancel();
    return draw >= CONFIG.bow.minRelease
      ? { draw, speed: BowController.speed(draw) }
      : null;
  }
  resetAim() {
    this.yaw = 0;
    this.pitch = 0;
  }
}
