import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js"

// Satins: the Tunelis flight, but the chrome goes satin — hazy, champagne-
// tinted reflections of the live tunnel with a broad soft key light.
// Original notes:
// Tunelis: the reference turned inside out. The painting depicts a dotted
// cylinder from outside — here we fly down its bore. The walls carry the
// same weave: palette stripes running along the axis like a sunburst, the
// dot grid on the green sectors, and the gold redo wrapped around the tube
// in rings that sweep past. Perspective does the op-art work — cells are
// huge and sheared at the rim of the screen, grain-fine at the far glow.

const CELLS_AROUND = 40 // dot columns around the tube
const DOT_R = 0.36
const SPEED = 0.55 // flight speed, depth units per second
const LOGO_EVERY = 4.2 // a logo ring every N depth units
const LOGO_REPEATS = 3 // times the word wraps around the tube

let width = window.innerWidth || 1280
let height = window.innerHeight || 720

let mouseX = 0
let mouseY = 0
let lastClientX = null
let lastClientY = null
let energy = 0

const canvas = document.getElementById("scene_root")

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)

const scene = new THREE.Scene()
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

// -- the glossy logo floating in the bore --------------------------------------------

// a second, perspective scene composited over the tunnel: the extruded
// logotype in the chrome of the original Liquid 001 — an env-mapped Lambert
// fed by a cube camera that photographed a palette-striped sky once
renderer.autoClear = false

const logoScene = new THREE.Scene()
const logoCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 120)
logoScene.add(new THREE.AmbientLight(0xffffff, Math.PI))

const LOGO_W = 9
const logoGroup = new THREE.Group()
logoScene.add(logoGroup)

