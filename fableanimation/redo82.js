import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Zvaigznes: the mark as a constellation — a star chart where the letters are picked out in twinkling stars joined by faint survey lines, drifting in parallax.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x04060f)
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

const group = new THREE.Group()
scene.add(group)
let starGeo = null, starN = 0, phases = null, baseCol = null
loadMask((data, MW, MH) => {
  const pts = []
  const GX = 60, GY = 17
  for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) {
    const mx = Math.floor((gx + 0.5) / GX * MW), my = Math.floor((gy + 0.5) / GY * MH)
    if (data[(my * MW + mx) * 4 + 3] > 128 && Math.random() < 0.5) {
      pts.push([
        (gx / GX - 0.5) * LOGO_W + (Math.random() - 0.5) * 0.03,
        -(gy / GY - 0.5) * LOGO_W * (MH / MW) + (Math.random() - 0.5) * 0.03,
        (Math.random() - 0.5) * 0.3
      ])
    }
  }
  starN = pts.length
  const pos = new Float32Array(starN * 3)
  const col = new Float32Array(starN * 3)
  phases = new Float32Array(starN)
  for (let i = 0; i < starN; i++) {
    pos.set(pts[i], i * 3)
    phases[i] = Math.random() * 6.28
    const w = 0.7 + Math.random() * 0.3
    col[i*3] = w; col[i*3+1] = w; col[i*3+2] = Math.min(1, w + 0.15)
  }
  baseCol = col.slice()
  starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3))
  starGeo.setAttribute("color", new THREE.BufferAttribute(col, 3))
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    size: 0.035, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
  }))
  stars.frustumCulled = false
  group.add(stars)
  // соединительные линии к ближайшему соседу
  const linePos = []
  for (let i = 0; i < starN; i++) {
    let best = -1, bd = 1e9
    for (let j = 0; j < starN; j++) {
      if (i === j) continue
      const dx = pts[i][0]-pts[j][0], dy = pts[i][1]-pts[j][1]
      const d = dx*dx + dy*dy
      if (d < bd) { bd = d; best = j }
    }
    if (best >= 0 && bd < 0.05) linePos.push(...pts[i], ...pts[best])
  }
  const lGeo = new THREE.BufferGeometry()
  lGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePos, 3))
  const lines = new THREE.LineSegments(lGeo, new THREE.LineBasicMaterial({
    color: 0x4a6a9a, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending
  }))
  lines.frustumCulled = false
  group.add(lines)
})
// дальний фон
const far = []
for (let i = 0; i < 500; i++) far.push((Math.random()-0.5)*24, (Math.random()-0.5)*14, -6 - Math.random()*8)
const farGeo = new THREE.BufferGeometry()
farGeo.setAttribute("position", new THREE.Float32BufferAttribute(far, 3))
scene.add(new THREE.Points(farGeo, new THREE.PointsMaterial({ color: 0x39456a, size: 0.03 })))
function tick(dt) {
  if (starGeo && phases) {
    const col = starGeo.attributes.color.array
    for (let i = 0; i < starN; i++) {
      const tw = 0.55 + 0.45 * Math.sin(t * (1.5 + (i % 7) * 0.4) + phases[i])
      col[i*3] = baseCol[i*3] * tw
      col[i*3+1] = baseCol[i*3+1] * tw
      col[i*3+2] = baseCol[i*3+2] * tw
    }
    starGeo.attributes.color.needsUpdate = true
  }
  group.rotation.y = Math.sin(t * 0.12) * 0.16 + mouseX * 0.3
  group.rotation.x = Math.sin(t * 0.09) * 0.06 - mouseY * 0.15
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
