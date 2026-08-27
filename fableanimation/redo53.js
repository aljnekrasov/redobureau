import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Klucisi: the mark built out of toy blocks — hundreds of little painted cubes rain down, bounce once and lock into the word, then burst apart and rebuild.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0xefe9dc)
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

const PAL = [0xe63946, 0xf4a261, 0x2a9d8f, 0x457b9d, 0xf7c948]
let inst = null, N = 0
const cells = []
loadMask((data, MW, MH) => {
  const GX = 72, GY = 20
  for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) {
    const mx = Math.floor((gx + 0.5) / GX * MW), my = Math.floor((gy + 0.5) / GY * MH)
    if (data[(my * MW + mx) * 4 + 3] > 128) {
      cells.push({
        x: (gx / GX - 0.5) * LOGO_W,
        y: -(gy / GY - 0.5) * LOGO_W * (MH / MW),
        d: Math.random() * 0.55,
        s: Math.random() * Math.PI * 2
      })
    }
  }
  N = cells.length
  const size = LOGO_W / GX * 0.94
  inst = new THREE.InstancedMesh(new THREE.BoxGeometry(size, size, size * 1.6), 
    new THREE.MeshStandardMaterial({ roughness: 0.5 }), N)
  for (let i = 0; i < N; i++) inst.setColorAt(i, new THREE.Color(PAL[(Math.random() * PAL.length) | 0]))
  inst.instanceColor.needsUpdate = true
  inst.frustumCulled = false
  scene.add(inst)
})
scene.add(new THREE.AmbientLight(0xffffff, 0.9))
const key = new THREE.DirectionalLight(0xfff4dd, 1.6)
key.position.set(3, 5, 6)
scene.add(key)
const dummy = new THREE.Object3D()
function tick(dt) {
  if (!inst) return
  const CYC = 9
  const ph = (t % CYC) / CYC
  for (let i = 0; i < N; i++) {
    const c = cells[i]
    let k = Math.max(0, Math.min(1, (ph * 2.4 - c.d) * 2.2))
    // drop in with one bounce
    let y
    if (k <= 0) y = 4
    else if (k >= 1) y = 0
    else {
      const e = 1 - Math.pow(1 - k, 2)
      y = (1 - e) * 4 - Math.sin(Math.min(1, k * 1.6) * Math.PI) * 0.08 * (1 - k)
    }
    // scatter at the tail of the cycle
    let sx = 0, sy = 0, rz = 0
    if (ph > 0.86) {
      const q = (ph - 0.86) / 0.14
      sx = Math.cos(c.s) * q * q * 3
      sy = Math.sin(c.s) * q * q * 2 - q * q * 1.4
      rz = q * 4 * (c.s - 3)
    }
    dummy.position.set(c.x + sx, c.y + y + sy, 0)
    dummy.rotation.set(0, 0, rz)
    dummy.updateMatrix()
    inst.setMatrixAt(i, dummy.matrix)
  }
  inst.instanceMatrix.needsUpdate = true
  inst.rotation.y = mouseX * 0.2
  inst.rotation.x = -mouseY * 0.1
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
