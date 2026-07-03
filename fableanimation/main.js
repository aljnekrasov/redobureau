import * as THREE from "three"
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js"

// Liquid-metal blob in the homepage style: same psychedelic sky (11.jpg),
// same CubeCamera live reflections and mouse-follow camera — but instead of
// the static logo, a continuously morphing chrome blob that churns harder
// the faster you move the pointer.

const container = document.getElementById("three_root")

// fallbacks keep the camera sane when the page loads in a zero-sized frame
let height = window.innerHeight || 720
let width = window.innerWidth || 1280

let windowHalfX = width / 2
let windowHalfY = height / 2

const distance = 14
const fov = 50
let kX = (3.5 ** 2 * height) / (width * 1.5 * 4)
let kY = (9 * height) / (width * 4)

let mouseX = 0
let mouseY = 0
let lastClientX = null
let lastClientY = null

// "churn" energy fed by pointer speed, decays every frame
let energy = 0

const BLOB_RADIUS = 2
// PolyhedronGeometry detail is linear: 20 * (detail + 1)^2 triangles
const BLOB_DETAIL = 31
const BASE_AMP = 0.22
const FREQ_1 = 1.2
const FREQ_2 = 2.6

const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 80)

const renderer = new THREE.WebGLRenderer({
  powerPreference: "high-performance"
})
renderer.setPixelRatio(
  window.devicePixelRatio ? Math.min(window.devicePixelRatio, 2) : 1
)
applySize()
container.appendChild(renderer.domElement)

// PI compensates the physical lighting of newer three — keeps the r114 look
const light = new THREE.AmbientLight(0xffffff, Math.PI)
light.matrixAutoUpdate = false
scene.add(light)

// -- sky sphere with the homepage environment texture ------------------------

// unlit: exact equivalent of the homepage's Lambert + ambient(1) in legacy mode
const skyGeo = new THREE.SphereGeometry(20, 25, 25)
const skyMaterial = new THREE.MeshBasicMaterial({ side: THREE.BackSide })
const sky = new THREE.Mesh(skyGeo, skyMaterial)
scene.add(sky)

new THREE.TextureLoader().load(
  "../assets/models/11.jpg",
  texture => {
    texture.colorSpace = THREE.SRGBColorSpace
    skyMaterial.map = texture
    skyMaterial.needsUpdate = true
  },
  undefined,
  () => {
    // standalone fallback: procedural waves in the 11.jpg palette
    const texture = new THREE.CanvasTexture(makeFallbackSky())
    texture.colorSpace = THREE.SRGBColorSpace
    skyMaterial.map = texture
    skyMaterial.needsUpdate = true
  }
)

function makeFallbackSky() {
  const size = 1024
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = size
  const ctx = canvas.getContext("2d")

  ctx.fillStyle = "#04041e"
  ctx.fillRect(0, 0, size, size)

  const bands = [
    { color: "#d40000", y: 0.10, amp: 90, freq: 1.5, w: 70 },
    { color: "#1414e0", y: 0.34, amp: 120, freq: 1.0, w: 160 },
    { color: "#ff3fd2", y: 0.62, amp: 100, freq: 1.8, w: 60 },
    { color: "#ffe93b", y: 0.72, amp: 110, freq: 1.8, w: 40 },
    { color: "#63ffe9", y: 0.86, amp: 90, freq: 2.2, w: 46 },
    { color: "#1414e0", y: 0.95, amp: 80, freq: 1.2, w: 120 }
  ]

  ctx.globalCompositeOperation = "lighter"
  for (const band of bands) {
    ctx.strokeStyle = band.color
    ctx.lineWidth = band.w
    ctx.shadowColor = band.color
    ctx.shadowBlur = 70
    ctx.beginPath()
    for (let x = -40; x <= size + 40; x += 8) {
      const y =
        band.y * size +
        Math.sin((x / size) * Math.PI * 2 * band.freq) * band.amp
      x === -40 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  return canvas
}

// -- chrome blob with live reflections ---------------------------------------

const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256)
const sphereCamera = new THREE.CubeCamera(0.1, 30, cubeRenderTarget)
scene.add(sphereCamera)

const blobGeometry = mergeVertices(
  new THREE.IcosahedronGeometry(BLOB_RADIUS, BLOB_DETAIL)
)
const position = blobGeometry.attributes.position

// unit directions of the pristine sphere — displacement always starts from these
const dirs = new Float32Array(position.array.length)
for (let i = 0; i < position.array.length; i += 3) {
  dirs[i] = position.array[i] / BLOB_RADIUS
  dirs[i + 1] = position.array[i + 1] / BLOB_RADIUS
  dirs[i + 2] = position.array[i + 2] / BLOB_RADIUS
}

const blobMaterial = new THREE.MeshLambertMaterial({
  color: 0xffffff,
  envMap: cubeRenderTarget.texture
})
const blob = new THREE.Mesh(blobGeometry, blobMaterial)
scene.add(blob)

// -- events -------------------------------------------------------------------

window.addEventListener("resize", onWindowResize, false)
container.addEventListener("mousemove", onDocumentMouseMove, false)
container.addEventListener("touchmove", onDocumentTouch, { passive: false })

function onDocumentTouch(event) {
  event.preventDefault()
  onDocumentMouseMove(event.targetTouches[0])
}

function onDocumentMouseMove(event) {
  mouseX = (event.clientX - windowHalfX) * 0.015 * kX
  mouseY = (event.clientY - windowHalfY) * 0.015 * kY

  if (lastClientX !== null) {
    const speed =
      Math.hypot(event.clientX - lastClientX, event.clientY - lastClientY) /
      Math.max(width, height)
    energy = Math.min(energy + speed * 6, 1.4)
  }
  lastClientX = event.clientX
  lastClientY = event.clientY
}

function onWindowResize() {
  applySize()
}

function applySize() {
  if (window.innerWidth && window.innerHeight) {
    width = window.innerWidth
    height = window.innerHeight
  }

  windowHalfX = width / 2
  windowHalfY = height / 2

  kX = (3.5 ** 2 * height) / (width * 1.5 * 4)
  kY = (9 * height) / (width * 4)

  // clamped so the camera never leaves the sky sphere on narrow screens
  camera.position.z = Math.min((distance * height) / width, 18)
  camera.aspect = width / height
  camera.updateProjectionMatrix()

  renderer.setSize(width, height)
}

// -- render loop ----------------------------------------------------------------

const clock = new THREE.Clock()
let morphTime = 0

function animate() {
  requestAnimationFrame(animate)
  render()
}

function render() {
  // catches size changes the resize event misses (hidden/zero-sized frames)
  if (width !== window.innerWidth || height !== window.innerHeight) {
    applySize()
  }

  const dt = Math.min(clock.getDelta(), 0.05)

  energy *= Math.pow(0.2, dt) // ~fully calm in a couple of seconds
  morphTime += dt * (0.35 + energy * 1.1)

  updateBlob()

  blob.rotation.y += dt * 0.12
  sky.rotation.y += dt * 0.008

  camera.position.x += (mouseX - camera.position.x) * 0.05
  camera.position.y -= (mouseY + camera.position.y) * 0.05
  camera.lookAt(scene.position)

  blob.visible = false
  sphereCamera.update(renderer, scene)
  blob.visible = true

  renderer.render(scene, camera)
}

function updateBlob() {
  const amp = BLOB_RADIUS * (BASE_AMP + energy * 0.16)
  const array = position.array
  const t = morphTime

  for (let i = 0; i < array.length; i += 3) {
    const dx = dirs[i]
    const dy = dirs[i + 1]
    const dz = dirs[i + 2]
    const n =
      0.7 * simplex3(dx * FREQ_1 + t, dy * FREQ_1, dz * FREQ_1) +
      0.3 * simplex3(dx * FREQ_2, dy * FREQ_2 - t * 1.7, dz * FREQ_2 + t * 0.9)
    const r = BLOB_RADIUS + amp * n
    array[i] = dx * r
    array[i + 1] = dy * r
    array[i + 2] = dz * r
  }
  position.needsUpdate = true
  blobGeometry.computeVertexNormals()
}

// -- 3d simplex noise (Gustavson) --------------------------------------------

const grad3 = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
]

