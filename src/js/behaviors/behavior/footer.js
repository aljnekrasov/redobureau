import { getOffset } from './../../helpers'
import createBehavior from './../../functions/createBehavior'

const footer = createBehavior(
  'footer',
  {
    setPushHeight () {
      this.$push.style.height = `${getOffset(this.node).height}px`
    }
  },
  {
    init () {
      this.$push = document.createElement('div')
      this.node.parentNode.insertBefore(this.$push, this.node)

      this.setPushHeight()
    },
    resized () {
      this.setPushHeight()
    }
  }
)

export default footer
