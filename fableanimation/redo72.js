import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Gramata: a pop-up book — the covers swing open on the desk and the mark rises off the page, folds flat again as the book breathes shut.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x2a201a)
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

const book = new THREE.Group()
book.position.y = -0.5
book.rotation.x = -0.9
scene.add(book)
const pageMat = new THREE.MeshStandardMaterial({ color: 0xf3ecdc, roughness: 0.9 })
const coverMat = new THREE.MeshStandardMaterial({ color: 0x7a3b2e, roughness: 0.7 })
const pageL = new THREE.Group(), pageR = new THREE.Group()
book.add(pageL, pageR)
for (const [grp, side] of [[pageL, -1], [pageR, 1]]) {
  const cover = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.5, 0.05), coverMat)
  cover.position.x = side * 1.05
  const paper = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.42, 0.09), pageMat)
  paper.position.set(side * 1.02, 0, 0.07)
  grp.add(cover, paper)
}
let logo = null
buildLogoGeo(90, geo => {
  logo = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xc95a3a, roughness: 0.6 }))
  logo.scale.setScalar(0.62)
  logo.position.z = 0.13
  book.add(logo)
})
scene.add(new THREE.AmbientLight(0xfff2dd, 0.8))
const key = new THREE.DirectionalLight(0xfff4dd, 1.6)
key.position.set(2, 4, 5)
scene.add(key)
function tick(dt) {
  const open = 0.5 - 0.5 * Math.cos(Math.min((t % 12) / 5, 1) * Math.PI)
  const closing = (t % 12) > 9 ? 0.5 - 0.5 * Math.cos(((t % 12) - 9) / 3 * Math.PI) : 0
  const k = open * (1 - closing)
  pageL.rotation.y = -(1 - k) * 1.5
  pageR.rotation.y = (1 - k) * 1.5
  if (logo) {
    logo.rotation.x = (1 - k) * -Math.PI / 2
    logo.position.y = k * 0.15
    logo.scale.setScalar(0.4 + k * 0.25)
  }
  book.rotation.z = mouseX * 0.15
  book.rotation.x = -0.9 - mouseY * 0.1
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
