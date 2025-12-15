import createBehavior from './../../functions/createBehavior'

// see https://code.area17.com/a17/fe-boilerplate/wikis/js-functions-createBehavior

const headerBg = createBehavior(
  'headerBg',
  {
    handleScrolled () {
      var { top } = this.$main.getBoundingClientRect()

      if (top <= 0) {
        if (!this.isWhite) return

        this.node.classList.add('is-hidden')
        this.isWhite = !this.isWhite
      } else {
        if (this.isWhite) return

        this.node.classList.remove('is-hidden')
        this.isWhite = !this.isWhite
      }
    }
  },
  {
    init () {
      this.isWhite = false
      this.$main = this.getChild('main', document)
    },
    enabled () {
      this.$main
        ? window.addEventListener('scrolled', this.handleScrolled)
        : this.node.classList.add('is-hidden')
    },
    destroy () {
      window.removeEventListener('scrolled', this.handleScrolled)
    }
  }
)

export default headerBg
