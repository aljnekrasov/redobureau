import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Rusa: bare steel being eaten by rust — corrosion creeps across the mark in patches until it is fully oxidised, then the plate is blasted clean again.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x14161a)
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

function steelRust() {
  const S = 512
  const c = document.createElement("canvas"); c.width = c.height = S
  const g = c.getContext("2d")
  g.fillStyle = "#6a6d72"; g.fillRect(0, 0, S, S)
  const id = g.getImageData(0, 0, S, S), d = id.data
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 14; d[i] += n; d[i+1] += n; d[i+2] += n }
  g.putImageData(id, 0, 0)
  const rust = document.createElement("canvas"); rust.width = rust.height = S
  const rg = rust.getContext("2d")
  rg.fillStyle = "#000"; rg.fillRect(0, 0, S, S)
  for (let i = 0; i < 260; i++) {
    const r = 8 + Math.random() * 60
    const grd = rg.createRadialGradient(Math.random()*S, Math.random()*S, 0, Math.random()*S, Math.random()*S, r)
    grd.addColorStop(0, "rgba(255,255,255,0.5)")
    grd.addColorStop(1, "rgba(255,255,255,0)")
    rg.fillStyle = grd
    rg.fillRect(0, 0, S, S)
  }
  return [new THREE.CanvasTexture(c), new THREE.CanvasTexture(rust)]
}
const [steelTex, rustNoise] = steelRust()
steelTex.wrapS = steelTex.wrapT = THREE.RepeatWrapping
rustNoise.wrapS = rustNoise.wrapT = THREE.RepeatWrapping
let mesh = null
const uni = { uTime: { value: 0 }, uSpread: { value: 0 }, uSteel: { value: steelTex }, uNoise: { value: rustNoise } }
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
    uniform float uTime, uSpread;
    uniform sampler2D uSteel, uNoise;
    varying vec3 vN; varying vec3 vP; varying vec3 vV;
    void main() {
      vec3 n = normalize(vN); vec3 v = normalize(vV);
      if (dot(n, v) < 0.0) n = -n;
      vec2 uv = vP.xy * 0.6 + 0.5;
      float li = 0.35 + 0.85 * max(dot(n, normalize(vec3(0.7, 0.5, 0.5))), 0.0);
      vec3 steel = texture2D(uSteel, uv).rgb * li;
      steel += vec3(0.9, 0.95, 1.0) * pow(max(dot(reflect(-v, n), normalize(vec3(0.7, 0.5, 0.5))), 0.0), 30.0) * 0.5;
      float nz = texture2D(uNoise, uv * 1.4).r;
      float rustK = smoothstep(uSpread - 0.18, uSpread + 0.05, nz);
      vec3 rust = mix(vec3(0.42, 0.18, 0.08), vec3(0.65, 0.32, 0.12), nz) * (0.5 + 0.5 * li);
      vec3 col = mix(steel, rust, 1.0 - rustK);
      gl_FragColor = vec4(col, 1.0);
    }`
})
buildLogoGeo(140, geo => { mesh = new THREE.Mesh(geo, mat); scene.add(mesh) })
function tick(dt) {
  uni.uTime.value = t
  const c = (t % 18) / 18
  uni.uSpread.value = c < 0.75 ? 1.0 - (c / 0.75) : (c - 0.75) / 0.25
  if (!mesh) return
  mesh.rotation.y = Math.sin(t * 0.25) * 0.3 + mouseX * 0.35
  mesh.rotation.x = Math.sin(t * 0.18) * 0.1 - mouseY * 0.15
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
