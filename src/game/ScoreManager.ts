import type { Impact } from "./TargetSystem";
import { CONFIG } from "./config";
export interface Shot {
  score: number;
  isX: boolean;
  x: number;
  y: number;
  flightTime: number;
  speed: number;
  draw: number;
  wind: number;
}
export interface PlayerScore {
  id: string;
  ends: Shot[][];
}
export class ScoreManager {
  readonly players = new Map<string, PlayerScore>();
  register(id: string) {
    if (!this.players.has(id))
      this.players.set(id, {
        id,
        ends: Array.from({ length: CONFIG.match.ends }, () => []),
      });
  }
  get(id: string) {
    const p = this.players.get(id);
    if (!p) throw new Error(`Unknown player ${id}`);
    return p;
  }
  record(id: string, end: number, impact: Impact, draw: number, wind: number) {
    const shots = this.get(id).ends[end];
    if (!shots || shots.length >= CONFIG.match.arrowsPerEnd)
      throw new Error("End is already complete");
    const shot: Shot = {
      score: impact.score,
      isX: impact.isX,
      x: impact.position.x,
      y: impact.position.y - CONFIG.target.centerHeight,
      flightTime: impact.flightTime,
      speed: impact.speed,
      draw,
      wind,
    };
    shots.push(shot);
    return shot;
  }
  total(id: string) {
    return this.get(id)
      .ends.flat()
      .reduce((sum, s) => sum + s.score, 0);
  }
  count(id: string) {
    return this.get(id).ends.flat().length;
  }
  reset() {
    for (const p of this.players.values())
      p.ends = Array.from({ length: CONFIG.match.ends }, () => []);
  }
}
