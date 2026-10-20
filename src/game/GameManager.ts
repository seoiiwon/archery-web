import { Vector3 } from "three";
import { CONFIG } from "./config";
import { Player } from "./Player";
import { ScoreManager } from "./ScoreManager";
import { WeatherSystem } from "./WeatherSystem";
import { WindSystem } from "./WindSystem";
import { ArrowPhysics, createArrow, type ArrowState } from "./ArrowPhysics";
import { BowController } from "./BowController";
import { TargetSystem, type Impact } from "./TargetSystem";
export type Phase =
  "ready" | "drawing" | "flight" | "impact" | "end" | "finished";
export class GameManager extends EventTarget {
  readonly players = new Map<string, Player>([
    ["p1", new Player("p1", "Player 01")],
  ]);
  readonly scores = new ScoreManager();
  activePlayerId = "p1";
  weather = new WeatherSystem();
  wind = new WindSystem();
  phase: Phase = "ready";
  end = 0;
  time = 0;
  arrow: ArrowState | null = null;
  lastImpact: Impact | null = null;
  paused = false;
  impactTimer = 0;
  accumulator = 0;
  releaseDraw = 0;
  releaseWind = 0;
  readonly sightPitch = ArrowPhysics.calibrate(BowController.speed(1));
  constructor() {
    super();
    this.scores.register("p1");
    this.wind.generate(this.weather.current);
  }
  get player() {
    return this.players.get(this.activePlayerId)!;
  }
  emit(name: string, detail?: unknown) {
    this.dispatchEvent(new CustomEvent(name, { detail }));
  }
  beginDraw() {
    if (this.paused || this.phase !== "ready") return;
    this.player.bow.begin();
    this.phase = "drawing";
    this.emit("draw");
  }
  cancelDraw() {
    if (this.phase === "drawing") {
      this.player.bow.cancel();
      this.phase = "ready";
      this.emit("cancel");
    }
  }
  release() {
    if (this.phase !== "drawing" || this.paused) return;
    const sway = this.player.bow.sway(this.time);
    const result = this.player.bow.release();
    if (!result) {
      this.phase = "ready";
      this.emit("cancel");
      return;
    }
    const yaw = this.player.bow.yaw + sway.x;
    const pitch = this.sightPitch + this.player.bow.pitch + sway.y;
    this.arrow = createArrow(
      new Vector3(0, CONFIG.aim.launchHeight, 0),
      new Vector3(
        -Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        -Math.cos(yaw) * Math.cos(pitch),
      ),
      result.speed,
    );
    this.releaseDraw = result.draw;
    this.releaseWind = this.wind.sample(this.time).length();
    this.accumulator = 0;
    this.phase = "flight";
    this.emit("release", this.arrow);
  }
  impact(impact: Impact) {
    if (!this.arrow || !this.arrow.alive || this.phase !== "flight") return;
    this.arrow.alive = false;
    this.arrow.position.copy(impact.position);
    this.lastImpact = impact;
    this.scores.record(
      this.activePlayerId,
      this.end,
      impact,
      this.releaseDraw,
      this.releaseWind,
    );
    this.phase = "impact";
    this.impactTimer = CONFIG.camera.shotDuration;
    this.emit("impact", impact);
  }
  update(dt: number) {
    if (this.paused) return;
    dt = Math.min(dt, CONFIG.physics.maxFrameDelta);
    this.time += dt;
    this.player.bow.update(dt);
    if (this.phase === "flight" && this.arrow) {
      this.accumulator += dt;
      while (this.accumulator >= CONFIG.physics.fixedStep && this.arrow.alive) {
        ArrowPhysics.step(
          this.arrow,
          CONFIG.physics.fixedStep,
          this.wind.sample(this.time - this.accumulator, this.arrow.position.y),
          this.weather.current.density,
        );
        const hit = TargetSystem.intersect(this.arrow);
        if (hit) this.impact(hit);
        else if (
          this.arrow.position.y <= 0 ||
          this.arrow.time > CONFIG.physics.maxFlightTime
        )
          this.impact(TargetSystem.miss(this.arrow));
        this.accumulator -= CONFIG.physics.fixedStep;
      }
    }
    if (this.phase === "impact") {
      this.impactTimer -= dt;
      if (this.impactTimer <= 0) {
        const shots = this.scores.get(this.activePlayerId).ends[this.end];
        this.phase =
          shots.length === CONFIG.match.arrowsPerEnd
            ? this.end === CONFIG.match.ends - 1
              ? "finished"
              : "end"
            : "ready";
        this.emit("phase", this.phase);
      }
    }
  }
  nextEnd() {
    if (this.phase !== "end") return;
    this.end++;
    this.phase = "ready";
    this.lastImpact = null;
    this.arrow = null;
    this.wind.generate(this.weather.current);
    this.emit("nextend");
  }
  restart() {
    this.player.bow.cancel();
    this.player.bow.resetAim();
    this.scores.reset();
    this.end = 0;
    this.time = 0;
    this.accumulator = 0;
    this.arrow = null;
    this.lastImpact = null;
    this.paused = false;
    this.phase = "ready";
    this.weather = new WeatherSystem();
    this.wind.generate(this.weather.current);
    this.emit("restart");
  }
}
