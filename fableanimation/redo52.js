import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Folija: holographic foil — the color of every point is nothing but the angle you see it from, a rainbow that slides as the mark turns.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x101014)
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
    varying vec3 vN; varying vec3 vV; varying vec3 vP;
    void main() {
      vN = normalize(normalMatrix * normal);
      vec4 wp = modelViewMatrix * vec4(position, 1.0);
      vV = normalize(-wp.xyz);
      vP = position;
      gl_Position = projectionMatrix * wp;
    }`,
  fragmentShader: `
    precision highp float;
    uniform float uTime;
    varying vec3 vN; varying vec3 vV; varying vec3 vP;
    vec3 hsl2rgb(vec3 c) {
      vec3 rgb = clamp(abs(mod(c.x*6.0 + vec3(0.0,4.0,2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
      return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0*c.z - 1.0));
    }
    void main() {
      vec3 n = normalize(vN); vec3 v = normalize(vV);
      if (dot(n, v) < 0.0) n = -n;
      float d = dot(n, v);
      float hue = fract(acos(clamp(d, -1.0, 1.0)) * 0.9 + vP.x * 0.10 + vP.y * 0.14 + uTime * 0.05);
      vec3 col = hsl2rgb(vec3(hue, 0.85, 0.55));
      float fres = pow(1.0 - d, 3.0);
      col += vec3(1.0) * fres * 0.55;
      col += pow(max(dot(reflect(-v, n), normalize(vec3(0.4,0.7,0.6))), 0.0), 60.0) * 0.8;
      gl_FragColor = vec4(col, 1.0);
    }`
})
buildLogoGeo(140, geo => { mesh = new THREE.Mesh(geo, mat); scene.add(mesh) })
function tick(dt) {
  uni.uTime.value = t
  if (!mesh) return
  mesh.rotation.y = Math.sin(t * 0.45) * 0.5 + mouseX * 0.5
  mesh.rotation.x = Math.sin(t * 0.3) * 0.14 - mouseY * 0.25
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
