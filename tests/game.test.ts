import { test } from "node:test";
import assert from "node:assert/strict";
import { Vector3 } from "three";
import { CONFIG } from "../src/game/config.ts";
import { TargetSystem } from "../src/game/TargetSystem.ts";
import { BowController } from "../src/game/BowController.ts";
import { ArrowPhysics, createArrow } from "../src/game/ArrowPhysics.ts";
import { GameManager } from "../src/game/GameManager.ts";
import { WeatherSystem, WEATHERS } from "../src/game/WeatherSystem.ts";
import { WindSystem } from "../src/game/WindSystem.ts";

test("target ring boundaries use the shaft edge, including outside 1-ring", () => {
  assert.equal(TargetSystem.score(0, 0).score, 10);
  assert.equal(TargetSystem.score(0.0305 + 0.003, 0).isX, true);
  for (let ring = 1; ring <= 10; ring++) {
    const radius = 0.061 * ring + 0.003;
    assert.equal(TargetSystem.score(radius, 0).score, 11 - ring);
    assert.equal(
      TargetSystem.score(radius + 0.00001, 0).score,
      Math.max(0, 10 - ring),
    );
  }
  assert.equal(TargetSystem.score(0.8, 0).score, 0);
});
test("draw energy is monotonic, finite and fatigue reduces performance", () => {
  let previous = 0;
  for (let d = 0; d <= 1; d += 0.05) {
    const speed = BowController.speed(d);
    assert.ok(speed >= previous);
    previous = speed;
  }
  assert.ok(BowController.speed(1) > 55 && BowController.speed(1) < 70);
  const b = new BowController();
  b.begin();
  b.update(1.45);
  assert.equal(b.draw, 1);
  b.update(10);
  assert.ok(b.draw < 1);
  assert.ok(b.fatigue > 0);
  assert.ok(b.release());
  b.begin();
  b.update(0.05);
  assert.equal(b.release(), null);
});
function fly(
  wind = new Vector3(),
  pitch = ArrowPhysics.calibrate(BowController.speed(1)),
  step: number = CONFIG.physics.fixedStep,
) {
  const a = createArrow(
    new Vector3(0, CONFIG.aim.launchHeight, 0),
    new Vector3(0, Math.sin(pitch), -Math.cos(pitch)),
    BowController.speed(1),
  );
  for (let i = 0; i < 2000; i++) {
    ArrowPhysics.step(a, step, wind, CONFIG.physics.airDensity);
    const impact = TargetSystem.intersect(a);
    if (impact) return impact;
  }
  throw new Error("No impact");
}
test("calibrated still-air shot reaches 70m gold; wind produces real lateral displacement", () => {
  const calm = fly();
  assert.equal(calm.score, 10);
  assert.ok(Math.abs(calm.position.y - CONFIG.target.centerHeight) < 0.002);
  assert.ok(calm.flightTime > 1);
  assert.ok(calm.speed < BowController.speed(1));
  const right = fly(new Vector3(4, 0, 0));
  const left = fly(new Vector3(-4, 0, 0));
  assert.ok(right.position.x > 0.25);
  assert.ok(left.position.x < -0.25);
  assert.ok(Math.abs(right.position.x + left.position.x) < 0.001);
});
test("continuous intersection detects hits even when a step crosses the face", () => {
  const a = createArrow(new Vector3(0, 1.3, -69), new Vector3(0, 0, -1), 60);
  a.previous.set(0, 1.3, -69);
  a.position.set(0, 1.3, -71);
  const hit = TargetSystem.intersect(a);
  assert.ok(hit);
  assert.equal(hit.position.z, -70);
  assert.equal(hit.score, 10);
});
test("gravity acts in vacuum and finer integration converges", () => {
  const a = createArrow(new Vector3(0, 10, 0), new Vector3(0, 0, -1), 30);
  for (let i = 0; i < 240; i++) ArrowPhysics.step(a, 1 / 240, new Vector3(), 0);
  assert.ok(Math.abs(a.position.y - (10 - CONFIG.physics.gravity / 2)) < 1e-8);
  const coarse = fly();
  const fine = fly(new Vector3(), undefined, 1 / 480);
  assert.ok(coarse.position.distanceTo(fine.position) < 0.002);
});
test("weather supports at least four physical environments and wind changes with time", () => {
  assert.ok(WEATHERS.length >= 4);
  for (const weather of WEATHERS) {
    const wind = new WindSystem(() => 0.7);
    wind.generate(weather);
    assert.ok(wind.speed >= weather.minWind && wind.speed <= weather.maxWind);
    assert.notEqual(wind.sample(0).x, wind.sample(5).x);
  }
  assert.ok(new WeatherSystem(() => 0).current);
});
test("72-shot match advances 12 ends, reaches 720, and restarts cleanly", () => {
  const g = new GameManager();
  const center = fly();
  for (let e = 0; e < 12; e++) {
    for (let shot = 0; shot < 6; shot++) {
      g.beginDraw();
      g.player.bow.update(1.5);
      g.release();
      assert.equal(g.phase, "flight");
      g.impact(center);
      for (let i = 0; i < 50; i++) g.update(0.05);
    }
    assert.equal(g.phase, e === 11 ? "finished" : "end");
    if (e < 11) g.nextEnd();
  }
  assert.equal(g.scores.total("p1"), 720);
  assert.equal(g.scores.count("p1"), 72);
  g.restart();
  assert.equal(g.phase, "ready");
  assert.equal(g.end, 0);
  assert.equal(g.scores.total("p1"), 0);
});
test("pause/cancel never consumes an arrow and player scores remain independent", () => {
  const g = new GameManager();
  g.beginDraw();
  g.update(0.05);
  g.cancelDraw();
  assert.equal(g.scores.count("p1"), 0);
  g.paused = true;
  g.beginDraw();
  assert.equal(g.phase, "ready");
  g.scores.register("p2");
  g.scores.record("p2", 0, fly(), 1, 0);
  assert.equal(g.scores.total("p1"), 0);
  assert.equal(g.scores.total("p2"), 10);
});
test("live simulation resolves a shot once and respects a paused match", () => {
  const g = new GameManager();
  g.wind.speed = 0;
  g.weather.current.density = CONFIG.physics.airDensity;
  g.beginDraw();
  g.player.bow.update(1.5);
  g.release();
  g.paused = true;
  const before = g.arrow!.position.clone();
  g.update(0.05);
  assert.ok(before.equals(g.arrow!.position));
  g.paused = false;
  for (let i = 0; i < 100 && g.phase === "flight"; i++) g.update(0.02);
  assert.equal(g.phase, "impact");
  assert.ok(g.lastImpact!.score >= 9);
  assert.equal(g.scores.count("p1"), 1);
  g.impact(g.lastImpact!);
  assert.equal(g.scores.count("p1"), 1);
});
