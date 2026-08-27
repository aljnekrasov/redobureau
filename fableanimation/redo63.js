import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js"

// Spoguli: the mark as a wall of mirror cubes — rows keep somersaulting in a travelling wave while three colored lights orbit the wall.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x08080e)
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

scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture
let inst = null, N = 0
const cells = []
let GY = 18
loadMask((data, MW, MH) => {
  const GX = 64
  GY = 18
  for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) {
    const mx = Math.floor((gx + 0.5) / GX * MW), my = Math.floor((gy + 0.5) / GY * MH)
    if (data[(my * MW + mx) * 4 + 3] > 128) {
      cells.push({ x: (gx / GX - 0.5) * LOGO_W, y: -(gy / GY - 0.5) * LOGO_W * (MH / MW), row: gy })
    }
  }
  N = cells.length
  const size = LOGO_W / GX
  inst = new THREE.InstancedMesh(new THREE.BoxGeometry(size * 0.92, size * 0.92, size * 0.92),
    new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.06 }), N)
  inst.frustumCulled = false
  scene.add(inst)
})
const lights = []
const LC = [0xff4fd8, 0x4fe8ff, 0xffc94f]
for (let i = 0; i < 3; i++) {
  const l = new THREE.PointLight(LC[i], 30, 25)
  scene.add(l); lights.push(l)
}
const dummy = new THREE.Object3D()
function tick(dt) {
  for (let i = 0; i < 3; i++) {
    const a = t * (0.5 + i * 0.17) + i * 2.1
    lights[i].position.set(Math.cos(a) * 3, Math.sin(a * 1.3) * 1.5, 1.5 + Math.sin(a) * 0.8)
  }
  if (!inst) return
  for (let i = 0; i < N; i++) {
    const c = cells[i]
    const w = t * 0.55 - c.row * 0.16
    const step = Math.floor(w)
    const f = w - step
    const ease = f < 0.35 ? (1 - Math.cos(Math.PI * (f / 0.35))) / 2 : 1
    const ang = (step + ease) * Math.PI / 2
    dummy.position.set(c.x, c.y, 0)
    dummy.rotation.set(ang, 0, 0)
    dummy.updateMatrix()
    inst.setMatrixAt(i, dummy.matrix)
  }
  inst.instanceMatrix.needsUpdate = true
  inst.rotation.y = mouseX * 0.25
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
