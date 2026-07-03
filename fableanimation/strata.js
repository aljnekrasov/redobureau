import * as THREE from "three"
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js"
import { simplex3 } from "./noise.js"
import { makeFallbackSky, makeVelvetSky } from "./sky.js"

// Liquid Strata: the Liquid 001 scene composited with the op-slani grid.
// Each frame the 3D render is sampled per cell, its luminance is pushed
// through op-slani's drifting field and quantized into the same six
// discrete opacity levels — boundaries crawl, the blob is the mass.

const INK = "#1E2B7B"
const PAPER = "#F4F2E9"
const GOLD = "#C09A2E"
const LEVELS = [0.05, 0.14, 0.28, 0.48, 0.72, 1]

const CELL = 22 // css px per grid cell (op-slani cell ≈ 20px)
const BOX = 9.4 / 12 // square side as a fraction of the cell, op-slani ratio
const SS = 2 // 3d samples per cell side (supersampling)

const distance = 14
const fov = 50
const BLOB_RADIUS = 2
const BLOB_DETAIL = 31
const BASE_AMP = 0.22
const FREQ_1 = 1.2
const FREQ_2 = 2.6

// fallbacks keep the camera sane when the page loads in a zero-sized frame
let height = window.innerHeight || 720
let width = window.innerWidth || 1280

let windowHalfX = width / 2
let windowHalfY = height / 2
let kX = (3.5 ** 2 * height) / (width * 1.5 * 4)
let kY = (9 * height) / (width * 4)

let mouseX = 0
let mouseY = 0
let lastClientX = null
let lastClientY = null
let energy = 0

const gridCanvas = document.getElementById("grid_root")
const ctx = gridCanvas.getContext("2d")

// -- 3d scene (rendered offscreen, never composited directly) ----------------

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 80)

// alpha matters: with alpha=false three clears render targets with alpha=1
// and the blob coverage mask (pass 2) would read as full-frame
const renderer = new THREE.WebGLRenderer({
  powerPreference: "high-performance",
  alpha: true
})

const light = new THREE.AmbientLight(0xffffff, Math.PI)
light.matrixAutoUpdate = false
scene.add(light)

const skyGeo = new THREE.SphereGeometry(20, 25, 25)
// dark until the texture arrives — keeps the first frames from flashing white
const skyMaterial = new THREE.MeshBasicMaterial({
  side: THREE.BackSide,
  color: 0x10173f
})
const sky = new THREE.Mesh(skyGeo, skyMaterial)
scene.add(sky)

const skyTextures = { waves: null, velvet: null }
let currentSky = "waves"

function setSkyMap(texture) {
  skyMaterial.map = texture
  skyMaterial.color.set(0xffffff)
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
    const texture = new THREE.CanvasTexture(makeFallbackSky())
    texture.colorSpace = THREE.SRGBColorSpace
    skyTextures.waves = texture
    if (currentSky === "waves") setSkyMap(texture)
  }
)

const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256)
const sphereCamera = new THREE.CubeCamera(0.1, 30, cubeRenderTarget)
scene.add(sphereCamera)

const blobGeometry = mergeVertices(
  new THREE.IcosahedronGeometry(BLOB_RADIUS, BLOB_DETAIL)
)
const position = blobGeometry.attributes.position

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

// -- grid state ----------------------------------------------------------------

let cols = 0
let rows = 0
let target = null
let pixelsSky = null
let pixelsBlob = null
let cellHash = null
let dpr = 1

