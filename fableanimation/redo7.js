import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js"

// Punkti: the redo logotype in 3d, its surface printed with a moving grid of
// dots. The dots live in the surface's own plane, so where the rounded walls
// turn away from the camera the perspective foreshortens each round dot into
// a stretched ellipse — the op-art effect from the reference painting. The
// grid scrolls, and the surface itself carries a green-to-gold gradient.

const LOGO_WIDTH = 9
const EXTRUDE_DEPTH = 150 // svg units, scaled with the outline

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
scene.background = new THREE.Color(0x000000)

const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 120)

const renderer = new THREE.WebGLRenderer({
  canvas,
  powerPreference: "high-performance",
  antialias: true
})
renderer.setPixelRatio(1)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

// a near-black backdrop sits behind the logotype so its cast shadow has
// something to fall on — a shadow can't show against a truly black void
const backdrop = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80),
  new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 1, metalness: 0 })
)
backdrop.position.z = -3.2
backdrop.receiveShadow = true
scene.add(backdrop)

// key light casts the shadow; the ambient lifts the backdrop to a soft dark
// grey so the shadow reads as a gentle darkening, not a hard black blob
const ambient = new THREE.AmbientLight(0x2a2a34, 1.7)
scene.add(ambient)
const key = new THREE.DirectionalLight(0xfff1e0, 2.2)
key.position.set(2.2, 4.5, 8)
key.castShadow = true
key.shadow.mapSize.set(2048, 2048)
key.shadow.camera.near = 1
key.shadow.camera.far = 40
key.shadow.camera.left = -8
key.shadow.camera.right = 8
key.shadow.camera.top = 8
key.shadow.camera.bottom = -8
key.shadow.bias = -0.0006
key.shadow.radius = 14
scene.add(key)
scene.add(key.target)

// -- dot shader ---------------------------------------------------------------------

const vertexShader = /* glsl */ `
  varying vec3 vObj;
  varying vec3 vN;
  varying vec3 vView;
  void main() {
    vObj = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalMatrix * normal;
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uScale;
  uniform float uRadius;
  uniform float uFlow;
  uniform vec3 uGreen;
  uniform vec3 uGold;
  uniform vec3 uDeep;
  uniform vec3 uDot;
  varying vec3 vObj;
  varying vec3 vN;
  varying vec3 vView;

  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(vView);
    float facing = abs(dot(N, V));            // 1 head-on, 0 at the silhouette

    // round dots printed in the surface's object plane; the perspective
    // camera turns them into ellipses on the turned-away walls for free.
    // the grid scrolls along y over time.
    vec2 g = vObj.xy * uScale + vec2(0.0, uTime * uFlow);
    vec2 cell = fract(g) - 0.5;
    float d = length(cell);
    float aa = fwidth(d) * 1.4 + 0.006;
    float dotMask = 1.0 - smoothstep(uRadius - aa, uRadius + aa, d);

    // green -> gold -> deep-green gradient down the logotype, brightest at
    // the belly like the reference
    float band = smoothstep(-2.6, 0.0, vObj.y) * smoothstep(2.6, 0.0, vObj.y);
    vec3 grad = mix(uGreen, uGold, band);
    grad = mix(uDeep, grad, 0.35 + 0.65 * facing);

    // dark dots punch through the gradient; they read stronger where the
    // surface faces us, fading into the gradient at grazing angles
    vec3 col = mix(grad, uDot, dotMask * (0.35 + 0.65 * facing));

    // a soft directional sheen so the form still reads as solid 3d
    float sheen = pow(abs(dot(N, normalize(vec3(0.25, 0.45, 0.85)))), 2.0);
    col += vec3(0.10, 0.11, 0.06) * sheen;

    gl_FragColor = vec4(col, 1.0);
  }
`

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0 },
    uScale: { value: 2.4 },   // dot density
    uRadius: { value: 0.34 }, // dot radius within its cell
    uFlow: { value: 0.16 },   // scroll speed
    uGreen: { value: new THREE.Color("#2f7d45") },
    uGold: { value: new THREE.Color("#d8c24a") },
    uDeep: { value: new THREE.Color("#123f27") },
    uDot: { value: new THREE.Color("#0a1f14") }
  },
  side: THREE.DoubleSide
})

// -- logo geometry ------------------------------------------------------------------

const group = new THREE.Group()
scene.add(group)

new SVGLoader().load("redo-logo.svg", data => {
  const shapes = []
  for (const path of data.paths) {
    for (const shape of SVGLoader.createShapes(path)) shapes.push(shape)
  }

  // a rounded bevel with many segments gives smoothly rounded corners and
  // broad turned surfaces for the dots to stretch on, kept modest so the
  // letterforms stay legible
  let geometry = new THREE.ExtrudeGeometry(shapes, {
    depth: EXTRUDE_DEPTH,
    curveSegments: 32,
    bevelEnabled: true,
    bevelThickness: 40,
    bevelSize: 34,
    bevelSegments: 9
  })
  geometry = mergeVertices(geometry, 0.4)
  geometry.computeVertexNormals()

  const s = LOGO_WIDTH / 1840.49
  geometry.scale(s, -s, s)
  geometry.computeBoundingBox()
  const c = new THREE.Vector3()
  geometry.boundingBox.getCenter(c)
  geometry.translate(-c.x, -c.y, -c.z)

  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  // the surface shader doesn't move vertices, so a plain depth material
  // renders the correct silhouette into the shadow map
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    side: THREE.DoubleSide
  })
  group.add(mesh)
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
  const halfAngle = Math.atan(Math.tan((camera.fov * Math.PI) / 360) * camera.aspect)
  camera.position.z = (LOGO_WIDTH / 2 / 0.82) / Math.tan(halfAngle)
  camera.updateProjectionMatrix()

  renderer.setSize(width, height, false)
}

applySize()
window.addEventListener("resize", applySize, false)

// -- interaction --------------------------------------------------------------------

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
  material.uniforms.uTime.value = t

  // slow turning so the dots visibly stretch as walls swing toward the edge
  group.rotation.y = Math.sin(t * 0.16) * 0.5 + mouseX * 0.35
  group.rotation.x = Math.cos(t * 0.12) * 0.16 - mouseY * 0.25

  camera.position.x += (mouseX * 0.4 - camera.position.x) * 0.05
  camera.position.y += (-mouseY * 0.4 - camera.position.y) * 0.05
  camera.lookAt(scene.position)

  renderer.render(scene, camera)
}

function animate() {
  requestAnimationFrame(animate)
  render()
}

animate()

window.__fable = { renderer, scene, camera, group, material, render }
