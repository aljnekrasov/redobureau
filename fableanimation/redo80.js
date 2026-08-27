import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Diegs: the mark written in yarn — a crimson thread lays itself along every contour, loop by loop, until the word is stitched, then unravels.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0xefe6d8)
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

const tubes = []
let total = 0
new SVGLoader().load("redo-logo.svg", data => {
  const s = LOGO_W / 1840.49
  const loops = []
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9
  for (const path of data.paths) for (const sp of path.subPaths) {
    const pts = sp.getPoints(60).map(p => new THREE.Vector3(p.x * s, -p.y * s, 0))
    if (pts.length < 6) continue
    for (const p of pts) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
    }
    loops.push(pts)
  }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
  const group = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({ color: 0xb83a4a, roughness: 0.8 })
  for (const pts of loops) {
    for (const p of pts) { p.x -= cx; p.y -= cy }
    const curve = new THREE.CatmullRomCurve3(pts, true)
    const geo = new THREE.TubeGeometry(curve, 220, 0.022, 7, true)
    const m = new THREE.Mesh(geo, mat)
    m.frustumCulled = false
    const count = geo.index.count
    group.add(m)
    tubes.push({ m, count })
    total += count
  }
  scene.add(group)
  window.__yarn = group
})
scene.add(new THREE.AmbientLight(0xfff2e8, 0.85))
const key = new THREE.DirectionalLight(0xfff4dd, 1.5)
key.position.set(2, 4, 5)
scene.add(key)
function tick(dt) {
  if (!tubes.length) return
  const c = (t % 16) / 16
  let prog
  if (c < 0.55) prog = c / 0.55
  else if (c < 0.75) prog = 1
  else prog = 1 - (c - 0.75) / 0.25
  let acc = prog * total
  for (const tu of tubes) {
    const n = Math.max(0, Math.min(tu.count, acc))
    tu.m.geometry.setDrawRange(0, Math.floor(n / 3) * 3)
    acc -= tu.count
  }
  const g = window.__yarn
  if (g) {
    g.rotation.y = Math.sin(t * 0.3) * 0.25 + mouseX * 0.3
    g.rotation.x = Math.sin(t * 0.2) * 0.07 - mouseY * 0.12
  }
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
