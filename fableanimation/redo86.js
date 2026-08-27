import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Sonars: a tilted radar scope in 3D — the sweeping beam paints the mark in phosphor blips that decay until the beam comes round again.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x020604)
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 300)

function applySize() {
  width = window.innerWidth || width; height = window.innerHeight || height
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  const halfA = Math.atan(Math.tan((camera.fov * Math.PI) / 360) * camera.aspect)
  camera.position.z = (LOGO_W / 2 / 0.5) / Math.tan(halfA)
  camera.updateProjectionMatrix()
}
applySize()
window.addEventListener("resize", applySize)
window.addEventListener("mousemove", e => {
  mouseX = (e.clientX / width - 0.5) * 2
  mouseY = (e.clientY / height - 0.5) * 2
  if (lastX !== null) energy = Math.min(energy + Math.hypot(e.clientX - lastX, e.clientY - lastY) / Math.max(width, height) * 5, 1.6)
  lastX = e.clientX; lastY = e.clientY
})

function loadMask(done) {
  fetch("redo-logo.svg").then(r => r.text()).then(svg => {
    const sized = svg.replace(/currentColor/g, "#fff")
      .replace("<svg ", '<svg width="1840.49" height="468.42" ')
    const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }))
    const img = new Image()
    img.onload = () => {
      const MW = 512, MH = 140
      const c = document.createElement("canvas"); c.width = MW; c.height = MH
      const g = c.getContext("2d")
      const s = Math.min((MW * 0.96) / img.width, (MH * 0.9) / img.height)
      const dw = img.width * s, dh = img.height * s
      g.drawImage(img, (MW - dw) / 2, (MH - dh) / 2, dw, dh)
      done(g.getImageData(0, 0, MW, MH).data, MW, MH, c)
      URL.revokeObjectURL(url)
    }
    img.src = url
  })
}

let disc = null
const uni = { uTime: { value: 0 }, uBeam: { value: 0 }, uMask: { value: null } }
loadMask((data, MW, MH, srcCanvas) => {
  const tex = new THREE.CanvasTexture(srcCanvas)
  uni.uMask.value = tex
  const mat = new THREE.ShaderMaterial({
    uniforms: uni,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv - 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      precision highp float;
      uniform float uTime, uBeam;
      uniform sampler2D uMask;
      varying vec2 vUv;
      void main() {
        float r = length(vUv) * 2.0;
        if (r > 1.0) discard;
        float a = atan(vUv.y, vUv.x);
        vec3 col = vec3(0.006, 0.03, 0.012);
        // сетка
        float rings = smoothstep(0.012, 0.0, abs(fract(r * 4.0) - 0.5) * 0.25 - 0.115);
        float spokes = smoothstep(0.02, 0.0, abs(fract(a / 6.2831 * 12.0) - 0.5) - 0.47);
        col += vec3(0.04, 0.14, 0.06) * max(rings, spokes) * 0.6;
        // луч
        float da = mod(uBeam - a, 6.2831)
;        float beam = exp(-da * 6.0);
        col += vec3(0.2, 0.9, 0.35) * beam * 0.5;
        // цель: маска в прямоугольнике внутри диска
        vec2 muv = vUv * vec2(1.35, 3.4) + 0.5;
        float m = 0.0;
        if (muv.x > 0.0 && muv.x < 1.0 && muv.y > 0.0 && muv.y < 1.0) m = texture2D(uMask, muv).a;
        float decay = exp(-da * 0.55);
        col += vec3(0.35, 1.0, 0.5) * m * decay * 1.4;
        col += vec3(0.1, 0.4, 0.18) * m * 0.12;
        // виньетка края
        col *= smoothstep(1.0, 0.92, r);
        gl_FragColor = vec4(col, 1.0);
      }`
  })
  disc = new THREE.Mesh(new THREE.CircleGeometry(2.4, 72), mat)
  disc.rotation.x = -0.85
  scene.add(disc)
})
function tick(dt) {
  uni.uTime.value = t
  uni.uBeam.value = t * 1.1
  if (disc) {
    disc.rotation.z = mouseX * 0.2
    disc.rotation.x = -0.85 - mouseY * 0.12
  }
}

const clock = new THREE.Clock()
let t = 0
function render() {
  if (width !== window.innerWidth || height !== window.innerHeight) applySize()
  const dt = Math.min(clock.getDelta(), 0.05)
  t += dt
  energy *= Math.pow(0.5, dt)
  tick(dt)
  renderer.render(scene, camera)
}
function animate() { requestAnimationFrame(animate); render() }
animate()

window.__fable = { renderer, scene, camera, get t() { return t }, set t(v) { t = v }, render }
