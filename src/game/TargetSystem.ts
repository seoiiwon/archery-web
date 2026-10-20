import { Vector3 } from "three";
import { CONFIG } from "./config";
import type { ArrowState } from "./ArrowPhysics";
export interface Impact {
  position: Vector3;
  velocity: Vector3;
  score: number;
  isX: boolean;
  onTarget: boolean;
  radius: number;
  flightTime: number;
  speed: number;
  depth: number;
}
export class TargetSystem {
  static score(x: number, y: number) {
    const radius = Math.hypot(x, y);
    // The shaft's edge touching a boundary receives the higher value.
    const edge = Math.max(0, radius - CONFIG.arrow.radius);
    const score =
      edge > CONFIG.target.radius + 1e-10
        ? 0
        : Math.max(
            1,
            Math.min(
              10,
              11 - Math.ceil((edge - 1e-10) / (CONFIG.target.radius / 10)),
            ),
          );
    return { score, isX: edge <= CONFIG.target.xRadius + 1e-10, radius };
  }
  static intersect(a: ArrowState): Impact | null {
    if (
      a.previous.z > -CONFIG.match.distance &&
      a.position.z <= -CONFIG.match.distance
    ) {
      const t =
        (-CONFIG.match.distance - a.previous.z) / (a.position.z - a.previous.z);
      const p = a.previous.clone().lerp(a.position, t);
      const scored = this.score(p.x, p.y - CONFIG.target.centerHeight);
      return {
        position: p,
        velocity: a.velocity.clone(),
        ...scored,
        onTarget: scored.radius <= CONFIG.target.backingRadius,
        flightTime: a.time - CONFIG.physics.fixedStep * (1 - t),
        speed: a.velocity.length(),
        depth: Math.min(0.21, 0.08 + a.velocity.length() * 0.0018),
      };
    }
    return null;
  }
  static miss(a: ArrowState): Impact {
    return {
      position: a.position.clone(),
      velocity: a.velocity.clone(),
      score: 0,
      isX: false,
      onTarget: false,
      radius: Infinity,
      flightTime: a.time,
      speed: a.velocity.length(),
      depth: 0,
    };
  }
}
