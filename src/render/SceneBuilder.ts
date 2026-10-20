import * as THREE from "three";
import { CONFIG } from "../game/config";
import type { Weather } from "../game/WeatherSystem";

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
const random = rng(3207);
const mat = (color: THREE.ColorRepresentation, roughness = 0.9) =>
  new THREE.MeshStandardMaterial({ color, roughness });
function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function bar(
  a: THREE.Vector3,
  b: THREE.Vector3,
  radius: number,
  material: THREE.Material,
) {
  const m = mesh(
    new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 8),
    material,
  );
  m.position.copy(a).lerp(b, 0.5);
  m.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    b.clone().sub(a).normalize(),
  );
  return m;
}
export function targetCanvas(size = 1024) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const colors = [
    "#f7f4e7",
    "#f7f4e7",
    "#262a28",
    "#262a28",
    "#489ccc",
    "#489ccc",
    "#e84e43",
    "#e84e43",
    "#f6ca4a",
    "#f6ca4a",
  ];
  for (let ring = 10; ring >= 1; ring--) {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, ((size / 2 - 3) * ring) / 10, 0, Math.PI * 2);
    ctx.fillStyle = colors[10 - ring];
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = ring === 7 || ring === 8 ? "#999d94" : "#424c42";
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, (size / 2 - 3) / 20, 0, Math.PI * 2);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#89772f";
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(size / 2 - 4, size / 2);
  ctx.lineTo(size / 2 + 4, size / 2);
  ctx.moveTo(size / 2, size / 2 - 4);
  ctx.lineTo(size / 2, size / 2 + 4);
  ctx.stroke();
  return c;
}
export interface RangeScene {
  scene: THREE.Scene;
  sun: THREE.DirectionalLight;
  ambient: THREE.HemisphereLight;
  sky: THREE.Mesh;
  flags: THREE.Mesh[];
  grassMaterial: THREE.MeshStandardMaterial;
  rain: THREE.LineSegments;
  rainPositions: Float32Array;
  setWeather: (weather: Weather) => void;
  update: (
    time: number,
    wind: THREE.Vector3,
    camera: THREE.Camera,
    dt: number,
  ) => void;
}
export function buildScene(): RangeScene {
  const scene = new THREE.Scene();
  const ambient = new THREE.HemisphereLight("#d9e5e5", "#647149", 2.2);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight("#fff3ce", 2.5);
  sun.position.set(-45, 65, -30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -65,
    right: 65,
    top: 65,
    bottom: -65,
    near: 1,
    far: 190,
  });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.06;
  sun.target.position.set(0, 0, -35);
  scene.add(sun, sun.target);
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color("#81adc1") },
      bottom: { value: new THREE.Color("#e9eadd") },
    },
    vertexShader:
      "varying vec3 vPos; void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader:
      "varying vec3 vPos; uniform vec3 top; uniform vec3 bottom; void main(){float h=normalize(vPos).y;gl_FragColor=vec4(mix(bottom,top,smoothstep(-0.03,0.65,h)),1.);}",
  });
  const sky = mesh(new THREE.SphereGeometry(700, 32, 16), skyMaterial);
  sky.castShadow = false;
  scene.add(sky);
  // A locally generated, repeating ground texture: no network assets required.
  const groundCanvas = document.createElement("canvas");
  groundCanvas.width = groundCanvas.height = 512;
  const gctx = groundCanvas.getContext("2d")!;
  gctx.fillStyle = "#657448";
  gctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 42000; i++) {
    gctx.fillStyle = `rgba(${70 + random() * 65},${85 + random() * 65},${35 + random() * 45},0.24)`;
    gctx.fillRect(
      random() * 512,
      random() * 512,
      1 + random() * 3,
      1 + random() * 4,
    );
  }
  const groundTexture = new THREE.CanvasTexture(groundCanvas);
  groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.repeat.set(65, 65);
  groundTexture.colorSpace = THREE.SRGBColorSpace;
  groundTexture.anisotropy = 8;
  const ground = mesh(
    new THREE.PlaneGeometry(700, 700),
    new THREE.MeshStandardMaterial({ map: groundTexture, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.025;
  scene.add(ground);
  // Alternating mowing bands and the deliberately open competition lanes.
  for (let i = 0; i < 15; i++) {
    const strip = mesh(
      new THREE.PlaneGeometry(25, 5),
      new THREE.MeshStandardMaterial({
        color: i % 2 ? "#8a9662" : "#7c8959",
        transparent: true,
        opacity: 0.22,
        roughness: 1,
      }),
      0,
      0.002,
      -i * 5 - 2.5,
    );
    strip.rotation.x = -Math.PI / 2;
    strip.castShadow = false;
    scene.add(strip);
  }
  const lineMaterial = mat("#dce0c9");
  for (const x of [-11, -3.5, 3.5, 11]) {
    const l = mesh(
      new THREE.PlaneGeometry(0.045, 76),
      lineMaterial,
      x,
      0.008,
      -35,
    );
    l.rotation.x = -Math.PI / 2;
    l.castShadow = false;
    scene.add(l);
  }
  for (const z of [0, -30, -50, -70]) {
    const l = mesh(
      new THREE.PlaneGeometry(25, z === 0 ? 0.12 : 0.035),
      lineMaterial,
      0,
      0.009,
      z,
    );
    l.rotation.x = -Math.PI / 2;
    l.castShadow = false;
    scene.add(l);
  }
  const dummy = new THREE.Object3D();
  const grassGeo = new THREE.BufferGeometry();
  grassGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [-0.035, 0, 0, 0.035, 0, 0, 0.016, 0.29, 0, 0, 0.42, 0, -0.015, 0.27, 0],
      3,
    ),
  );
  grassGeo.setIndex([0, 1, 2, 0, 2, 4, 4, 2, 3]);
  grassGeo.computeVertexNormals();
  const grassMaterial = new THREE.MeshStandardMaterial({
    color: "#80965a",
    side: THREE.DoubleSide,
    roughness: 1,
  });
  const grassUniforms = {
    time: { value: 0 },
    wind: { value: new THREE.Vector2() },
  };
  grassMaterial.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, grassUniforms);
    shader.vertexShader =
      "uniform float time; uniform vec2 wind;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>\n vec3 root=(instanceMatrix*vec4(position,1.)).xyz; transformed.x+=sin(time*1.8+root.x*.5+root.z*.32)*position.y*position.y*(.45+length(wind)*.12); transformed.z+=cos(time*1.4+root.z*.4)*position.y*position.y*.3;`,
    );
  };
  const grass = new THREE.InstancedMesh(
    grassGeo,
    grassMaterial,
    CONFIG.visuals.grassCount,
  );
  const color = new THREE.Color();
  for (let i = 0; i < CONFIG.visuals.grassCount; i++) {
    const x = (random() - 0.5) * 110,
      z = 12 - random() * 140;
    dummy.position.set(x, 0, z);
    dummy.rotation.y = random() * Math.PI;
    const s =
      Math.abs(x) < 12 && z < 0
        ? 0.2 + random() * 0.22
        : 0.55 + random() * 1.25;
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    grass.setMatrixAt(i, dummy.matrix);
    grass.setColorAt(
      i,
      color.setHSL(
        0.2 + random() * 0.035,
        0.25 + random() * 0.12,
        0.24 + random() * 0.13,
      ),
    );
  }
  scene.add(grass);
  // Layered rolling terrain forms the horizon behind the wooded range.
  for (let layer = 0; layer < 3; layer++) {
    const geo = new THREE.PlaneGeometry(950, 260, 110, 30);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        z = pos.getZ(i);
      const height =
        (Math.sin(x * 0.012 + layer * 2) * 13 +
          Math.sin(x * 0.029 + layer) * 6 +
          23 +
          layer * 14) *
        Math.sin(((z + 130) / 260) * Math.PI);
      pos.setY(i, Math.max(-2, height));
    }
    geo.computeVertexNormals();
    const hill = mesh(
      geo,
      mat(["#728d79", "#91a392", "#adbaaa"][layer]),
      0,
      -4,
      -210 - layer * 155,
    );
    hill.castShadow = false;
    scene.add(hill);
  }
  // Instanced trunks and irregular canopies keep the forest inexpensive.
  const trunk = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.13, 0.25, 1, 7),
    mat("#645c44"),
    CONFIG.visuals.treeCount,
  );
  const foliageGeometry = new THREE.IcosahedronGeometry(1, 2);
  const foliageVertices = foliageGeometry.attributes.position;
  for (let i = 0; i < foliageVertices.count; i++) {
    const x = foliageVertices.getX(i),
      y = foliageVertices.getY(i),
      z = foliageVertices.getZ(i);
    const noise =
      1 +
      0.12 * Math.sin(x * 23 + y * 17 + z * 13) +
      0.07 * Math.cos(z * 31 - x * 19);
    foliageVertices.setXYZ(i, x * noise, y * noise, z * noise);
  }
  foliageGeometry.computeVertexNormals();
  const crown = new THREE.InstancedMesh(
    foliageGeometry,
    mat("#ffffff"),
    CONFIG.visuals.treeCount * 16,
  );
  const pine = new THREE.InstancedMesh(
    new THREE.ConeGeometry(1, 1, 14, 4),
    mat("#ffffff"),
    CONFIG.visuals.treeCount * 7,
  );
  trunk.castShadow = crown.castShadow = pine.castShadow = true;
  trunk.receiveShadow = crown.receiveShadow = true;
  for (let i = 0; i < CONFIG.visuals.treeCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const x = i < 130 ? side * (25 + random() * 65) : (random() - 0.5) * 250;
    const z = i < 130 ? 10 - random() * 145 : -105 - random() * 75;
    const h = 7 + random() * 12;
    dummy.position.set(x, h * 0.32, z);
    dummy.scale.set(1, h * 0.64, 1);
    dummy.rotation.set(0, random() * 6, 0);
    dummy.updateMatrix();
    trunk.setMatrixAt(i, dummy.matrix);
    const isPine = i % 3 === 0;
    for (let k = 0; k < 16; k++) {
      const a = k * 2.3999,
        r = Math.sqrt(k / 16) * h * 0.24;
      dummy.position.set(
        x + Math.cos(a) * r,
        h * 0.68 + (random() - 0.5) * h * 0.28,
        z + Math.sin(a) * r,
      );
      dummy.scale.set(h * 0.12, h * 0.13, h * 0.12);
      if (isPine) dummy.scale.setScalar(0);
      dummy.rotation.set(random(), random(), random());
      dummy.updateMatrix();
      crown.setMatrixAt(i * 16 + k, dummy.matrix);
      crown.setColorAt(
        i * 16 + k,
        color.setHSL(
          0.22 + random() * 0.065,
          0.24 + random() * 0.14,
          0.19 + random() * 0.12,
        ),
      );
    }
    for (let k = 0; k < 7; k++) {
      dummy.position.set(x + (random() - 0.5) * 0.3, h * (0.38 + k * 0.085), z);
      dummy.rotation.set(0, random() * 6, 0);
      dummy.scale.set(h * (0.22 - k * 0.026), h * 0.25, h * (0.22 - k * 0.026));
      if (!isPine) dummy.scale.setScalar(0);
      dummy.updateMatrix();
      pine.setMatrixAt(i * 7 + k, dummy.matrix);
      pine.setColorAt(
        i * 7 + k,
        color.setHSL(0.28, 0.22, 0.19 + random() * 0.065),
      );
    }
  }
  scene.add(trunk, crown, pine);
  // Soft, layered cloud cards.
  const cc = document.createElement("canvas");
  cc.width = 256;
  cc.height = 128;
  const cx = cc.getContext("2d")!;
  for (let i = 0; i < 18; i++) {
    const x = 30 + random() * 196,
      y = 40 + random() * 45,
      r = 20 + random() * 32;
    const gradient = cx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, "rgba(255,255,246,0.45)");
    gradient.addColorStop(1, "rgba(255,255,246,0)");
    cx.fillStyle = gradient;
    cx.fillRect(0, 0, 256, 128);
  }
  const cloudMat = new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(cc),
    transparent: true,
    depthWrite: false,
    opacity: 0.64,
    fog: false,
  });
  for (let i = 0; i < 18; i++) {
    const cloud = mesh(
      new THREE.PlaneGeometry(65 + random() * 80, 22 + random() * 20),
      cloudMat,
      (random() - 0.5) * 650,
      65 + random() * 75,
      -230 - random() * 170,
    );
    cloud.castShadow = false;
    scene.add(cloud);
  }
  // Competition targets, stands, numbering, and backstop net.
  const faceTexture = new THREE.CanvasTexture(targetCanvas());
  faceTexture.colorSpace = THREE.SRGBColorSpace;
  faceTexture.anisotropy = 8;
  const wood = mat("#857557"),
    dark = mat("#30483e"),
    straw = mat("#9c9577");
  for (const [index, x] of [-7, 0, 7].entries()) {
    const group = new THREE.Group();
    group.position.set(x, 0, -CONFIG.match.distance);
    const backing = mesh(
      new THREE.CylinderGeometry(0.76, 0.76, 0.22, 64),
      straw,
      0,
      CONFIG.target.centerHeight,
      -0.115,
    );
    backing.rotation.x = Math.PI / 2;
    group.add(backing);
    const face = mesh(
      new THREE.CircleGeometry(0.61, 96),
      new THREE.MeshStandardMaterial({ map: faceTexture, roughness: 1 }),
      0,
      CONFIG.target.centerHeight,
      0.003,
    );
    group.add(face);
    for (const side of [-1, 1])
      group.add(
        bar(
          new THREE.Vector3(side * 0.64, 0, 0.35),
          new THREE.Vector3(side * 0.43, 1.85, -0.17),
          0.045,
          wood,
        ),
      );
    group.add(
      bar(
        new THREE.Vector3(0, 0, -0.8),
        new THREE.Vector3(0, 1.7, -0.2),
        0.04,
        wood,
      ),
    );
    group.add(mesh(new THREE.BoxGeometry(1.35, 0.09, 0.1), wood, 0, 0.7, 0.05));
    const label = document.createElement("canvas");
    label.width = 256;
    label.height = 128;
    const lc = label.getContext("2d")!;
    lc.fillStyle = "#223c30";
    lc.fillRect(0, 0, 256, 128);
    lc.fillStyle = "#f2f0dc";
    lc.font = "500 66px sans-serif";
    lc.textAlign = "center";
    lc.fillText(`0${index + 1}`, 128, 88);
    const labelTexture = new THREE.CanvasTexture(label);
    labelTexture.colorSpace = THREE.SRGBColorSpace;
    group.add(
      mesh(
        new THREE.PlaneGeometry(0.46, 0.23),
        new THREE.MeshStandardMaterial({ map: labelTexture }),
        0,
        2.24,
        0,
      ),
    );
    scene.add(group);
  }
  const netMaterial = new THREE.LineBasicMaterial({
    color: "#607766",
    transparent: true,
    opacity: 0.28,
  });
  const netVertices: number[] = [];
  for (let x = -13; x <= 13; x += 0.5) netVertices.push(x, 0, -73, x, 4, -73);
  for (let y = 0; y <= 4; y += 0.5) netVertices.push(-13, y, -73, 13, y, -73);
  const netGeo = new THREE.BufferGeometry();
  netGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(netVertices, 3),
  );
  scene.add(new THREE.LineSegments(netGeo, netMaterial));
  for (const x of [-13, 13])
    scene.add(
      mesh(new THREE.CylinderGeometry(0.04, 0.04, 4, 8), dark, x, 2, -73),
    );
  // Boundary fence.
  for (const side of [-1, 1]) {
    for (let z = 8; z > -110; z -= 8)
      scene.add(
        mesh(new THREE.BoxGeometry(0.12, 1.2, 0.12), wood, side * 17, 0.6, z),
      );
    for (const y of [0.48, 0.94])
      scene.add(
        mesh(new THREE.BoxGeometry(0.07, 0.09, 120), wood, side * 17, y, -48),
      );
  }
  const flags: THREE.Mesh[] = [];
  for (const [x, z] of [
    [-4.2, -69],
    [11, -35],
    [-11, -12],
  ]) {
    scene.add(
      mesh(
        new THREE.CylinderGeometry(0.025, 0.035, 3.2, 8),
        mat("#c3c5b0"),
        x,
        1.6,
        z,
      ),
    );
    const flag = mesh(
      new THREE.PlaneGeometry(1.05, 0.42, 18, 6),
      new THREE.MeshStandardMaterial({
        color: "#dce4bd",
        side: THREE.DoubleSide,
        roughness: 1,
      }),
      x,
      2.95,
      z,
    );
    flag.geometry.translate(0.525, 0, 0);
    flag.castShadow = false;
    flags.push(flag);
    scene.add(flag);
  }
  // Benches and a compact timber shelter outside the shooting lanes.
  for (const z of [-5, -12]) {
    scene.add(mesh(new THREE.BoxGeometry(2.5, 0.12, 0.55), wood, -14, 0.48, z));
    for (const x of [-14.9, -13.1])
      scene.add(mesh(new THREE.BoxGeometry(0.1, 0.48, 0.5), dark, x, 0.24, z));
  }
  for (const x of [-21, -16])
    for (const z of [-10, 1])
      scene.add(mesh(new THREE.BoxGeometry(0.16, 2.8, 0.16), wood, x, 1.4, z));
  scene.add(
    mesh(
      new THREE.BoxGeometry(6, 0.16, 12.5),
      mat("#3b4b3e"),
      -18.5,
      2.85,
      -4.5,
    ),
  );
  const rainPositions = new Float32Array(CONFIG.visuals.rainCount * 6);
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));
  for (let i = 0; i < rainPositions.length; i += 6) {
    rainPositions[i] = (random() - 0.5) * 45;
    rainPositions[i + 1] = random() * 24;
    rainPositions[i + 2] = -random() * 80;
    rainPositions[i + 3] = rainPositions[i];
    rainPositions[i + 4] = rainPositions[i + 1] - 0.45;
    rainPositions[i + 5] = rainPositions[i + 2];
  }
  const rain = new THREE.LineSegments(
    rainGeo,
    new THREE.LineBasicMaterial({
      color: "#d1dfe0",
      transparent: true,
      opacity: 0.3,
    }),
  );
  rain.frustumCulled = false;
  scene.add(rain);
  let rainy = false;
  function setWeather(weather: Weather) {
    scene.fog = new THREE.Fog(
      weather.fog,
      weather.kind === "fog" ? 10 : 55,
      weather.visibility,
    );
    skyMaterial.uniforms.top.value.set(
      weather.kind === "clear" ? "#84b3d1" : weather.sky,
    );
    skyMaterial.uniforms.bottom.value
      .set(weather.fog)
      .lerp(new THREE.Color("#f1eddd"), 0.25);
    sun.intensity = weather.light;
    ambient.intensity = weather.kind === "rain" ? 1.7 : 2.05;
    sun.color.set(weather.kind === "sunset" ? "#ffd0a0" : "#fff3d4");
    sun.position.y = weather.kind === "sunset" ? 28 : 65;
    rainy = weather.rain > 0;
    rain.visible = rainy;
  }
  function update(
    time: number,
    wind: THREE.Vector3,
    _camera: THREE.Camera,
    dt: number,
  ) {
    grassUniforms.time.value = time;
    grassUniforms.wind.value.set(wind.x, wind.z);
    for (const flag of flags) {
      flag.rotation.y = -Math.atan2(wind.z, wind.x);
      const p = flag.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        p.setZ(
          i,
          Math.sin(time * (4 + wind.length() * 0.5) - x * 8) * x * 0.11,
        );
      }
      p.needsUpdate = true;
      flag.geometry.computeVertexNormals();
    }
    if (rainy) {
      for (let i = 0; i < rainPositions.length; i += 6) {
        rainPositions[i + 1] -= dt * 12;
        rainPositions[i] += wind.x * dt * 0.6;
        if (rainPositions[i + 1] < 0) {
          rainPositions[i + 1] = 24;
          rainPositions[i] = (random() - 0.5) * 45;
        }
        rainPositions[i + 3] = rainPositions[i] - 0.06 * wind.x;
        rainPositions[i + 4] = rainPositions[i + 1] - 0.55;
        rainPositions[i + 5] = rainPositions[i + 2];
      }
      rain.geometry.attributes.position.needsUpdate = true;
    }
  }
  return {
    scene,
    sun,
    ambient,
    sky,
    flags,
    grassMaterial,
    rain,
    rainPositions,
    setWeather,
    update,
  };
}

