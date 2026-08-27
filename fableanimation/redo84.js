import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Aptumsums: an eclipse — the mark as a pure black silhouette against a roaring corona, light bleeding around the letter edges, flare orbs drifting on the axis.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050408)
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

// корона за знаком
const coronaUni = { uTime: { value: 0 } }
const corona = new THREE.Mesh(new THREE.PlaneGeometry(14, 8),
  new THREE.ShaderMaterial({
    uniforms: coronaUni,
    transparent: true,
    depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv - 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      precision highp float;
      uniform float uTime;
      varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      void main() {
        vec2 q = vUv * vec2(14.0/8.0, 1.0) * 2.2;
        float r = length(q);
        float a = atan(q.y, q.x);
        float rays = 0.5 + 0.5 * sin(a * 9.0 + uTime * 0.35) * sin(a * 5.0 - uTime * 0.22);
        float glow = exp(-r * 2.1) * 2.2 + exp(-r * 0.8) * 0.5;
        glow *= 0.75 + 0.45 * rays;
        vec3 col = vec3(1.0, 0.85, 0.6) * glow + vec3(1.0, 0.5, 0.25) * exp(-r * 4.5) * 1.6;
        gl_FragColor = vec4(col, min(1.0, glow));
      }`
  }))
corona.position.z = -1.2
scene.add(corona)
let logo = null
buildLogoGeo(130, geo => {
  logo = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x020204 }))
  scene.add(logo)
})
// блики на оси
const flares = []
for (let i = 0; i < 5; i++) {
  const f = new THREE.Mesh(new THREE.CircleGeometry(0.07 + i * 0.03, 24),
    new THREE.MeshBasicMaterial({ color: [0xffc46a, 0x8ad8ff, 0xff8a6a, 0xbfffa8, 0xffe8a8][i], transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }))
  scene.add(f)
  flares.push(f)
}
function tick(dt) {
  coronaUni.uTime.value = t
  for (let i = 0; i < flares.length; i++) {
    const k = (i + 1) / flares.length
    flares[i].position.set((mouseX * 1.6) * k, (-mouseY * 0.9) * k, 0.6)
    flares[i].material.opacity = 0.12 + 0.1 * Math.sin(t * 2 + i)
  }
  if (logo) {
    logo.rotation.y = Math.sin(t * 0.2) * 0.12 + mouseX * 0.15
    logo.rotation.x = Math.sin(t * 0.15) * 0.05 - mouseY * 0.08
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
