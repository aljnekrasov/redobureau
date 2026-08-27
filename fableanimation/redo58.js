import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js"

// Orbita: the mark as a space station — brushed steel word circling a blue planet with a glowing atmosphere, stars behind.

const LOGO_W = 1.5
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x01020a)
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 300)

function applySize() {
  width = window.innerWidth || width; height = window.innerHeight || height
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  const halfA = Math.atan(Math.tan((camera.fov * Math.PI) / 360) * camera.aspect)
  camera.position.z = (LOGO_W / 2 / 0.30) / Math.tan(halfA)
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

scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture
const orbit = new THREE.Group()
scene.add(orbit)
let mesh = null
buildLogoGeo(140, geo => {
  mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xdfe6f2, metalness: 0.85, roughness: 0.35 }))
  mesh.position.set(0, 2.35, 0)
  orbit.add(mesh)
})
function planetTex() {
  const c = document.createElement("canvas"); c.width = 512; c.height = 256
  const g = c.getContext("2d")
  g.fillStyle = "#2a5fbf"; g.fillRect(0, 0, 512, 256)
  for (let i = 0; i < 60; i++) {
    g.fillStyle = "rgba(255,255,255," + (0.05 + Math.random() * 0.12).toFixed(3) + ")"
    const y = Math.random() * 256, w = 60 + Math.random() * 180, h = 6 + Math.random() * 18
    g.beginPath(); g.ellipse(Math.random() * 512, y, w, h, 0, 0, Math.PI * 2); g.fill()
  }
  return new THREE.CanvasTexture(c)
}
const planet = new THREE.Mesh(new THREE.SphereGeometry(6, 48, 32),
  new THREE.MeshStandardMaterial({ map: planetTex(), roughness: 0.9 }))
planet.position.set(0, -7.6, -4)
scene.add(planet)
const atmo = new THREE.Mesh(new THREE.SphereGeometry(6.22, 48, 32),
  new THREE.MeshBasicMaterial({ color: 0x5fa8ff, transparent: true, opacity: 0.28, side: THREE.BackSide, blending: THREE.AdditiveBlending }))
atmo.position.copy(planet.position)
scene.add(atmo)
const starGeo = new THREE.BufferGeometry()
const stars = []
for (let i = 0; i < 900; i++) {
  const r = 40 + Math.random() * 40, a = Math.random() * 6.28, b = (Math.random() - 0.5) * 3.14
  stars.push(Math.cos(a) * Math.cos(b) * r, Math.sin(b) * r, Math.sin(a) * Math.cos(b) * r - 10)
}
starGeo.setAttribute("position", new THREE.Float32BufferAttribute(stars, 3))
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xcfd8ff, size: 0.09 })))
const sun = new THREE.DirectionalLight(0xfff4dd, 2.4)
sun.position.set(6, 3, 5)
scene.add(sun)
function tick(dt) {
  orbit.position.set(0, -7.6, -4)
  orbit.rotation.z = -t * 0.10 + mouseX * 0.05
  if (mesh) { mesh.rotation.y = t * 0.45; mesh.rotation.x = Math.sin(t * 0.3) * 0.2 }
  planet.rotation.y = t * 0.04
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
