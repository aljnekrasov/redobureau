import * as THREE from "three"

// Iela: the same theatre-maquette language as Skatuve, but the stage is a
// Buenos Aires street. The obelisk rises at the back, balconied townhouse
// facades and blossoming jacarandas hang on wires, a vintage colectivo
// stands at the kerb, a tango pair holds a dip under a curled street lamp,
// and a winged bandoneon ferries across the fly loft trailing music. The
// floor is the classic ridged sidewalk tile. Ivory paper, ink lines, a
// breath of jacaranda blue.

const IVORY = "#EAE3C9"
const INK = "#4A3B28"
const BLUE = "#8FB6DD"

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
  return mesh
}

// -- cut-out artwork ------------------------------------------------------------------

// the obelisk
function makeObelisk() {
  const c = document.createElement("canvas")
  c.width = 256
  c.height = 1024
  const g = c.getContext("2d")
  g.fillStyle = IVORY
  g.strokeStyle = INK
  g.lineWidth = 4
  g.beginPath()
  g.moveTo(128, 14)
  g.lineTo(158, 90)
  g.lineTo(146, 96)
  g.lineTo(170, 880)
  g.lineTo(86, 880)
  g.lineTo(110, 96)
  g.lineTo(98, 90)
  g.closePath()
  g.fill()
  g.stroke()
  // base
  g.beginPath()
  g.rect(66, 880, 124, 90)
  g.fill()
  g.stroke()
  // window and seams
  g.lineWidth = 2.5
  g.beginPath()
  g.rect(118, 130, 20, 30)
  g.stroke()
  for (const y of [300, 500, 700]) {
    g.beginPath()
    g.moveTo(104 + (y / 880) * 8, y)
    g.lineTo(152 - (y / 880) * 8, y)
    g.stroke()
  }
  g.beginPath()
  g.moveTo(66, 916)
  g.lineTo(190, 916)
  g.stroke()
  return c
}

// balconied townhouse facade
function makeFacade(seed) {
  const c = document.createElement("canvas")
  c.width = 512
  c.height = 768
  const g = c.getContext("2d")
  const rnd = (n) => {
    const x = Math.sin(seed * 77.7 + n * 39.1) * 43758.5453
    return x - Math.floor(x)
  }
  const W = 380 + Math.floor(rnd(1) * 90)
  const x0 = (512 - W) / 2
  g.fillStyle = IVORY
  g.strokeStyle = INK

  // body with parapet
  g.lineWidth = 4
  g.beginPath()
  g.rect(x0, 90, W, 660)
  g.fill()
  g.stroke()
  // parapet balusters
  for (let x = x0 + 14; x < x0 + W - 10; x += 22) {
    g.lineWidth = 2
    g.beginPath()
    g.rect(x, 52, 10, 38)
    g.fill()
    g.stroke()
  }
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(x0 - 12, 52)
  g.lineTo(x0 + W + 12, 52)
  g.stroke()
  // cornice
  g.beginPath()
  g.moveTo(x0 - 10, 120)
  g.lineTo(x0 + W + 10, 120)
  g.stroke()

  const floors = 3
  const cols = 2 + Math.floor(rnd(2) * 2)
  const colW = W / cols
  for (let f = 0; f < floors; f++) {
    const y = 170 + f * 200
    for (let k = 0; k < cols; k++) {
      const x = x0 + colW * (k + 0.5)
      // arched tall window, punched through
      g.save()
      g.globalCompositeOperation = "destination-out"
      g.beginPath()
      g.moveTo(x - 32, y + 130)
      g.lineTo(x - 32, y + 30)
      g.arc(x, y + 30, 32, Math.PI, 0)
      g.lineTo(x + 32, y + 130)
      g.closePath()
      g.fill()
      g.restore()
      // frame
      g.lineWidth = 3
      g.beginPath()
      g.moveTo(x - 32, y + 130)
      g.lineTo(x - 32, y + 30)
      g.arc(x, y + 30, 32, Math.PI, 0)
      g.lineTo(x + 32, y + 130)
      g.closePath()
      g.stroke()
      // shutters hint
      g.lineWidth = 1.6
      for (let s = -1; s <= 1; s += 2) {
        for (let yy = y + 40; yy < y + 120; yy += 12) {
          g.beginPath()
          g.moveTo(x + s * 36, yy)
          g.lineTo(x + s * 46, yy)
          g.stroke()
        }
      }
      // balcony railing
      g.lineWidth = 2.5
      g.beginPath()
      g.moveTo(x - 48, y + 130)
      g.lineTo(x + 48, y + 130)
      g.stroke()
      for (let bx = -44; bx <= 44; bx += 11) {
        g.beginPath()
        g.moveTo(x + bx, y + 130)
        g.quadraticCurveTo(x + bx + 5, y + 152, x + bx, y + 172)
        g.stroke()
      }
      g.beginPath()
      g.moveTo(x - 48, y + 172)
      g.lineTo(x + 48, y + 172)
      g.stroke()
    }
  }
  return c
}

