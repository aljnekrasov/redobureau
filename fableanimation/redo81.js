import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js"

// Prese: an industrial stamping press — the steel ram slams down over the mark, sparks jump, the whole camera kicks, and the letters flash white-hot at impact.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x17181c)
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
let logo = null, logoMat = null
buildLogoGeo(130, geo => {
  logoMat = new THREE.MeshStandardMaterial({ color: 0x3a3d44, metalness: 0.85, roughness: 0.45, emissive: 0x000000 })
  logo = new THREE.Mesh(geo, logoMat)
  scene.add(logo)
})
const ram = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.8, 1.2),
  new THREE.MeshStandardMaterial({ color: 0x565b64, metalness: 0.9, roughness: 0.35 }))
ram.position.y = 2.6
scene.add(ram)
const top = new THREE.SpotLight(0xdfe8ff, 300, 40, 0.9, 0.5, 2)
top.position.set(0, 6, 3)
scene.add(top, new THREE.AmbientLight(0x8a94a8, 0.35))
// искры
const NSP = 160
const sp = new Float32Array(NSP * 3), sv = new Float32Array(NSP * 3)
let sparkAge = 10
const sGeo = new THREE.BufferGeometry()
sGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3))
const sparks = new THREE.Points(sGeo, new THREE.PointsMaterial({
  color: 0xffc45e, size: 0.03, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false
}))
sparks.frustumCulled = false
scene.add(sparks)
let shake = 0, lastCyc = -1
function tick(dt) {
  const CYC = 4.2
  const c = (t % CYC) / CYC
  const cyc = Math.floor(t / CYC)
  let y
  if (c < 0.62) y = 2.6 - Math.pow(c / 0.62, 0.8) * 0.4
  else if (c < 0.68) y = 2.2 - Math.pow((c - 0.62) / 0.06, 2) * 1.55
  else if (c < 0.82) y = 0.65
  else y = 0.65 + ((c - 0.82) / 0.18) * 1.95
  ram.position.y = y
  if (c >= 0.68 && cyc !== lastCyc) {
    lastCyc = cyc
    shake = 1
    sparkAge = 0
    for (let i = 0; i < NSP; i++) {
      sp[i*3] = (Math.random() - 0.5) * 3
      sp[i*3+1] = 0.35
      sp[i*3+2] = (Math.random() - 0.5) * 0.5
      sv[i*3] = (Math.random() - 0.5) * 3.2
      sv[i*3+1] = Math.random() * 2.2
      sv[i*3+2] = (Math.random() - 0.5) * 2
    }
  }
  sparkAge += dt
  for (let i = 0; i < NSP; i++) {
    sv[i*3+1] -= 5 * dt
    sp[i*3] += sv[i*3] * dt; sp[i*3+1] += sv[i*3+1] * dt; sp[i*3+2] += sv[i*3+2] * dt
  }
  sGeo.attributes.position.needsUpdate = true
  sparks.material.opacity = Math.max(0, 1 - sparkAge * 1.6)
  shake *= Math.exp(-dt * 5)
  camera.position.x = Math.sin(t * 60) * 0.05 * shake
  camera.position.y = Math.cos(t * 53) * 0.04 * shake
  if (logoMat) logoMat.emissive.setScalar(shake * 0.45)
  if (logo) logo.rotation.y = mouseX * 0.15
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
