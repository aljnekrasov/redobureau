import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Pikseli: an LED ticker wall — the mark scrolls across a curved screen of physical pixels, each one a cube that lights hot red as the word passes through it.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x060404)
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 300)

function applySize() {
  width = window.innerWidth || width; height = window.innerHeight || height
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  const halfA = Math.atan(Math.tan((camera.fov * Math.PI) / 360) * camera.aspect)
  camera.position.z = (LOGO_W / 2 / 0.62) / Math.tan(halfA)
  camera.updateProjectionMatrix()
}
applySize()
window.addEventListener("resize", applySize)
window.addEventListener("mousemove", e => {
  mouseX = (e.clientX / width - 0.5) * 2
  mouseY = (e.clientY / height - 0.5) * 2
  if (lastX !== null) energy = Math.min(energy + Math.hypot(e.clientX - lastX, e.clientY - lastY) / Math.max(width, height) * 5, 1.6)
  lastX = e.clientX; lastY = e.clientY
})

function loadMask(done) {
  fetch("redo-logo.svg").then(r => r.text()).then(svg => {
    const sized = svg.replace(/currentColor/g, "#fff")
      .replace("<svg ", '<svg width="1840.49" height="468.42" ')
    const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }))
    const img = new Image()
    img.onload = () => {
      const MW = 512, MH = 140
      const c = document.createElement("canvas"); c.width = MW; c.height = MH
      const g = c.getContext("2d")
      const s = Math.min((MW * 0.96) / img.width, (MH * 0.9) / img.height)
      const dw = img.width * s, dh = img.height * s
      g.drawImage(img, (MW - dw) / 2, (MH - dh) / 2, dw, dh)
      done(g.getImageData(0, 0, MW, MH).data, MW, MH, c)
      URL.revokeObjectURL(url)
    }
    img.src = url
  })
}

let inst = null, N = 0, MASK = null, MMW = 0, MMH = 0
const GX = 110, GY = 32
const cellIdx = []
loadMask((data, MW, MH) => {
  MASK = data; MMW = MW; MMH = MH
  const size = LOGO_W * 1.35 / GX
  N = GX * GY
  inst = new THREE.InstancedMesh(new THREE.BoxGeometry(size * 0.8, size * 0.8, size * 0.9),
    new THREE.MeshBasicMaterial(), N)
  inst.frustumCulled = false
  const dummy = new THREE.Object3D()
  let i = 0
  for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) {
    const x = (gx / GX - 0.5) * LOGO_W * 1.35
    const y = -(gy / GY - 0.5) * LOGO_W * 1.35 * (GY / GX)
    dummy.position.set(x, y, -Math.pow(x * 0.42, 2) * 0.35)
    dummy.updateMatrix()
    inst.setMatrixAt(i, dummy.matrix)
    inst.setColorAt(i, new THREE.Color(0x180a08))
    cellIdx.push([gx, gy])
    i++
  }
  inst.instanceColor.needsUpdate = true
  scene.add(inst)
})
const LIT = new THREE.Color(0xff2a1a), DIM = new THREE.Color(0x1c0a08), MID = new THREE.Color(0x5e130c)
const cc = new THREE.Color()
function tick(dt) {
  if (!inst || !MASK) return
  const scroll = (t * 0.22) % 2
  for (let i = 0; i < N; i++) {
    const [gx, gy] = cellIdx[i]
    let u = gx / GX + 1.05 - scroll
    let lit = 0
    if (u >= 0 && u < 1) {
      const mx = Math.floor(u * MMW)
      const my = Math.floor(((gy / GY) * 0.72 + 0.14) * MMH)
      if (MASK[(my * MMW + mx) * 4 + 3] > 128) lit = 1
    }
    const flick = 0.85 + 0.15 * Math.sin(t * 22 + i)
    cc.copy(DIM).lerp(lit ? LIT : DIM, 1).lerp(lit ? LIT : DIM, 0)
    if (lit) { cc.copy(LIT).multiplyScalar(flick) } else { cc.copy(gx % 8 === 0 ? MID : DIM) }
    inst.setColorAt(i, cc)
  }
  inst.instanceColor.needsUpdate = true
  inst.rotation.y = mouseX * 0.25
  inst.rotation.x = -mouseY * 0.12
}

const clock = new THREE.Clock()
let t = 0
function render() {
  if (width !== window.innerWidth || height !== window.innerHeight) applySize()
  const dt = Math.min(clock.getDelta(), 0.05)
  t += dt
  energy *= Math.pow(0.5, dt)
  tick(dt)
  renderer.render(scene, camera)
}
function animate() { requestAnimationFrame(animate); render() }
animate()

window.__fable = { renderer, scene, camera, get t() { return t }, set t(v) { t = v }, render }
