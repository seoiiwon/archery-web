import "./style.css";
import { GameManager } from "./game/GameManager";
import { AudioManager } from "./game/AudioManager";
import { RangeRenderer } from "./render/RangeRenderer";
import { UIManager } from "./ui/UIManager";

const root = document.querySelector<HTMLElement>("#app")!;
const game = new GameManager(),
  audio = new AudioManager(),
  ui = new UIManager(root, game, audio);
let renderer: RangeRenderer;
try {
  renderer = new RangeRenderer(ui.canvas, game);
  ui.renderer = renderer;
} catch (error) {
  root.innerHTML =
    '<div style="padding:60px;max-width:640px;margin:auto"><h1>3D 경기장을 열 수 없습니다.</h1><p>WebGL을 지원하는 데스크톱 브라우저에서 하드웨어 가속을 켜고 다시 시도하세요.</p><button onclick="location.reload()">다시 시도</button></div>';
  throw error;
}
const canvas = ui.canvas;
let pointerId: number | null = null,
  lastX = 0,
  lastY = 0,
  usingLock = false;
canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || game.phase !== "ready" || game.paused) return;
  event.preventDefault();
  pointerId = event.pointerId;
  lastX = event.clientX;
  lastY = event.clientY;
  canvas.setPointerCapture(event.pointerId);
  canvas.focus({ preventScroll: true });
  void audio.start(game.weather.current);
  game.beginDraw();
  if (event.pointerType === "mouse" && canvas.requestPointerLock) {
    try {
      const request = canvas.requestPointerLock();
      request?.catch(() => {});
    } catch {
      /* Pointer capture remains available in embedded browsers. */
    }
  }
});
document.addEventListener("pointerlockchange", () => {
  const wasLocked = usingLock;
  usingLock = document.pointerLockElement === canvas;
  if (wasLocked && !usingLock && game.phase === "drawing") {
    game.cancelDraw();
    pointerId = null;
  }
});
canvas.addEventListener("pointermove", (event) => {
  const dx = usingLock ? event.movementX : event.clientX - lastX,
    dy = usingLock ? event.movementY : event.clientY - lastY;
  lastX = event.clientX;
  lastY = event.clientY;
  if (game.phase === "drawing") game.player.bow.move(dx, dy, ui.sensitivity);
});
// Toggle aiming is an accessible alternative to holding the mouse button.
document.addEventListener("keydown", (event) => {
  if (
    event.key.toLowerCase() !== "f" ||
    event.repeat ||
    game.paused ||
    event.target instanceof HTMLInputElement
  )
    return;
  event.preventDefault();
  if (game.phase === "ready") {
    void audio.start(game.weather.current);
    game.beginDraw();
  } else if (game.phase === "drawing") {
    game.release();
    if (document.pointerLockElement === canvas) document.exitPointerLock();
  }
});
const release = (event: PointerEvent) => {
  if (event.button !== 0 || game.phase !== "drawing") return;
  game.release();
  if (pointerId !== null && canvas.hasPointerCapture(pointerId))
    canvas.releasePointerCapture(pointerId);
  pointerId = null;
  if (document.pointerLockElement === canvas) document.exitPointerLock();
};
document.addEventListener("pointerup", release);
canvas.addEventListener("pointercancel", () => {
  game.cancelDraw();
  pointerId = null;
});
canvas.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  game.cancelDraw();
  if (document.pointerLockElement) document.exitPointerLock();
});
window.addEventListener("blur", () => {
  game.cancelDraw();
  if (document.pointerLockElement) document.exitPointerLock();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    game.cancelDraw();
    audio.cancelDraw();
  }
});
game.addEventListener("draw", () => audio.draw());
game.addEventListener("cancel", () => audio.cancelDraw());
game.addEventListener("release", () => audio.release());
game.addEventListener("impact", () => audio.impact(game.lastImpact!.score));
let previous = performance.now(),
  ready = false;
renderer.renderer.setAnimationLoop((now) => {
  const dt = Math.min(0.05, (now - previous) / 1000);
  previous = now;
  if (!document.hidden) {
    game.update(dt);
    renderer.render(dt);
    ui.update(dt);
    audio.update(
      game.time,
      game.wind.sample(game.time).length(),
      game.weather.current,
      game.paused,
    );
  }
  if (!ready) {
    ready = true;
    ui.ready();
  }
});
