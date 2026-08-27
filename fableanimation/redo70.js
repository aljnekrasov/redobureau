import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Vejs: the mark in a wind tunnel — amber stream-ribbons pour past the dark teal letterforms, bending around the silhouette like smoke trails around a car.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0c1417)
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

let mesh = null
buildLogoGeo(120, geo => {
  mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x16424a, roughness: 0.5, metalness: 0.25 }))
  scene.add(mesh)
})
scene.add(new THREE.AmbientLight(0xbfd8e0, 0.5))
const key = new THREE.DirectionalLight(0xffffff, 1.4)
key.position.set(2, 4, 5)
scene.add(key)

const FW = 128, FH = 36
let field = null
loadMask((data, MW, MH, srcCanvas) => {
  const b = document.createElement("canvas"); b.width = FW; b.height = FH
  const g = b.getContext("2d")
  g.filter = "blur(4px)"
  g.drawImage(srcCanvas, 0, 0, FW, FH)
  const d = g.getImageData(0, 0, FW, FH).data
  field = new Float32Array(FW * FH)
  for (let i = 0; i < FW * FH; i++) field[i] = d[i * 4 + 3] / 255
})
function fAt(u, v) {
  if (!field || u < 0 || u > 1 || v < 0 || v > 1) return 0
  const x = Math.min(FW - 1, (u * FW) | 0), y = Math.min(FH - 1, (v * FH) | 0)
  return field[y * FW + x]
}
const NR = 46, TR = 34
const ribbons = []
for (let i = 0; i < NR; i++) {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(TR * 3), 3))
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
    color: 0xffa63f, transparent: true, opacity: 0.35 + Math.random() * 0.3,
    blending: THREE.AdditiveBlending
  }))
  line.frustumCulled = false
  scene.add(line)
  ribbons.push({
    line,
    x: -2.6 - Math.random() * 3,
    y: (Math.random() - 0.5) * 1.6,
    z: (Math.random() - 0.5) * 0.7,
    sp: 1.2 + Math.random() * 0.9,
    trail: []
  })
}
function tick(dt) {
  for (const r of ribbons) {
    const u = r.x / (LOGO_W * 1.05) + 0.5
    const v = -r.y / (LOGO_W * (140 / 512)) / 1.0 + 0.5
    const e = 0.02
    const gx = fAt(u + e, v) - fAt(u - e, v)
    const gy = fAt(u, v + e) - fAt(u, v - e)
    r.x += r.sp * dt
    r.y += (-gy) * dt * 2.6 * Math.sign(r.y - 0) === 0 ? 0 : (-gy) * dt * 2.6
    r.y += Math.sin(t * 1.2 + r.z * 8) * 0.02 * dt * 60 * 0.01
    const push = fAt(u, v)
    r.y += (r.y >= 0 ? 1 : -1) * push * dt * 1.4
    if (r.x > 3.2) {
      r.x = -2.6 - Math.random() * 2
      r.y = (Math.random() - 0.5) * 1.6
      r.trail.length = 0
    }
    r.trail.push([r.x, r.y, r.z])
    if (r.trail.length > TR) r.trail.shift()
    const arr = r.line.geometry.attributes.position.array
    for (let k = 0; k < TR; k++) {
      const p = r.trail[Math.min(k, r.trail.length - 1)] || [r.x, r.y, r.z]
      arr[k * 3] = p[0]; arr[k * 3 + 1] = p[1]; arr[k * 3 + 2] = p[2]
    }
    r.line.geometry.attributes.position.needsUpdate = true
  }
  if (mesh) {
    mesh.rotation.y = mouseX * 0.25
    mesh.rotation.x = -mouseY * 0.12
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
