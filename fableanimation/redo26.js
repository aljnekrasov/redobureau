import * as THREE from "three"

// Anamorfoze: three secret assembly points scattered through a black void,
// each looking in its own direction, each with its own cloud of invisible
// panels — some an arm's length away, some sixty units deep, tilted every
// which way. The camera flies a closed loop through space: it brakes into
// a station, the white shards lock into the mark for a breath, then it
// tears away toward the next station somewhere else entirely, and the
// fragments scatter into the dark. No walls, no light — only the mark.

let width = window.innerWidth || 1280
let height = window.innerHeight || 720

let mouseX = 0
let mouseY = 0

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000000)

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 300)

// -- the mark texture -----------------------------------------------------------------

const artCanvas = document.createElement("canvas")
artCanvas.width = 2048
artCanvas.height = 1152
const artTexture = new THREE.CanvasTexture(artCanvas)
artTexture.minFilter = THREE.LinearFilter
artTexture.generateMipmaps = false

fetch("redo-logo.svg")
  .then(r => r.text())
  .then(svg => {
    const sized = svg
      .replace(/currentColor/g, "#f2f0ea")
      .replace("<svg ", '<svg width="1840.49" height="468.42" ')
    const blob = new Blob([sized], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const g = artCanvas.getContext("2d")
      g.clearRect(0, 0, 2048, 1152)
      const dw = 2048 * 0.72
      const dh = dw * (468.42 / 1840.49)
      g.drawImage(img, (2048 - dw) / 2, (1152 - dh) / 2, dw, dh)
      artTexture.needsUpdate = true
      URL.revokeObjectURL(url)
    }
    img.src = url
  })

// -- three stations, three directions ---------------------------------------------------

function hash(n) {
  const x = Math.sin(n * 127.1) * 43758.5453
  return x - Math.floor(x)
}

const STATIONS = [
  { pos: new THREE.Vector3(0, 0, 6), look: new THREE.Vector3(0, 0, -20) },
  { pos: new THREE.Vector3(-34, 7, -34), look: new THREE.Vector3(-6, 2, -40) },
  { pos: new THREE.Vector3(24, -9, -60), look: new THREE.Vector3(2, -2, -30) }
]

const quats = []
// a camera helper: cameras look down -Z, so lookAt gives camera-style quats
const helper = new THREE.PerspectiveCamera()
for (const s of STATIONS) {
  helper.position.copy(s.pos)
  helper.lookAt(s.look)
  helper.updateMatrixWorld()
  quats.push(helper.quaternion.clone())
  s.dir = s.look.clone().sub(s.pos).normalize()
}

