import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Kartons: the mark cut from corrugated cardboard — kraft faces, fluted edges striped along the cut, a strip of packing tape, rocking gently on the table.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0xefe7d9)
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
const mat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `
    varying vec3 vN; varying vec3 vP; varying vec3 vNo;
    void main() {
      vN = normalize(normalMatrix * normal);
      vNo = normal;
      vP = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `
    precision highp float;
    varying vec3 vN; varying vec3 vP; varying vec3 vNo;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    void main() {
      float li = 0.5 + 0.6 * max(dot(normalize(vN), normalize(vec3(0.4, 0.7, 0.6))), 0.0);
      vec3 kraft = vec3(0.76, 0.60, 0.42);
      // боковые грани — гофра: полосы вдоль реза
      float sideK = 1.0 - abs(vNo.z);
      float flute = 0.5 + 0.5 * sin(vP.z * 160.0);
      vec3 side = mix(vec3(0.62, 0.47, 0.32), vec3(0.84, 0.68, 0.5), flute);
      vec3 col = mix(kraft, side, smoothstep(0.35, 0.75, sideK));
      col += (hash(vP.xy * 90.0) - 0.5) * 0.05;
      col *= li;
      gl_FragColor = vec4(col, 1.0);
    }`
})
buildLogoGeo(160, geo => {
  mesh = new THREE.Mesh(geo, mat)
  scene.add(mesh)
  const tape = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.34),
    new THREE.MeshStandardMaterial({ color: 0xcbb98a, transparent: true, opacity: 0.55, roughness: 0.25 }))
  tape.position.set(0.5, 0.12, 0.16)
  tape.rotation.z = -0.3
  mesh.add(tape)
})
scene.add(new THREE.AmbientLight(0xfff2dd, 0.7))
const key = new THREE.DirectionalLight(0xfff4dd, 1.4)
key.position.set(3, 5, 5)
scene.add(key)
function tick(dt) {
  if (!mesh) return
  mesh.rotation.z = Math.sin(t * 0.9) * 0.05
  mesh.rotation.y = Math.sin(t * 0.5) * 0.25 + mouseX * 0.35
  mesh.rotation.x = Math.sin(t * 0.35) * 0.07 - mouseY * 0.15
  mesh.position.y = Math.abs(Math.sin(t * 0.9)) * 0.03
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
