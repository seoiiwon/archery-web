export type WeatherKind =
  "clear" | "cloudy" | "rain" | "fog" | "windy" | "sunset";
export interface Weather {
  kind: WeatherKind;
  label: string;
  english: string;
  temperature: number;
  density: number;
  visibility: number;
  rain: number;
  minWind: number;
  maxWind: number;
  sky: string;
  fog: string;
  light: number;
}
export const WEATHERS: Weather[] = [
  {
    kind: "clear",
    label: "맑음",
    english: "Clear skies",
    temperature: 21,
    density: 1.2,
    visibility: 450,
    rain: 0,
    minWind: 0.6,
    maxWind: 3.0,
    sky: "#c5d9df",
    fog: "#cbd5ca",
    light: 2.5,
  },
  {
    kind: "cloudy",
    label: "흐림",
    english: "Overcast",
    temperature: 17,
    density: 1.24,
    visibility: 300,
    rain: 0,
    minWind: 1,
    maxWind: 4,
    sky: "#b7c3c4",
    fog: "#bec8c0",
    light: 1.2,
  },
  {
    kind: "rain",
    label: "비",
    english: "Passing rain",
    temperature: 15,
    density: 1.25,
    visibility: 155,
    rain: 1,
    minWind: 1.4,
    maxWind: 4.5,
    sky: "#899fa5",
    fog: "#99ada7",
    light: 0.9,
  },
  {
    kind: "fog",
    label: "안개",
    english: "Morning mist",
    temperature: 13,
    density: 1.26,
    visibility: 105,
    rain: 0,
    minWind: 0.3,
    maxWind: 1.6,
    sky: "#c3cfcc",
    fog: "#c3cfcc",
    light: 1.1,
  },
  {
    kind: "windy",
    label: "강풍",
    english: "Breezy afternoon",
    temperature: 19,
    density: 1.22,
    visibility: 380,
    rain: 0,
    minWind: 4.5,
    maxWind: 7.5,
    sky: "#bfd2d5",
    fog: "#c2cec0",
    light: 2.1,
  },
  {
    kind: "sunset",
    label: "석양",
    english: "Golden hour",
    temperature: 18,
    density: 1.23,
    visibility: 400,
    rain: 0,
    minWind: 0.4,
    maxWind: 2.8,
    sky: "#dfc9af",
    fog: "#d2c4a5",
    light: 2.1,
  },
];
export class WeatherSystem {
  current: Weather;
  constructor(random = Math.random) {
    const weights = [0, 0, 0, 1, 2, 3, 4, 5];
    this.current = {
      ...WEATHERS[weights[Math.floor(random() * weights.length)]],
    };
  }
}