function facetMaterial(projVP) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMask: { value: artTexture },
      uProjVP: { value: projVP }
    },
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      uniform mat4 uProjVP;
      varying vec4 vP;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vP = uProjVP * w;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform sampler2D uMask;
      varying vec4 vP;
      void main() {
        float m = 0.0;
        if (vP.w > 0.0) {
          vec2 uv = vP.xy / vP.w * 0.5 + 0.5;
          if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) {
            m = texture2D(uMask, uv).a;
          }
        }
        // panels are pure void — only the projected shards exist
        vec3 col = mix(vec3(0.0), vec3(0.945, 0.94, 0.925), m);
        gl_FragColor = vec4(col, 1.0);
      }
    `
  })
}

const facets = []

STATIONS.forEach((s, si) => {
  const projector = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 300)
  projector.position.copy(s.pos)
  projector.lookAt(s.look)
  projector.updateMatrixWorld()
  const projVP = new THREE.Matrix4()
  projVP.multiplyMatrices(projector.projectionMatrix, projector.matrixWorldInverse)

  // frame vectors of the projector for placing panels in its frustum
  const fwd = s.dir
  const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize()
  const up = new THREE.Vector3().crossVectors(right, fwd).normalize()

  const N = 16
  for (let i = 0; i < N; i++) {
    const k = si * 100 + i
    // dramatic depth spread: from right under the nose to way out deep
    const depth = 2.2 + Math.pow(hash(k * 3.1), 2.2) * 58
    const hh = Math.tan((40 * Math.PI) / 360) * depth
    const hw = hh * (16 / 9)
    const cx = (hash(k * 13.3) - 0.5) * 2 * hw * 0.85
    const cy = (hash(k * 17.9) - 0.5) * 2 * hh * 0.85
    // dramatic size spread too
    const sz = hh * (0.35 + hash(k * 41.3) * 1.5)

    const centre = s.pos.clone()
      .addScaledVector(fwd, depth)
      .addScaledVector(right, cx)
      .addScaledVector(up, cy)

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), facetMaterial(projVP))
    mesh.position.copy(centre)
    // start facing the projector, then knock it wildly off-plane
    mesh.lookAt(s.pos)
    mesh.rotateX((hash(k * 23.7) - 0.5) * 1.5)
    mesh.rotateY((hash(k * 29.1) - 0.5) * 1.5)
    mesh.rotateZ((hash(k * 31.7) - 0.5) * 1.0)
    scene.add(mesh)
    facets.push(mesh)
  }

  // catch-all wall far behind this station's cloud
  const backDepth = 68
  const bh = Math.tan((40 * Math.PI) / 360) * backDepth * 1.35
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(bh * 2 * (16 / 9), bh * 2),
    facetMaterial(projVP)
  )
  back.position.copy(s.pos.clone().addScaledVector(fwd, backDepth))
  back.lookAt(s.pos)
  scene.add(back)
  facets.push(back)
})

// -- the flight path: a closed loop through the three stations ------------------------

// wide detour points between stations keep the flight OUTSIDE the lit
// projection cones most of the way — the shards are seen scattered from
// the side, and only brief flashes happen when a panel is pierced
const WAYPOINTS = [
  STATIONS[0].pos.clone(),
  new THREE.Vector3(-22, 13, -4),
  STATIONS[1].pos.clone(),
  new THREE.Vector3(-4, -16, -24),
  STATIONS[2].pos.clone(),
  new THREE.Vector3(25, 8, -16)
]
const curve = new THREE.CatmullRomCurve3(WAYPOINTS, true, "centripetal", 0.5)

// -- sizing ---------------------------------------------------------------------------

function applySize() {
  if (window.innerWidth && window.innerHeight) {
    width = window.innerWidth
    height = window.innerHeight
  }
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

applySize()
window.addEventListener("resize", applySize, false)

// -- interaction ----------------------------------------------------------------------

window.addEventListener("mousemove", e => {
  mouseX = (e.clientX / width - 0.5) * 2
  mouseY = (e.clientY / height - 0.5) * 2
})

// -- loop -----------------------------------------------------------------------------

const clock = new THREE.Clock()
let t = 0
const qTmp = new THREE.Quaternion()
const wobQ = new THREE.Quaternion()
const wobE = new THREE.Euler()

function render() {
  if (width !== window.innerWidth || height !== window.innerHeight) applySize()

  const dt = Math.min(clock.getDelta(), 0.05)
  t += dt

  // 11 seconds per leg: a long tearing flight, then a held breath exactly
  // in the next projector's shoes
  const LEG = 11
  const TRAVEL = 0.85
  const p = (t / LEG) % 3
  const seg = Math.floor(p)
  const f = p - seg

  let blend
  if (f < TRAVEL) {
    const q = f / TRAVEL
    blend = q * q * (3 - 2 * q)
  } else {
    blend = 1
  }

  const u = ((seg + blend) / 3) % 1
  const pos = curve.getPoint(u)
  // the eye turns toward the next station early, so its shard cloud is in
  // frame for most of the flight
  const oBlend = Math.min(1, blend * 1.7)
  qTmp.slerpQuaternions(quats[seg], quats[(seg + 1) % 3], oBlend)

  // shatter wobble peaks mid-flight, dies exactly at the stations
  const wob = Math.sin(Math.min(f / TRAVEL, 1) * Math.PI)

  pos.x += (Math.sin(t * 0.9) * 2.0 + mouseX * 1.8) * wob
  pos.y += (Math.cos(t * 0.7) * 1.4 - mouseY * 1.3) * wob

  camera.position.copy(pos)
  camera.quaternion.copy(qTmp)
  wobE.set(
    Math.sin(t * 0.6) * 0.06 * wob,
    Math.cos(t * 0.5) * 0.06 * wob,
    Math.sin(t * 0.45) * 0.09 * wob
  )
  wobQ.setFromEuler(wobE)
  camera.quaternion.multiply(wobQ)

  renderer.render(scene, camera)
}

function animate() {
  requestAnimationFrame(animate)
  render()
}

animate()

window.__fable = { renderer, scene, camera, facets, STATIONS, quats, curve, render }
