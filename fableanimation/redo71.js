import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Lampas: a theatre marquee — the mark spelled in hundreds of little bulbs, chase patterns running through the letters like a Broadway sign.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1c0a0e)
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
  const GX = 88, GY = 24
  for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) {
    const mx = Math.floor((gx + 0.5) / GX * MW), my = Math.floor((gy + 0.5) / GY * MH)
    if (data[(my * MW + mx) * 4 + 3] > 128) {
      cells.push({ x: (gx / GX - 0.5) * LOGO_W, y: -(gy / GY - 0.5) * LOGO_W * (MH / MW), gx, gy })
    }
  }
  N = cells.length
  inst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.017, 10, 8),
    new THREE.MeshBasicMaterial(), N)
  inst.frustumCulled = false
  const dummy = new THREE.Object3D()
  for (let i = 0; i < N; i++) {
    dummy.position.set(cells[i].x, cells[i].y, 0)
    dummy.updateMatrix()
    inst.setMatrixAt(i, dummy.matrix)
    inst.setColorAt(i, new THREE.Color(0x3a1e10))
  }
  inst.instanceColor.needsUpdate = true
  scene.add(inst)
})
const ON = new THREE.Color(0xffc76a), HOT = new THREE.Color(0xfff2d0), OFF = new THREE.Color(0x38200f)
const cc = new THREE.Color()
function tick(dt) {
  if (!inst) return
  for (let i = 0; i < N; i++) {
    const c = cells[i]
    const chase = Math.sin(c.gx * 0.55 - t * 6) > 0.35
    const wave = Math.sin((c.gx + c.gy) * 0.3 - t * 2.2) > 0
    let k = chase ? (wave ? 1 : 0.55) : 0.06
    if (Math.random() < 0.0008) k = 0     // a dead bulb blinks
    cc.copy(OFF).lerp(k > 0.9 ? HOT : ON, k)
    inst.setColorAt(i, cc)
  }
  inst.instanceColor.needsUpdate = true
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
