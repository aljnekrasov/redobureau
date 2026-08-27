import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Dumi: the mark exhaled as smoke — soft pastel puffs rise from the letterforms, swell, drift and dissolve, the word forever evaporating.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b0d13)
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

function loadMask(done) {
  fetch("redo-logo.svg").then(r => r.text()).then(svg => {
    const sized = svg.replace(/currentColor/g, "#fff")
      .replace("<svg ", '<svg width="1840.49" height="468.42" ')
    const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }))
    const img = new Image()
    img.onload = () => {
      const MW = 512, MH = 140
      const c = document.createElement("canvas"); c.width = MW; c.height = MH
      const g = c.getContext("2d")
      const s = Math.min((MW * 0.96) / img.width, (MH * 0.9) / img.height)
      const dw = img.width * s, dh = img.height * s
      g.drawImage(img, (MW - dw) / 2, (MH - dh) / 2, dw, dh)
      done(g.getImageData(0, 0, MW, MH).data, MW, MH, c)
      URL.revokeObjectURL(url)
    }
    img.src = url
  })
}

function puffTex() {
  const c = document.createElement("canvas"); c.width = c.height = 64
  const g = c.getContext("2d")
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grd.addColorStop(0, "rgba(255,255,255,0.85)")
  grd.addColorStop(0.4, "rgba(255,255,255,0.35)")
  grd.addColorStop(1, "rgba(255,255,255,0)")
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}
const N = 2600
let pts = null
const P = { pos: null, vel: null, age: null, life: null, seed: null, homes: [] }
loadMask((data, MW, MH) => {
  for (let y = 0; y < MH; y += 2) for (let x = 0; x < MW; x += 2) {
    if (data[(y * MW + x) * 4 + 3] > 120) {
      P.homes.push([(x / MW - 0.5) * LOGO_W, -(y / MH - 0.5) * LOGO_W * (MH / MW)])
    }
  }
  P.pos = new Float32Array(N * 3)
  P.vel = new Float32Array(N * 3)
  P.age = new Float32Array(N)
  P.life = new Float32Array(N)
  P.seed = new Float32Array(N)
  const cols = new Float32Array(N * 3)
  const geo = new THREE.BufferGeometry()
  for (let i = 0; i < N; i++) { respawn(i); P.age[i] = Math.random() * P.life[i]
    const h = P.pos[i * 3] / LOGO_W + 0.5
    const c = new THREE.Color().setHSL(0.55 + h * 0.35, 0.45, 0.62)
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b
  }
  geo.setAttribute("position", new THREE.BufferAttribute(P.pos, 3))
  geo.setAttribute("color", new THREE.BufferAttribute(cols, 3))
  pts = new THREE.Points(geo, new THREE.PointsMaterial({
    map: puffTex(), size: 0.16, vertexColors: true, transparent: true, opacity: 0.35,
    blending: THREE.AdditiveBlending, depthWrite: false
  }))
  pts.frustumCulled = false
  scene.add(pts)
})
function respawn(i) {
  const h = P.homes[(Math.random() * P.homes.length) | 0]
  P.pos[i * 3] = h[0]; P.pos[i * 3 + 1] = h[1]; P.pos[i * 3 + 2] = (Math.random() - 0.5) * 0.2
  P.vel[i * 3] = (Math.random() - 0.5) * 0.02
  P.vel[i * 3 + 1] = 0.10 + Math.random() * 0.15
  P.vel[i * 3 + 2] = (Math.random() - 0.5) * 0.02
  P.age[i] = 0
  P.life[i] = 2.5 + Math.random() * 3
  P.seed[i] = Math.random() * 6.28
}
function tick(dt) {
  if (!pts) return
  for (let i = 0; i < N; i++) {
    P.age[i] += dt
    if (P.age[i] > P.life[i]) { respawn(i); continue }
    const k = i * 3
    P.pos[k] += (P.vel[k] + Math.sin(t * 1.4 + P.seed[i] + P.pos[k + 1] * 2.2) * 0.05) * dt
    P.pos[k + 1] += P.vel[k + 1] * dt
    P.pos[k + 2] += P.vel[k + 2] * dt
  }
  pts.geometry.attributes.position.needsUpdate = true
  pts.rotation.y = mouseX * 0.2
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
