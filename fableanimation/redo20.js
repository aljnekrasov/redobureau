import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js"

// Spogulis: the engine-turned light show of 022 becomes the room. A
// fullscreen sheet of animated brushed rings burns behind, the same weave
// lines an invisible sphere around the mark, and the rounded chrome redo
// hangs in front, mirroring the sweeping fans in real time — the cube
// camera re-photographs the metal world every frame.

const LOGO_W = 9

let width = window.innerWidth || 1280
let height = window.innerHeight || 720

let mouseX = 0
let mouseY = 0
let lastClientX = null
let lastClientY = null
let energy = 0

const canvas = document.getElementById("scene_root")

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
renderer.autoClear = false

// the engine-turned pattern, shared by the backdrop and the mirror world
const TURN_GLSL = /* glsl */ `
  float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
  float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x),
      mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x),
      f.y);
  }
  // anisotropic sheen of arcs brushed around uHub, lamps circling with time.
  // pc is in "pattern units": rings are ~0.34 wide
  vec3 turned(vec2 pc, vec2 hub, float time, float azi) {
    vec2 d = pc - hub;
    float r = length(d);
    float theta = atan(d.y, d.x);
    vec2 rad = d / max(r, 1e-4);
    float band = floor(r / 0.34);
    float bh = hash(band + 7.0);

    vec2 tg = vec2(-rad.y, rad.x);
    float ang = (bh - 0.5) * 0.9;
    float ca = cos(ang), sa = sin(ang);
    tg = vec2(tg.x * ca - tg.y * sa, tg.x * sa + tg.y * ca);
    vec3 T = vec3(tg, 0.0);

    float grain =
      0.62 * vnoise(vec2(r * 42.0, theta * 7.0 + bh * 60.0)) +
      0.38 * vnoise(vec2(r * 120.0, theta * 3.0 + bh * 21.0));

    // flat wall: N = +z, V = -z
    float sweep = time * 0.55 + azi;
    vec3 L1 = normalize(vec3(cos(sweep), sin(sweep), 0.38));
    float sweep2 = time * 0.31 + 2.1 + azi * 0.6;
    vec3 L2 = normalize(vec3(cos(sweep2), sin(sweep2), 0.30));

    vec3 H1 = normalize(L1 + vec3(0.0, 0.0, 1.0));
    vec3 H2 = normalize(L2 + vec3(0.0, 0.0, 1.0));
    float th1 = dot(T, H1);
    float th2 = dot(T, H2);
    float s1 = sqrt(max(0.0, 1.0 - th1 * th1));
    float s2 = sqrt(max(0.0, 1.0 - th2 * th2));

    float lum = 0.07 + 0.06 * grain + 0.045 * bh
              + pow(s1, 9.0) * (0.62 + 0.28 * grain)
              + pow(s1, 70.0) * 0.80
              + pow(s2, 12.0) * 0.40
              + pow(s2, 90.0) * 0.35;
    return vec3(lum) * vec3(0.96, 0.975, 1.0);
  }
`

// -- backdrop: fullscreen turned metal ------------------------------------------------

const bgScene = new THREE.Scene()
const bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

const bgUniforms = {
  uTime: { value: 0 },
  uRes: { value: new THREE.Vector2(width, height) },
  uAzi: { value: 0 }
}

const bgMaterial = new THREE.ShaderMaterial({
  uniforms: bgUniforms,
  vertexShader: /* glsl */ `
    void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform float uTime;
    uniform vec2 uRes;
    uniform float uAzi;
    ${TURN_GLSL}
    void main() {
      vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y * 3.4;
      vec3 col = turned(p, vec2(-1.55, -1.1), uTime, uAzi);
      // sit the wall back a little so the chrome pops in front
      col *= 0.72;
      gl_FragColor = vec4(col, 1.0);
    }
  `
})

bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMaterial))

// -- the mirror world and the rounded chrome mark -------------------------------------

const logoScene = new THREE.Scene()
const logoCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 120)

const logoGroup = new THREE.Group()
logoScene.add(logoGroup)

const envUniforms = {
  uTime: { value: 0 },
  uAzi: { value: 0 }
}

