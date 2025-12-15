import random from 'lodash.random'
import nm8 from './../../functions/nm8'
import createBehavior from './../../functions/createBehavior'

const redo = createBehavior(
  'redo',
  {
    handleScrolled (e) {
      let { last } = e.detail

      if (last >= window.innerHeight) {
        if (this.isHidden) return

        this.pause()

        this.node.style.opacity = 0
        this.node.style.zIndex = -1

        this.isHidden = !this.isHidden
      } else {
        if (!this.isHidden) return

        this.node.style.opacity = this.node.style.zIndex = null

        this.play()

        this.isHidden = !this.isHidden
      }
    },
    pause () {
      this.tweens.forEach(function (tween) {
        tween.pause()
      })
    },
    play () {
      this.tweens.forEach(function (tween) {
        tween.play()
      })
    }
  },
  {
    init () {
      this.tweens = []
      this.isHidden = false

      function _wrap (el, wrapper) {
        el.parentNode.insertBefore(wrapper, el)
        wrapper.appendChild(el)
      }

      this.$lines = this.getChildren('line')
      this.$lines.forEach(($line, i) => {
        const wrapper = document.createElement('div')
        const children = $line.children[0]
        const clone = children.cloneNode(true)
        let animation

        _wrap(children, wrapper)
        wrapper.appendChild(clone)

        const widthHalf = wrapper.scrollWidth / 2
        const isReverse = random(0, 1)
        const duration = (wrapper.scrollWidth / random(1, 3)) * 10

        wrapper.style.willChange = 'transform'

        if (isReverse) {
          animation = nm8((offset) => {
            wrapper.style.transform = wrapper.style.webkitTransform = `translate3d(${widthHalf * -1 * offset}px, 0px, 0)`

            if (offset >= 1) {
              animation
                .stop()
                .play()
            }
          }, duration)
        } else {
          wrapper.style.transform = wrapper.style.webkitTransform = `translate3d(${widthHalf * -1}px, 0px, 0)`

          animation = nm8((offset) => {
            wrapper.style.transform = wrapper.style.webkitTransform = `translate3d(${(widthHalf * -1) + widthHalf * offset}px, 0px, 0)`

            if (offset >= 1) {
              animation
                .stop()
                .play()
            }
          }, duration)
        }

        animation.play()

        this.tweens.push(animation)
      })

      window.addEventListener('focus', this.play)
      window.addEventListener('blur', this.pause)

      window.addEventListener('scrolled', this.handleScrolled)
    },
    destroy () {
      window.removeEventListener('focus', this.play)
      window.removeEventListener('blur', this.pause)

      window.removeEventListener('scrolled', this.handleScrolled)
    }
  }
)

export default redo
