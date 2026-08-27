import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Marionetes: the mark as a puppet troupe — every glyph hangs on its own string from a wooden batten, swinging out of phase under a stage spot.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x201014)
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

const shapes = []
const group = new THREE.Group()
group.position.y = -0.45
scene.add(group)
const bar = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 0.3),
  new THREE.MeshStandardMaterial({ color: 0x6a4a2e, roughness: 0.7 }))
bar.position.y = 1.35
group.add(bar)
const PAL = [0xc94a3a, 0xe8a03a, 0x3a8a6e, 0x4a6ab8, 0xb84a8a, 0xc9c93a]
new SVGLoader().load("redo-logo.svg", data => {
  const s = LOGO_W / 1840.49
  const meshes = []
  let i = 0
  const box = new THREE.Box3()
  for (const path of data.paths) for (const shape of SVGLoader.createShapes(path)) {
    const g = new THREE.ExtrudeGeometry(shape, { depth: 90, curveSegments: 20, bevelEnabled: false })
    g.scale(s, -s, s)
    g.computeBoundingBox()
    const bb = g.boundingBox
    const cx = (bb.min.x + bb.max.x) / 2
    const topY = bb.max.y
    // pivot к верхней точке формы
    g.translate(-cx, -topY, 0)
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: PAL[i % PAL.length], roughness: 0.55 }))
    meshes.push({ m, cx, topY })
    i++
  }
  // общий центр
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9
  for (const e of meshes) {
    minX = Math.min(minX, e.cx); maxX = Math.max(maxX, e.cx)
    minY = Math.min(minY, e.topY); maxY = Math.max(maxY, e.topY)
  }
  const ccx = (minX + maxX) / 2
  meshes.forEach((e, idx) => {
    const pivot = new THREE.Group()
    pivot.position.set(e.cx - ccx, 1.35, 0)
    const drop = 1.35 - (e.topY - (minY + maxY) / 2) - 0.55
    e.m.position.y = -drop
    pivot.add(e.m)
    // нить
    const lg = new THREE.BufferGeometry()
    lg.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, -drop, 0], 3))
    pivot.add(new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xc9baa0, transparent: true, opacity: 0.5 })))
    group.add(pivot)
    shapes.push({ pivot, ph: idx * 1.1, sp: 0.8 + (idx % 3) * 0.25 })
  })
})
const spot = new THREE.SpotLight(0xffe8c0, 260, 30, 0.7, 0.5, 2)
spot.position.set(0, 5, 4)
scene.add(spot, new THREE.AmbientLight(0x3a2a30, 0.9))
function tick(dt) {
  for (const s2 of shapes) {
    s2.pivot.rotation.z = Math.sin(t * s2.sp + s2.ph) * 0.16 + mouseX * 0.05
    s2.pivot.rotation.x = Math.sin(t * s2.sp * 0.7 + s2.ph * 2) * 0.06
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
