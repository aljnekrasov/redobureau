import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Zibens: a storm — the mark waits in darkness until lightning rips down and strikes a letter; for a breath the whole word is burned into view, then night again.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x05060a)
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

let logo = null, logoMat = null
buildLogoGeo(130, geo => {
  logoMat = new THREE.MeshStandardMaterial({ color: 0x2a2d36, metalness: 0.6, roughness: 0.4 })
  logo = new THREE.Mesh(geo, logoMat)
  scene.add(logo)
})
const flashLight = new THREE.PointLight(0xcfe0ff, 0, 40)
flashLight.position.set(0, 3, 3)
scene.add(flashLight, new THREE.AmbientLight(0x10141c, 0.8))
// молния
const boltGeo = new THREE.BufferGeometry()
const boltMax = 40
boltGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(boltMax * 3), 3))
const bolt = new THREE.Line(boltGeo, new THREE.LineBasicMaterial({
  color: 0xeaf2ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, linewidth: 2
}))
bolt.frustumCulled = false
scene.add(bolt)
let flash = 0, nextStrike = 2
function strike() {
  const tx = (Math.random() - 0.5) * 2.6
  const arr = boltGeo.attributes.position.array
  let x = tx + (Math.random() - 0.5) * 1.5, y = 4.2
  let n = 0
  while (y > 0.3 && n < boltMax - 1) {
    arr[n * 3] = x; arr[n * 3 + 1] = y; arr[n * 3 + 2] = 0.4
    x += (tx - x) * 0.25 + (Math.random() - 0.5) * 0.45
    y -= 0.25 + Math.random() * 0.3
    n++
  }
  arr[n * 3] = tx; arr[n * 3 + 1] = 0.1; arr[n * 3 + 2] = 0.3
  boltGeo.setDrawRange(0, n + 1)
  boltGeo.attributes.position.needsUpdate = true
  flash = 1
  flashLight.position.set(tx, 2, 2.5)
}
function tick(dt) {
  if (t > nextStrike) {
    strike()
    nextStrike = t + 1.8 + Math.random() * 2.6
  }
  flash *= Math.exp(-dt * 6.5)
  const fl = flash > 0.55 ? flash * (0.7 + 0.3 * Math.sin(t * 90)) : flash
  bolt.material.opacity = Math.min(1, fl * 1.6)
  flashLight.intensity = fl * 320
  if (logoMat) logoMat.emissive.setRGB(0.4 * fl, 0.45 * fl, 0.6 * fl)
  if (logo) {
    logo.rotation.y = mouseX * 0.2
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