export function createArrowMesh() {
  const group = new THREE.Group();
  const shaft = mesh(
    new THREE.CylinderGeometry(0.003, 0.003, 0.73, 8),
    mat("#393e39", 0.45),
    0,
    0,
    0.365,
  );
  shaft.rotation.x = Math.PI / 2;
  group.add(shaft);
  const tip = mesh(
    new THREE.ConeGeometry(0.0045, 0.028, 8),
    new THREE.MeshStandardMaterial({
      color: "#b4bdbe",
      metalness: 0.8,
      roughness: 0.25,
    }),
    0,
    0,
    -0.008,
  );
  tip.rotation.x = -Math.PI / 2;
  group.add(tip);
  for (let i = 0; i < 3; i++) {
    const vane = mesh(
      new THREE.PlaneGeometry(0.025, 0.075),
      mat(i === 0 ? "#e1b05a" : "#e2e4c9"),
    );
    vane.material.side = THREE.DoubleSide;
    vane.rotation.x = Math.PI / 2;
    vane.rotation.z = (i * Math.PI * 2) / 3;
    vane.position.set(
      Math.cos((i * Math.PI * 2) / 3) * 0.008,
      Math.sin((i * Math.PI * 2) / 3) * 0.008,
      0.66,
    );
    group.add(vane);
  }
  return group;
}
