var arThings = function() {
  const a = document.createElement("a")
  const ar = document.querySelector('a[rel="ar"]')
  if (ar) {
  if (a.relList.supports("ar")) {
    ar.classList.remove("hidden")
  } else {
      ar.remove()
    }
  }
}

export default arThings
