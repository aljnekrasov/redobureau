import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Laterna: a paper festival lantern — the mark glows from within, candlelight breathing through warm paper, bobbing on its string in the night.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a1020)
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
      float flicker = 0.85 + 0.15 * sin(uTime * 9.0 + sin(uTime * 23.0));
      float inner = 1.0 - abs(dot(n, v)) * 0.45;
      vec3 paper = vec3(1.0, 0.72, 0.38) * inner * flicker * 1.5;
      paper += vec3(1.0, 0.45, 0.15) * vno(vP.xy * 3.0 + uTime * 0.1) * 0.25;
      paper += vec3(1.0, 0.9, 0.7) * pow(1.0 - dot(n, v), 3.0) * 0.4;
      gl_FragColor = vec4(paper, 1.0);
    }`
})
const group = new THREE.Group()
scene.add(group)
buildLogoGeo(150, geo => { mesh = new THREE.Mesh(geo, mat); group.add(mesh) })
// строка подвеса
const lineGeo = new THREE.BufferGeometry()
lineGeo.setAttribute("position", new THREE.Float32BufferAttribute([0, 3, 0, 0, 0.45, 0], 3))
group.add(new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x9a8468, transparent: true, opacity: 0.5 })))
// ореол за лампой
const halo = new THREE.Mesh(new THREE.CircleGeometry(2.6, 40),
  new THREE.MeshBasicMaterial({ color: 0xff9a3a, transparent: true, opacity: 0.10, blending: THREE.AdditiveBlending, depthWrite: false }))
halo.position.z = -0.6
group.add(halo)
function tick(dt) {
  uni.uTime.value = t
  group.position.y = Math.sin(t * 0.8) * 0.07
  group.rotation.z = Math.sin(t * 0.6) * 0.05 + mouseX * 0.1
  group.rotation.y = Math.sin(t * 0.4) * 0.2 + mouseX * 0.3
  halo.material.opacity = 0.08 + 0.03 * Math.sin(t * 9)
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
