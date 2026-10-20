import { Vector3 } from "three";
import { CONFIG } from "./config";
export interface ArrowState {
  position: Vector3;
  previous: Vector3;
  velocity: Vector3;
  time: number;
  alive: boolean;
}
export function createArrow(
  position: Vector3,
  direction: Vector3,
  speed: number,
): ArrowState {
  return {
    position: position.clone(),
    previous: position.clone(),
    velocity: direction.clone().normalize().multiplyScalar(speed),
    time: 0,
    alive: true,
  };
}
export class ArrowPhysics {
  static acceleration(velocity: Vector3, wind: Vector3, density: number) {
    const speed = velocity.length();
    const forward = velocity.clone().normalize();
    const relative = velocity.clone().sub(wind);
    const axial = relative.dot(forward);
    const lateral = relative.clone().addScaledVector(forward, -axial);
    const drag = forward.multiplyScalar(
      (-0.5 *
        density *
        CONFIG.arrow.axialCd *
        CONFIG.arrow.axialArea *
        axial *
        Math.abs(axial)) /
        CONFIG.arrow.mass,
    );
    drag.addScaledVector(
      lateral,
      (-0.5 * density * CONFIG.arrow.sideCd * CONFIG.arrow.sideArea * speed) /
        CONFIG.arrow.mass,
    );
    drag.y -= CONFIG.physics.gravity;
    return drag;
  }
  static step(arrow: ArrowState, dt: number, wind: Vector3, density: number) {
    if (!arrow.alive) return;
    arrow.previous.copy(arrow.position);
    // Midpoint integration, fixed at 240 Hz by GameManager.
    const a = this.acceleration(arrow.velocity, wind, density);
    const midVelocity = arrow.velocity.clone().addScaledVector(a, dt * 0.5);
    arrow.position.addScaledVector(midVelocity, dt);
    arrow.velocity.addScaledVector(
      this.acceleration(midVelocity, wind, density),
      dt,
    );
    arrow.time += dt;
  }
  /** Calibrate the sight in still air at full draw; weather and wind are never compensated. */
  static calibrate(speed: number) {
    let low = 0,
      high = 0.4;
    for (let iteration = 0; iteration < 28; iteration++) {
      const pitch = (low + high) / 2;
      const a = createArrow(
        new Vector3(0, CONFIG.aim.launchHeight, 0),
        new Vector3(0, Math.sin(pitch), -Math.cos(pitch)),
        speed,
      );
      while (a.position.z > -CONFIG.match.distance && a.time < 5)
        this.step(
          a,
          CONFIG.physics.fixedStep,
          new Vector3(),
          CONFIG.physics.airDensity,
        );
      const t =
        (-CONFIG.match.distance - a.previous.z) / (a.position.z - a.previous.z);
      const y = a.previous.y + (a.position.y - a.previous.y) * t;
      if (y > CONFIG.target.centerHeight) high = pitch;
      else low = pitch;
    }
    return (low + high) / 2;
  }
}
