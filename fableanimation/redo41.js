// Lava: a lava lamp locked inside the letterforms. Eight metaballs of
// molten light drift on lissajous orbits; their field is thresholded into
// a glowing liquid that blobs, merges and splits — but only where the logo
// mask lets it through, so the letters are windows into the lamp. Colors
// are not computed: the field value rides through a Nano Banana marble
// texture used as a palette, so the lava inherits the generated dye. The
// cursor is a ninth blob you can drag through the letters.

const canvas = document.getElementById("scene_root")
const gl = canvas.getContext("webgl")

let width = window.innerWidth || 1280
let height = window.innerHeight || 720

let mouseX = 0.5, mouseY = 0.5

// -- mask ------------------------------------------------------------------------------------

let maskTex = null
fetch("redo-logo.svg").then(r => r.text()).then(svg => {
  const sized = svg.replace(/currentColor/g, "#fff")
    .replace("<svg ", '<svg width="1840.49" height="468.42" ')
  const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }))
  const img = new Image()
  img.onload = () => {
    const c = document.createElement("canvas"); c.width = 1024; c.height = 280
    const g = c.getContext("2d")
    const s = Math.min((1024 * 0.9) / img.width, (280 * 0.78) / img.height)
    const dw = img.width * s, dh = img.height * s
    g.drawImage(img, (1024 - dw) / 2, (280 - dh) / 2, dw, dh)
    maskTex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, maskTex)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    URL.revokeObjectURL(url)
  }
  img.src = url
})

// -- palette from the Nano Banana marble ------------------------------------------------------

let palTex = null
const palImg = new Image()
palImg.onload = () => {
  palTex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, palTex)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, palImg)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
}
palImg.src = "nano-texture.png"

// -- shader ------------------------------------------------------------------------------------

const vsrc = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`
const fsrc = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform sampler2D uMask, uPal;
uniform vec3 uBlobs[9];

float logoAt(vec2 q){
  float lw = min(1.5, (uRes.x / uRes.y) * 0.88);
  float lh = lw * (280.0 / 1024.0);
  vec2 m = vec2(q.x / lw + 0.5, q.y / lh + 0.5);
  if (m.x < 0.0 || m.x > 1.0 || m.y < 0.0 || m.y > 1.0) return 0.0;
  return texture2D(uMask, m).a;
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 q = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);

  float m = logoAt(q);
  float ink = smoothstep(0.45, 0.55, m);

  // metaball field
  float f = 0.0;
  for (int i = 0; i < 9; i++) {
    vec3 b = uBlobs[i];
    vec2 d = q - b.xy;
    f += (b.z * b.z) / (dot(d, d) + 1e-4);
  }

  // lava body through the generated palette
  float body = smoothstep(0.9, 1.25, f);
  float core = smoothstep(1.6, 2.6, f);
  vec2 pal = vec2(fract(f * 0.33 - uTime * 0.025), 0.4 + 0.18 * sin(uTime * 0.11));
  vec3 lava = texture2D(uPal, pal).rgb;
  vec3 col = lava * body * (1.15 + 1.0 * core);
  col += lava * pow(max(1.0 - abs(f - 1.08) * 5.0, 0.0), 2.0) * 0.9;   // rim of each blob
  col += vec3(1.0, 0.85, 0.6) * core * 0.35;

  // dim ember glow where lava is absent, so letters never go fully dark
  col += texture2D(uPal, vec2(fract(q.x * 0.15 + uTime * 0.008), 0.8)).rgb * 0.09;

  col *= ink;

  // faint outline of the mark
  float edge = smoothstep(0.18, 0.5, m) * (1.0 - smoothstep(0.5, 0.82, m));
  col += vec3(0.16, 0.13, 0.11) * edge;

  gl_FragColor = vec4(col, 1.0);
}
`

function compile(type, src) {
  const s = gl.createShader(type)
  gl.shaderSource(s, src); gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s))
  return s
}
const prog = gl.createProgram()
gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsrc))
gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsrc))
gl.linkProgram(prog)
gl.useProgram(prog)

const buf = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, buf)
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW)
const loc = gl.getAttribLocation(prog, "p")
gl.enableVertexAttribArray(loc)
gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

const U = {
  res: gl.getUniformLocation(prog, "uRes"),
  time: gl.getUniformLocation(prog, "uTime"),
  mask: gl.getUniformLocation(prog, "uMask"),
  pal: gl.getUniformLocation(prog, "uPal"),
  blobs: gl.getUniformLocation(prog, "uBlobs")
}

function applySize() {
  width = window.innerWidth || width
  height = window.innerHeight || height
  canvas.width = width; canvas.height = height
  gl.viewport(0, 0, width, height)
}
applySize()
window.addEventListener("resize", applySize)
window.addEventListener("mousemove", e => {
  mouseX = e.clientX / width
  mouseY = 1 - e.clientY / height
})

let t = 0
let last = performance.now()
const blobs = new Float32Array(27)

function step(dt) {
  t += dt
  const aspect = width / height
  const lw = Math.min(1.5, aspect * 0.88)

  for (let i = 0; i < 8; i++) {
    const s1 = 0.16 + 0.05 * (i % 3), s2 = 0.11 + 0.04 * ((i + 1) % 4)
    blobs[i * 3] = Math.sin(t * s1 + i * 2.4) * lw * 0.46
    blobs[i * 3 + 1] = Math.sin(t * s2 * 1.7 + i * 1.3) * 0.16
    blobs[i * 3 + 2] = 0.11 + 0.05 * (0.5 + 0.5 * Math.sin(t * 0.3 + i))
  }
  // cursor blob
  blobs[24] = (mouseX - 0.5) * aspect
  blobs[25] = (mouseY - 0.5)
  blobs[26] = 0.12

  if (maskTex) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, maskTex); gl.uniform1i(U.mask, 0) }
  if (palTex) { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, palTex); gl.uniform1i(U.pal, 1) }
  gl.uniform2f(U.res, width, height)
  gl.uniform1f(U.time, t)
  gl.uniform3fv(U.blobs, blobs)
  gl.drawArrays(gl.TRIANGLES, 0, 3)
}

function frame(now) {
  requestAnimationFrame(frame)
  const dt = Math.min((now - last) / 1000, 0.05); last = now
  step(dt)
}
requestAnimationFrame(frame)

window.__fable = { get t() { return t }, set t(v) { t = v }, step }
