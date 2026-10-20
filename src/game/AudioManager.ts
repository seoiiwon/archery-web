import type { Weather } from "./WeatherSystem";
/** Entire soundscape is synthesized locally. No downloaded media or autoplay. */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private windGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private drawTone: OscillatorNode | null = null;
  private drawGain: GainNode | null = null;
  private flight: AudioBufferSourceNode | null = null;
  muted = false;
  volume = 0.45;
  private birdAt = 0;
  async start(weather: Weather) {
    if (this.ctx) {
      await this.ctx.resume();
      return;
    }
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.master.connect(ctx.destination);
    this.windGain = this.noiseLoop(320, "lowpass", 0.1);
    this.rainGain = this.noiseLoop(2300, "highpass", weather.rain * 0.07);
    await ctx.resume();
  }
  private noiseBuffer(seconds: number) {
    const ctx = this.ctx!;
    const b = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  private noiseLoop(frequency: number, type: BiquadFilterType, volume: number) {
    const ctx = this.ctx!;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer(3);
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(filter).connect(gain).connect(this.master!);
    source.start();
    return gain;
  }
  private tone(
    start: number,
    end: number,
    duration: number,
    volume: number,
    type: OscillatorType = "sine",
    delay = 0,
  ) {
    if (!this.ctx) return;
    const ctx = this.ctx,
      t = ctx.currentTime + delay;
    const osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(start, t);
    osc.frequency.exponentialRampToValueAtTime(end, t + duration);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(this.master!);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }
  draw() {
    if (!this.ctx) return;
    this.cancelDraw();
    const ctx = this.ctx;
    this.drawTone = ctx.createOscillator();
    this.drawTone.type = "triangle";
    this.drawTone.frequency.setValueAtTime(110, ctx.currentTime);
    this.drawTone.frequency.exponentialRampToValueAtTime(
      220,
      ctx.currentTime + 1.5,
    );
    this.drawGain = ctx.createGain();
    this.drawGain.gain.setValueAtTime(0.014, ctx.currentTime);
    this.drawGain.gain.exponentialRampToValueAtTime(
      0.002,
      ctx.currentTime + 1.6,
    );
    this.drawTone.connect(this.drawGain).connect(this.master!);
    this.drawTone.start();
  }
  cancelDraw() {
    if (this.drawTone) {
      this.drawTone.stop();
      this.drawTone.disconnect();
      this.drawGain?.disconnect();
      this.drawTone = null;
    }
  }
  release() {
    this.cancelDraw();
    this.tone(170, 43, 0.23, 0.34, "triangle");
    this.tone(630, 110, 0.08, 0.09, "sawtooth");
    if (!this.ctx) return;
    const ctx = this.ctx;
    this.flight = ctx.createBufferSource();
    this.flight.buffer = this.noiseBuffer(3);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1400;
    const gain = ctx.createGain();
    gain.gain.value = 0.035;
    this.flight.connect(filter).connect(gain).connect(this.master!);
    this.flight.start();
  }
  impact(score: number) {
    this.flight?.stop();
    this.flight = null;
    this.tone(100, 38, 0.18, 0.32, "triangle");
    this.tone(350, 70, 0.08, 0.1, "sawtooth");
    if (score === 10) {
      this.tone(660, 660, 0.4, 0.035, "sine", 0.12);
      this.tone(880, 880, 0.5, 0.024, "sine", 0.24);
    }
  }
  update(time: number, wind: number, weather: Weather, paused: boolean) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.windGain?.gain.setTargetAtTime(
      paused ? 0.015 : 0.04 + wind * 0.018,
      t,
      0.5,
    );
    this.rainGain?.gain.setTargetAtTime(
      weather.rain * (paused ? 0.01 : 0.1),
      t,
      0.6,
    );
    if (time > this.birdAt && !paused && weather.kind !== "rain") {
      this.birdAt = time + 12 + Math.random() * 20;
      this.tone(2200, 3100, 0.12, 0.008);
      this.tone(2700, 2200, 0.14, 0.006, "sine", 0.18);
    }
  }
  setVolume(volume: number) {
    this.volume = volume;
    this.apply();
  }
  toggle() {
    this.muted = !this.muted;
    this.apply();
    return this.muted;
  }
  private apply() {
    if (this.ctx && this.master)
      this.master.gain.setTargetAtTime(
        this.muted ? 0 : this.volume,
        this.ctx.currentTime,
        0.06,
      );
  }
}
