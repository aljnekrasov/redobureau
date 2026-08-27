import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Akvarijs: the mark sunk as an aquarium ornament — wavering blue light, orange fish threading through the letters, bubbles on their way up.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a2a3e)
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

function buildLogoGeo(depth, done, curveSegments) {
  new SVGLoader().load("redo-logo.svg", data => {
    const geos = []; let i = 0
    for (const path of data.paths) for (const shape of SVGLoader.createShapes(path)) {
      const g = new THREE.ExtrudeGeometry(shape, { depth, curveSegments: curveSegments || 22, bevelEnabled: false })
      g.translate(0, 0, i * 2); i++; geos.push(g)
    }
    let geo = BufferGeometryUtils.mergeGeometries(geos)
    geo = BufferGeometryUtils.mergeVertices(geo, 0.4)
    geo.computeVertexNormals()
    const s = LOGO_W / 1840.49
    geo.scale(s, -s, s)
    geo.computeBoundingBox()
    const bb = geo.boundingBox
    geo.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, -(bb.min.z + bb.max.z) / 2)
    done(geo)
  })
}

let logo = null
buildLogoGeo(140, geo => {
  logo = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x5a7a6e, roughness: 0.85 }))
  scene.add(logo)
})
scene.add(new THREE.AmbientLight(0x3a6a8a, 0.9))
const sun = new THREE.PointLight(0x9fd8ff, 60, 30)
sun.position.set(0, 4, 2)
scene.add(sun)
const caustic = new THREE.PointLight(0x6ab8d8, 30, 20)
scene.add(caustic)
// рыбки
const NF = 10
const fishes = []
for (let i = 0; i < NF; i++) {
  const f = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8),
    new THREE.MeshStandardMaterial({ color: i % 3 ? 0xff8a3a : 0xffb84a, roughness: 0.6 }))
  f.scale.set(2.2, 0.8, 0.7)
  scene.add(f)
  fishes.push({ m: f, ph: Math.random() * 6.28, sp: 0.25 + Math.random() * 0.3, r: 1.2 + Math.random() * 1.1, yo: (Math.random() - 0.5) * 0.9 })
}
// пузыри
const NB = 260
const bp = new Float32Array(NB * 3)
for (let i = 0; i < NB; i++) { bp[i*3] = (Math.random()-0.5)*4; bp[i*3+1] = (Math.random()-0.5)*2.4; bp[i*3+2] = (Math.random()-0.5)*1.5 }
const bGeo = new THREE.BufferGeometry()
bGeo.setAttribute("position", new THREE.BufferAttribute(bp, 3))
const bubbles = new THREE.Points(bGeo, new THREE.PointsMaterial({ color: 0xbfe8ff, size: 0.02, transparent: true, opacity: 0.6 }))
bubbles.frustumCulled = false
scene.add(bubbles)
function tick(dt) {
  caustic.position.set(Math.sin(t * 0.7) * 2, 2.5, 1 + Math.cos(t * 0.5))
  caustic.intensity = 22 + 12 * Math.sin(t * 2.3) * Math.sin(t * 1.1)
  for (const f of fishes) {
    const a = t * f.sp + f.ph
    f.m.position.set(Math.cos(a) * f.r, f.yo + Math.sin(a * 2.3) * 0.2, Math.sin(a) * 0.7)
    f.m.rotation.y = -a + Math.PI / 2
  }
  for (let i = 0; i < NB; i++) {
    bp[i * 3 + 1] += (0.15 + (i % 5) * 0.03) * dt
    bp[i * 3] += Math.sin(t + i) * 0.02 * dt
    if (bp[i * 3 + 1] > 1.4) bp[i * 3 + 1] = -1.4
  }
  bGeo.attributes.position.needsUpdate = true
  if (logo) {
    logo.rotation.y = mouseX * 0.2 + Math.sin(t * 0.2) * 0.06
    logo.rotation.x = -mouseY * 0.1
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
