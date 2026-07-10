import * as THREE from "three"

// Skatuve: a theatre maquette in the round — dark timber proscenium, a
// raked engraved floor, and flat paper cut-outs hung on wires: lace
// trellis columns of vine, grape-cluster trees, a bird-boat ferrying
// bottles across the stage, a barrel cart, a carafe under a wire cloche
// and a lone vintner. Everything sways gently on its wires, the boat
// sails back and forth, the warm stage light breathes. Winery theatre.

const IVORY = "#EAE3C9"
const INK = "#4A3B28"
const BLUE = "#7FB8D6"

let width = window.innerWidth || 1280
let height = window.innerHeight || 720

let mouseX = 0
let mouseY = 0

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x241a12)

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
camera.position.set(0, 2.3, 10.2)

// -- lights ---------------------------------------------------------------------------

scene.add(new THREE.AmbientLight(0xffe4c0, 0.55))
const key = new THREE.SpotLight(0xffdcae, 900, 60, 0.7, 0.55)
key.position.set(-3, 9.5, 9)
key.castShadow = true
key.shadow.mapSize.set(2048, 2048)
key.shadow.bias = -0.0004
scene.add(key)
const fill = new THREE.DirectionalLight(0xcfd8e8, 0.35)
fill.position.set(5, 4, -4)
scene.add(fill)

// -- paper helpers --------------------------------------------------------------------

function paperMaterial(canvasTex) {
  const tex = new THREE.CanvasTexture(canvasTex)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.45,
    side: THREE.DoubleSide,
    roughness: 0.9,
    metalness: 0
  })
}

function flat(c, w, h) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), paperMaterial(c))
  mesh.castShadow = true
  mesh.receiveShadow = false
  return mesh
}

function wire(x, yTop, yBottom, z) {
  const g = new THREE.CylinderGeometry(0.008, 0.008, yTop - yBottom, 6)
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x6a5a44, roughness: 0.6 }))
  m.position.set(x, (yTop + yBottom) / 2, z)
  return m
}

// -- cut-out artwork ------------------------------------------------------------------

// lace trellis column: stacked vine scrolls with grapes, pointed top
function makeVineColumn(seed) {
  const c = document.createElement("canvas")
  c.width = 256
  c.height = 1024
  const g = c.getContext("2d")
  const rnd = (n) => {
    const x = Math.sin(seed * 91.7 + n * 47.3) * 43758.5453
    return x - Math.floor(x)
  }
  g.fillStyle = IVORY
  g.strokeStyle = INK
  // silhouette: narrow pointed column of stacked lobes
  g.beginPath()
  g.moveTo(128, 8)
  for (let y = 40; y <= 1000; y += 60) {
    const w = 34 + 74 * Math.min(1, y / 480) * (0.85 + 0.3 * rnd(y))
    g.quadraticCurveTo(128 + w, y - 30, 128 + w * 0.72, y)
  }
  g.lineTo(128, 1016)
  for (let y = 1000; y >= 40; y -= 60) {
    const w = 34 + 74 * Math.min(1, y / 480) * (0.85 + 0.3 * rnd(y))
    g.quadraticCurveTo(128 - w, y - 30, 128 - (y <= 40 ? 0 : w * 0.72), y - 60)
  }
  g.closePath()
  g.fill()

  // openwork: punch leaf-shaped holes
  g.globalCompositeOperation = "destination-out"
  for (let y = 90; y < 980; y += 46) {
    for (const s of [-1, 1]) {
      const w = (30 + 60 * Math.min(1, y / 480)) * (0.7 + 0.4 * rnd(y * s))
      g.beginPath()
      g.ellipse(128 + s * w * 0.55, y, w * 0.26, 15, s * 0.5, 0, Math.PI * 2)
      g.fill()
    }
  }
  g.globalCompositeOperation = "source-over"

  // ink: stem, scroll veins, grape dots
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(128, 12)
  g.lineTo(128, 1016)
  g.stroke()
  g.lineWidth = 2
  for (let y = 80; y < 980; y += 46) {
    for (const s of [-1, 1]) {
      const w = (30 + 60 * Math.min(1, y / 480)) * 0.9
      g.beginPath()
      g.moveTo(128, y)
      g.quadraticCurveTo(128 + s * w * 0.7, y - 18, 128 + s * w, y + 6)
      g.stroke()
      if (rnd(y * 3 * s) > 0.55) {
        g.fillStyle = INK
        for (let k = 0; k < 6; k++) {
          const a = k * 1.1
          g.beginPath()
          g.arc(128 + s * w * 0.55 + Math.cos(a) * 7, y + 14 + Math.sin(a) * 8, 4.2, 0, Math.PI * 2)
          g.fill()
        }
        g.fillStyle = IVORY
      }
    }
  }
  return c
}

