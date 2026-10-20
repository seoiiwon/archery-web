import * as THREE from "three";
import { CONFIG } from "../game/config";
import type { GameManager } from "../game/GameManager";
export class CameraController {
  readonly camera = new THREE.PerspectiveCamera(
    CONFIG.camera.idleFov,
    1,
    0.03,
    900,
  );
  recoil = 0;
  cinematic = true;
  private position = new THREE.Vector3();
  private look = new THREE.Vector3();
  private desiredLook = new THREE.Vector3();
  constructor() {
    this.camera.position.set(0, 1.65, 1.1);
    this.look.set(0, 1.3, -70);
  }
  update(game: GameManager, dt: number) {
    const bow = game.player.bow,
      sway = bow.sway(game.time);
    const aiming = game.phase === "drawing";
    this.recoil *= Math.exp(-dt * 12);
    const linePitch = Math.atan2(
      CONFIG.target.centerHeight - 1.65,
      CONFIG.match.distance + 1.1,
    );
    const pitch =
      linePitch + bow.pitch + (aiming ? sway.y : 0) + this.recoil * 0.025;
    const yaw = bow.yaw + (aiming ? sway.x : 0);
    this.position.set(0, 1.65, 1.1);
    this.desiredLook.set(
      -Math.sin(yaw) * 70,
      1.65 + Math.tan(pitch) * 70,
      1.1 - Math.cos(yaw) * 70,
    );
    let fov: number = aiming ? CONFIG.camera.aimFov : CONFIG.camera.idleFov;
    let speed = aiming ? 5 : 4;
    if (
      this.cinematic &&
      game.phase === "flight" &&
      game.arrow &&
      game.arrow.time > 0.16
    ) {
      const a = game.arrow;
      this.position.copy(a.position).add(new THREE.Vector3(1.2, 0.65, 3.8));
      this.desiredLook.copy(a.position).addScaledVector(a.velocity, 0.1);
      fov = 48;
      speed = 6;
    }
    if (
      game.phase === "impact" &&
      game.lastImpact?.onTarget &&
      this.cinematic
    ) {
      this.position.set(1.15, 1.8, -67.1);
      this.desiredLook.set(0, CONFIG.target.centerHeight, -70);
      fov = 37;
      speed = 5;
    }
    const blend = 1 - Math.exp(-dt * speed);
    this.camera.position.lerp(this.position, blend);
    this.look.lerp(this.desiredLook, blend);
    this.camera.lookAt(this.look);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, fov, blend);
    this.camera.updateProjectionMatrix();
  }
  reset() {
    this.camera.position.set(0, 1.65, 1.1);
    this.look.set(0, 1.3, -70);
    this.recoil = 0;
  }
}
