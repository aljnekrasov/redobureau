import createBehavior from './../../functions/createBehavior'

const slideshow = createBehavior(
  'slideshow',
  {},
  {
    init () {
      this.instance = new window.Swiper(this.node, {
        slidesPerView: 1.25,
        breakpointsInverse: true,
        spaceBetween: 10,
        grabCursor: true,
        breakpoints: {
          667: {
            slidesPerView: 1.55,
            spaceBetween: 20
          },
          1200: { slidesPerView: 2.5 }
        }
      })
    }
  }
)

export default slideshow
