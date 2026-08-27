import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Ekvalaizers: the mark as a wall of sound — every cell of the word is a bar that dances in depth to its own frequency, green cooling to red at the peaks.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x030304)
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

let inst = null, N = 0
const cells = []
loadMask((data, MW, MH) => {
  const GX = 96, GY = 26
  for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) {
    const mx = Math.floor((gx + 0.5) / GX * MW), my = Math.floor((gy + 0.5) / GY * MH)
    if (data[(my * MW + mx) * 4 + 3] > 128) {
      cells.push({
        x: (gx / GX - 0.5) * LOGO_W,
        y: -(gy / GY - 0.5) * LOGO_W * (MH / MW),
        f: 1.3 + ((gx * 7919) % 100) / 100 * 2.6,
        p: ((gx * 104729) % 628) / 100,
        row: gy / GY
      })
    }
  }
  N = cells.length
  const size = LOGO_W / GX
  inst = new THREE.InstancedMesh(new THREE.BoxGeometry(size * 0.9, size * 0.9, 1),
    new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.3 }), N)
  const cLow = new THREE.Color(0x27e07c), cHigh = new THREE.Color(0xff4a3a), cc = new THREE.Color()
  for (let i = 0; i < N; i++) {
    inst.setColorAt(i, cc.copy(cLow).lerp(cHigh, cells[i].row))
  }
  inst.instanceColor.needsUpdate = true
  inst.frustumCulled = false
  inst.rotation.y = -0.35
  scene.add(inst)
})
scene.add(new THREE.AmbientLight(0xffffff, 0.5))
const key = new THREE.DirectionalLight(0xffffff, 1.8)
key.position.set(2, 3, 6)
scene.add(key)
const dummy = new THREE.Object3D()
function tick(dt) {
  if (!inst) return
  for (let i = 0; i < N; i++) {
    const c = cells[i]
    const z = 0.06 + (0.5 + 0.5 * Math.sin(t * c.f + c.p)) * 0.5 * (1 + energy)
    dummy.position.set(c.x, c.y, z / 2)
    dummy.scale.set(1, 1, z)
    dummy.updateMatrix()
    inst.setMatrixAt(i, dummy.matrix)
  }
  inst.instanceMatrix.needsUpdate = true
  inst.rotation.y = -0.35 + mouseX * 0.25
  inst.rotation.x = -mouseY * 0.12
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
