import createBehavior from './../../functions/createBehavior'
import { ajaxRequest, objectifyForm, trigger } from './../../helpers'

const contactForm = createBehavior(
  'contactForm',
  {
    success (res) {
      res = JSON.parse(res)
      if (res.ok) this.node.reset()

      trigger(document, 'message', { message: res.msg })
    },
    handleSubmit (e) {
      e.preventDefault()

      let _this = this
      let data = objectifyForm(_this.node)
      let url = _this.node.getAttribute('action')
      let type = _this.node.getAttribute('method')

      ajaxRequest({
        url: url,
        type: type,
        data: data,
        onSuccess: _this.success
      })
    }
  },
  {
    init () {
      this.node.addEventListener('submit', this.handleSubmit)
    }
  }
)

export default contactForm
