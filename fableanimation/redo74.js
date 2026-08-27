import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Zale: the mark grown as a lawn — six thousand grass blades sprout inside the letterforms and sway together under a passing wind.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0xdfe9e2)
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
const blades = []
loadMask((data, MW, MH) => {
  let guard = 0
  while (blades.length < 6000 && guard++ < 300000) {
    const x = Math.random() * MW, y = Math.random() * MH
    if (data[((y | 0) * MW + (x | 0)) * 4 + 3] > 120) {
      blades.push({
        x: (x / MW - 0.5) * LOGO_W,
        y: -(y / MH - 0.5) * LOGO_W * (MH / MW),
        ph: Math.random() * 6.28,
        h: 0.7 + Math.random() * 0.6
      })
    }
  }
  N = blades.length
  const g = new THREE.PlaneGeometry(0.012, 0.13)
  g.translate(0, 0.065, 0)
  const colors = new Float32Array(g.attributes.position.count * 3)
  for (let i = 0; i < g.attributes.position.count; i++) {
    const k = g.attributes.position.getY(i) / 0.13
    colors[i * 3] = 0.12 + k * 0.25
    colors[i * 3 + 1] = 0.35 + k * 0.45
    colors[i * 3 + 2] = 0.10 + k * 0.15
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3))
  inst = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }), N)
  inst.frustumCulled = false
  scene.add(inst)
})
const dummy = new THREE.Object3D()
function tick(dt) {
  if (!inst) return
  for (let i = 0; i < N; i++) {
    const b = blades[i]
    const wind = Math.sin(t * 1.3 + b.x * 1.8 + b.ph * 0.3) * 0.35
      + Math.sin(t * 0.6 + b.x * 0.7) * 0.25
    dummy.position.set(b.x, b.y - 0.05, 0)
    dummy.rotation.set(0, 0, wind * 0.5)
    dummy.scale.set(1, b.h, 1)
    dummy.updateMatrix()
    inst.setMatrixAt(i, dummy.matrix)
  }
  inst.instanceMatrix.needsUpdate = true
  inst.rotation.y = mouseX * 0.15
  inst.rotation.x = -mouseY * 0.08
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