// jacaranda: ink trunk, crown of pale blue blossoms
function makeJacaranda(seed) {
  const c = document.createElement("canvas")
  c.width = 512
  c.height = 640
  const g = c.getContext("2d")
  const rnd = (n) => {
    const x = Math.sin(seed * 61.3 + n * 83.7) * 43758.5453
    return x - Math.floor(x)
  }
  g.strokeStyle = INK
  g.lineWidth = 6
  g.beginPath()
  g.moveTo(256, 630)
  g.quadraticCurveTo(246, 480, 256, 420)
  g.stroke()
  g.lineWidth = 3.5
  for (const [dx, dy] of [[-90, -60], [80, -80], [-30, -110], [50, -30]]) {
    g.beginPath()
    g.moveTo(256, 430)
    g.quadraticCurveTo(256 + dx * 0.5, 400 + dy * 0.5, 256 + dx, 360 + dy)
    g.stroke()
  }
  // blossom cloud
  for (let k = 0; k < 190; k++) {
    const a = rnd(k) * Math.PI * 2
    const rr = Math.sqrt(rnd(k + 500)) * 200
    const x = 256 + Math.cos(a) * rr * 1.15
    const y = 250 + Math.sin(a) * rr * 0.72
    g.fillStyle = rnd(k + 900) > 0.22 ? BLUE : IVORY
    g.beginPath()
    g.arc(x, y, 7 + rnd(k + 300) * 7, 0, Math.PI * 2)
    g.fill()
    g.lineWidth = 1.2
    g.beginPath()
    g.arc(x, y, 7 + rnd(k + 300) * 7, 0, Math.PI * 2)
    g.stroke()
  }
  return c
}

// vintage colectivo, side view, fileteado swirls
function makeColectivo() {
  const c = document.createElement("canvas")
  c.width = 768
  c.height = 420
  const g = c.getContext("2d")
  g.fillStyle = IVORY
  g.strokeStyle = INK

  // body
  g.lineWidth = 4
  g.beginPath()
  g.moveTo(60, 320)
  g.lineTo(60, 190)
  g.quadraticCurveTo(60, 130, 130, 126)
  g.lineTo(560, 118)
  g.quadraticCurveTo(650, 116, 680, 170)
  g.quadraticCurveTo(710, 195, 710, 240)
  g.lineTo(710, 320)
  g.closePath()
  g.fill()
  g.stroke()

  // windows punched
  g.globalCompositeOperation = "destination-out"
  for (let k = 0; k < 5; k++) {
    g.beginPath()
    g.rect(120 + k * 95, 140, 72, 62)
    g.fill()
  }
  g.globalCompositeOperation = "source-over"
  for (let k = 0; k < 5; k++) {
    g.lineWidth = 3
    g.beginPath()
    g.rect(120 + k * 95, 140, 72, 62)
    g.stroke()
  }
  // windshield
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(620, 140)
  g.quadraticCurveTo(670, 150, 686, 195)
  g.lineTo(650, 205)
  g.quadraticCurveTo(640, 160, 615, 152)
  g.closePath()
  g.stroke()

  // blue waist stripe with fileteado curls
  g.strokeStyle = BLUE
  g.lineWidth = 10
  g.beginPath()
  g.moveTo(64, 235)
  g.lineTo(706, 235)
  g.stroke()
  g.strokeStyle = INK
  g.lineWidth = 2.2
  for (let x = 100; x < 660; x += 110) {
    g.beginPath()
    g.moveTo(x, 262)
    g.quadraticCurveTo(x + 26, 250, x + 46, 262)
    g.quadraticCurveTo(x + 60, 270, x + 74, 258)
    g.stroke()
    g.beginPath()
    g.arc(x + 30, 268, 6, 0, Math.PI * 2)
    g.stroke()
  }

  // wheels
  const wheel = (x) => {
    g.fillStyle = IVORY
    g.lineWidth = 4
    g.beginPath()
    g.arc(x, 330, 56, 0, Math.PI * 2)
    g.fill()
    g.stroke()
    g.lineWidth = 2
    for (let k = 0; k < 8; k++) {
      g.beginPath()
      g.moveTo(x, 330)
      g.lineTo(x + Math.cos(k * Math.PI / 4) * 56, 330 + Math.sin(k * Math.PI / 4) * 56)
      g.stroke()
    }
    g.beginPath()
    g.arc(x, 330, 14, 0, Math.PI * 2)
    g.stroke()
  }
  wheel(180)
  wheel(560)
  return c
}

