import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js"

// Vēdeklis: the redo logotype as a fan of near-black slabs, after the
// turbine reference. One thin dark extrusion of the logo is echoed a few
// dozen times, every copy stepped a little further around the screen axis
// and tilted a little deeper — the stack reads as a spiral staircase of
// panels. Bodies stay black-on-black; only the edges catch a thin cold
// glint. The fan breathes open and shut, and the mouse stirs it.

const WING = 13 // dark slabs per direction — the fan opens both ways
const LOGO_WIDTH = 7.4 // world units the logotype is scaled to
const EXTRUDE_DEPTH = 26 // svg units — a thin slab, not a brick

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
scene.background = new THREE.Color("#050506")

const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 120)

const renderer = new THREE.WebGLRenderer({
  canvas,
  powerPreference: "high-performance",
  antialias: true
})
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
// without scaling them into the css box, a retina bitmap shows as a crop
renderer.setPixelRatio(1)

// -- slab shader: black body, thin edge glint --------------------------------------

const vertexShader = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalMatrix * normal;
    vV = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`

const fragmentShader = /* glsl */ `
  uniform float uFade;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(vV);
    float grazing = pow(1.0 - abs(dot(N, V)), 5.0);
    // a faint directional sheen keeps the black slabs from merging fully
    float sheen = pow(abs(dot(N, normalize(vec3(0.3, 0.5, 0.8)))), 3.0);
    vec3 body = vec3(0.055, 0.057, 0.062) + vec3(0.05) * sheen;
    vec3 rim = vec3(0.88, 0.90, 0.94) * grazing * uFade;
    gl_FragColor = vec4(body + rim, 1.0);
  }
`

// the centre slab: matte paper white, softly shaded — the readable redo
const whiteFragmentShader = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec3 N = normalize(vN);
    float l = abs(dot(N, normalize(vec3(0.25, 0.4, 0.9))));
    gl_FragColor = vec4(vec3(0.965, 0.965, 0.945) * (0.58 + 0.42 * l), 1.0);
  }
`

// -- fan ----------------------------------------------------------------------------

const group = new THREE.Group()
scene.add(group)

const slabs = []

new SVGLoader().load("redo-logo.svg", data => {
  const shapes = []
  for (const path of data.paths) {
    for (const shape of SVGLoader.createShapes(path)) shapes.push(shape)
  }

  let geometry = new THREE.ExtrudeGeometry(shapes, {
    depth: EXTRUDE_DEPTH,
    curveSegments: 20,
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

  // two mirrored wings of dark echoes, one swinging clockwise, one counter
  for (const dir of [-1, 1]) {
    for (let i = 0; i < WING; i++) {
      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          // front copies glint brightest, the tail sinks into black
          uFade: { value: 1 - (i / (WING - 1)) * 0.65 }
        }
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.renderOrder = WING - i
      mesh.userData = { dir, step: i + 1 }
      slabs.push(mesh)
      group.add(mesh)
    }
  }

  // the central redo: white, in front, drawn over everything — always legible
  const white = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: whiteFragmentShader,
    depthTest: false,
    depthWrite: false
  })
  const centre = new THREE.Mesh(geometry, white)
  centre.renderOrder = 1000
  group.add(centre)
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
  // the fan sweeps a circle as wide as the logotype — fit that circle
  const halfAngle = Math.atan(Math.tan((camera.fov * Math.PI) / 360) * camera.aspect)
  camera.position.z = (LOGO_WIDTH / 2 / 0.55) / Math.tan(halfAngle)
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
  mouseX = ((event.clientX - windowHalfX) / windowHalfX) * 1.4
  mouseY = ((event.clientY - windowHalfY) / windowHalfY) * 0.9

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
  t += dt * (1 + energy * 1.6)

  // the fan breathes: spread angle per copy swells and shrinks, so the
  // stack opens into a full turbine and folds back into a crescent
  const spread = 0.13 + 0.08 * Math.sin(t * 0.21)
  const tilt = 0.028 * Math.sin(t * 0.16 + 1.3)
  const lift = 0.05 + 0.02 * Math.sin(t * 0.11 + 2.1)

  for (const mesh of slabs) {
    const { dir, step } = mesh.userData
    mesh.rotation.z = dir * step * spread
    mesh.rotation.y = dir * step * tilt
    mesh.position.z = -step * lift
  }

  // gentle sway only — no full precession, the white redo stays upright
  group.rotation.z = Math.sin(t * 0.06) * 0.14 + energy * 0.05
  group.rotation.x = Math.cos(t * 0.09) * 0.16 - mouseY * 0.22
  group.rotation.y = Math.sin(t * 0.07) * 0.2 + mouseX * 0.28

  camera.position.x += (mouseX * 0.6 - camera.position.x) * 0.05
  camera.position.y += (-mouseY * 0.6 - camera.position.y) * 0.05
  camera.lookAt(scene.position)

  renderer.render(scene, camera)
}

function animate() {
  requestAnimationFrame(animate)
  render()
}

animate()

window.__fable = { renderer, scene, camera, group, slabs, render }
