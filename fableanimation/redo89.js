import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Putni: a starling murmuration at dusk — nine hundred birds wander as a living cloud, then swirl in and hold the shape of the mark before scattering again.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0xe8c9a8)
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

let pts = null, N = 0
let homes = null, pos = null, vel = null, seeds = null
loadMask((data, MW, MH) => {
  N = 900
  homes = new Float32Array(N * 3)
  pos = new Float32Array(N * 3)
  vel = new Float32Array(N * 3)
  seeds = new Float32Array(N)
  let i = 0, guard = 0
  while (i < N && guard++ < N * 60) {
    const x = (Math.random() * MW) | 0, y = (Math.random() * MH) | 0
    if (data[(y * MW + x) * 4 + 3] > 120) {
      homes[i*3] = (x / MW - 0.5) * LOGO_W
      homes[i*3+1] = -(y / MH - 0.5) * LOGO_W * (MH / MW)
      homes[i*3+2] = (Math.random() - 0.5) * 0.3
      pos[i*3] = (Math.random() - 0.5) * 6
      pos[i*3+1] = (Math.random() - 0.5) * 3
      pos[i*3+2] = (Math.random() - 0.5) * 2
      seeds[i] = Math.random() * 6.28
      i++
    }
  }
  N = i
  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.BufferAttribute(pos.subarray(0, N * 3), 3))
  pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x1c1a20, size: 0.035 }))
  pts.frustumCulled = false
  scene.add(pts)
})
function tick(dt) {
  if (!pts) return
  const c = (t % 20) / 20
  // 0..0.45 стая гуляет, 0.45..0.8 слово, 0.8..1 разлетается
  let gather
  if (c < 0.45) gather = 0
  else if (c < 0.55) gather = (c - 0.45) / 0.1
  else if (c < 0.8) gather = 1
  else gather = 1 - (c - 0.8) / 0.2
  const cx = Math.sin(t * 0.25) * 1.6, cy = Math.sin(t * 0.18) * 0.8
  for (let i = 0; i < N; i++) {
    const k = i * 3
    // блуждание мурмурации
    const wx = Math.sin(t * 0.9 + seeds[i]) + Math.sin(t * 0.37 + seeds[i] * 2.3) * 0.6
    const wy = Math.cos(t * 0.8 + seeds[i] * 1.7) * 0.7
    const wz = Math.sin(t * 0.6 + seeds[i] * 3.1) * 0.4
    const tx = gather * homes[k] + (1 - gather) * (cx + wx * 1.6)
    const ty = gather * homes[k+1] + (1 - gather) * (cy + wy * 1.1)
    const tz = gather * homes[k+2] + (1 - gather) * wz
    vel[k] += (tx - pos[k]) * dt * (1.5 + gather * 3)
    vel[k+1] += (ty - pos[k+1]) * dt * (1.5 + gather * 3)
    vel[k+2] += (tz - pos[k+2]) * dt * (1.5 + gather * 3)
    vel[k] *= 0.92; vel[k+1] *= 0.92; vel[k+2] *= 0.92
    pos[k] += vel[k] * dt * 4
    pos[k+1] += vel[k+1] * dt * 4
    pos[k+2] += vel[k+2] * dt * 4
  }
  pts.geometry.attributes.position.needsUpdate = true
  pts.rotation.y = mouseX * 0.15
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