// tango pair in a dip
function makeTango() {
  const c = document.createElement("canvas")
  c.width = 384
  c.height = 420
  const g = c.getContext("2d")
  g.fillStyle = IVORY
  g.strokeStyle = INK
  g.lineWidth = 3

  // leader: leaning figure
  g.beginPath()
  g.moveTo(150, 400)
  g.lineTo(168, 300)
  g.quadraticCurveTo(140, 250, 168, 205)
  g.quadraticCurveTo(150, 165, 178, 152)
  g.quadraticCurveTo(206, 142, 212, 172)
  g.quadraticCurveTo(216, 196, 200, 210)
  g.quadraticCurveTo(250, 230, 262, 275)
  g.lineTo(300, 330)
  g.lineTo(284, 342)
  g.lineTo(246, 296)
  g.quadraticCurveTo(230, 320, 208, 322)
  g.lineTo(226, 400)
  g.lineTo(206, 400)
  g.lineTo(186, 330)
  g.lineTo(170, 400)
  g.closePath()
  g.fill()
  g.stroke()

  // follower: dipped figure, arched back, one leg extended
  g.beginPath()
  g.moveTo(258, 282)
  g.quadraticCurveTo(300, 250, 330, 262)
  g.quadraticCurveTo(356, 272, 350, 296)
  g.quadraticCurveTo(346, 316, 322, 318)
  g.quadraticCurveTo(300, 348, 262, 342)
  g.lineTo(180, 396)
  g.lineTo(170, 382)
  g.lineTo(240, 330)
  g.quadraticCurveTo(236, 306, 258, 282)
  g.closePath()
  g.fill()
  g.stroke()
  // her hair knot
  g.fillStyle = INK
  g.beginPath()
  g.arc(348, 282, 9, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = IVORY
  return c
}

// curled street lamp with a blue-glass lantern
function makeFarol() {
  const c = document.createElement("canvas")
  c.width = 256
  c.height = 640
  const g = c.getContext("2d")
  g.strokeStyle = INK
  g.fillStyle = IVORY
  g.lineWidth = 6
  g.beginPath()
  g.moveTo(80, 630)
  g.lineTo(80, 120)
  g.quadraticCurveTo(80, 60, 150, 66)
  g.quadraticCurveTo(190, 72, 186, 108)
  g.stroke()
  g.lineWidth = 2.5
  g.beginPath()
  g.moveTo(60, 630)
  g.lineTo(102, 630)
  g.stroke()
  g.beginPath()
  g.moveTo(64, 596)
  g.lineTo(98, 596)
  g.stroke()
  // curl
  g.beginPath()
  g.moveTo(150, 66)
  g.quadraticCurveTo(120, 84, 132, 104)
  g.stroke()
  // lantern
  g.lineWidth = 3
  g.fillStyle = BLUE
  g.beginPath()
  g.moveTo(186, 112)
  g.lineTo(206, 112)
  g.lineTo(200, 170)
  g.lineTo(176, 170)
  g.closePath()
  g.fill()
  g.stroke()
  g.fillStyle = IVORY
  g.beginPath()
  g.moveTo(170, 104)
  g.lineTo(212, 104)
  g.lineTo(206, 116)
  g.lineTo(176, 116)
  g.closePath()
  g.fill()
  g.stroke()
  return c
}

// winged bandoneon, bellows fanned like rigging, music curls behind
function makeBandoneon() {
  const c = document.createElement("canvas")
  c.width = 768
  c.height = 460
  const g = c.getContext("2d")
  g.strokeStyle = INK
  g.fillStyle = IVORY

  // music streamers
  g.lineWidth = 1.6
  for (let k = 0; k < 4; k++) {
    g.beginPath()
    g.moveTo(120, 210 + k * 16)
    g.quadraticCurveTo(40 + k * 10, 190 + k * 30, 70, 120 + k * 26)
    g.stroke()
  }

  // bellows fan
  const bx = 384, by = 260
  g.lineWidth = 2.4
  for (let k = -6; k <= 6; k++) {
    g.beginPath()
    g.moveTo(bx - 120, by + k * 4)
    g.quadraticCurveTo(bx, by + k * 26, bx + 120, by + k * 4)
    g.stroke()
  }

  // end boxes with button dots
  const box = (x, tilt) => {
    g.save()
    g.translate(x, by)
    g.rotate(tilt)
    g.lineWidth = 4
    g.beginPath()
    g.rect(-58, -95, 116, 190)
    g.fill()
    g.stroke()
    g.lineWidth = 1.8
    for (let r = 0; r < 4; r++) {
      for (let k = 0; k < 6; k++) {
        g.beginPath()
        g.arc(-32 + r * 21, -62 + k * 25, 6, 0, Math.PI * 2)
        g.stroke()
      }
    }
    g.restore()
  }
  box(bx - 178, -0.10)
  box(bx + 178, 0.10)

  // little wings on top
  g.lineWidth = 2.5
  for (const s of [-1, 1]) {
    g.beginPath()
    g.moveTo(bx + s * 190, by - 100)
    g.quadraticCurveTo(bx + s * 260, by - 170, bx + s * 210, by - 190)
    g.quadraticCurveTo(bx + s * 180, by - 196, bx + s * 178, by - 150)
    g.closePath()
    g.fill()
    g.stroke()
  }
  return c
}

// sidewalk floor: the ridged vereda tiles plus a plaza medallion
function makeFloor() {
  const c = document.createElement("canvas")
  c.width = 2048
  c.height = 1024
  const g = c.getContext("2d")
  g.fillStyle = "#DCD5BD"
  g.fillRect(0, 0, 2048, 1024)
  g.strokeStyle = "rgba(74, 59, 40, 0.7)"

  const T = 128
  for (let ty = 0; ty < 8; ty++) {
    for (let tx = 0; tx < 16; tx++) {
      const x = tx * T, y = ty * T
      g.lineWidth = 2.4
      g.strokeRect(x + 2, y + 2, T - 4, T - 4)
      // ridged fan: diagonal grooves, alternating direction
      g.lineWidth = 1.1
      const flip = (tx + ty) % 2 === 0
      for (let k = 1; k < 8; k++) {
        g.beginPath()
        if (flip) {
          g.moveTo(x + 6, y + (k / 8) * T)
          g.lineTo(x + (k / 8) * T, y + 6)
        } else {
          g.moveTo(x + T - 6, y + (k / 8) * T)
          g.lineTo(x + T - (k / 8) * T, y + 6)
        }
        g.stroke()
      }
    }
  }

  // plaza medallion over the tiles
  const cx = 1024, cy = 560
  g.fillStyle = "#DCD5BD"
  g.beginPath()
  g.arc(cx, cy, 235, 0, Math.PI * 2)
  g.fill()
  g.lineWidth = 4
  g.beginPath()
  g.arc(cx, cy, 232, 0, Math.PI * 2)
  g.stroke()
  g.lineWidth = 2
  g.beginPath()
  g.arc(cx, cy, 180, 0, Math.PI * 2)
  g.stroke()
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2
    g.beginPath()
    g.moveTo(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60)
    g.lineTo(cx + Math.cos(a) * 180, cy + Math.sin(a) * 180)
    g.stroke()
  }
  g.beginPath()
  g.arc(cx, cy, 60, 0, Math.PI * 2)
  g.stroke()
  return c
}

