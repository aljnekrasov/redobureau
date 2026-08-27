import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js"

// Svece: the mark as poured candle wax — ivory, softly sagging, with small flames standing on the letter tops, shivering in a draft.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x171012)
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
buildLogoGeo(150, geo => {
  basePos = geo.attributes.position.array.slice()
  mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xf2e8d2, roughness: 0.45 }))
  scene.add(mesh)
})
function flameTex() {
  const c = document.createElement("canvas"); c.width = c.height = 64
  const g = c.getContext("2d")
  const grd = g.createRadialGradient(32, 40, 2, 32, 32, 30)
  grd.addColorStop(0, "rgba(255,240,200,1)")
  grd.addColorStop(0.35, "rgba(255,170,60,0.8)")
  grd.addColorStop(1, "rgba(255,100,20,0)")
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}
const ft = flameTex()
const flames = []
const FX = [-1.42, -0.95, -0.5, -0.05, 0.42, 0.9, 1.38]
for (const x of FX) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: ft, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
  }))
  s.scale.set(0.22, 0.3, 1)
  s.position.set(x, 0.52, 0.1)
  scene.add(s)
  flames.push(s)
  const l = new THREE.PointLight(0xffb45e, 6, 4)
  l.position.set(x, 0.6, 0.4)
  scene.add(l)
  flames.push(l)
}
scene.add(new THREE.AmbientLight(0x40342a, 0.8))
function tick(dt) {
  if (mesh && basePos) {
    const m = 0.5 - 0.5 * Math.cos(t * 0.3)
    const arr = mesh.geometry.attributes.position.array
    for (let i = 0; i < arr.length; i += 3) {
      const x = basePos[i], y = basePos[i + 1]
      const sag = m * 0.12 * Math.max(0, Math.min(1, (-y - 0.02) / 0.4)) * (1 + 0.4 * Math.sin(x * 5.0))
      arr[i + 1] = y - sag
    }
    mesh.geometry.attributes.position.needsUpdate = true
    if ((frame++ % 4) === 0) mesh.geometry.computeVertexNormals()
    mesh.rotation.y = mouseX * 0.25
    mesh.rotation.x = -mouseY * 0.1
  }
  for (let i = 0; i < flames.length; i += 2) {
    const s = flames[i], l = flames[i + 1]
    const f = 0.8 + 0.3 * Math.sin(t * 11 + i * 2.7) * Math.sin(t * 7 + i)
    s.scale.set(0.2 * f + 0.06, 0.3 * f + 0.05, 1)
    s.material.opacity = 0.6 + 0.35 * f * 0.4
    l.intensity = 4 + 3 * f
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
