import createBehavior from './../../functions/createBehavior'

const hero = createBehavior(
  'hero',
  {
    handleScrolled (e) {
      var { last } = e.detail

      if (last >= this.vh) return

      // if (last < 0) {
      //   this.node.style.transform = this.node.style.webkitTransform = null

      //   return
      // }

      this.node.style.transform = `translate3d(0, ${last / 3}px, 0)`
      this.node.style.webkitTransform = `translate3d(0, ${last / 3}px, 0)`
    }
  },
  {
    init () {
      this.vh = window.innerHeight
      window.addEventListener('scrolled', this.handleScrolled)
    },
    destroy () {
      window.removeEventListener('scrolled', this.handleScrolled)
    }
  }
)

export default hero
