import {
  BoxGeometry,
  CapsuleGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  QuadraticBezierCurve3,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from 'three'

const BODY = 0x7ec8a9
const BELLY = 0xa8dcc0
const FEATURES = 0x2f4f43
const BLUSH = 0xf4a3a3
const CURL = 0x5da88b

export interface Character {
  group: Group
  setMouth(t: number): void
  leftEye: Object3D
  rightEye: Object3D
  leftBrow: Object3D
  rightBrow: Object3D
  blushMaterial: MeshStandardMaterial
}

function bodyMaterial(color: number): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, flatShading: true, roughness: 0.9 })
}

function mouthGeometry(t: number): TubeGeometry {
  const controlY = 0.08 - 0.16 * t
  const curve = new QuadraticBezierCurve3(
    new Vector3(-0.16, 0, 0),
    new Vector3(0, controlY, 0),
    new Vector3(0.16, 0, 0),
  )
  return new TubeGeometry(curve, 12, 0.03, 6, false)
}

export function disposeObject(root: Object3D): void {
  root.traverse((object) => {
    if (object instanceof Mesh) {
      object.geometry.dispose()
      const material = object.material
      if (Array.isArray(material)) {
        material.forEach((item) => item.dispose())
      } else {
        material.dispose()
      }
    }
  })
}

export function createCharacter(): Character {
  const group = new Group()
  const green = bodyMaterial(BODY)
  const belly = bodyMaterial(BELLY)
  const features = bodyMaterial(FEATURES)
  const curl = bodyMaterial(CURL)
  const white = bodyMaterial(0xffffff)
  const blushMaterial = new MeshStandardMaterial({
    color: BLUSH,
    flatShading: true,
    roughness: 0.9,
    transparent: true,
  })

  const head = new Mesh(new IcosahedronGeometry(0.55, 1), green)
  head.position.set(0, 0.75, 0)
  group.add(head)

  for (const side of [-1, 1]) {
    const ear = new Mesh(new SphereGeometry(0.24, 10, 8), green)
    ear.scale.set(1, 1, 0.6)
    ear.position.set(side * 0.36, 1.16, 0)
    group.add(ear)

    const innerEar = new Mesh(new SphereGeometry(0.13, 8, 6), belly)
    innerEar.scale.set(1, 1, 0.5)
    innerEar.position.set(side * 0.36, 1.16, 0.12)
    group.add(innerEar)
  }

  const torso = new Mesh(new IcosahedronGeometry(0.62, 1), green)
  torso.scale.set(1, 1.15, 0.9)
  torso.position.set(0, -0.15, 0)
  group.add(torso)

  const bellyMesh = new Mesh(new SphereGeometry(0.42, 10, 8), belly)
  bellyMesh.scale.set(0.9, 1, 0.6)
  bellyMesh.position.set(0, -0.18, 0.42)
  group.add(bellyMesh)

  for (const side of [-1, 1]) {
    const arm = new Mesh(new CapsuleGeometry(0.12, 0.42, 4, 8), green)
    arm.position.set(side * 0.62, -0.15, 0)
    arm.rotation.z = side * 0.5
    group.add(arm)

    const foot = new Mesh(new CapsuleGeometry(0.14, 0.2, 4, 8), green)
    foot.position.set(side * 0.3, -0.78, 0.12)
    foot.rotation.x = Math.PI / 2
    group.add(foot)
  }

  const eyes: Object3D[] = []
  for (const side of [-1, 1]) {
    const eye = new Group()
    eye.position.set(side * 0.22, 0.82, 0.46)
    eye.add(new Mesh(new SphereGeometry(0.12, 8, 8), white))
    const pupil = new Mesh(new SphereGeometry(0.05, 8, 8), features)
    pupil.position.set(0, 0, 0.1)
    eye.add(pupil)
    group.add(eye)
    eyes.push(eye)
  }

  const brows: Object3D[] = []
  for (const side of [-1, 1]) {
    const brow = new Mesh(new BoxGeometry(0.22, 0.05, 0.05), features)
    brow.position.set(side * 0.22, 1, 0.5)
    group.add(brow)
    brows.push(brow)
  }

  let mouthMesh: Mesh | undefined

  function setMouth(t: number): void {
    const geometry = mouthGeometry(t)
    if (mouthMesh) {
      mouthMesh.geometry.dispose()
      mouthMesh.geometry = geometry
    } else {
      mouthMesh = new Mesh(geometry, features)
      mouthMesh.position.set(0, 0.62, 0.5)
      group.add(mouthMesh)
    }
  }

  for (const side of [-1, 1]) {
    const cheek = new Mesh(new SphereGeometry(0.09, 8, 6), blushMaterial)
    cheek.scale.set(1, 0.6, 0.4)
    cheek.position.set(side * 0.42, 0.68, 0.4)
    group.add(cheek)
  }

  const backCurl = new Mesh(new TorusGeometry(0.12, 0.03, 6, 10, Math.PI * 1.2), curl)
  backCurl.position.set(0.05, 1.15, -0.35)
  backCurl.rotation.set(0.4, 0.4, 0)
  group.add(backCurl)

  const tail = new Mesh(new SphereGeometry(0.12, 8, 6), belly)
  tail.scale.set(1, 0.7, 0.5)
  tail.position.set(0, -0.72, -0.5)
  group.add(tail)

  setMouth(1)

  return {
    group,
    setMouth,
    leftEye: eyes[0],
    rightEye: eyes[1],
    leftBrow: brows[0],
    rightBrow: brows[1],
    blushMaterial,
  }
}