// grape-cluster tree: a rhombus lattice of little leaves with hanging bunches
function makeGrapeTree(seed) {
  const c = document.createElement("canvas")
  c.width = 512
  c.height = 720
  const g = c.getContext("2d")
  const rnd = (n) => {
    const x = Math.sin(seed * 53.9 + n * 71.3) * 43758.5453
    return x - Math.floor(x)
  }
  g.strokeStyle = INK
  g.fillStyle = IVORY
  // trunk
  g.lineWidth = 5
  g.beginPath()
  g.moveTo(256, 700)
  g.lineTo(256, 420)
  g.stroke()
  // diamond crown made of little leaf diamonds
  const R = 15
  for (let row = -8; row <= 8; row++) {
    const half = 8 - Math.abs(row)
    for (let col = -half; col <= half; col++) {
      if (rnd(row * 31 + col * 7) < 0.14) continue
      const x = 256 + col * 30
      const y = 250 + row * 26
      g.fillStyle = IVORY
      g.beginPath()
      g.moveTo(x, y - R)
      g.lineTo(x + R * 0.7, y)
      g.lineTo(x, y + R)
      g.lineTo(x - R * 0.7, y)
      g.closePath()
      g.fill()
      g.lineWidth = 1.6
      g.stroke()
      g.beginPath()
      g.moveTo(x, y - R + 3)
      g.lineTo(x, y + R - 3)
      g.stroke()
    }
  }
  // hanging bunches
  for (const bx of [-70, 40, 100]) {
    const x = 256 + bx
    const y = 480 + 40 * rnd(bx)
    g.lineWidth = 2.5
    g.beginPath()
    g.moveTo(x, y - 60)
    g.quadraticCurveTo(x + 8, y - 30, x, y)
    g.stroke()
    g.fillStyle = IVORY
    for (let r = 0; r < 4; r++) {
      for (let k = 0; k <= r; k++) {
        g.beginPath()
        g.arc(x - r * 7 + k * 14, y + r * 13, 8, 0, Math.PI * 2)
        g.fill()
        g.lineWidth = 1.6
        g.stroke()
      }
    }
  }
  return c
}

