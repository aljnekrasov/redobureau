import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Betons: brutalist concrete — the mark cast in rough cement on a plaster wall, a low sun swinging its hard shadow around it.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0xb8b2a6)
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

renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

function concreteTex() {
  const c = document.createElement("canvas"); c.width = c.height = 512
  const g = c.getContext("2d")
  g.fillStyle = "#8f8b82"; g.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 90; i++) {
    const r = 20 + Math.random() * 90
    const grd = g.createRadialGradient(Math.random()*512, Math.random()*512, 0, Math.random()*512, Math.random()*512, r)
    grd.addColorStop(0, Math.random() < 0.5 ? "rgba(70,66,60,0.10)" : "rgba(200,196,188,0.10)")
    grd.addColorStop(1, "rgba(0,0,0,0)")
    g.fillStyle = grd; g.fillRect(0, 0, 512, 512)
  }
  const id = g.getImageData(0, 0, 512, 512), d = id.data
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 18; d[i] += n; d[i+1] += n; d[i+2] += n }
  g.putImageData(id, 0, 0)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}
const ct = concreteTex()
let mesh = null
buildLogoGeo(150, geo => {
  mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x9a958c, map: ct, bumpMap: ct, bumpScale: 4, roughness: 0.95 }))
  mesh.castShadow = true
  scene.add(mesh)
})
const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 24),
  new THREE.MeshStandardMaterial({ color: 0xb8b2a6, roughness: 1 }))
wall.position.z = -0.45
wall.receiveShadow = true
scene.add(wall)
const sun = new THREE.DirectionalLight(0xfff1dd, 2.4)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.left = -4; sun.shadow.camera.right = 4
sun.shadow.camera.top = 3; sun.shadow.camera.bottom = -3
scene.add(sun, sun.target, new THREE.AmbientLight(0xffffff, 0.55))
function tick(dt) {
  const a = t * 0.12
  sun.position.set(Math.cos(a) * 7, 2.2 + Math.sin(t * 0.07) * 1.2, 5)
  if (mesh) mesh.rotation.y = mouseX * 0.06
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
