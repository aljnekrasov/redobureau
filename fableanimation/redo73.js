import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Lente: a worn VHS of the mark — tracking bands shear the letters sideways, scanlines crawl, colors split like a stretched tape.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0c0d12)
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
const uni = { uTime: { value: 0 }, uGlitch: { value: 0 } }
const mat = new THREE.ShaderMaterial({
  uniforms: uni,
  vertexShader: `
    uniform float uTime, uGlitch;
    varying vec3 vN; varying vec3 vP; varying vec3 vV;
    float hash(float n){ return fract(sin(n) * 43758.5453); }
    void main() {
      vec3 p = position;
      float band = floor((p.y + 0.5) * 14.0);
      float jit = (hash(band + floor(uTime * 9.0) * 7.0) - 0.5);
      p.x += jit * 0.08 * uGlitch;
      vN = normalize(normalMatrix * normal);
      vP = position;
      vec4 wp = modelViewMatrix * vec4(p, 1.0);
      vV = normalize(-wp.xyz);
      gl_Position = projectionMatrix * wp;
    }`,
  fragmentShader: `
    precision highp float;
    uniform float uTime, uGlitch;
    varying vec3 vN; varying vec3 vP; varying vec3 vV;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    void main() {
      vec3 n = normalize(vN); vec3 v = normalize(vV);
      if (dot(n, v) < 0.0) n = -n;
      float d1 = max(dot(n, normalize(vec3(0.4, 0.6, 0.7))), 0.0);
      float d2 = max(dot(n, normalize(vec3(0.42, 0.58, 0.7))), 0.0);
      float d3 = max(dot(n, normalize(vec3(0.38, 0.62, 0.7))), 0.0);
      vec3 col;
      col.r = 0.20 + 0.85 * d2;
      col.g = 0.22 + 0.80 * d1;
      col.b = 0.28 + 0.85 * d3;
      col *= vec3(0.9, 1.0, 1.05);
      float scan = 0.85 + 0.15 * sin(vP.y * 160.0 + uTime * 8.0);
      col *= scan;
      float band = floor((vP.y + 0.5) * 14.0);
      float noiseBand = step(0.94, hash(vec2(band, floor(uTime * 9.0))));
      col += vec3(1.0) * noiseBand * uGlitch * 0.7 * hash(vP.xy * 40.0 + uTime);
      float fres = pow(1.0 - dot(n, v), 3.0);
      col += vec3(0.3, 0.5, 0.7) * fres * 0.4;
      gl_FragColor = vec4(col, 1.0);
    }`
})
buildLogoGeo(120, geo => { mesh = new THREE.Mesh(geo, mat); scene.add(mesh) })
function tick(dt) {
  uni.uTime.value = t
  const g = Math.sin(t * 0.7) > 0.55 ? 1 : 0.15
  uni.uGlitch.value += (g - uni.uGlitch.value) * Math.min(1, dt * 8)
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
