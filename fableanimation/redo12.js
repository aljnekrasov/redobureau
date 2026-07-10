import * as THREE from "three"

// Neons: a gallery wall of fluorescent tubes, after the installation
// reference — ice white, pale blue, cream, green, amber and a few dead-dark
// tubes in a long row, soft bloom on the wall, a wooden floor catching the
// spill. Inside the tubes lives the redo logotype: every few seconds the
// amber segments ignite with a true fluorescent stutter, hold the word
// across the row, then let it die back into a plain light installation.

const TUBES = 88
const CYCLE = 10 // seconds per ignition cycle
const LOGO_SHARE = 0.68 // of the panel width

let width = window.innerWidth || 1280
let height = window.innerHeight || 720

let cursorX = -1e4
let lastClientX = null
let lastClientY = null
let energy = 0

const canvas = document.getElementById("scene_root")

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)

const scene = new THREE.Scene()
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

// -- logo mask ----------------------------------------------------------------------

const maskCanvas = document.createElement("canvas")
maskCanvas.width = 2048
maskCanvas.height = 560
const maskTexture = new THREE.CanvasTexture(maskCanvas)
maskTexture.minFilter = THREE.LinearFilter
maskTexture.generateMipmaps = false

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
      const ctx = maskCanvas.getContext("2d")
      const scale = Math.min((2048 * 0.94) / img.width, (560 * 0.88) / img.height)
      const dw = img.width * scale
      const dh = img.height * scale
      ctx.clearRect(0, 0, 2048, 560)
      ctx.drawImage(img, (2048 - dw) / 2, (560 - dh) / 2, dw, dh)
      maskFrac.x = dw / 2048
      maskTexture.needsUpdate = true
      URL.revokeObjectURL(url)
      applySize()
    }
    img.src = url
  })

// -- shader -------------------------------------------------------------------------