// op-slani per-cell jitter
function hash(x, y) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return h - Math.floor(h)
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

  camera.position.z = Math.min((distance * height) / width, 18)
  camera.aspect = width / height
  camera.updateProjectionMatrix()

  cols = Math.max(8, Math.round(width / CELL))
  rows = Math.max(6, Math.round(height / CELL))

  if (target) target.dispose()
  target = new THREE.WebGLRenderTarget(cols * SS, rows * SS)
  pixelsSky = new Uint8Array(cols * SS * rows * SS * 4)
  pixelsBlob = new Uint8Array(cols * SS * rows * SS * 4)

  cellHash = new Float32Array(cols * rows)
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) cellHash[y * cols + x] = hash(x, y)
  }

  dpr = window.devicePixelRatio ? Math.min(window.devicePixelRatio, 2) : 1
  gridCanvas.width = Math.round(width * dpr)
  gridCanvas.height = Math.round(height * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

applySize()

// -- events ----------------------------------------------------------------------

window.addEventListener("resize", applySize, false)
gridCanvas.addEventListener("mousemove", onDocumentMouseMove, false)
gridCanvas.addEventListener("touchmove", onDocumentTouch, { passive: false })

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

// -- render loop -------------------------------------------------------------------

const clock = new THREE.Clock()
let morphTime = 0
let fieldTime = 0

function animate() {
  requestAnimationFrame(animate)
  render()
}

function render() {
  if (width !== window.innerWidth || height !== window.innerHeight) {
    applySize()
  }

  const dt = Math.min(clock.getDelta(), 0.05)

  energy *= Math.pow(0.2, dt)
  morphTime += dt * (0.35 + energy * 1.1)
  fieldTime += dt

  updateBlob()

  blob.rotation.y += dt * 0.12
  sky.rotation.y += dt * 0.008

  camera.position.x += (mouseX - camera.position.x) * 0.05
  camera.position.y -= (mouseY + camera.position.y) * 0.05
  camera.lookAt(scene.position)

  blob.visible = false
  sphereCamera.update(renderer, scene)
  blob.visible = true

  // two passes: sky and blob sampled separately so the mass always reads
  renderer.setRenderTarget(target)

  blob.visible = false
  renderer.render(scene, camera)
  renderer.readRenderTargetPixels(target, 0, 0, cols * SS, rows * SS, pixelsSky)
  blob.visible = true

  sky.visible = false
  renderer.render(scene, camera)
  renderer.readRenderTargetPixels(target, 0, 0, cols * SS, rows * SS, pixelsBlob)
  sky.visible = true

  renderer.setRenderTarget(null)

  drawGrid(fieldTime)
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

function drawGrid(t) {
  ctx.fillStyle = INK
  ctx.fillRect(0, 0, width, height)

  const cw = width / cols
  const ch = height / rows
  const box = Math.min(cw, ch) * BOX
  const ox = (cw - box) / 2
  const oy = (ch - box) / 2

  const srcW = cols * SS
  const driftAmp = 1 + energy * 0.5
  const maxQ = LEVELS.length - 1

  for (let cy = 0; cy < rows; cy++) {
    // op-slani's field was tuned for a 28x24 grid — keep its spatial scale
    const fy = (cy * 24) / rows
    for (let cx = 0; cx < cols; cx++) {
      const fx = (cx * 28) / cols

      // average the SS x SS block; gl readback is bottom-up, so flip rows
      let skyLum = 0
      let blobLum = 0
      let cov = 0
      let blobPeak = 0
      for (let sy = 0; sy < SS; sy++) {
        const row = (rows - 1 - cy) * SS + sy
        for (let sx = 0; sx < SS; sx++) {
          const p = (row * srcW + cx * SS + sx) * 4
          skyLum +=
            (0.2126 * pixelsSky[p] +
              0.7152 * pixelsSky[p + 1] +
              0.0722 * pixelsSky[p + 2]) /
            255
          const a = pixelsBlob[p + 3] / 255
          if (a > 0) {
            const l =
              (0.2126 * pixelsBlob[p] +
                0.7152 * pixelsBlob[p + 1] +
                0.0722 * pixelsBlob[p + 2]) /
              255
            blobLum += l
            if (l > blobPeak) blobPeak = l
          }
          cov += a
        }
      }
      const inv = 1 / (SS * SS)
      cov *= inv
      // render-target pixels are linear — lift them back to perceptual
      skyLum = Math.pow(skyLum * inv, 1 / 2.2)
      blobLum = cov > 0 ? Math.pow((blobLum * inv) / cov, 1 / 2.2) : 0

      // sky lives in the lower strata, the blob mass in the upper: the sky
      // ceiling (0.45) stays below the mass floor (0.62) so the two never
      // share the top quantization levels, and the drift is damped inside
      // the mass — the field crawls on the background and at the boundary,
      // while the mass holds together as one body
      let stretched = (skyLum - 0.45) * 1.4 + 0.45
      stretched = stretched < 0 ? 0 : stretched > 1 ? 1 : stretched
      const skyV = 0.03 + stretched * 0.42
      const blobV = 0.62 + blobLum * 0.48

      let v =
        skyV * (1 - cov) +
        blobV * cov +
        (1 - cov * 0.72) *
          driftAmp *
          0.85 *
          (0.16 * Math.sin(fx * 0.33 - t * 0.95 + fy * 0.24) +
            0.1 * Math.sin(fx * 0.11 + t * 0.42 + 1.7) +
            0.05 * Math.sin(t * 0.23 + fy * 0.5)) +
        (cellHash[cy * cols + cx] - 0.5) * 0.06

      v = v < 0 ? 0 : v > 1 ? 1 : v
      const q = Math.round(v * maxQ)

      ctx.globalAlpha = LEVELS[q]
      // gild only the hottest crests of the mass
      ctx.fillStyle = q === maxQ && cov > 0.5 && blobPeak > 0.9 ? GOLD : PAPER
      ctx.fillRect(cx * cw + ox, cy * ch + oy, box, box)
    }
  }
  ctx.globalAlpha = 1
}

animate()

window.__fable = { renderer, scene, camera, sky, skyMaterial, blob, render }

window.__fable.debugCoverageMap = function () {
  const lines = []
  for (let cy = 0; cy < rows; cy += 2) {
    let line = ""
    for (let cx = 0; cx < cols; cx++) {
      let cov = 0
      for (let sy = 0; sy < SS; sy++) {
        const row = (rows - 1 - cy) * SS + sy
        for (let sx = 0; sx < SS; sx++) {
          cov += pixelsBlob[(row * (cols * SS) + cx * SS + sx) * 4 + 3] / 255
        }
      }
      line += Math.round((cov / (SS * SS)) * 9)
    }
    lines.push(line)
  }
  return lines.join("\n")
}

window.__fable.debugStats = function () {
  const n = cols * SS * rows * SS
  let sMin = 1, sMax = 0, sSum = 0, cSum = 0, bSum = 0, bCount = 0
  for (let i = 0; i < n; i++) {
    const p = i * 4
    const s =
      (0.2126 * pixelsSky[p] + 0.7152 * pixelsSky[p + 1] + 0.0722 * pixelsSky[p + 2]) / 255
    sSum += s
    if (s < sMin) sMin = s
    if (s > sMax) sMax = s
    const a = pixelsBlob[p + 3] / 255
    cSum += a
    if (a > 0) {
      bSum +=
        (0.2126 * pixelsBlob[p] + 0.7152 * pixelsBlob[p + 1] + 0.0722 * pixelsBlob[p + 2]) / 255
      bCount++
    }
  }
  return {
    cols, rows,
    skyLinear: { min: +sMin.toFixed(3), max: +sMax.toFixed(3), mean: +(sSum / n).toFixed(3) },
    coverage: +(cSum / n).toFixed(3),
    blobLinearMean: bCount ? +(bSum / bCount).toFixed(3) : null
  }
}