// the bird-boat: a swan hull ferrying bottles, rigging fanned like a sail
function makeBoatBird() {
  const c = document.createElement("canvas")
  c.width = 768
  c.height = 512
  const g = c.getContext("2d")
  g.strokeStyle = INK
  g.fillStyle = IVORY

  // rigging fan
  g.lineWidth = 1.5
  for (let k = 0; k < 12; k++) {
    g.beginPath()
    g.moveTo(240, 330)
    g.quadraticCurveTo(300 + k * 14, 140 - k * 6, 560 - k * 8, 60 + k * 16)
    g.stroke()
  }

  // hull: crescent boat
  g.lineWidth = 4
  g.beginPath()
  g.moveTo(150, 300)
  g.quadraticCurveTo(380, 430, 620, 290)
  g.quadraticCurveTo(600, 380, 470, 400)
  g.quadraticCurveTo(350, 420, 240, 380)
  g.quadraticCurveTo(170, 350, 150, 300)
  g.closePath()
  g.fill()
  g.stroke()

  // swan neck and head at the bow
  g.beginPath()
  g.moveTo(170, 320)
  g.quadraticCurveTo(90, 300, 100, 230)
  g.quadraticCurveTo(106, 190, 140, 190)
  g.quadraticCurveTo(170, 190, 160, 225)
  g.quadraticCurveTo(150, 260, 200, 290)
  g.closePath()
  g.fill()
  g.stroke()
  // beak + eye
  g.beginPath()
  g.moveTo(100, 205)
  g.lineTo(70, 218)
  g.lineTo(102, 226)
  g.closePath()
  g.fillStyle = INK
  g.fill()
  g.beginPath()
  g.arc(126, 208, 4, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = IVORY

  // cargo: three bottles in the hull, one glass-blue
  const bottle = (x, y, fillCol) => {
    g.fillStyle = fillCol
    g.lineWidth = 3
    g.beginPath()
    g.moveTo(x - 16, y)
    g.lineTo(x - 16, y - 48)
    g.quadraticCurveTo(x - 16, y - 60, x - 6, y - 64)
    g.lineTo(x - 6, y - 86)
    g.lineTo(x + 6, y - 86)
    g.lineTo(x + 6, y - 64)
    g.quadraticCurveTo(x + 16, y - 60, x + 16, y - 48)
    g.lineTo(x + 16, y)
    g.closePath()
    g.fill()
    g.stroke()
  }
  bottle(330, 350, IVORY)
  bottle(400, 360, BLUE)
  bottle(470, 350, IVORY)

  // masthead orb
  g.beginPath()
  g.arc(560, 60, 22, 0, Math.PI * 2)
  g.fillStyle = BLUE
  g.fill()
  g.lineWidth = 3
  g.stroke()
  return c
}

// carafe under a wire cloche
function makeCloche() {
  const c = document.createElement("canvas")
  c.width = 256
  c.height = 384
  const g = c.getContext("2d")
  g.strokeStyle = INK
  g.fillStyle = IVORY
  // dome bars
  g.lineWidth = 3
  for (let k = -3; k <= 3; k++) {
    g.beginPath()
    g.ellipse(128, 210, Math.abs(k) * 30 + 8, 150, 0, Math.PI, Math.PI * 2)
    g.stroke()
  }
  g.beginPath()
  g.ellipse(128, 210, 98, 26, 0, 0, Math.PI * 2)
  g.stroke()
  g.beginPath()
  g.arc(128, 52, 10, 0, Math.PI * 2)
  g.stroke()
  // carafe inside
  g.lineWidth = 3.5
  g.beginPath()
  g.moveTo(112, 210)
  g.quadraticCurveTo(96, 180, 120, 160)
  g.lineTo(120, 130)
  g.lineTo(136, 130)
  g.lineTo(136, 160)
  g.quadraticCurveTo(160, 180, 144, 210)
  g.closePath()
  g.fill()
  g.stroke()
  return c
}

// barrel cart with a crane pole hanging a bunch
function makeBarrelCart() {
  const c = document.createElement("canvas")
  c.width = 512
  c.height = 420
  const g = c.getContext("2d")
  g.strokeStyle = INK
  g.fillStyle = IVORY

  const wheel = (x, y, r) => {
    g.lineWidth = 4
    g.beginPath()
    g.arc(x, y, r, 0, Math.PI * 2)
    g.fill()
    g.stroke()
    g.lineWidth = 2
    for (let k = 0; k < 8; k++) {
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + Math.cos(k * Math.PI / 4) * r, y + Math.sin(k * Math.PI / 4) * r)
      g.stroke()
    }
    g.beginPath()
    g.arc(x, y, r * 0.25, 0, Math.PI * 2)
    g.stroke()
  }

  // barrel (horizontal)
  g.lineWidth = 4
  g.beginPath()
  g.ellipse(230, 240, 120, 68, 0, 0, Math.PI * 2)
  g.fill()
  g.stroke()
  g.lineWidth = 2.5
  for (const dx of [-70, -25, 25, 70]) {
    g.beginPath()
    g.ellipse(230 + dx, 240, 16, 66, 0, Math.PI * 1.5, Math.PI * 0.5)
    g.stroke()
  }

  // crane pole with grapes on a chain
  g.lineWidth = 5
  g.beginPath()
  g.moveTo(360, 300)
  g.quadraticCurveTo(430, 140, 380, 70)
  g.stroke()
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(382, 72)
  g.lineTo(382, 150)
  g.stroke()
  g.fillStyle = IVORY
  for (let r = 0; r < 3; r++) {
    for (let k = 0; k <= r; k++) {
      g.beginPath()
      g.arc(382 - r * 6 + k * 12, 158 + r * 11, 7, 0, Math.PI * 2)
      g.fill()
      g.lineWidth = 1.6
      g.stroke()
    }
  }

  wheel(150, 340, 58)
  wheel(330, 340, 58)
  return c
}

// the vintner: a small paper figure with a staff
function makeFigure() {
  const c = document.createElement("canvas")
  c.width = 200
  c.height = 400
  const g = c.getContext("2d")
  g.strokeStyle = INK
  g.fillStyle = IVORY
  g.lineWidth = 3
  // staff
  g.beginPath()
  g.moveTo(148, 60)
  g.lineTo(148, 380)
  g.stroke()
  // body
  g.beginPath()
  g.moveTo(80, 380)
  g.lineTo(88, 250)
  g.quadraticCurveTo(60, 240, 66, 180)
  g.quadraticCurveTo(70, 140, 100, 132)
  g.quadraticCurveTo(92, 100, 104, 88)
  g.quadraticCurveTo(120, 74, 134, 90)
  g.quadraticCurveTo(142, 104, 134, 128)
  g.quadraticCurveTo(160, 140, 156, 190)
  g.quadraticCurveTo(152, 240, 120, 250)
  g.lineTo(126, 380)
  g.lineTo(108, 380)
  g.lineTo(104, 260)
  g.lineTo(96, 380)
  g.closePath()
  g.fill()
  g.stroke()
  // hat brim
  g.lineWidth = 4
  g.beginPath()
  g.moveTo(88, 96)
  g.lineTo(150, 96)
  g.stroke()
  // hatching on the jacket
  g.lineWidth = 1.4
  for (let y = 150; y < 240; y += 9) {
    g.beginPath()
    g.moveTo(74, y)
    g.lineTo(150, y - 12)
    g.stroke()
  }
  return c
}

