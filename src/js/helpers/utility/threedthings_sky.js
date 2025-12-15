var threedthings = function() {
  if (document.body.classList.contains("home")) {
    var logo, sphereCamera, stats, scene, renderer, camera, light, sky

    var windowHalfX = window.innerWidth / 2
    var windowHalfY = window.innerHeight / 2

    var mouseX = 0,
      mouseY = 0

    init()
    animate()

    function init() {
      scene = new THREE.Scene()
      camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth /
          Math.min(window.innerHeight, (window.innerWidth * 10) / 16),
        0.1,
        500
      )
      renderer = new THREE.WebGLRenderer({
        // alpha: true,
        // antialias: true,
        powerPreference: "high-performance"
      })

      camera.position.z = 10

      // renderer.setClearColor(0x000000, 0)
      renderer.setSize(
        window.innerWidth,
        Math.min(window.innerHeight, (window.innerWidth * 10) / 16)
      )

      renderer.setPixelRatio(
        window.devicePixelRatio ? window.devicePixelRatio : 1
      )
      document.getElementById("three_root").appendChild(renderer.domElement)

      window.renderer = renderer

      stats = new Stats()
      document.body.appendChild(stats.dom)

      light = new THREE.AmbientLight(0xffffff, 1)
      scene.add(light)

      const skyGeo = new THREE.SphereBufferGeometry(20, 25, 25)
      let loader = new THREE.TextureLoader()
      const texture = loader.load("assets/models/19_feb_comp.jpg")
      // texture.minFilter = THREE.LinearFilter

      const material = new THREE.MeshLambertMaterial({
        map: texture
      })

      sky = new THREE.Mesh(skyGeo, material)
      sky.material.side = THREE.BackSide
      scene.add(sky)
      sky.matrixAutoUpdate = false

      // scene.background = new THREE.CubeTextureLoader()
      //   .setPath("textures/cube/pisa/")
      //   .load(["px.png", "nx.png", "py.png", "ny.png", "pz.png", "nz.png"])

      window.addEventListener("resize", onWindowResize, false)
      document
        .getElementById("three_root")
        .addEventListener("mousemove", onDocumentMouseMove, false)
      window.addEventListener("resize", onWindowResize, false)

      loader = new THREE.GLTFLoader()
      loader.load(
        "assets/models/13feb_two_sides.glb",
        function(gltf) {
          window.gltf = gltf
          const mesh = gltf.scenes[0].children[0]
          const geometry = mesh.geometry
          sphereCamera = new THREE.CubeCamera(1, 300, 150)
          sphereCamera.position.set(0, 0, 10)
          scene.add(sphereCamera)

          let sphereMaterial = new THREE.MeshLambertMaterial({
            color: 0xfffffff,
            envMap: sphereCamera.renderTarget.texture
            // refractionRatio: 1
          })

          logo = new THREE.Mesh(geometry, sphereMaterial)
          logo.matrixAutoUpdate = false
          scene.add(logo)
        },
        undefined,
        function(error) {
          console.error(error)
        }
      )
    }

    function onWindowResize() {
      const height = Math.min(window.innerHeight, (window.innerWidth * 10) / 16)
      const width = window.innerWidth

      windowHalfX = width / 2
      windowHalfY = height / 2

      camera.aspect = width / height
      camera.updateProjectionMatrix()

      renderer.setSize(width, height)
    }

    function onDocumentMouseMove(event) {
      mouseX = (event.clientX - windowHalfX) * 0.015
      mouseY = (event.clientY - windowHalfY) * 0.015
    }

    function animate() {
      requestAnimationFrame(animate)

      render()
      stats.update()
    }

    function render() {
      // const dX = mouseX - camera.position.x
      // const dY = mouseY + camera.position.y
      // console.log({ dX, dY })

      // if (dX != 0 || dY != 0) {
      camera.position.x += (mouseX - camera.position.x) * 0.05
      camera.position.y -= (mouseY + camera.position.y) * 0.05
      camera.lookAt(scene.position)
      if (sphereCamera) {
        // sky.visible = true
        logo.visible = false
        sphereCamera.update(renderer, scene)
        logo.visible = true
        // sky.visible = false
      }
      // }

      renderer.render(scene, camera)
    }
  }
}

export default threedthings