// the reflection environment IS the tunnel: a real cylinder around the
// logo, textured with the same wall weave — stripes along the axis, the
// rolling dot grid, gold glow at the far end. only the cube camera ever
// sees it, and it photographs it every frame, so the chrome carries the
// live flight.
const wallUniforms = { uT: { value: 0 } }
const wallMaterial = new THREE.ShaderMaterial({
  uniforms: wallUniforms,
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
    uniform float uT;
    varying vec2 vUv;

    vec3 stripes(float x) {
      float m = min(x, 1.0 - x);
      vec3 yellow = vec3(0.882, 0.631, 0.231);
      vec3 red    = vec3(0.808, 0.255, 0.153);
      vec3 cream  = vec3(0.937, 0.906, 0.808);
      vec3 green  = vec3(0.118, 0.424, 0.235);
      vec3 blue   = vec3(0.180, 0.384, 0.651);
      vec3 deepg  = vec3(0.078, 0.322, 0.180);
      if (m < 0.045) return yellow;
      if (m < 0.095) return mix(yellow, red, smoothstep(0.045, 0.095, m));
      if (m < 0.115) return red;
      if (m < 0.125) return cream;
      if (m < 0.142) return green;
      if (m < 0.150) return cream;
      if (m < 0.163) return blue;
      if (m < 0.180) return red;
      if (m < 0.205) return deepg;
      return vec3(0.106, 0.420, 0.231);
    }

    void main() {
      float U = vUv.x;
      float su = fract(U * 2.0);
      vec3 col = stripes(su);

      float m2 = min(su, 1.0 - su);
      if (m2 > 0.205) {
        float belly = exp(-abs(m2 - 0.5) * 6.0);
        col = mix(vec3(0.066, 0.27, 0.15), vec3(0.129, 0.459, 0.259), belly);
        float u = U * 40.0;
        float v = vUv.y * 85.0 + uT * 3.5;
        vec2 cell = vec2(fract(u), fract(v)) - 0.5;
        float d = length(cell);
        float aa = fwidth(d) * 1.3 + 0.02;
        float dm = 1.0 - smoothstep(0.36 - aa, 0.36 + aa, d);
        col = mix(col, vec3(0.024, 0.09, 0.055), dm);
      }

      // gold furnace at the far end, dimming toward the camera end
      col = mix(vec3(0.84, 0.76, 0.33), col, smoothstep(0.0, 0.3, vUv.y));
      col *= 0.55 + 0.45 * smoothstep(1.0, 0.5, vUv.y);
      gl_FragColor = vec4(col, 1.0);
    }
  `
})

const wallCylinder = new THREE.Mesh(
  new THREE.CylinderGeometry(6, 6, 80, 48, 1, true),
  wallMaterial
)
wallCylinder.geometry.rotateX(Math.PI / 2) // axis along z, far end at -z
wallCylinder.visible = false
logoScene.add(wallCylinder)

const cubeTarget = new THREE.WebGLCubeRenderTarget(256, {
  generateMipmaps: true,
  minFilter: THREE.LinearMipmapLinearFilter
})
const cubeCamera = new THREE.CubeCamera(0.1, 60, cubeTarget)
logoScene.add(cubeCamera)

// -- logo mask ----------------------------------------------------------------------

const maskCanvas = document.createElement("canvas")
maskCanvas.width = 2048
maskCanvas.height = 560
const maskTexture = new THREE.CanvasTexture(maskCanvas)
maskTexture.minFilter = THREE.LinearFilter
maskTexture.generateMipmaps = false

const maskFrac = { x: 1, y: 468.42 / 560 }

// blurred copy of the mask: a smooth heightfield whose gradient rounds the
// chrome's edges in the shader — bevel gloss without bevel geometry
const heightCanvas = document.createElement("canvas")
heightCanvas.width = 1024
heightCanvas.height = 280
const heightTexture = new THREE.CanvasTexture(heightCanvas)
heightTexture.minFilter = THREE.LinearFilter
heightTexture.generateMipmaps = false

// candy chrome: flat caps get their normals bent by the blurred-mask
// heightfield, so the edges read as rounded glossy bevels — while the
// geometry stays flat and artifact-free. walls reflect with their own
// geometric normals. (defined before the svg loader below fires)
const chromeUniforms = {
  uEnv: { value: cubeTarget.texture },
  uHeight: { value: heightTexture },
  uSpan: { value: new THREE.Vector2(LOGO_W, LOGO_W * 560 / 2048) },
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
    // plateau remap: the blur ramp 0..0.55 becomes the rounded rim, and
    // everything deeper saturates flat — no wobble inside the letter faces
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
      vec3 R = reflect(V, N);
      // satin: the tunnel reflection is sampled far up the mip chain and
      // goes hazy; a touch of sharpness returns at grazing angles
      vec3 envSoft = textureCube(uEnv, R, 4.5).rgb;
      vec3 envSharp = textureCube(uEnv, R, 1.0).rgb;
      float fres = pow(1.0 - abs(dot(N, V)), 2.2);
      vec3 env = mix(envSoft, envSharp, 0.18 + 0.40 * fres);
      vec3 tint = vec3(0.93, 0.87, 0.70); // champagne metal
      vec3 L = normalize(vec3(0.4, 0.55, 0.75));
      vec3 H = normalize(L - V);
      float ndl = max(dot(N, L), 0.0);
      float spec = pow(max(dot(N, H), 0.0), 22.0) * 0.32;
      vec3 col = env * tint * (1.05 + 0.55 * fres)
               + tint * (0.14 + 0.26 * ndl)
               + spec * vec3(1.0, 0.96, 0.86);
      col *= 0.76 + 0.24 * h; // soft occlusion toward the rims
      gl_FragColor = vec4(col, 1.0);
    }
  `
})

new SVGLoader().load("redo-logo.svg", data => {
  const shapes = []
  for (const path of data.paths) {
    for (const shape of SVGLoader.createShapes(path)) shapes.push(shape)
  }
  // no bevel at all: on this outline any bevel offset folds over at the
  // concave joints and tight arcs, shedding flipped shards. flat extrusion
  // is geometrically clean, and the chrome still plays — cap normals sweep
  // the palette as the logo sways. shapes are extruded separately and
  // staggered a hair in depth so overlapping caps can't z-fight
  const params = {
    depth: 130,
    curveSegments: 24,
    bevelEnabled: false
  }
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
      const ctx = maskCanvas.getContext("2d")
      const scale = Math.min((2048 * 0.94) / img.width, (560 * 0.88) / img.height)
      const dw = img.width * scale
      const dh = img.height * scale
      ctx.clearRect(0, 0, 2048, 560)
      ctx.drawImage(img, (2048 - dw) / 2, (560 - dh) / 2, dw, dh)
      maskFrac.x = dw / 2048
      maskFrac.y = dh / 560
      maskTexture.needsUpdate = true

      const hctx = heightCanvas.getContext("2d")
      hctx.clearRect(0, 0, 1024, 280)
      hctx.filter = "blur(16px)"
      hctx.drawImage(img, (1024 - dw / 2) / 2, (280 - dh / 2) / 2, dw / 2, dh / 2)
      heightTexture.needsUpdate = true

      URL.revokeObjectURL(url)
    }
    img.src = url
  })