const envSphere = new THREE.Mesh(
  new THREE.SphereGeometry(30, 32, 32),
  new THREE.ShaderMaterial({
    uniforms: envUniforms,
    side: THREE.BackSide,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform float uTime;
      uniform float uAzi;
      varying vec2 vUv;
      ${TURN_GLSL}
      void main() {
        vec2 pc = (vUv - 0.5) * vec2(10.0, 5.0);
        vec3 col = turned(pc, vec2(-1.2, -0.9), uTime, uAzi);
        gl_FragColor = vec4(col, 1.0);
      }
    `
  })
)
envSphere.visible = false
logoScene.add(envSphere)

const cubeTarget = new THREE.WebGLCubeRenderTarget(256)
const cubeCamera = new THREE.CubeCamera(0.1, 60, cubeTarget)
logoScene.add(cubeCamera)

// heightfield: the blurred mask that rounds the chrome's rims in the shader
const heightCanvas = document.createElement("canvas")
heightCanvas.width = 1024
heightCanvas.height = 280
const heightTexture = new THREE.CanvasTexture(heightCanvas)
heightTexture.minFilter = THREE.LinearFilter
heightTexture.generateMipmaps = false

const maskFrac = { x: 1 }

fetch("redo-logo.svg")
  .then(r => r.text())
  .then(svg => {
    const sized = svg
      .replace(/currentColor/g, "#ffffff")
      .replace("<svg ", '<svg width="1840.49" height="468.42" ')
    const blob = new Blob([sized], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const g = heightCanvas.getContext("2d")
      const scale = Math.min((1024 * 0.94) / img.width, (280 * 0.88) / img.height)
      const dw = img.width * scale
      const dh = img.height * scale
      g.clearRect(0, 0, 1024, 280)
      g.filter = "blur(16px)"
      g.drawImage(img, (1024 - dw) / 2, (280 - dh) / 2, dw, dh)
      maskFrac.x = dw / 1024
      heightTexture.needsUpdate = true
      URL.revokeObjectURL(url)
    }
    img.src = url
  })

const chromeUniforms = {
  uEnv: { value: cubeTarget.texture },
  uHeight: { value: heightTexture },
  uSpan: { value: new THREE.Vector2(LOGO_W, LOGO_W * 280 / 1024) },
  uBump: { value: 5.5 }
}

const chromeMaterial = new THREE.ShaderMaterial({
  uniforms: chromeUniforms,
  vertexShader: /* glsl */ `
    uniform vec2 uSpan;
    varying vec3 vWPos;
    varying vec3 vWN;
    varying vec3 vTX;
    varying vec3 vTY;
    varying vec2 vLuv;
    varying float vCap;
    void main() {
      vLuv = position.xy / uSpan + 0.5;
      vCap = normal.z;
      vWPos = (modelMatrix * vec4(position, 1.0)).xyz;
      vWN = mat3(modelMatrix) * normal;
      vTX = mat3(modelMatrix) * vec3(1.0, 0.0, 0.0);
      vTY = mat3(modelMatrix) * vec3(0.0, 1.0, 0.0);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform samplerCube uEnv;
    uniform sampler2D uHeight;
    uniform float uBump;
    varying vec3 vWPos;
    varying vec3 vWN;
    varying vec3 vTX;
    varying vec3 vTY;
    varying vec2 vLuv;
    varying float vCap;
    float hgt(vec2 uv) {
      return smoothstep(0.0, 0.55, texture2D(uHeight, uv).a);
    }
    void main() {
      float h = hgt(vLuv);
      vec3 N;
      if (abs(vCap) > 0.5) {
        float e = 1.6 / 1024.0;
        float hL = hgt(vLuv - vec2(e, 0.0));
        float hR = hgt(vLuv + vec2(e, 0.0));
        float hB = hgt(vLuv - vec2(0.0, e * 3.657));
        float hT = hgt(vLuv + vec2(0.0, e * 3.657));
        vec3 nObj = normalize(vec3(-(hR - hL) * uBump, -(hT - hB) * uBump, sign(vCap)));
        N = normalize(vTX * nObj.x + vTY * nObj.y + normalize(vWN) * abs(nObj.z));
      } else {
        N = normalize(vWN);
      }
      vec3 V = normalize(vWPos - cameraPosition);
      if (dot(N, V) > 0.0) N = -N;
      vec3 R = reflect(V, N);
      vec3 env = textureCube(uEnv, R).rgb;
      float fres = pow(1.0 - abs(dot(N, V)), 2.6);
      vec3 col = env * (0.85 + 0.75 * fres) + vec3(0.03, 0.03, 0.035);
      col *= 0.80 + 0.20 * h;
      gl_FragColor = vec4(col, 1.0);
    }
  `
})

new SVGLoader().load("redo-logo.svg", data => {
  const shapes = []
  for (const path of data.paths) {
    for (const shape of SVGLoader.createShapes(path)) shapes.push(shape)
  }
  const params = { depth: 130, curveSegments: 24, bevelEnabled: false }
  let geometry = mergeGeometries(
    shapes.map((shape, i) => {
      const g = new THREE.ExtrudeGeometry(shape, params)
      g.translate(0, 0, i * 3)
      return g
    })
  )
  geometry = mergeVertices(geometry, 0.4)
  geometry.computeVertexNormals()
  const s = LOGO_W / 1840.49
  geometry.scale(s, -s, s)
  geometry.computeBoundingBox()
  const c = new THREE.Vector3()
  geometry.boundingBox.getCenter(c)
  geometry.translate(-c.x, -c.y, -c.z)
  logoGroup.add(new THREE.Mesh(geometry, chromeMaterial))
})

// -- sizing ---------------------------------------------------------------------------

function applySize() {
  if (window.innerWidth && window.innerHeight) {
    width = window.innerWidth
    height = window.innerHeight
  }
  renderer.setSize(width, height, false)
  bgUniforms.uRes.value.set(width, height)

  logoCamera.aspect = width / height
  const halfAngle = Math.atan(
    Math.tan((logoCamera.fov * Math.PI) / 360) * logoCamera.aspect
  )
  logoCamera.position.z = (LOGO_W / 2 / 0.62) / Math.tan(halfAngle)
  logoCamera.updateProjectionMatrix()
}

applySize()
window.addEventListener("resize", applySize, false)

// -- interaction ----------------------------------------------------------------------

canvas.addEventListener("mousemove", onPointerMove, false)
canvas.addEventListener("touchmove", e => {
  e.preventDefault()
  onPointerMove(e.targetTouches[0])
}, { passive: false })

function onPointerMove(event) {
  mouseX = (event.clientX / width - 0.5) * 2
  mouseY = (event.clientY / height - 0.5) * 2
  if (lastClientX !== null) {
    const speed =
      Math.hypot(event.clientX - lastClientX, event.clientY - lastClientY) /
      Math.max(width, height)
    energy = Math.min(energy + speed * 6, 1.4)
  }
  lastClientX = event.clientX
  lastClientY = event.clientY
}

// -- loop -----------------------------------------------------------------------------

const clock = new THREE.Clock()
let t = 0

function render() {
  if (width !== window.innerWidth || height !== window.innerHeight) applySize()

  const dt = Math.min(clock.getDelta(), 0.05)
  energy *= Math.pow(0.25, dt)
  t += dt * (1 + energy * 1.2)

  const azi = mouseX * 2.4
  bgUniforms.uTime.value = t
  bgUniforms.uAzi.value = azi
  envUniforms.uTime.value = t
  envUniforms.uAzi.value = azi

  // re-photograph the burning metal world each frame
  const spanX = LOGO_W / maskFrac.x
  chromeUniforms.uSpan.value.set(spanX, spanX * 280 / 1024)
  envSphere.visible = true
  logoGroup.visible = false
  cubeCamera.update(renderer, logoScene)
  logoGroup.visible = true
  envSphere.visible = false

  logoGroup.rotation.y = Math.sin(t * 0.3) * 0.16 + mouseX * 0.22
  logoGroup.rotation.x = Math.cos(t * 0.23) * 0.07 - mouseY * 0.15

  renderer.clear()
  renderer.render(bgScene, bgCamera)
  renderer.clearDepth()
  renderer.render(logoScene, logoCamera)
}

function animate() {
  requestAnimationFrame(animate)
  render()
}

animate()

window.__fable = { renderer, logoGroup, logoCamera, logoScene, bgScene, bgCamera, uniforms: { bgUniforms, envUniforms, chromeUniforms }, render }
