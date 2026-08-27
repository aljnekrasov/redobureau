import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Asfalts: the mark painted on a night road — worn white paint on asphalt, dashed lane lines running past, headlights sweeping through and firing the retro-reflective letters.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0c12)
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 300)

function applySize() {
  width = window.innerWidth || width; height = window.innerHeight || height
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  const halfA = Math.atan(Math.tan((camera.fov * Math.PI) / 360) * camera.aspect)
  camera.position.z = (LOGO_W / 2 / 0.55) / Math.tan(halfA)
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

function asphaltTex() {
  const S = 512
  const c = document.createElement("canvas"); c.width = c.height = S
  const g = c.getContext("2d")
  g.fillStyle = "#232426"; g.fillRect(0, 0, S, S)
  const id = g.getImageData(0, 0, S, S), d = id.data
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 26; d[i] += n; d[i+1] += n; d[i+2] += n }
  g.putImageData(id, 0, 0)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(4, 8)
  return tex
}
const road = new THREE.Mesh(new THREE.PlaneGeometry(9, 22),
  new THREE.MeshStandardMaterial({ map: asphaltTex(), roughness: 0.95 }))
road.rotation.x = -Math.PI / 2
road.position.y = -0.6
scene.add(road)
// разметка
for (let i = 0; i < 8; i++) {
  const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x8f8f86, roughness: 0.8 }))
  dash.rotation.x = -Math.PI / 2
  dash.position.set(-2.6, -0.595, -9 + i * 2.6)
  scene.add(dash)
}
let paint = null, paintMat = null
loadMask((data, MW, MH, srcCanvas) => {
  const tex = new THREE.CanvasTexture(srcCanvas)
  paintMat = new THREE.MeshStandardMaterial({
    color: 0xe8e8e0, roughness: 0.5, transparent: true, alphaMap: tex,
    emissive: 0xdfe8ff, emissiveIntensity: 0
  })
  paint = new THREE.Mesh(new THREE.PlaneGeometry(LOGO_W * 1.2, LOGO_W * 1.2 * (MH / MW)), paintMat)
  paint.rotation.x = -Math.PI / 2
  paint.rotation.z = 0.0
  paint.position.y = -0.585
  scene.add(paint)
})
scene.add(new THREE.AmbientLight(0x3a4050, 0.7))
const head = new THREE.SpotLight(0xfff2d0, 0, 40, 0.55, 0.5, 1.6)
head.position.set(6, 1.2, 6)
scene.add(head, head.target)
camera.position.y = 1.4
function tick(dt) {
  camera.lookAt(0, -0.4, 0)
  const c = (t % 7) / 7
  const hx = 8 - c * 16
  head.position.set(hx, 1.3, 5)
  head.target.position.set(hx * 0.3, -0.6, -1)
  head.intensity = c > 0.05 && c < 0.95 ? 260 : 0
  if (paintMat) {
    const near = Math.max(0, 1 - Math.abs(hx) / 5)
    paintMat.emissiveIntensity = near * 0.9
  }
  camera.position.x = mouseX * 0.6
  camera.position.y = 1.4 - mouseY * 0.3
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
