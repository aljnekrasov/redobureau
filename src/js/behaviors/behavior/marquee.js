import nm8 from './../../functions/nm8'
import createBehavior from './../../functions/createBehavior'

const marquee = createBehavior(
  'marquee',
  {},
  {
    init () {
      for (var i = 1; i >= 0; i--) {
        let body = this.node.children[0].cloneNode(true)
        this.node.appendChild(body)
      }

      const xOffset = this.node.scrollWidth / 2 * -1

      this.node.style.willChange = 'transform'

      const animation = nm8((offset) => {
        this.node.style.transform = this.node.style.webkitTransform = `translate3d(${xOffset * offset}px, 0px, 0)`

        if (offset === 1) {
          animation.stop()
          animation.play()
        }
      }, (this.node.scrollWidth / 2) * 30).play()
    }
  }
)

export default marquee