// -- build the street -----------------------------------------------------------------

const floorTex = new THREE.CanvasTexture(makeFloor())
floorTex.colorSpace = THREE.SRGBColorSpace
floorTex.anisotropy = 8
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(16, 9),
  new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85 })
)
floor.rotation.x = -Math.PI / 2 + 0.055
floor.position.set(0, 0, 0.5)
floor.receiveShadow = true
scene.add(floor)

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

const RIG_TOP = 7.2
const swingers = []

function hang(cv, w, h, x, yBottom, z, seed) {
  const group = new THREE.Group()
  const piece = flat(cv, w, h)
  piece.position.y = -(RIG_TOP - (yBottom + h / 2))
  group.add(piece)
  const len = RIG_TOP - (yBottom + h)
  const wr = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, Math.max(len, 0.01), 6),
    new THREE.MeshStandardMaterial({ color: 0x6a5a44, roughness: 0.6 })
  )
  wr.position.set(0, -(len / 2), 0)
  group.add(wr)
  group.position.set(x, RIG_TOP, z)
  group.userData = { w: 0.35 + (seed % 10) * 0.045, p: seed * 1.7, a: 0.028 }
  swingers.push(group)
  scene.add(group)
  return group
}

hang(makeObelisk(), 1.35, 5.9, 0.3, 0.55, -3.6, 1)
hang(makeFacade(1), 2.4, 3.7, -3.4, 0.7, -2.9, 2)
hang(makeFacade(2), 2.1, 3.4, -1.7, 0.8, -2.3, 3)
hang(makeFacade(3), 2.3, 3.6, 1.9, 0.75, -2.7, 4)
hang(makeFacade(4), 2.0, 3.2, 3.6, 0.85, -2.1, 5)
hang(makeJacaranda(1), 2.3, 2.9, -2.6, 0.8, -1.6, 6)
hang(makeJacaranda(2), 2.0, 2.5, 2.8, 0.8, -1.4, 7)

