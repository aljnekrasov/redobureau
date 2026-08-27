import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Magma: the mark as cooling obsidian — a black volcanic crust webbed with pulsing cracks of live lava light.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x070403)
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
const uni = { uTime: { value: 0 } }
const mat = new THREE.ShaderMaterial({
  uniforms: uni,
  vertexShader: `
    varying vec3 vN; varying vec3 vP; varying vec3 vV;
    void main() {
      vN = normalize(normalMatrix * normal);
      vP = position;
      vec4 wp = modelViewMatrix * vec4(position, 1.0);
      vV = normalize(-wp.xyz);
      gl_Position = projectionMatrix * wp;
    }`,
  fragmentShader: `
    precision highp float;
    uniform float uTime;
    varying vec3 vN; varying vec3 vP; varying vec3 vV;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float vno(vec2 p){
      vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
      return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
                 mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
    }
    void main() {
      vec3 n = normalize(vN); vec3 v = normalize(vV);
      if (dot(n, v) < 0.0) n = -n;
      float diff = max(dot(n, normalize(vec3(0.4, 0.7, 0.6))), 0.0);
      vec3 rock = vec3(0.055, 0.045, 0.042) * (0.5 + 0.7 * diff);
      float w = vno(vP.xy * 5.0 + vec2(0.0, uTime * 0.06)) + 0.5 * vno(vP.xy * 11.0 - uTime * 0.04);
      float crack = smoothstep(0.66, 0.72, w) * (1.0 - smoothstep(0.78, 0.86, w));
      float pulse = 0.7 + 0.5 * sin(uTime * 1.6 + vP.x * 2.0);
      vec3 lava = mix(vec3(1.0, 0.32, 0.06), vec3(1.0, 0.75, 0.2), 0.5 + 0.5 * sin(vP.x * 3.0 + uTime * 0.4));
      vec3 col = rock + lava * crack * pulse * 2.2;
      col += vec3(1.0, 0.5, 0.15) * pow(1.0 - dot(n, v), 3.0) * 0.12;
      gl_FragColor = vec4(col, 1.0);
    }`
})
buildLogoGeo(150, geo => { mesh = new THREE.Mesh(geo, mat); scene.add(mesh) })
const ember = new THREE.PointLight(0xff6a2a, 18, 15)
ember.position.set(0, -1.5, 2)
scene.add(ember)
function tick(dt) {
  uni.uTime.value = t
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
