import * as THREE from "three"

// Audums: the mark printed on silk. A wide bolt of ivory cloth hangs in a
// dark room, pinned along its left edge; wind travels through it in long
// rolling waves, the ink of the logotype stretching and folding with the
// weave. Light rakes across the ripples so every fold reads. The cursor is
// a draught — a gust that punches a travelling bulge through the fabric.

const FLAG_W = 10
const FLAG_H = 5
const SEG_X = 140
const SEG_Y = 70

let width = window.innerWidth || 1280
let height = window.innerHeight || 720

let mouseWX = 0, mouseWY = 0
let energy = 0
let lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b0c10)

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)

// -- the printed cloth texture ---------------------------------------------------------

const texCanvas = document.createElement("canvas")
texCanvas.width = 2048
texCanvas.height = 1024
const texture = new THREE.CanvasTexture(texCanvas)
texture.anisotropy = 4

function paintCloth(img) {
  const g = texCanvas.getContext("2d")
  g.fillStyle = "#efeadf"
  g.fillRect(0, 0, 2048, 1024)
  // a faint weave
  g.globalAlpha = 0.05
  g.strokeStyle = "#8a8378"
  g.lineWidth = 1
  g.beginPath()
  for (let y = 0; y < 1024; y += 4) { g.moveTo(0, y); g.lineTo(2048, y) }
  g.stroke()
  g.globalAlpha = 0.035
  g.beginPath()
  for (let x = 0; x < 2048; x += 4) { g.moveTo(x, 0); g.lineTo(x, 1024) }
  g.stroke()
  g.globalAlpha = 1
  if (img) {
    const dw = 2048 * 0.64
    const dh = dw * (468.42 / 1840.49)
    g.drawImage(img, (2048 - dw) / 2, (1024 - dh) / 2, dw, dh)
  }
  texture.needsUpdate = true
}
paintCloth(null)

fetch("redo-logo.svg").then(r => r.text()).then(svg => {
  const sized = svg.replace(/currentColor/g, "#15171c")
    .replace("<svg ", '<svg width="1840.49" height="468.42" ')
  const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }))
  const img = new Image()
  img.onload = () => { paintCloth(img); URL.revokeObjectURL(url) }
  img.src = url
})

// -- the cloth -------------------------------------------------------------------------

const geo = new THREE.PlaneGeometry(FLAG_W, FLAG_H, SEG_X, SEG_Y)
const mat = new THREE.MeshStandardMaterial({
  map: texture, side: THREE.DoubleSide, roughness: 0.92, metalness: 0.0
})
const cloth = new THREE.Mesh(geo, mat)
cloth.rotation.y = -0.16
scene.add(cloth)

const basePos = geo.attributes.position.array.slice()

// -- light -----------------------------------------------------------------------------

const key = new THREE.DirectionalLight(0xfff2dd, 1.35)
key.position.set(4, 5, 8)
scene.add(key)
const fill = new THREE.DirectionalLight(0x7f8db2, 0.4)
fill.position.set(-6, -3, 5)
scene.add(fill)
const rim = new THREE.DirectionalLight(0xffffff, 0.5)
rim.position.set(-2, 3, -7)
scene.add(rim)
scene.add(new THREE.AmbientLight(0xffffff, 0.32))

// -- sizing / input --------------------------------------------------------------------

function applySize() {
  width = window.innerWidth || width; height = window.innerHeight || height
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  const halfA = Math.atan(Math.tan((camera.fov * Math.PI) / 360) * camera.aspect)
  camera.position.set(0.4, 0.15, (FLAG_W / 2 / 0.82) / Math.tan(halfA))
  camera.lookAt(0, 0, 0)
  camera.updateProjectionMatrix()
}
applySize()
window.addEventListener("resize", applySize)

window.addEventListener("mousemove", e => {
  // rough world position of the cursor on the cloth plane
  const visH = 2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360)
  const visW = visH * camera.aspect
  mouseWX = (e.clientX / width - 0.5) * visW
  mouseWY = -(e.clientY / height - 0.5) * visH
  if (lastX !== null) energy = Math.min(energy + Math.hypot(e.clientX - lastX, e.clientY - lastY) / Math.max(width, height) * 6, 1.6)
  lastX = e.clientX; lastY = e.clientY
})

// -- loop ------------------------------------------------------------------------------

const clock = new THREE.Clock()
let t = 0

function render() {
  if (width !== window.innerWidth || height !== window.innerHeight) applySize()
  const dt = Math.min(clock.getDelta(), 0.05)
  t += dt
  energy *= Math.pow(0.45, dt)

  const arr = geo.attributes.position.array
  for (let i = 0; i < arr.length; i += 3) {
    const x = basePos[i], y = basePos[i + 1]
    const xn = (x + FLAG_W / 2) / FLAG_W          // 0 at the pinned edge
    const amp = Math.pow(xn, 1.25)
    let z =
      amp * (0.52 * Math.sin(1.35 * x - 2.1 * t + 0.8 * y)
           + 0.26 * Math.sin(2.9 * x - 3.4 * t + 1.7)
           + 0.16 * Math.sin(2.1 * y + 1.8 * t))
    // the cursor draught
    const dx = x - mouseWX, dy = y - mouseWY
    z += Math.exp(-(dx * dx + dy * dy) / 1.3) * Math.sin(t * 7 - x * 2) * 0.55 * energy * amp
    arr[i + 2] = z
  }
  geo.attributes.position.needsUpdate = true
  geo.computeVertexNormals()

  cloth.rotation.y = -0.16 + Math.sin(t * 0.23) * 0.05

  renderer.render(scene, camera)
}
function animate() { requestAnimationFrame(animate); render() }
animate()

window.__fable = { renderer, scene, camera, get t() { return t }, set t(v) { t = v }, render }