const perm = makePerm(1929)

function makePerm(seed) {
  const p = []
  for (let i = 0; i < 256; i++) p[i] = i
  let s = seed >>> 0
  const random = () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[p[i], p[j]] = [p[j], p[i]]
  }
  const out = new Uint8Array(512)
  for (let i = 0; i < 512; i++) out[i] = p[i & 255]
  return out
}

function simplex3(xin, yin, zin) {
  const F3 = 1 / 3
  const G3 = 1 / 6

  const s = (xin + yin + zin) * F3
  const i = Math.floor(xin + s)
  const j = Math.floor(yin + s)
  const k = Math.floor(zin + s)
  const t = (i + j + k) * G3
  const x0 = xin - (i - t)
  const y0 = yin - (j - t)
  const z0 = zin - (k - t)

  let i1, j1, k1, i2, j2, k2
  if (x0 >= y0) {
    if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0 }
    else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1 }
    else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1 }
  } else {
    if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1 }
    else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1 }
    else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0 }
  }

  const x1 = x0 - i1 + G3
  const y1 = y0 - j1 + G3
  const z1 = z0 - k1 + G3
  const x2 = x0 - i2 + 2 * G3
  const y2 = y0 - j2 + 2 * G3
  const z2 = z0 - k2 + 2 * G3
  const x3 = x0 - 1 + 3 * G3
  const y3 = y0 - 1 + 3 * G3
  const z3 = z0 - 1 + 3 * G3

  const ii = i & 255
  const jj = j & 255
  const kk = k & 255

  let n = 0

  let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0
  if (t0 > 0) {
    const g = grad3[perm[ii + perm[jj + perm[kk]]] % 12]
    t0 *= t0
    n += t0 * t0 * (g[0] * x0 + g[1] * y0 + g[2] * z0)
  }
  let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1
  if (t1 > 0) {
    const g = grad3[perm[ii + i1 + perm[jj + j1 + perm[kk + k1]]] % 12]
    t1 *= t1
    n += t1 * t1 * (g[0] * x1 + g[1] * y1 + g[2] * z1)
  }
  let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2
  if (t2 > 0) {
    const g = grad3[perm[ii + i2 + perm[jj + j2 + perm[kk + k2]]] % 12]
    t2 *= t2
    n += t2 * t2 * (g[0] * x2 + g[1] * y2 + g[2] * z2)
  }
  let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3
  if (t3 > 0) {
    const g = grad3[perm[ii + 1 + perm[jj + 1 + perm[kk + 1]]] % 12]
    t3 *= t3
    n += t3 * t3 * (g[0] * x3 + g[1] * y3 + g[2] * z3)
  }

  return 32 * n
}

animate()

window.__fable = { renderer, scene, camera, sky, skyMaterial, blob, render }