// engraved stage floor
function makeFloor() {
  const c = document.createElement("canvas")
  c.width = 2048
  c.height = 1024
  const g = c.getContext("2d")
  g.fillStyle = "#DCD5BD"
  g.fillRect(0, 0, 2048, 1024)
  g.strokeStyle = "rgba(74, 59, 40, 0.75)"

  // nested frames
  g.lineWidth = 5
  g.strokeRect(60, 50, 1928, 924)
  g.lineWidth = 2
  g.strokeRect(90, 76, 1868, 872)
  g.strokeRect(210, 170, 1628, 684)
  g.lineWidth = 4
  g.strokeRect(230, 186, 1588, 652)

  // centre medallion: radial fan and a grape garland ring
  const cx = 1024, cy = 512
  g.lineWidth = 2
  g.beginPath()
  g.arc(cx, cy, 200, 0, Math.PI * 2)
  g.stroke()
  g.beginPath()
  g.arc(cx, cy, 150, 0, Math.PI * 2)
  g.stroke()
  for (let k = 0; k < 36; k++) {
    const a = (k / 36) * Math.PI * 2
    g.beginPath()
    g.moveTo(cx + Math.cos(a) * 150, cy + Math.sin(a) * 150)
    g.lineTo(cx + Math.cos(a) * 200, cy + Math.sin(a) * 200)
    g.stroke()
  }
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2
    for (let r = 0; r < 3; r++) {
      g.beginPath()
      g.arc(cx + Math.cos(a) * (110 - r * 16), cy + Math.sin(a) * (110 - r * 16), 7, 0, Math.PI * 2)
      g.stroke()
    }
  }
  // corner scrolls
  for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    g.lineWidth = 3
    g.beginPath()
    g.moveTo(cx + sx * 780, cy + sy * 380)
    g.quadraticCurveTo(cx + sx * 640, cy + sy * 420, cx + sx * 560, cy + sy * 330)
    g.quadraticCurveTo(cx + sx * 520, cy + sy * 280, cx + sx * 580, cy + sy * 262)
    g.stroke()
  }
  // long flourish lines toward the apron
  g.lineWidth = 1.6
  for (const yy of [880, 906]) {
    g.beginPath()
    g.moveTo(300, yy)
    g.quadraticCurveTo(1024, yy - 36, 1748, yy)
    g.stroke()
  }
  return c
}

// -- build the stage ------------------------------------------------------------------

const floorTex = new THREE.CanvasTexture(makeFloor())
floorTex.colorSpace = THREE.SRGBColorSpace
floorTex.anisotropy = 8
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(16, 9),
  new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85 })
)
floor.rotation.x = -Math.PI / 2 + 0.055 // the rake
floor.position.set(0, 0, 0.5)
floor.receiveShadow = true
scene.add(floor)

// dark timber box: back wall and curved wings
const timber = new THREE.MeshStandardMaterial({ color: 0x2c2016, roughness: 0.92 })
const back = new THREE.Mesh(new THREE.PlaneGeometry(20, 10), timber)
back.position.set(0, 4.5, -4.4)
scene.add(back)
for (const s of [-1, 1]) {
  const wing = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 10, 24, 1, true, 0, Math.PI * 0.75), timber)
  wing.position.set(s * 8.1, 4.4, 1.6)
  wing.rotation.y = s > 0 ? Math.PI * 1.1 : Math.PI * 0.15
  scene.add(wing)
}
const ceilingShadow = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 4),
  new THREE.MeshBasicMaterial({ color: 0x120c08 })
)
ceilingShadow.position.set(0, 6.9, 2.2)
ceilingShadow.rotation.x = 0.35
scene.add(ceilingShadow)

// hanging cut-outs: [canvas, w, h, x, y(bottom), z, sway]
const RIG_TOP = 7.2
const swingers = []

