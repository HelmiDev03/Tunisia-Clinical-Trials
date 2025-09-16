var map, dataSet
anychart.onDocumentReady(() => {
  // create choropleth map
  map = anychart.choropleth()

  // set map geo data
  map.geoData("anychart.maps.tunisia")

  // create color scale
  var scale = anychart.scales.ordinalColor()
  scale.colors(["#81d4fa", "#4fc3f7", "#29b6f6", "#039be5", "#0288d1"])

  // random data
  var data = generateData(map)

  // data ser from data
  dataSet = anychart.data.set(generateData(map))

  // create choropleth series and setup color scale
  var series = map.choropleth(dataSet)
  series.colorScale(scale)

  // set container id for the map
  map.container("container")

  // initiate chart drawing
  map.draw()
})

var randomExt = (a, b) => Math.round(Math.random() * (b - a + 1) + a)

function updateData() {
  if (dataSet) dataSet.data(generateData(map))
}

var min = 1900
var max = 2000
var generateData = (chart) => {
  var data = []
  features = chart.geoData()["features"]
  for (var i = 0, len = features.length; i < len; i++) {
    var feature = features[i]
    if (feature["properties"]) {
      id = feature["properties"][chart.geoIdField()]
      data.push({ id: id, value: randomExt(min, max), size: randomExt(1, 100) })
    }
  }
  return data
}
