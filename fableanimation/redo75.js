import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js"

// Sniegs: a snow globe — the mark sealed in a glass sphere on a wooden base, snow drifting down around it; a click shakes the globe.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x141824)
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 300)

function applySize() {
  width = window.innerWidth || width; height = window.innerHeight || height
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  const halfA = Math.atan(Math.tan((camera.fov * Math.PI) / 360) * camera.aspect)
  camera.position.z = (LOGO_W / 2 / 0.45) / Math.tan(halfA)
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
let logo = null
buildLogoGeo(110, geo => {
  logo = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xc94a3a, roughness: 0.5 }))
  logo.scale.setScalar(0.62)
  scene.add(logo)
})
const globe = new THREE.Mesh(new THREE.SphereGeometry(1.45, 48, 32),
  new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.03, transmission: 0.96,
    thickness: 0.3, ior: 1.4, transparent: true
  }))
scene.add(globe)
const base = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.2, 0.5, 40),
  new THREE.MeshStandardMaterial({ color: 0x5a3a24, roughness: 0.55 }))
base.position.y = -1.55
scene.add(base)
const NS = 1300
const snowPos = new Float32Array(NS * 3)
const snowVel = new Float32Array(NS * 3)
function seedFlake(i, top) {
  const r = Math.random() * 1.3, a = Math.random() * 6.28
  snowPos[i * 3] = Math.cos(a) * r * Math.sqrt(Math.random())
  snowPos[i * 3 + 1] = top ? 0.8 + Math.random() * 0.5 : (Math.random() - 0.5) * 2.4
  snowPos[i * 3 + 2] = Math.sin(a) * r * Math.sqrt(Math.random())
  snowVel[i * 3] = 0; snowVel[i * 3 + 1] = -(0.08 + Math.random() * 0.12); snowVel[i * 3 + 2] = 0
}
for (let i = 0; i < NS; i++) seedFlake(i, false)
const snowGeo = new THREE.BufferGeometry()
snowGeo.setAttribute("position", new THREE.BufferAttribute(snowPos, 3))
const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({
  color: 0xffffff, size: 0.022, transparent: true, opacity: 0.9, depthWrite: false
}))
snow.frustumCulled = false
scene.add(snow)
const warm = new THREE.SpotLight(0xffe0b0, 140, 30, 0.8, 0.5, 2)
warm.position.set(2, 3.5, 3)
scene.add(warm, new THREE.AmbientLight(0xdfe8ff, 0.4))
let shake = 0
window.addEventListener("mousedown", () => {
  shake = 1
  for (let i = 0; i < NS; i++) {
    snowVel[i * 3] = (Math.random() - 0.5) * 1.6
    snowVel[i * 3 + 1] = (Math.random() - 0.2) * 1.6
    snowVel[i * 3 + 2] = (Math.random() - 0.5) * 1.6
  }
})
function tick(dt) {
  shake *= Math.exp(-dt * 2)
  for (let i = 0; i < NS; i++) {
    const k = i * 3
    snowVel[k] += Math.sin(t * 1.1 + i) * 0.01 * dt * 60 * 0.02
    snowVel[k + 1] += (-(0.10) - snowVel[k + 1]) * Math.min(1, dt * 0.8)
    snowPos[k] += snowVel[k] * dt
    snowPos[k + 1] += snowVel[k + 1] * dt
    snowPos[k + 2] += snowVel[k + 2] * dt
    const rr = Math.hypot(snowPos[k], snowPos[k + 1], snowPos[k + 2])
    if (rr > 1.38) {
      const f = 1.38 / rr
      snowPos[k] *= f; snowPos[k + 1] *= f; snowPos[k + 2] *= f
      snowVel[k] *= -0.2; snowVel[k + 2] *= -0.2
    }
    if (snowPos[k + 1] < -1.32) seedFlake(i, true)
  }
  snowGeo.attributes.position.needsUpdate = true
  const rx = Math.sin(t * 30) * 0.02 * shake
  scene.rotation.y = mouseX * 0.35 + rx
  scene.rotation.x = -mouseY * 0.15 + Math.cos(t * 27) * 0.015 * shake
  if (logo) logo.rotation.y = Math.sin(t * 0.4) * 0.15
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
