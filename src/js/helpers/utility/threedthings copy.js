var threedthings = function() {
  var logo, sphereCamera, stats, scene, renderer, camera, light, sky

  var windowHalfX = window.innerWidth / 2
  var windowHalfY = window.innerHeight / 2

  var mouseX = 0,
    mouseY = 0

  init()
  animate()

  //   let startTime = Date.now()

  function init() {
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(50, 16 / 10, 0.1, 500)
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    })
    // renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })

    camera.position.z = 10

    renderer.setClearColor(0x000000, 0)
    renderer.setSize(window.innerWidth, (window.innerWidth * 10) / 16)
    renderer.setPixelRatio(
      window.devicePixelRatio ? window.devicePixelRatio : 1
    )
    document.getElementById("three_root").appendChild(renderer.domElement)

    stats = new Stats()
    document.body.appendChild(stats.dom)

    light = new THREE.AmbientLight(0xffffff)
    scene.add(light)

    const skyGeo = new THREE.SphereBufferGeometry(200, 25, 25)
    let loader = new THREE.TextureLoader()
    const texture = loader.load("assets/models/texsl.jpg")
    texture.minFilter = THREE.LinearFilter

    const material = new THREE.MeshPhongMaterial({
      map: texture
    })

    sky = new THREE.Mesh(skyGeo, material)
    sky.material.side = THREE.BackSide
    scene.add(sky)

    window.addEventListener("resize", onWindowResize, false)
    document.addEventListener("mousemove", onDocumentMouseMove, false)
    window.addEventListener("resize", onWindowResize, false)

    loader = new THREE.GLTFLoader()
    loader.load(
      "assets/models/13feb_two_sides.glb",
      // "assets/models/simplified_one_cap.glb",
      function(gltf) {
        window.gltf = gltf
        const mesh = gltf.scenes[0].children[0]
        const geometry = mesh.geometry
        sphereCamera = new THREE.CubeCamera(1, 300, 500)
        sphereCamera.position.set(0, 0, -10)
        scene.add(sphereCamera)

        let sphereMaterial = new THREE.MeshPhongMaterial({
          color: 0xfffffff,
          envMap: sphereCamera.renderTarget.texture,
          refractionRatio: 0.95
        })

        logo = new THREE.Mesh(geometry, sphereMaterial)
        scene.add(logo)
      },
      undefined,
      function(error) {
        console.error(error)
      }
    )
  }

  function onWindowResize() {
    windowHalfX = window.innerWidth / 2
    windowHalfY = window.innerHeight / 2

    camera.aspect = 16 / 10
    camera.updateProjectionMatrix()

    renderer.setSize(window.innerWidth, (window.innerWidth * 10) / 16)
  }

  function onDocumentMouseMove(event) {
    mouseX = (event.clientX - windowHalfX) * 0.015
    mouseY = (event.clientY - windowHalfY) * 0.015
  }

  function animate() {
    requestAnimationFrame(animate)
    render()
    stats.update()

    // var currentTime = Date.now()
    // var time = (currentTime - startTime) / 100
    // console.log("render", currentTime)

    // if (sky) {
    //   sky.rotation.y = 0.01 * time
    // }
  }

  function render() {
    const newX = (mouseX - camera.position.x) * 0.05
    const newY = (mouseY + camera.position.y) * 0.05

    if (newX != camera.position.x || newY != camera.position.y) {
      camera.position.x += newX
      camera.position.y -= newY
      camera.lookAt(scene.position)
    }
    if (sphereCamera) {
      // sky.visible = true
      logo.visible = false
      sphereCamera.update(renderer, scene)
      logo.visible = true
      // sky.visible = false
    }
    renderer.render(scene, camera)
  }
}

export default threedthings
