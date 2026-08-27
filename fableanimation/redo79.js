import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Skembas: the mark blown to glass shards — every face flies off on its own vector, hangs scattered, then the explosion runs backwards and the word heals.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0e14)
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
const uni = { uTime: { value: 0 }, uK: { value: 0 } }
buildLogoGeo(120, geo => {
  geo = geo.toNonIndexed()
  const pos = geo.attributes.position
  const dirs = new Float32Array(pos.count * 4)
  for (let i = 0; i < pos.count; i += 3) {
    const cx = (pos.getX(i) + pos.getX(i+1) + pos.getX(i+2)) / 3
    const cy = (pos.getY(i) + pos.getY(i+1) + pos.getY(i+2)) / 3
    const cz = (pos.getZ(i) + pos.getZ(i+1) + pos.getZ(i+2)) / 3
    const len = Math.hypot(cx, cy, cz) + 0.3
    const dx = cx / len + (Math.random() - 0.5) * 0.6
    const dy = cy / len + (Math.random() - 0.5) * 0.6
    const dz = cz / len + (Math.random() - 0.5) * 1.4
    const ph = Math.random()
    for (let k2 = 0; k2 < 3; k2++) {
      dirs[(i + k2) * 4] = dx; dirs[(i + k2) * 4 + 1] = dy
      dirs[(i + k2) * 4 + 2] = dz; dirs[(i + k2) * 4 + 3] = ph
    }
  }
  geo.setAttribute("aDir", new THREE.BufferAttribute(dirs, 4))
  geo.computeVertexNormals()
  const mat = new THREE.ShaderMaterial({
    uniforms: uni,
    side: THREE.DoubleSide,
    vertexShader: `
      attribute vec4 aDir;
      uniform float uTime, uK;
      varying vec3 vN; varying vec3 vV;
      void main() {
        float k = uK * (0.5 + aDir.w);
        vec3 p = position + aDir.xyz * k * 1.6;
        vN = normalize(normalMatrix * normal);
        vec4 wp = modelViewMatrix * vec4(p, 1.0);
        vV = normalize(-wp.xyz);
        gl_Position = projectionMatrix * wp;
      }`,
    fragmentShader: `
      precision highp float;
      varying vec3 vN; varying vec3 vV;
      void main() {
        vec3 n = normalize(vN); vec3 v = normalize(vV);
        if (dot(n, v) < 0.0) n = -n;
        float fres = pow(1.0 - dot(n, v), 2.5);
        vec3 col = vec3(0.55, 0.75, 0.85) * (0.25 + 0.5 * max(dot(n, normalize(vec3(0.4,0.7,0.6))), 0.0));
        col += vec3(0.8, 0.95, 1.0) * fres * 0.9;
        col += vec3(1.0) * pow(max(dot(reflect(-v, n), normalize(vec3(0.4,0.7,0.6))), 0.0), 50.0) * 0.8;
        gl_FragColor = vec4(col, 1.0);
      }`
  })
  mesh = new THREE.Mesh(geo, mat)
  mesh.frustumCulled = false
  scene.add(mesh)
})
function tick(dt) {
  uni.uTime.value = t
  const c = (t % 9) / 9
  let k
  if (c < 0.12) k = Math.pow(c / 0.12, 2)
  else if (c < 0.55) k = 1
  else if (c < 0.85) k = 1 - (c - 0.55) / 0.3
  else k = 0
  uni.uK.value += (k - uni.uK.value) * Math.min(1, dt * 6)
  if (!mesh) return
  mesh.rotation.y = Math.sin(t * 0.3) * 0.3 + mouseX * 0.4
  mesh.rotation.x = Math.sin(t * 0.22) * 0.1 - mouseY * 0.18
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
