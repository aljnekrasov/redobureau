import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Caurules: the outlines of the letters bent from glass tubing — every contour is a closed neon tube with its own gas color, flickering like a workshop sign.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x150710)
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

const NEON = [0xff4fd8, 0x4fe8ff, 0xffc94f, 0x9fff4f, 0xff6a4f, 0x8f6bff]
const halos = [], cores = []
new SVGLoader().load("redo-logo.svg", data => {
  const s = LOGO_W / 1840.49
  const loops = []
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9
  for (const path of data.paths) for (const sp of path.subPaths) {
    const pts = sp.getPoints(64).map(p => new THREE.Vector3(p.x * s, -p.y * s, 0))
    if (pts.length < 6) continue
    for (const p of pts) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
    }
    loops.push(pts)
  }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
  const group = new THREE.Group()
  loops.forEach((pts, i) => {
    for (const p of pts) { p.x -= cx; p.y -= cy }
    const curve = new THREE.CatmullRomCurve3(pts, true)
    const col = NEON[i % NEON.length]
    const core = new THREE.Mesh(new THREE.TubeGeometry(curve, 200, 0.016, 8, true),
      new THREE.MeshBasicMaterial({ color: col }))
    const halo = new THREE.Mesh(new THREE.TubeGeometry(curve, 200, 0.040, 8, true),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }))
    group.add(core, halo)
    cores.push(core); halos.push(halo)
  })
  scene.add(group)
  window.__tubes = group
})
function tick(dt) {
  const g = window.__tubes
  if (!g) return
  g.rotation.y = Math.sin(t * 0.35) * 0.32 + mouseX * 0.4
  g.rotation.x = Math.sin(t * 0.26) * 0.1 - mouseY * 0.18
  for (let i = 0; i < halos.length; i++) {
    let o = 0.18 + 0.10 * Math.sin(t * 7 + i * 2.3)
    if (Math.random() < 0.006) o *= 0.2
    halos[i].material.opacity = o
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
