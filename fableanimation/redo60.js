import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Kvanti: the mark as a cloud of orbiting quanta — twenty thousand cyan and magenta particles, each circling its own home point inside the letter volume.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x020208)
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
let home = null, u1 = null, u2 = null, spd = null, ph = null
loadMask((data, MW, MH) => {
  N = 20000
  home = new Float32Array(N * 3)
  u1 = new Float32Array(N * 3)
  u2 = new Float32Array(N * 3)
  spd = new Float32Array(N)
  ph = new Float32Array(N)
  const cols = new Float32Array(N * 3)
  const cA = new THREE.Color(0x53e8ff), cB = new THREE.Color(0xff53d8)
  let i = 0, guard = 0
  while (i < N && guard++ < N * 50) {
    const x = (Math.random() * MW) | 0, y = (Math.random() * MH) | 0
    if (data[(y * MW + x) * 4 + 3] > 120) {
      home[i * 3] = (x / MW - 0.5) * LOGO_W
      home[i * 3 + 1] = -(y / MH - 0.5) * LOGO_W * (MH / MW)
      home[i * 3 + 2] = (Math.random() - 0.5) * 0.24
      const ax = Math.random() * 6.28, az = Math.random() * 6.28
      const r = 0.012 + Math.random() * 0.05
      u1[i * 3] = Math.cos(ax) * r; u1[i * 3 + 1] = Math.sin(ax) * r; u1[i * 3 + 2] = Math.cos(az) * r * 0.7
      u2[i * 3] = -Math.sin(ax) * r; u2[i * 3 + 1] = Math.cos(ax) * r * 0.6; u2[i * 3 + 2] = Math.sin(az) * r
      spd[i] = 0.8 + Math.random() * 2.6
      ph[i] = Math.random() * 6.28
      const c = Math.random() < 0.5 ? cA : cB
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b
      i++
    }
  }
  N = i
  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3))
  geo.setAttribute("color", new THREE.BufferAttribute(cols.subarray(0, N * 3), 3))
  pts = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.016, vertexColors: true, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false
  }))
  pts.frustumCulled = false
  scene.add(pts)
})
function tick(dt) {
  if (!pts) return
  const arr = pts.geometry.attributes.position.array
  const sp = 1 + energy * 2
  for (let i = 0; i < N; i++) {
    const w = t * spd[i] * sp + ph[i]
    const cw = Math.cos(w), sw = Math.sin(w)
    arr[i * 3] = home[i * 3] + u1[i * 3] * cw + u2[i * 3] * sw
    arr[i * 3 + 1] = home[i * 3 + 1] + u1[i * 3 + 1] * cw + u2[i * 3 + 1] * sw
    arr[i * 3 + 2] = home[i * 3 + 2] + u1[i * 3 + 2] * cw + u2[i * 3 + 2] * sw
  }
  pts.geometry.attributes.position.needsUpdate = true
  pts.rotation.y = mouseX * 0.3
  pts.rotation.x = -mouseY * 0.15
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