// the bandoneon flies the loft
const bird = new THREE.Group()
const birdFlat = flat(makeBandoneon(), 2.9, 1.75)
bird.add(birdFlat)
const birdWire = new THREE.Mesh(
  new THREE.CylinderGeometry(0.008, 0.008, 4, 6),
  new THREE.MeshStandardMaterial({ color: 0x6a5a44, roughness: 0.6 })
)
birdWire.position.y = 2.6
bird.add(birdWire)
bird.position.set(0.4, 3.6, -1.0)
scene.add(bird)

// street level
const colectivo = flat(makeColectivo(), 2.9, 1.6)
colectivo.position.set(3.3, 0.85, 0.7)
colectivo.rotation.y = -0.12
scene.add(colectivo)

const tango = flat(makeTango(), 1.5, 1.65)
tango.position.set(-1.5, 0.85, 1.7)
tango.rotation.y = 0.08
scene.add(tango)

const farol = flat(makeFarol(), 0.95, 2.4)
farol.position.set(-4.2, 1.22, 1.9)
farol.rotation.y = 0.15
scene.add(farol)

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

  for (const s of swingers) {
    const u = s.userData
    s.rotation.z = Math.sin(t * u.w + u.p) * u.a
    s.rotation.y = Math.sin(t * u.w * 0.6 + u.p * 2.0) * u.a * 1.6
  }

  bird.position.x = Math.sin(t * 0.08) * 3.6 + 0.3
  bird.position.y = 3.55 + Math.sin(t * 0.45) * 0.14
  bird.rotation.z = Math.sin(t * 0.38 + 1.0) * 0.05
  birdFlat.rotation.y = Math.cos(t * 0.08) > 0 ? 0 : Math.PI

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

window.__fable = { renderer, scene, camera, bird, swingers, render }