function hang(cv, w, h, x, yBottom, z, seed) {
  const group = new THREE.Group()
  const piece = flat(cv, w, h)
  piece.position.y = -(RIG_TOP - (yBottom + h / 2))
  group.add(piece)
  group.add(wire(0, 0, piece.position.y + h / 2 - 0.02, 0).translateY(-(0)) )
  // the wire runs from the rig down to the piece's top
  const wr = wire(0, 0, 0, 0)
  wr.geometry.dispose()
  const len = RIG_TOP - (yBottom + h)
  wr.geometry = new THREE.CylinderGeometry(0.008, 0.008, Math.max(len, 0.01), 6)
  wr.position.set(0, -(len / 2), 0)
  group.add(wr)
  group.position.set(x, RIG_TOP, z)
  group.userData = { w: 0.35 + (seed % 10) * 0.045, p: seed * 1.7, a: 0.028 }
  swingers.push(group)
  scene.add(group)
  return group
}

hang(makeVineColumn(1), 1.5, 6.0, -1.1, 0.55, -2.6, 1)
hang(makeVineColumn(2), 1.3, 5.2, 0.6, 0.75, -3.1, 2)
hang(makeVineColumn(3), 1.15, 4.5, 2.0, 0.6, -2.2, 3)
hang(makeGrapeTree(1), 2.6, 3.6, -3.6, 1.1, -3.3, 4)
hang(makeGrapeTree(2), 2.2, 3.1, -2.3, 0.9, -2.0, 5)
hang(makeGrapeTree(3), 2.4, 3.3, 3.8, 1.0, -3.0, 6)

// the boat flies on its own wire
const boat = new THREE.Group()
const boatFlat = flat(makeBoatBird(), 3.0, 2.0)
boat.add(boatFlat)
const boatWire = new THREE.Mesh(
  new THREE.CylinderGeometry(0.008, 0.008, 4, 6),
  new THREE.MeshStandardMaterial({ color: 0x6a5a44, roughness: 0.6 })
)
boatWire.position.y = 2.6
boat.add(boatWire)
boat.position.set(0.4, 3.4, -1.2)
scene.add(boat)

// grounded pieces
const cloche = flat(makeCloche(), 1.15, 1.7)
cloche.position.set(-1.3, 0.86, 1.6)
scene.add(cloche)

const cart = flat(makeBarrelCart(), 2.1, 1.7)
cart.position.set(3.4, 0.9, 0.6)
cart.rotation.y = -0.15
scene.add(cart)

const figure = flat(makeFigure(), 0.85, 1.7)
figure.position.set(-4.3, 0.9, 2.3)
figure.rotation.y = 0.12
scene.add(figure)

// -- sizing ---------------------------------------------------------------------------

function applySize() {
  if (window.innerWidth && window.innerHeight) {
    width = window.innerWidth
    height = window.innerHeight
  }
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

applySize()
window.addEventListener("resize", applySize, false)

// -- interaction ----------------------------------------------------------------------

window.addEventListener("mousemove", e => {
  mouseX = (e.clientX / width - 0.5) * 2
  mouseY = (e.clientY / height - 0.5) * 2
})

// -- loop -----------------------------------------------------------------------------

const clock = new THREE.Clock()
let t = 0

function render() {
  if (width !== window.innerWidth || height !== window.innerHeight) applySize()

  const dt = Math.min(clock.getDelta(), 0.05)
  t += dt

  // every flat breathes on its wire
  for (const s of swingers) {
    const u = s.userData
    s.rotation.z = Math.sin(t * u.w + u.p) * u.a
    s.rotation.y = Math.sin(t * u.w * 0.6 + u.p * 2.0) * u.a * 1.6
  }

  // the boat ferries across the stage and bobs
  boat.position.x = Math.sin(t * 0.09) * 3.4 + 0.3
  boat.position.y = 3.35 + Math.sin(t * 0.5) * 0.12
  boat.rotation.z = Math.sin(t * 0.4 + 1.0) * 0.05
  boatFlat.rotation.y = Math.cos(t * 0.09) > 0 ? 0 : Math.PI // face the way it sails

  // stage light breathes
  key.intensity = 900 * (1 + 0.07 * Math.sin(t * 0.6))

  camera.position.x += (mouseX * 1.4 - camera.position.x) * 0.04
  camera.position.y += (2.3 - mouseY * 0.7 - camera.position.y) * 0.04
  camera.lookAt(0, 1.6, -1)

  renderer.render(scene, camera)
}

function animate() {
  requestAnimationFrame(animate)
  render()
}

animate()

window.__fable = { renderer, scene, camera, boat, swingers, render }
