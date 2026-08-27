import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Rentgens: the mark under x-ray — an additive translucent film where the glow is the geometry's own thickness, a scan band sweeping through the bones.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x010207)
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
const uni = { uTime: { value: 0 }, uSweep: { value: -2 } }
const mat = new THREE.ShaderMaterial({
  uniforms: uni,
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  vertexShader: `
    varying vec3 vN; varying vec3 vV; varying vec3 vP;
    void main() {
      vN = normalize(normalMatrix * normal);
      vP = position;
      vec4 wp = modelViewMatrix * vec4(position, 1.0);
      vV = normalize(-wp.xyz);
      gl_Position = projectionMatrix * wp;
    }`,
  fragmentShader: `
    precision highp float;
    uniform float uTime, uSweep;
    varying vec3 vN; varying vec3 vV; varying vec3 vP;
    void main() {
      vec3 n = normalize(vN); vec3 v = normalize(vV);
      float grazing = 1.0 - abs(dot(n, v));
      float body = pow(grazing, 1.5) * 0.55 + 0.05;
      vec3 col = vec3(0.35, 0.65, 1.0) * body;
      float band = exp(-pow((vP.x - uSweep) * 5.0, 2.0));
      col += vec3(0.7, 0.9, 1.0) * band * 0.5 * (0.4 + grazing);
      gl_FragColor = vec4(col, 1.0);
    }`
})
buildLogoGeo(140, geo => { mesh = new THREE.Mesh(geo, mat); scene.add(mesh) })
function tick(dt) {
  uni.uTime.value = t
  uni.uSweep.value = ((t * 0.7) % 5) - 2.5
  if (!mesh) return
  mesh.rotation.y = Math.sin(t * 0.3) * 0.4 + mouseX * 0.4
  mesh.rotation.x = Math.sin(t * 0.22) * 0.12 - mouseY * 0.2
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
