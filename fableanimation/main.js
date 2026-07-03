import * as THREE from "three"
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js"
import { simplex3 } from "./noise.js"
import { makeFallbackSky, makeVelvetSky } from "./sky.js"

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

// two skies: "waves" (the homepage 11.jpg) and "velvet" (procedural grain)
const skyTextures = { waves: null, velvet: null }
let currentSky = "waves"

function setSkyMap(texture) {
  skyMaterial.map = texture
  skyMaterial.needsUpdate = true
}

function setSky(name) {
  currentSky = name
  if (name === "velvet" && !skyTextures.velvet) {
    const texture = new THREE.CanvasTexture(makeVelvetSky())
    texture.colorSpace = THREE.SRGBColorSpace
    skyTextures.velvet = texture
  }
  if (skyTextures[name]) setSkyMap(skyTextures[name])

  switchEl.classList.toggle("velvet", name === "velvet")
  for (const label of switchEl.querySelectorAll(".sky-label")) {
    label.classList.toggle("active", label.dataset.sky === name)
  }
}

const switchEl = document.getElementById("sky_switch")
switchEl.querySelector(".pill").addEventListener("click", () => {
  setSky(currentSky === "waves" ? "velvet" : "waves")
})
for (const label of switchEl.querySelectorAll(".sky-label")) {
  label.addEventListener("click", () => setSky(label.dataset.sky))
}

new THREE.TextureLoader().load(
  "../assets/models/11.jpg",
  texture => {
    texture.colorSpace = THREE.SRGBColorSpace
    skyTextures.waves = texture
    if (currentSky === "waves") setSkyMap(texture)
  },
  undefined,
  () => {
    // standalone fallback: procedural waves in the 11.jpg palette
    const texture = new THREE.CanvasTexture(makeFallbackSky())
    texture.colorSpace = THREE.SRGBColorSpace
    skyTextures.waves = texture
    if (currentSky === "waves") setSkyMap(texture)
  }
)


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

animate()

window.__fable = { renderer, scene, camera, sky, skyMaterial, blob, render }
