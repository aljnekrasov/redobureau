import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js"

// Disko: the mark as a mirror ball — thousands of jittered facets, three colored spotlights wheeling around it, specks of light thrown across the dark.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x060609)
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
let mesh = null
buildLogoGeo(150, geo => {
  geo = geo.toNonIndexed()
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i += 3) {
    const jx = (Math.random() - 0.5) * 0.018, jy = (Math.random() - 0.5) * 0.018, jz = (Math.random() - 0.5) * 0.03
    for (let k = 0; k < 3; k++) pos.setXYZ(i + k, pos.getX(i + k) + jx, pos.getY(i + k) + jy, pos.getZ(i + k) + jz)
  }
  geo.computeVertexNormals()
  mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: 0xffffff, metalness: 1, roughness: 0.05, flatShading: true
  }))
  scene.add(mesh)
})
const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 30),
  new THREE.MeshPhongMaterial({ color: 0x0a0a12, shininess: 90 }))
wall.position.z = -3
scene.add(wall)
const LC = [0xff2f8f, 0x2fd8ff, 0xffc22f]
const lights = []
for (let i = 0; i < 3; i++) {
  const l = new THREE.SpotLight(LC[i], 400, 40, 0.5, 0.4, 1.6)
  scene.add(l, l.target)
  lights.push(l)
}
function tick(dt) {
  for (let i = 0; i < 3; i++) {
    const a = t * (0.6 + i * 0.21) + i * 2.1
    lights[i].position.set(Math.cos(a) * 4, Math.sin(a * 0.8) * 2.5, 3 + Math.sin(a * 1.4))
    lights[i].target.position.set(Math.sin(a) * 0.5, 0, 0)
  }
  if (mesh) {
    mesh.rotation.y = t * 0.55 + mouseX * 0.2
    mesh.rotation.x = Math.sin(t * 0.4) * 0.08 - mouseY * 0.1
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
