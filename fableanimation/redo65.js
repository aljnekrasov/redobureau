import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Origami: the mark printed on a kraft sheet cut into six strips that hinge off each other — an accordion forever folding shut and springing open in 3D.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0xd9c9a8)
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

const STRIPS = 6
const groups = []
const mats = []
loadMask((data, MW, MH, srcCanvas) => {
  const H = LOGO_W * (MH / MW)
  const sh = H / STRIPS
  const pxH = MH / STRIPS
  let parent = new THREE.Group()
  parent.position.set(0, H / 2, 0)
  scene.add(parent)
  window.__root = parent
  for (let i = 0; i < STRIPS; i++) {
    const c = document.createElement("canvas"); c.width = MW; c.height = Math.ceil(pxH)
    const g = c.getContext("2d")
    g.fillStyle = "#f6efdf"; g.fillRect(0, 0, MW, c.height)
    g.drawImage(srcCanvas, 0, -i * pxH)
    const tex = new THREE.CanvasTexture(c)
    const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })
    mats.push(mat)
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(LOGO_W, sh), mat)
    strip.position.y = -sh / 2
    const hinge = new THREE.Group()
    hinge.add(strip)
    parent.add(hinge)
    hinge.position.y = i === 0 ? 0 : -sh
    if (i > 0) groups[i - 1].add(hinge)
    else { hinge.position.y = 0 }
    if (i > 0) parent = null
    groups.push(hinge)
  }
  // re-parent chain: each hinge hangs from the previous strip's bottom
  for (let i = 1; i < STRIPS; i++) {
    groups[i].removeFromParent()
    groups[i - 1].add(groups[i])
    groups[i].position.set(0, -sh, 0)
  }
})
function tick(dt) {
  if (!groups.length) return
  const cyc = 0.5 - 0.5 * Math.cos(t * 0.7)
  const A = cyc * 1.25
  for (let i = 1; i < groups.length; i++) {
    const dir = i % 2 === 0 ? 1 : -1
    groups[i].rotation.x = dir * A
    mats[i].color.setScalar(1 - Math.abs(Math.sin(A)) * 0.25 * (i % 2 ? 1 : 0.5))
  }
  const root = window.__root
  if (root) {
    root.rotation.y = Math.sin(t * 0.4) * 0.3 + mouseX * 0.4
    root.rotation.x = Math.sin(t * 0.28) * 0.08 - mouseY * 0.15
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
