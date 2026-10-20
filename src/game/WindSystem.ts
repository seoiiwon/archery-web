import { Vector3 } from "three";
import type { Weather } from "./WeatherSystem";
export class WindSystem {
  speed = 0;
  direction = 0;
  gusty = false;
  phase = 0;
  constructor(private random = Math.random) {}
  generate(weather: Weather) {
    this.speed =
      weather.minWind + this.random() * (weather.maxWind - weather.minWind);
    this.direction = this.random() * Math.PI * 2;
    this.gusty = this.random() < (weather.kind === "windy" ? 0.9 : 0.45);
    this.phase = this.random() * 100;
  }
  sample(time: number, height = 1.5): Vector3 {
    const gust = this.gusty
      ? 1 +
        0.29 * Math.sin(time * 1.1 + this.phase) +
        0.13 * Math.sin(time * 2.9 + this.phase)
      : 1 + 0.07 * Math.sin(time * 0.7 + this.phase);
    const shear = Math.max(
      0.6,
      Math.min(1.25, 1 + 0.07 * Math.log(Math.max(height, 0.1) / 1.5)),
    );
    const direction =
      this.direction + 0.06 * Math.sin(time * 0.45 + this.phase);
    return new Vector3(
      Math.cos(direction),
      0,
      Math.sin(direction),
    ).multiplyScalar(this.speed * gust * shear);
  }
}
