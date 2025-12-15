import createBehavior from './../../functions/createBehavior'

const contactMap = createBehavior(
  'contactMap',
  {
    handleMarkerClick (e) {
      window.open('https://goo.gl/maps/tPZ5R1Aao4T2', '_blank')
    }
  },
  {
    init () {
      const options = {
        zoom: 15,
        minZoom: 12,
        maxZoom: 18,
        zoomControl: false,
        mapTypeControl: false,
        scaleControl: false,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: false,
        clickableIcons: false,
        gestureHandling: 'cooperative',
        scrollwheel: false,
        center: new window.google.maps.LatLng(this.options.lat, this.options.long),
        styles: [{"featureType":"all","elementType":"labels.text.fill","stylers":[{"saturation":"36"},{"color":"#666666"},{"lightness":40}]},{"featureType":"all","elementType":"labels.text.stroke","stylers":[{"visibility":"off"},{"color":"#ffffff"},{"lightness":16}]},{"featureType":"all","elementType":"labels.icon","stylers":[{"visibility":"off"},{"saturation":"-100"}]},{"featureType":"administrative","elementType":"geometry.fill","stylers":[{"color":"#fefefe"},{"lightness":20}]},{"featureType":"administrative","elementType":"geometry.stroke","stylers":[{"color":"#fefefe"},{"lightness":17},{"weight":1.2}]},{"featureType":"landscape","elementType":"geometry","stylers":[{"color":"#f5f5f5"},{"lightness":20}]},{"featureType":"poi","elementType":"geometry","stylers":[{"color":"#f5f5f5"},{"lightness":21}]},{"featureType":"poi.park","elementType":"geometry","stylers":[{"color":"#f5f5f5"},{"lightness":"-5"},{"saturation":"0"}]},{"featureType":"poi.park","elementType":"labels.text.fill","stylers":[{"visibility":"on"}]},{"featureType":"poi.park","elementType":"labels.text.stroke","stylers":[{"visibility":"off"}]},{"featureType":"road.highway","elementType":"geometry.fill","stylers":[{"color":"#ffffff"},{"lightness":17}]},{"featureType":"road.highway","elementType":"geometry.stroke","stylers":[{"color":"#ffffff"},{"lightness":29},{"weight":0.2}]},{"featureType":"road.arterial","elementType":"geometry","stylers":[{"color":"#e4e4e4"},{"lightness":18}]},{"featureType":"road.local","elementType":"geometry","stylers":[{"color":"#e4e4e4"},{"lightness":16},{"visibility":"on"},{"saturation":"0"}]},{"featureType":"transit","elementType":"geometry","stylers":[{"color":"#f2f2f2"},{"lightness":19}]},{"featureType":"water","elementType":"geometry","stylers":[{"color":"#5a4fcf"}]},{"featureType":"water","elementType":"labels","stylers":[{"invert_lightness":true}]},{"featureType":"water","elementType":"labels.text.fill","stylers":[{"color":"#ffffff"}]},{"featureType":"water","elementType":"labels.text.stroke","stylers":[{"weight":"1.00"}]}]
      }

      this.map = new window.google.maps.Map(this.node, options)

      this.marker = new window.google.maps.Marker({
        position: new window.google.maps.LatLng(this.options.lat, this.options.long),
        map: this.map,
        icon: {
          url: '/assets/icons/pin.png',
          scaledSize: new window.google.maps.Size(41, 57)
        }
      })

      this.marker.addListener('click', this.handleMarkerClick)
    }
  }
)

export default contactMap