// -- tunnel shader --------------------------------------------------------------------

const uniforms = {
  uTime: { value: 0 },
  uRes: { value: new THREE.Vector2(width, height) },
  uMask: { value: maskTexture },
  uBend: { value: new THREE.Vector2(0, 0) },
  uSpeed: { value: SPEED },
  uCells: { value: CELLS_AROUND },
  uRad: { value: DOT_R },
  uLogoEvery: { value: LOGO_EVERY },
  uLogoReps: { value: LOGO_REPEATS }
}

const material = new THREE.ShaderMaterial({
  uniforms,
  vertexShader: /* glsl */ `
    void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform float uTime;
    uniform vec2 uRes;
    uniform sampler2D uMask;
    uniform vec2 uBend;
    uniform float uSpeed;
    uniform float uCells;
    uniform float uRad;
    uniform float uLogoEvery;
    uniform float uLogoReps;

    vec3 stripes(float x) {
      float m = min(x, 1.0 - x);
      vec3 yellow = vec3(0.882, 0.631, 0.231);
      vec3 red    = vec3(0.808, 0.255, 0.153);
      vec3 cream  = vec3(0.937, 0.906, 0.808);
      vec3 green  = vec3(0.118, 0.424, 0.235);
      vec3 blue   = vec3(0.180, 0.384, 0.651);
      vec3 deepg  = vec3(0.078, 0.322, 0.180);
      if (m < 0.045) return yellow;
      if (m < 0.095) return mix(yellow, red, smoothstep(0.045, 0.095, m));
      if (m < 0.115) return red;
      if (m < 0.125) return cream;
      if (m < 0.142) return green;
      if (m < 0.150) return cream;
      if (m < 0.163) return blue;
      if (m < 0.180) return red;
      if (m < 0.205) return deepg;
      return vec3(0.106, 0.420, 0.231);
    }

    void main() {
      vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
      // the tunnel bends away from straight ahead — drift plus steering
      p -= uBend;

      float r = length(p);
      float phi = atan(p.y, p.x) + uTime * 0.05; // slow roll of the tube
      float z = 0.35 / max(r, 0.002) + uTime * uSpeed;

      // stripes run along the axis: two palette periods around the bore
      float U = phi / 6.2831853 + 0.5;
      float su = fract(U * 2.0);
      vec3 col = stripes(su);

      // square cells on the wall: circumference = 2*pi at R = 1
      float arc = 6.2831853 / uCells;
      float u = phi / arc;
      float v = z / arc;
      vec2 cell = vec2(fract(u), fract(v)) - 0.5;
      float d = length(cell);
      float aa = fwidth(d) * 1.3 + 0.012;
      // dots dissolve into the deep glow instead of shimmering
      float rimFade = smoothstep(0.035, 0.14, r);

      // gold rings of the logotype sweep past, wrapping the whole bore
      float band = mod(z, uLogoEvery);
      float wordW = 6.2831853 / uLogoReps;
      float wordH = wordW / (2048.0 / 560.0);
      float mu = fract(U * uLogoReps);
      float mv = clamp(band / wordH, 0.0, 1.0);
      float logo = step(0.5, texture2D(uMask, vec2(mu, mv)).a);

      float m2 = min(su, 1.0 - su);
      if (m2 > 0.205) {
        // green sector: bright belly, dark toward the sector's stripe edges
        float belly = exp(-abs(m2 - 0.5) * 6.0);
        col = mix(vec3(0.066, 0.27, 0.15), vec3(0.129, 0.459, 0.259), belly);
        float dmD = (1.0 - smoothstep(uRad - aa, uRad + aa, d)) * rimFade;
        col = mix(col, vec3(0.024, 0.09, 0.055), dmD * (1.0 - logo));
      }

      float radL = uRad * 1.18;
      float dmL = (1.0 - smoothstep(radL - aa, radL + aa, d)) * rimFade * logo;
      col = mix(col, vec3(0.914, 0.784, 0.243), dmL);

      // the far end burns warm gold, like the belly glow of the painting
      col = mix(col, vec3(0.84, 0.76, 0.33), smoothstep(0.24, 0.03, r));
      // gentle vignette so the rim doesn't scream
      col *= 0.62 + 0.38 * smoothstep(1.35, 0.55, r);

      gl_FragColor = vec4(col, 1.0);
    }
  `
})

scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material))

// -- sizing -------------------------------------------------------------------------

function applySize() {
  if (window.innerWidth && window.innerHeight) {
    width = window.innerWidth
    height = window.innerHeight
  }
  renderer.setSize(width, height, false)
  uniforms.uRes.value.set(width, height)

  // fit the chrome logotype to ~62% of the view width
  logoCamera.aspect = width / height
  const halfAngle = Math.atan(
    Math.tan((logoCamera.fov * Math.PI) / 360) * logoCamera.aspect
  )
  logoCamera.position.z = (LOGO_W / 2 / 0.62) / Math.tan(halfAngle)
  logoCamera.updateProjectionMatrix()
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
  mouseX = (event.clientX / width - 0.5) * 2
  mouseY = (event.clientY / height - 0.5) * 2

  if (lastClientX !== null) {
    const speed =
      Math.hypot(event.clientX - lastClientX, event.clientY - lastClientY) /
      Math.max(width, height)
    energy = Math.min(energy + speed * 6, 1.6)
  }
  lastClientX = event.clientX
  lastClientY = event.clientY
}

// -- loop ---------------------------------------------------------------------------

const clock = new THREE.Clock()
let t = 0
let bx = 0
let by = 0

function render() {
  if (width !== window.innerWidth || height !== window.innerHeight) applySize()

  const dt = Math.min(clock.getDelta(), 0.05)
  energy *= Math.pow(0.3, dt)
  t += dt * (1 + energy * 1.3)
  uniforms.uTime.value = t

  // the bore drifts on its own and leans after the cursor
  const tx = 0.10 * Math.sin(t * 0.23) + mouseX * 0.16
  const ty = 0.08 * Math.sin(t * 0.31 + 2.0) - mouseY * 0.12
  bx += (tx - bx) * (1 - Math.pow(0.01, dt))
  by += (ty - by) * (1 - Math.pow(0.01, dt))
  uniforms.uBend.value.set(bx, by)

  // photograph the palette sky once, then hide it — the chrome keeps the
  // reflection while the tunnel stays visible behind the logo
  // photograph the live tunnel every frame — the wall cylinder is visible
  // only to the cube camera, and the logo hides so it can't bake its own
  // silhouette into the reflection
  wallUniforms.uT.value = t
  wallCylinder.visible = true
  logoGroup.visible = false
  cubeCamera.update(renderer, logoScene)
  logoGroup.visible = true
  wallCylinder.visible = false

  // keep the height-map window aligned with the artwork's share of the mask
  const spanX = LOGO_W / maskFrac.x
  chromeUniforms.uSpan.value.set(spanX, spanX * 560 / 2048)

  // the logo hangs in the bore, breathing with the flight
  logoGroup.rotation.y = Math.sin(t * 0.4) * 0.28 + bx * 0.9
  logoGroup.rotation.x = Math.cos(t * 0.31) * 0.12 - by * 0.7
  logoGroup.position.x = bx * 2.4
  logoGroup.position.y = by * 2.4

  renderer.clear()
  renderer.render(scene, camera)
  renderer.clearDepth()
  renderer.render(logoScene, logoCamera)
}

function animate() {
  requestAnimationFrame(animate)
  render()
}

animate()

window.__fable = { renderer, scene, camera, material, uniforms, render }
