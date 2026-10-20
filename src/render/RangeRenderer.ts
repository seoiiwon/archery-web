import * as THREE from "three";
import { CONFIG } from "../game/config";
import type { GameManager } from "../game/GameManager";
import type { Impact } from "../game/TargetSystem";
import { buildScene, createArrowMesh } from "./SceneBuilder";
import { BowModel } from "./BowModel";
import { CameraController } from "./CameraController";
export class RangeRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly range = buildScene();
  readonly cameras = new CameraController();
  readonly bow = new BowModel();
  readonly bowScene = new THREE.Scene();
  readonly bowCamera = new THREE.PerspectiveCamera(48, 1, 0.01, 10);
  private flying: THREE.Group | null = null;
  private arrows: THREE.Group[] = [];
  private trail: THREE.Line;
  private trailPoints: THREE.Vector3[] = [];
  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly game: GameManager,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(
      Math.min(devicePixelRatio, CONFIG.visuals.maxPixelRatio),
    );
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.autoClear = false;
    this.bowScene.add(new THREE.HemisphereLight("#e5e8dc", "#4a5c41", 2.5));
    const light = new THREE.DirectionalLight("#ffecd1", 3);
    light.position.set(-3, 5, 3);
    this.bowScene.add(light, this.bow.group);
    this.range.setWeather(game.weather.current);
    this.trail = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({
        color: "#eee7ca",
        transparent: true,
        opacity: 0.33,
      }),
    );
    this.trail.frustumCulled = false;
    this.range.scene.add(this.trail);
    game.addEventListener("release", () => {
      this.flying = createArrowMesh();
      this.range.scene.add(this.flying);
      this.trailPoints = [];
      this.cameras.recoil = 1;
    });
    game.addEventListener("impact", (event) =>
      this.onImpact((event as CustomEvent<Impact>).detail),
    );
    game.addEventListener("nextend", () => this.clearArrows());
    game.addEventListener("restart", () => {
      this.clearArrows();
      this.range.setWeather(game.weather.current);
      this.cameras.reset();
    });
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement!);
    this.resize();
  }
  resize() {
    const { width, height } = this.canvas.getBoundingClientRect();
    this.renderer.setSize(width, height, false);
    this.cameras.camera.aspect = width / height;
    this.cameras.camera.updateProjectionMatrix();
    this.bowCamera.aspect = width / height;
    this.bowCamera.updateProjectionMatrix();
  }
  private clearArrows() {
    for (const a of this.arrows) {
      this.range.scene.remove(a);
      this.disposeArrow(a);
    }
    this.arrows = [];
    if (this.flying) {
      this.range.scene.remove(this.flying);
      this.disposeArrow(this.flying);
      this.flying = null;
    }
    this.trailPoints = [];
    this.trail.visible = false;
  }
  private disposeArrow(group: THREE.Group) {
    group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        materials.forEach((m) => m.dispose());
      }
    });
  }
  private onImpact(hit: Impact) {
    if (!this.flying) return;
    if (hit.onTarget) {
      this.flying.position
        .copy(hit.position)
        .addScaledVector(hit.velocity.clone().normalize(), hit.depth);
      this.flying.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, -1),
        hit.velocity.clone().normalize(),
      );
      this.arrows.push(this.flying);
    } else {
      this.range.scene.remove(this.flying);
      this.disposeArrow(this.flying);
    }
    this.flying = null;
    this.trail.visible = false;
  }
  render(dt: number) {
    const game = this.game;
    this.cameras.update(game, dt);
    const camera = this.cameras.camera;
    this.range.update(
      game.time,
      game.wind.sample(game.time),
      camera,
      game.paused ? 0 : dt,
    );
    if (this.flying && game.arrow) {
      this.flying.position.copy(game.arrow.position);
      this.flying.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, -1),
        game.arrow.velocity.clone().normalize(),
      );
      this.trailPoints.push(game.arrow.position.clone());
      if (this.trailPoints.length > 32) this.trailPoints.shift();
      this.trail.geometry.dispose();
      this.trail.geometry = new THREE.BufferGeometry().setFromPoints(
        this.trailPoints,
      );
      this.trail.visible = true;
    }
    this.renderer.clear();
    this.renderer.render(this.range.scene, camera);
    const showBow =
      (game.phase === "ready" || game.phase === "drawing") && !game.paused;
    if (showBow) {
      this.bow.update(
        game.player.bow.draw,
        game.time,
        this.cameras.recoil,
        true,
      );
      this.renderer.clearDepth();
      this.renderer.render(this.bowScene, this.bowCamera);
    }
  }
}
