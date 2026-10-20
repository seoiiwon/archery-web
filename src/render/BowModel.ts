import * as THREE from "three";
export class BowModel {
  readonly group = new THREE.Group();
  readonly string: THREE.Line;
  readonly arrow = new THREE.Group();
  private upper: THREE.Mesh;
  private lower: THREE.Mesh;
  constructor() {
    const carbon = new THREE.MeshStandardMaterial({
      color: "#27312d",
      roughness: 0.28,
      metalness: 0.48,
    });
    const wood = new THREE.MeshStandardMaterial({
      color: "#8e5938",
      roughness: 0.55,
    });
    const brass = new THREE.MeshStandardMaterial({
      color: "#baa675",
      metalness: 0.7,
      roughness: 0.3,
    });
    const riserCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.03, -0.25, 0.01),
      new THREE.Vector3(-0.045, -0.11, 0),
      new THREE.Vector3(-0.03, 0, 0.035),
      new THREE.Vector3(0.015, 0.15, 0),
      new THREE.Vector3(0.025, 0.29, 0.01),
    ]);
    const riser = new THREE.Mesh(
      new THREE.TubeGeometry(riserCurve, 28, 0.027, 10, false),
      carbon,
    );
    this.group.add(riser);
    const grip = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.029, 0.13, 8, 12),
      wood,
    );
    grip.position.set(-0.034, -0.065, 0.025);
    grip.rotation.z = -0.12;
    this.group.add(grip);
    const limb = (side: number) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.025, side * 0.24, 0.01),
        new THREE.Vector3(0.018, side * 0.42, -0.035),
        new THREE.Vector3(0.006, side * 0.65, -0.005),
        new THREE.Vector3(0, side * 0.79, 0.13),
        new THREE.Vector3(0, side * 0.81, 0.18),
      ]);
      const m = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 32, 0.017, 8, false),
        carbon,
      );
      m.scale.x = 1.6;
      return m;
    };
    this.upper = limb(1);
    this.lower = limb(-1);
    this.group.add(this.upper, this.lower);
    for (const side of [-1, 1]) {
      const bolt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.013, 0.013, 0.045, 12),
        brass,
      );
      bolt.rotation.x = Math.PI / 2;
      bolt.position.set(0.025, side * 0.24, 0.025);
      this.group.add(bolt);
    }
    const stab = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.009, 0.48, 12),
      carbon,
    );
    stab.rotation.x = Math.PI / 2;
    stab.position.set(0.01, -0.15, -0.23);
    this.group.add(stab);
    const weight = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.07, 12),
      carbon,
    );
    weight.rotation.x = Math.PI / 2;
    weight.position.set(0.01, -0.15, -0.48);
    this.group.add(weight);
    const sightArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.012, 0.012),
      carbon,
    );
    sightArm.position.set(-0.075, 0.13, 0);
    this.group.add(sightArm);
    const sight = new THREE.Mesh(
      new THREE.TorusGeometry(0.022, 0.002, 8, 32),
      brass,
    );
    sight.position.set(-0.16, 0.13, 0);
    this.group.add(sight);
    this.string = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.81, 0.18),
        new THREE.Vector3(0, 0, 0.2),
        new THREE.Vector3(0, -0.81, 0.18),
      ]),
      new THREE.LineBasicMaterial({ color: "#e5dcc4" }),
    );
    this.group.add(this.string);
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.003, 0.003, 0.76, 8),
      new THREE.MeshStandardMaterial({
        color: "#8d947c",
        metalness: 0.4,
        roughness: 0.5,
      }),
    );
    shaft.rotation.x = Math.PI / 2;
    this.arrow.add(shaft);
    this.arrow.position.set(-0.025, 0.03, -0.15);
    this.group.add(this.arrow);
    // A restrained leather glove and sleeve silhouette, below the sightline.
    const glove = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.048, 0.12, 6, 12),
      new THREE.MeshStandardMaterial({ color: "#49473a", roughness: 0.96 }),
    );
    glove.position.set(-0.035, -0.07, 0.095);
    glove.rotation.z = -0.25;
    this.group.add(glove);
    const sleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.095, 0.5, 16),
      new THREE.MeshStandardMaterial({ color: "#5d6757", roughness: 1 }),
    );
    sleeve.position.set(0.1, -0.35, 0.26);
    sleeve.rotation.set(-0.55, 0, 0.45);
    this.group.add(sleeve);
  }
  update(draw: number, time: number, recoil: number, visible: boolean) {
    const p = this.string.geometry.attributes.position;
    p.setZ(1, 0.2 + draw * 0.46);
    p.needsUpdate = true;
    this.upper.rotation.x = -draw * 0.045;
    this.lower.rotation.x = draw * 0.045;
    this.arrow.position.z = -0.15 + draw * 0.4;
    this.arrow.visible = visible;
    this.group.position.set(
      0.31 - draw * 0.08,
      -0.16 + draw * 0.045,
      -0.77 + recoil * 0.35,
    );
    this.group.rotation.set(
      0.04 + recoil * 0.7,
      0.05,
      -0.12 + Math.sin(time * 1.7) * 0.003,
    );
  }
}