const uniforms = {
  uTime: { value: 0 },
  uRes: { value: new THREE.Vector2(width, height) },
  uMask: { value: maskTexture },
  uMouseX: { value: -1e4 },
  uPanel: { value: new THREE.Vector4() }, // left, right, tubeBottom, tubeTop
  uFloorY: { value: 150 },
  uN: { value: TUBES },
  uCycle: { value: CYCLE },
  uLogoW: { value: 600 },
  uLogoH: { value: 160 },
  uLogoCy: { value: 400 }
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
    uniform float uMouseX;
    uniform vec4 uPanel;
    uniform float uFloorY;
    uniform float uN;
    uniform float uCycle;
    uniform float uLogoW;
    uniform float uLogoH;
    uniform float uLogoCy;

    float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }

    vec3 tubeColor(float h) {
      if (h < 0.14) return vec3(0.85, 0.94, 1.00);      // ice white
      if (h < 0.24) return vec3(0.62, 0.87, 0.97);      // pale blue
      if (h < 0.40) return vec3(1.00, 0.94, 0.82);      // warm white
      if (h < 0.50) return vec3(0.93, 0.90, 0.74);      // cream
      if (h < 0.62) return vec3(1.00, 0.62, 0.10);      // amber
      if (h < 0.76) return vec3(0.16, 0.72, 0.28);      // green
      return vec3(0.05, 0.05, 0.06);                    // dead tube
    }

    // fluorescent ignition: staggered start, a burst of stutter, then hold,
    // then the word lets go
    float ignition(float seed) {
      float phase = fract(uTime / uCycle);
      float start = 0.06 + seed * 0.15;
      float after = smoothstep(start + 0.085, start + 0.10, phase);
      float sq = step(0.45, fract(phase * 47.0 + seed * 31.0));
      float during = smoothstep(start, start + 0.004, phase) * (1.0 - after) * sq;
      float env = during * (0.4 + 0.6 * seed) + after;
      env *= 1.0 - smoothstep(0.70, 0.82, phase);
      return env;
    }

    vec3 tubesLight(vec2 p, float isReflection) {
      float l = uPanel.x;
      float r = uPanel.y;
      float bot = uPanel.z;
      float top = uPanel.w;
      float s = (r - l) / (uN - 1.0);

      vec3 acc = vec3(0.0);
      float fi = (p.x - l) / s;
      for (int k = -2; k <= 2; k++) {
        float i = floor(fi + 0.5) + float(k);
        if (i < 0.0 || i > uN - 1.0) continue;
        // some slots stay empty — the row breaks into clusters like the
        // reference installation
        if (hash(i + 51.0) < 0.13) continue;
        float tx = l + i * s;
        float dx = abs(p.x - tx);
        float h = hash(i + 3.0);
        vec3 col = tubeColor(h);
        bool dead = h >= 0.76;

        // vertical extent with soft rounded ends
        float endIn = min(p.y - bot, top - p.y);
        if (endIn < -s * 0.8) continue;
        float endFade = smoothstep(-s * 0.05, s * 0.45, endIn);

        // the logotype segment inside this tube
        float mu = clamp((tx - uRes.x * 0.5) / uLogoW + 0.5, 0.0, 1.0);
        float mv = clamp((p.y - uLogoCy) / uLogoH + 0.5, 0.0, 1.0);
        float logo = step(0.5, texture2D(uMask, vec2(mu, mv)).a);
        float ign = ignition(hash(i + 17.0));
        float logoLit = logo * ign;

        // while the word burns, the rest of the installation gives up its
        // light — tubes dim, the amber segments carry the room
        float phase = fract(uTime / uCycle);
        float wordOn = smoothstep(0.10, 0.26, phase) * (1.0 - smoothstep(0.70, 0.82, phase));
        float base = dead ? 0.045 : 1.0 - 0.74 * wordOn;
        vec3 glowCol = mix(col, vec3(1.0, 0.58, 0.05), logoLit);
        float bright = mix(base, 1.55, logoLit);

        // cursor warms the nearby tubes
        bright *= 1.0 + 0.22 * exp(-pow((tx - uMouseX) / (s * 2.6), 2.0));

        float core = exp(-pow(dx / (s * 0.085), 2.0));
        float glass = exp(-pow(dx / (s * 0.19), 2.0));
        float halo = exp(-pow(dx / (s * 0.75), 2.0));

        vec3 tube =
          glowCol * (core * 1.15 + glass * 0.32) * bright +
          glowCol * halo * (0.085 + 0.10 * logoLit) * bright;

        // dark fixture caps at the ends of the glass
        float cap = step(dx, s * 0.10) * step(abs(endIn), s * 0.30) * step(-s * 0.3, endIn);
        tube = mix(tube, vec3(0.10, 0.095, 0.09), cap * (1.0 - isReflection));

        acc += tube * endFade;
      }
      return acc;
    }

    void main() {
      vec2 p = gl_FragCoord.xy;

      // black space: only the tubes' own breath lifts the darkness
      float wg = exp(-pow((p.x - uRes.x * 0.5) / (uRes.x * 0.40), 2.0))
               * exp(-pow((p.y - (uPanel.z + uPanel.w) * 0.5) / (uRes.y * 0.36), 2.0));
      vec3 col = vec3(0.010, 0.010, 0.013) + vec3(0.040, 0.037, 0.034) * wg;

      col += tubesLight(p, 0.0);

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

  // a compact row of short tubes, centred in the void
  const panelL = width * 0.15
  const panelR = width * 0.85
  const tubeBot = height * 0.36
  const tubeTop = height * 0.64
  uniforms.uPanel.value.set(panelL, panelR, tubeBot, tubeTop)
  uniforms.uLogoCy.value = (tubeBot + tubeTop) / 2

  const logoW = ((panelR - panelL) * LOGO_SHARE) / maskFrac.x
  uniforms.uLogoW.value = logoW
  uniforms.uLogoH.value = logoW / (2048 / 560)
}

applySize()
window.addEventListener("resize", applySize, false)

// -- interaction --------------------------------------------------------------------

canvas.addEventListener("mousemove", onPointerMove, false)
canvas.addEventListener("touchmove", e => {
  e.preventDefault()
  onPointerMove(e.targetTouches[0])
}, { passive: false })
canvas.addEventListener("mouseleave", () => { cursorX = -1e4 })

function onPointerMove(event) {
  cursorX = event.clientX
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
  energy *= Math.pow(0.3, dt)
  t += dt * (1 + energy * 0.4)

  uniforms.uTime.value = t
  uniforms.uMouseX.value = cursorX

  renderer.render(scene, camera)
}

function animate() {
  requestAnimationFrame(animate)
  render()
}

animate()

window.__fable = { renderer, scene, camera, material, uniforms, render }
