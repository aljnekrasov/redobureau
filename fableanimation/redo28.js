import * as THREE from "three"

// Smiltis: the mark drawn in sand. Fifty thousand grains sample the logo
// silhouette as home positions; a wind field made of curl noise scatters
// them into a drifting dune, then the pull home wins and the word settles
// back grain by grain, sharpest at the moment of rest. The cursor is a gust
// that blows a hole through the letters. Warm dust on near-black.

const COUNT = 55000

let width = window.innerWidth || 1280
let height = window.innerHeight || 720

let mouseX = 0, mouseY = 0
let energy = 0
let lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(1)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0c0a08)
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
camera.position.z = 9

// -- sample the logo into home positions ----------------------------------------------

const homes = new Float32Array(COUNT * 3)
const seeds = new Float32Array(COUNT)
let ready = false

fetch("redo-logo.svg").then(r => r.text()).then(svg => {
  const sized = svg.replace(/currentColor/g, "#fff")
    .replace("<svg ", '<svg width="1840.49" height="468.42" ')
  const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }))
  const img = new Image()
  img.onload = () => {
    const W = 1024, H = 260
    const c = document.createElement("canvas"); c.width = W; c.height = H
    const g = c.getContext("2d")
    const s = Math.min((W * 0.94) / img.width, (H * 0.86) / img.height)
    const dw = img.width * s, dh = img.height * s
    g.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh)
    const data = g.getImageData(0, 0, W, H).data
    const world = 9 // logo width in world units
    let i = 0, guard = 0
    while (i < COUNT && guard < COUNT * 60) {
      guard++
      const x = (Math.random() * W) | 0
      const y = (Math.random() * H) | 0
      if (data[(y * W + x) * 4 + 3] > 120) {
        homes[i * 3]     = (x / W - 0.5) * world
        homes[i * 3 + 1] = -(y / H - 0.5) * world * (H / W)
        homes[i * 3 + 2] = (Math.random() - 0.5) * 0.25
        seeds[i] = Math.random()
        i++
      }
    }
    URL.revokeObjectURL(url)
    build(i)
  }
  img.src = url
})

let geo, mat, points
const pos = new Float32Array(COUNT * 3)
const vel = new Float32Array(COUNT * 3)

function build(n) {
  for (let i = 0; i < n; i++) {
    // start scattered wide
    pos[i*3]   = (Math.random()-0.5) * 22
    pos[i*3+1] = (Math.random()-0.5) * 14
    pos[i*3+2] = (Math.random()-0.5) * 4
  }
  geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.BufferAttribute(pos.subarray(0, n*3), 3))
  const cols = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const w = 0.55 + Math.random() * 0.45
    cols[i*3] = w * 0.92; cols[i*3+1] = w * 0.78; cols[i*3+2] = w * 0.54
  }
  geo.setAttribute("color", new THREE.BufferAttribute(cols, 3))
  mat = new THREE.PointsMaterial({ size: 0.028, vertexColors: true, transparent: true,
    opacity: 0.92, depthWrite: false, blending: THREE.AdditiveBlending })
  points = new THREE.Points(geo, mat)
  scene.add(points)
  window.__count = n
  ready = true
}

// curl-ish wind from cheap sin fields
function windX(x, y, t) { return Math.sin(y * 0.7 + t * 0.6) + 0.5 * Math.sin(y * 1.9 - t * 0.4) }
function windY(x, y, t) { return Math.cos(x * 0.6 - t * 0.5) + 0.5 * Math.cos(x * 1.7 + t * 0.3) }

// -- sizing / input -------------------------------------------------------------------

function applySize() {
  width = window.innerWidth || width; height = window.innerHeight || height
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  const halfA = Math.atan(Math.tan((camera.fov*Math.PI)/360) * camera.aspect)
  camera.position.z = (9/2/0.8) / Math.tan(halfA)
  camera.updateProjectionMatrix()
}
applySize()
window.addEventListener("resize", applySize)

window.addEventListener("mousemove", e => {
  mouseX = (e.clientX / width - 0.5) * 9 * (width/height) * 0.5
  mouseY = -(e.clientY / height - 0.5) * 9 * 0.5
  if (lastX !== null) energy = Math.min(energy + Math.hypot(e.clientX-lastX, e.clientY-lastY)/Math.max(width,height)*6, 2)
  lastX = e.clientX; lastY = e.clientY
})

// -- loop -----------------------------------------------------------------------------

const clock = new THREE.Clock()
let t = 0

function render() {
  if (width !== window.innerWidth || height !== window.innerHeight) applySize()
  const dt = Math.min(clock.getDelta(), 0.033)
  t += dt
  energy *= Math.pow(0.5, dt)

  if (ready) {
    const n = window.__count
    // storm swells and calms on a slow cycle; cursor adds to it
    const storm = Math.pow(0.5 - 0.5 * Math.cos(t * 0.34), 2.0) * 1.0 + energy * 0.5
    const arr = geo.attributes.position.array
    for (let i = 0; i < n; i++) {
      const ix = i*3
      const px = arr[ix], py = arr[ix+1], pz = arr[ix+2]
      // pull home
      const k = 3.2 * (1.0 - storm * 0.7)
      let ax = (homes[ix] - px) * k
      let ay = (homes[ix+1] - py) * k
      let az = (homes[ix+2] - pz) * k * 2.0
      // wind
      const sw = storm * (0.7 + seeds[i] * 0.9)
      ax += windX(px, py, t) * sw * 2.4
      ay += windY(px, py, t) * sw * 2.4
      az += Math.sin(px*2.0 + py*2.0 + t*3.0 + seeds[i]*6.28) * sw * 1.4
      // cursor gust
      const dx = px - mouseX, dy = py - mouseY
      const d2 = dx*dx + dy*dy
      if (d2 < 4.0) { const f = (1 - d2/4.0) * 14.0; const d = Math.sqrt(d2)+1e-3; ax += dx/d*f; ay += dy/d*f }

      vel[ix]   = (vel[ix]   + ax*dt) * 0.86
      vel[ix+1] = (vel[ix+1] + ay*dt) * 0.86
      vel[ix+2] = (vel[ix+2] + az*dt) * 0.86
      arr[ix]   = px + vel[ix]*dt
      arr[ix+1] = py + vel[ix+1]*dt
      arr[ix+2] = pz + vel[ix+2]*dt
    }
    geo.attributes.position.needsUpdate = true
    // grains sharpen (shrink) when settled, bloom when flying
    mat.size = 0.026 + storm * 0.02
    mat.opacity = 0.7 + (1 - Math.min(storm,1)) * 0.28

    points.rotation.y = Math.sin(t*0.15) * 0.12 + (mouseX*0.02)
  }

  renderer.render(scene, camera)
}
function animate(){ requestAnimationFrame(animate); render() }
animate()

window.__fable = { renderer, scene, camera, homes, get t(){return t}, render }
