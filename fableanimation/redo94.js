import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Kritiens: gravity theatre — the glyphs drop in from above one after another, bounce with a squash on landing, settle into the word, then leap back up and go again.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x101216)
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 300)

function applySize() {
  width = window.innerWidth || width; height = window.innerHeight || height
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  const halfA = Math.atan(Math.tan((camera.fov * Math.PI) / 360) * camera.aspect)
  camera.position.z = (LOGO_W / 2 / 0.78) / Math.tan(halfA)
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

const parts = []
const group = new THREE.Group()
scene.add(group)
new SVGLoader().load("redo-logo.svg", data => {
  const s = LOGO_W / 1840.49
  const entries = []
  let i = 0
  for (const path of data.paths) for (const shape of SVGLoader.createShapes(path)) {
    const g = new THREE.ExtrudeGeometry(shape, { depth: 110, curveSegments: 20, bevelEnabled: false })
    g.scale(s, -s, s)
    g.computeBoundingBox()
    const bb = g.boundingBox
    const cx = (bb.min.x + bb.max.x) / 2, cy = (bb.min.y + bb.max.y) / 2
    g.translate(-cx, -cy, 0)
    entries.push({ g, cx, cy, idx: i })
    i++
  }
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9
  for (const e of entries) {
    minX = Math.min(minX, e.cx); maxX = Math.max(maxX, e.cx)
    minY = Math.min(minY, e.cy); maxY = Math.max(maxY, e.cy)
  }
  const ccx = (minX + maxX) / 2, ccy = (minY + maxY) / 2
  for (const e of entries) {
    const m = new THREE.Mesh(e.g, new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.6 }))
    const hx = e.cx - ccx, hy = e.cy - ccy
    m.position.set(hx, hy + 4, 0)
    group.add(m)
    parts.push({ m, hx, hy, delay: e.idx * 0.35 + Math.random() * 0.15 })
  }
})
scene.add(new THREE.AmbientLight(0x8a8ca0, 0.6))
const key = new THREE.DirectionalLight(0xffffff, 1.6)
key.position.set(2, 5, 5)
scene.add(key)
function tick(dt) {
  const CYC = 11
  const c = t % CYC
  for (const p of parts) {
    let y, sy = 1
    const lt = c - p.delay
    if (lt < 0) y = 4
    else if (lt < 1.0) {
      // падение с двумя отскоками
      const k = lt / 1.0
      const b = Math.abs(Math.cos(k * Math.PI * 1.5)) * Math.pow(1 - k, 1.6)
      y = b * 2.6
      if (y < 0.05 && k > 0.3) sy = 0.82 + 0.18 * Math.min(1, (y / 0.05))
    } else if (c < CYC - 1.2) y = 0
    else {
      const k = (c - (CYC - 1.2)) / 1.2
      y = Math.pow(k, 2) * 5
    }
    p.m.position.y = p.hy + y
    p.m.scale.y = sy
    p.m.scale.x = 2 - sy
  }
  group.rotation.y = mouseX * 0.25
  group.rotation.x = -mouseY * 0.1
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
