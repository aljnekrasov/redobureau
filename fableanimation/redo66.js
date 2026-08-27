import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js"

// Vitraza: the mark as a chapel window — every shape of the logo its own slab of jewel glass, a warm beam pushing through from behind.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x120d09)
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

scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture
const JEWEL = [0x2451b8, 0xb82432, 0x1f8a4c, 0xd8a218, 0x7a2fa0, 0x1f7a8a]
const group = new THREE.Group()
scene.add(group)
new SVGLoader().load("redo-logo.svg", data => {
  const s = LOGO_W / 1840.49
  const meshes = []
  let i = 0
  const box = new THREE.Box3()
  for (const path of data.paths) for (const shape of SVGLoader.createShapes(path)) {
    const g = new THREE.ExtrudeGeometry(shape, { depth: 26, curveSegments: 22, bevelEnabled: false })
    g.scale(s, -s, s)
    const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({
      color: JEWEL[i % JEWEL.length], metalness: 0, roughness: 0.18,
      transmission: 0.82, thickness: 0.5, ior: 1.4, side: THREE.DoubleSide
    }))
    meshes.push(m); group.add(m)
    box.expandByObject(m)
    i++
  }
  const c = box.getCenter(new THREE.Vector3())
  for (const m of meshes) m.position.sub(c)
})
const beam = new THREE.SpotLight(0xffdf9f, 320, 40, 0.5, 0.55, 2)
beam.position.set(1.5, 2.5, -5)
beam.target.position.set(0, 0, 2)
scene.add(beam, beam.target)
const shaft = new THREE.Mesh(new THREE.ConeGeometry(2.6, 9, 32, 1, true),
  new THREE.MeshBasicMaterial({ color: 0xffdf9f, transparent: true, opacity: 0.045, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }))
shaft.position.set(0.8, 1.2, -1.5)
shaft.rotation.x = 1.15
shaft.rotation.z = -0.2
scene.add(shaft)
scene.add(new THREE.AmbientLight(0xfff4dd, 0.25))
function tick(dt) {
  group.rotation.y = Math.sin(t * 0.28) * 0.3 + mouseX * 0.35
  group.rotation.x = Math.sin(t * 0.2) * 0.08 - mouseY * 0.15
  shaft.material.opacity = 0.038 + 0.012 * Math.sin(t * 0.9)
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
