import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Fejerverki: the finale — a rocket climbs the night, bursts, and its sparks are the mark itself: the word hangs written in fire, shivers, and rains away.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x040510)
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

let sparks = null, homes = null, N = 0
let pos = null, vel = null, colA = null
const state = { phase: "idle", t0: 0, rocket: new THREE.Vector3() }
const PALS = [[1.0, 0.6, 0.2], [0.4, 0.8, 1.0], [1.0, 0.4, 0.7], [0.7, 1.0, 0.5]]
let palIdx = 0
loadMask((data, MW, MH) => {
  const pts = []
  for (let y = 0; y < MH; y += 2) for (let x = 0; x < MW; x += 2) {
    if (data[(y * MW + x) * 4 + 3] > 120 && Math.random() < 0.5) {
      pts.push([(x / MW - 0.5) * LOGO_W, -(y / MH - 0.5) * LOGO_W * (MH / MW)])
    }
  }
  N = pts.length
  homes = new Float32Array(N * 2)
  for (let i = 0; i < N; i++) { homes[i*2] = pts[i][0]; homes[i*2+1] = pts[i][1] }
  pos = new Float32Array(N * 3)
  vel = new Float32Array(N * 3)
  colA = new Float32Array(N * 3)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3))
  geo.setAttribute("color", new THREE.BufferAttribute(colA, 3))
  sparks = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.03, vertexColors: true, transparent: true, opacity: 1,
    blending: THREE.AdditiveBlending, depthWrite: false
  }))
  sparks.frustumCulled = false
  scene.add(sparks)
})
// ракета
const rocket = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6),
  new THREE.MeshBasicMaterial({ color: 0xffe8b0 }))
rocket.visible = false
scene.add(rocket)
function tick(dt) {
  if (!sparks) return
  const cyc = 8
  const c = t % cyc
  const pal = PALS[palIdx % PALS.length]
  if (c < 1.6) {
    // ракета вверх
    rocket.visible = true
    const k = c / 1.6
    rocket.position.set(Math.sin(k * 2) * 0.3, -2.2 + k * 2.2, 0)
    if (state.phase !== "rise") {
      state.phase = "rise"
      palIdx++
      // спрятать искры
      for (let i = 0; i < N; i++) { pos[i*3] = 0; pos[i*3+1] = -10; pos[i*3+2] = 0 }
      sparks.geometry.attributes.position.needsUpdate = true
    }
  } else if (c < 1.75) {
    rocket.visible = false
    if (state.phase !== "burst") {
      state.phase = "burst"
      for (let i = 0; i < N; i++) {
        pos[i*3] = rocket.position.x
        pos[i*3+1] = rocket.position.y
        pos[i*3+2] = 0
        vel[i*3] = (homes[i*2] - rocket.position.x) * 6.5
        vel[i*3+1] = (homes[i*2+1] - rocket.position.y) * 6.5 + 0.6
        vel[i*3+2] = (Math.random() - 0.5) * 0.6
        colA[i*3] = pal[0] * 1.4; colA[i*3+1] = pal[1] * 1.4; colA[i*3+2] = pal[2] * 1.4
      }
      sparks.geometry.attributes.color.needsUpdate = true
    }
  } else {
    state.phase = "fall"
    const age = c - 1.75
    const drag = age < 0.45 ? 0.90 : 0.985
    const grav = age < 1.3 ? 0.02 : 0.55
    const homing = age < 1.1 ? Math.min(1, dt * 5) : 0
    for (let i = 0; i < N; i++) {
      const k = i * 3
      vel[k] *= drag; vel[k+1] = vel[k+1] * drag - grav * dt; vel[k+2] *= drag
      pos[k] += vel[k] * dt
      pos[k+1] += vel[k+1] * dt
      pos[k+2] += vel[k+2] * dt
      if (homing > 0) {
        pos[k] += (homes[i*2] - pos[k]) * homing
        pos[k+1] += (homes[i*2+1] - pos[k+1]) * homing
        pos[k+2] += (0 - pos[k+2]) * homing * 0.5
      }
      // мерцание и догорание
      const fade = Math.max(0, 1 - Math.max(0, age - 2.2) / 2.4)
      const tw = 0.7 + 0.3 * Math.sin(t * 20 + i * 3.1)
      colA[k] = pal[0] * fade * tw * 1.4
      colA[k+1] = pal[1] * fade * tw * 1.4
      colA[k+2] = pal[2] * fade * tw * 1.4
    }
    sparks.geometry.attributes.position.needsUpdate = true
    sparks.geometry.attributes.color.needsUpdate = true
  }
  sparks.rotation.y = mouseX * 0.15
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
