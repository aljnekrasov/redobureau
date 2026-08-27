import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Mals: the mark squeezed from terracotta clay — thumb-dented, matte, bouncing with squash and stretch like stop-motion plasticine.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0xe8dcc8)
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

let mesh = null
function hash3(x, y, z) { return (Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453) % 1 }
buildLogoGeo(180, geo => {
  const pos = geo.attributes.position
  const nrm = geo.attributes.normal
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    const b = Math.sin(x * 4.1 + y * 6.3) * Math.cos(y * 5.2 - x * 2.7) * 0.5
      + Math.sin(x * 9.7 + z * 8.1) * 0.25
    const d = b * 0.045
    pos.setXYZ(i, x + nrm.getX(i) * d, y + nrm.getY(i) * d, z + nrm.getZ(i) * d)
  }
  geo.computeVertexNormals()
  mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xc96a4a, roughness: 0.95 }))
  scene.add(mesh)
})
scene.add(new THREE.AmbientLight(0xfff2e0, 0.75))
const key = new THREE.DirectionalLight(0xfff4dd, 1.7)
key.position.set(3, 5, 5)
scene.add(key)
const fill = new THREE.DirectionalLight(0xbfd4ff, 0.4)
fill.position.set(-4, -1, 3)
scene.add(fill)
function tick(dt) {
  if (!mesh) return
  const b = Math.sin(t * 2.3)
  mesh.scale.y = 1 + 0.10 * b
  mesh.scale.x = 1 - 0.05 * b
  mesh.position.y = Math.abs(Math.sin(t * 1.15)) * 0.12 - 0.05
  mesh.rotation.z = Math.sin(t * 0.7) * 0.04
  mesh.rotation.y = mouseX * 0.3
  mesh.rotation.x = -mouseY * 0.15
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
