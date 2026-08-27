import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js"

// Sokolade: the mark moulded in dark chocolate on cream — glossy, warm-lit, forever on the edge of melting: the bottom sags and recovers in slow waves.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0xf3e4cd)
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

scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture
let mesh = null, basePos = null, frame = 0
buildLogoGeo(160, geo => {
  basePos = geo.attributes.position.array.slice()
  mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x5a3018, roughness: 0.30, metalness: 0.06 }))
  scene.add(mesh)
})
const warm = new THREE.SpotLight(0xffd9a8, 200, 30, 0.8, 0.6, 2)
warm.position.set(2, 4, 3)
scene.add(warm, warm.target, new THREE.AmbientLight(0xffe8cc, 0.5))
function tick(dt) {
  if (!mesh) return
  const m = 0.5 - 0.5 * Math.cos(t * 0.5)
  const pos = mesh.geometry.attributes.position
  const arr = pos.array
  for (let i = 0; i < arr.length; i += 3) {
    const x = basePos[i], y = basePos[i + 1]
    const sagZone = Math.max(0, Math.min(1, (-y - 0.05) / 0.35))
    const sag = m * 0.16 * sagZone * (1 + 0.35 * Math.sin(x * 4.0 + 1.3))
    arr[i + 1] = y - sag
    arr[i] = x + m * 0.02 * sagZone * Math.sin(x * 7.0)
  }
  pos.needsUpdate = true
  if ((frame++ % 3) === 0) mesh.geometry.computeVertexNormals()
  mesh.rotation.y = Math.sin(t * 0.3) * 0.22 + mouseX * 0.3
  mesh.rotation.x = Math.sin(t * 0.2) * 0.06 - mouseY * 0.12
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
