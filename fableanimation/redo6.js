import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js"

// Gredzens: after the HERETHERE poster — a loose vertical ring of thin
// extruded slabs tumbling on a periwinkle field, half warm gold, half
// paper white. Here every slab is a small redo logotype. Each one turns
// on its own axes at its own pace, the ring itself slowly precesses,
// the mouse tilts the whole carousel.

const SLABS = 11
const LOGO_WIDTH = 3.6 // world units per slab
const EXTRUDE_DEPTH = 120 // svg units — a chunky poster-like depth
const RING_RX = 2.9 // the ring is a standing oval with an open centre
const RING_RY = 3.7

const GOLD = 0xCBA36B
const GOLD_DEEP = 0xB08A50
const PAPER = 0xF6F5F0

let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let windowHalfX = width / 2
let windowHalfY = height / 2

let mouseX = 0
let mouseY = 0
let lastClientX = null
let lastClientY = null
let energy = 0

const canvas = document.getElementById("scene_root")

const scene = new THREE.Scene()
scene.background = new THREE.Color(0xB7BAEE)

const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 120)

const renderer = new THREE.WebGLRenderer({
  canvas,
  powerPreference: "high-performance",
  antialias: true
})
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
// without scaling them into the css box, a retina bitmap shows as a crop
renderer.setPixelRatio(1)

// paper-matte light: soft ambient plus one directional from the upper left,
// so caps stay bright and the extruded sides fall into warm shadow
scene.add(new THREE.AmbientLight(0xffffff, 1.25))
const sun = new THREE.DirectionalLight(0xffffff, 1.9)
sun.position.set(-4, 6, 8)
scene.add(sun)
const counter = new THREE.DirectionalLight(0x9fa3e8, 0.7)
counter.position.set(5, -4, 6)
scene.add(counter)

// -- ring of slabs -----------------------------------------------------------------

const ring = new THREE.Group()
scene.add(ring)

const slabs = []

function rand(a, b) {
  return a + Math.random() * (b - a)
}

new SVGLoader().load("redo-logo.svg", data => {
  const shapes = []
  for (const path of data.paths) {
    for (const shape of SVGLoader.createShapes(path)) shapes.push(shape)
  }

  let geometry = new THREE.ExtrudeGeometry(shapes, {
    depth: EXTRUDE_DEPTH,
    curveSegments: 16,
    bevelEnabled: false
  })
  geometry = mergeVertices(geometry, 0.4)
  geometry.computeVertexNormals()

  const s = LOGO_WIDTH / 1840.49
  geometry.scale(s, -s, s)
  geometry.computeBoundingBox()
  const c = new THREE.Vector3()
  geometry.boundingBox.getCenter(c)
  geometry.translate(-c.x, -c.y, -c.z)

  for (let i = 0; i < SLABS; i++) {
    // poster mix: roughly two golds to one white
    const roll = i % 3
    const material = new THREE.MeshLambertMaterial({
      color: roll === 0 ? PAPER : roll === 1 ? GOLD : GOLD_DEEP
    })
    const mesh = new THREE.Mesh(geometry, material)
    const phi = (i / SLABS) * Math.PI * 2
    mesh.userData = {
      phi,
      z: rand(-0.7, 0.7),
      rot: new THREE.Euler(rand(0, Math.PI * 2), rand(0, Math.PI * 2), rand(0, Math.PI * 2)),
      spin: new THREE.Vector3(rand(0.08, 0.3), rand(0.08, 0.3), rand(0.05, 0.2)),
      wobble: rand(0.15, 0.4)
    }
    slabs.push(mesh)
    ring.add(mesh)
  }
})

// -- sizing -------------------------------------------------------------------------

function applySize() {
  if (window.innerWidth && window.innerHeight) {
    width = window.innerWidth
    height = window.innerHeight
  }
  windowHalfX = width / 2
  windowHalfY = height / 2

  camera.aspect = width / height
  // fit the standing oval (plus slab reach) into the frame height
  const extent = RING_RY + LOGO_WIDTH * 0.75
  camera.position.z = extent / 0.98 / Math.tan((camera.fov * Math.PI) / 360)
  camera.updateProjectionMatrix()

  renderer.setSize(width, height, false)
}

applySize()
window.addEventListener("resize", applySize, false)

// -- interaction -----------------------------------------------------------------

canvas.addEventListener("mousemove", onPointerMove, false)
canvas.addEventListener("touchmove", e => {
  e.preventDefault()
  onPointerMove(e.targetTouches[0])
}, { passive: false })

function onPointerMove(event) {
  mouseX = ((event.clientX - windowHalfX) / windowHalfX) * 1.2
  mouseY = ((event.clientY - windowHalfY) / windowHalfY) * 0.8

  if (lastClientX !== null) {
    const speed =
      Math.hypot(event.clientX - lastClientX, event.clientY - lastClientY) /
      Math.max(width, height)
    energy = Math.min(energy + speed * 6, 1.4)
  }
  lastClientX = event.clientX
  lastClientY = event.clientY
}

// -- loop ---------------------------------------------------------------------------

const clock = new THREE.Clock()
let t = 0

function render() {
  if (width !== window.innerWidth || height !== window.innerHeight) applySize()

  const dt = Math.min(clock.getDelta(), 0.05)
  energy *= Math.pow(0.25, dt)
  t += dt * (1 + energy * 1.2)

  // the carousel drifts around the oval; each slab tumbles on its own
  const drift = t * 0.045
  for (const mesh of slabs) {
    const u = mesh.userData
    const phi = u.phi + drift
    mesh.position.set(
      Math.cos(phi) * RING_RX,
      Math.sin(phi) * RING_RY,
      u.z + Math.sin(t * u.wobble + u.phi * 3) * 0.5
    )
    // never fully edge-on: tilts oscillate around the frontal pose, only
    // the in-plane angle runs free — every slab keeps a readable 3/4 view
    mesh.rotation.set(
      Math.sin(t * u.spin.x + u.rot.x) * 0.45,
      Math.sin(t * u.spin.y + u.rot.y) * 0.55,
      u.rot.z + t * u.spin.z * 0.7
    )
  }

  ring.rotation.x = Math.cos(t * 0.07) * 0.06 - mouseY * 0.16
  ring.rotation.y = Math.sin(t * 0.09) * 0.08 + mouseX * 0.2

  camera.position.x += (mouseX * 0.5 - camera.position.x) * 0.05
  camera.position.y += (-mouseY * 0.5 - camera.position.y) * 0.05
  camera.lookAt(scene.position)

  renderer.render(scene, camera)
}

function animate() {
  requestAnimationFrame(animate)
  render()
}

animate()

window.__fable = { renderer, scene, camera, ring, slabs, render }
