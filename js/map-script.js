// Import anychart library
const anychart = require("anychart")

var map,
  dataSet,
  clickedStates = new Set()

anychart.onDocumentReady(() => {
  // create choropleth map
  map = anychart.choropleth()

  // set map geo data
  map.geoData("anychart.maps.tunisia")

  // create color scales for different states
  var defaultScale = anychart.scales.ordinalColor()
  defaultScale.colors(["#e3f2fd", "#bbdefb", "#90caf9", "#64b5f6", "#42a5f5"])

  var clickedScale = anychart.scales.ordinalColor()
  clickedScale.colors(["#ff8a65", "#ff7043", "#ff5722", "#f4511e", "#e64a19"])

  // generate initial data for all 24 states
  var data = generateTunisiaData(map)
  dataSet = anychart.data.set(data)

  // create choropleth series
  var series = map.choropleth(dataSet)
  series.colorScale(defaultScale)

  series.listen("pointClick", (e) => {
    var point = e.point
    var stateId = point.get("id")
    var stateName = point.get("name")

    // Toggle clicked state
    if (clickedStates.has(stateId)) {
      clickedStates.delete(stateId)
      // Reset to default color
      point.set("clicked", false)
      updateStateDisplay("Click on a state to see its name")
    } else {
      clickedStates.add(stateId)
      // Set as clicked
      point.set("clicked", true)
      updateStateDisplay(stateName || stateId)
    }

    // Update colors based on clicked state
    updateStateColors()
  })

  series.listen("pointMouseOver", (e) => {
    var point = e.point
    var stateName = point.get("name") || point.get("id")
    document.body.style.cursor = "pointer"

    // Show tooltip-like effect
    if (!clickedStates.has(point.get("id"))) {
      updateStateDisplay("Hover: " + stateName + " (Click to select)")
    }
  })

  series.listen("pointMouseOut", (e) => {
    document.body.style.cursor = "default"

    // Reset display if no state is clicked
    if (clickedStates.size === 0) {
      updateStateDisplay("Click on a state to see its name")
    } else {
      // Show the last clicked state
      var lastClicked = Array.from(clickedStates).pop()
      var lastClickedPoint = series.data().find((item) => item.get("id") === lastClicked)
      if (lastClickedPoint) {
        updateStateDisplay(lastClickedPoint.get("name") || lastClicked)
      }
    }
  })

  // set map title
  map.title("Tunisia - Interactive State Map (24 Governorates)")

  // set container id for the map
  map.container("container")

  // initiate chart drawing
  map.draw()
})

function updateStateDisplay(stateName) {
  var displayElement = document.getElementById("selected-state")
  if (displayElement) {
    displayElement.textContent = stateName

    // Add animation effect
    displayElement.style.transform = "scale(1.05)"
    setTimeout(() => {
      displayElement.style.transform = "scale(1)"
    }, 200)
  }
}

function updateStateColors() {
  if (!map) return

  var series = map.getSeries(0)
  var data = series.data()

  for (var i = 0; i < data.getRowsCount(); i++) {
    var point = data.row(i)
    var stateId = point.get("id")

    if (clickedStates.has(stateId)) {
      // Set clicked color (red/orange tones)
      point.set("value", 100) // High value for clicked color
    } else {
      // Set default color (blue tones)
      point.set("value", 20) // Low value for default color
    }
  }
}

function resetColors() {
  clickedStates.clear()
  updateStateDisplay("Click on a state to see its name")

  if (map) {
    var series = map.getSeries(0)
    var data = series.data()

    for (var i = 0; i < data.getRowsCount(); i++) {
      var point = data.row(i)
      point.set("value", 20) // Reset to default value
      point.set("clicked", false)
    }
  }
}

var generateTunisiaData = (chart) => {
  var data = []
  var features = chart.geoData()["features"]

  // Tunisia's 24 governorates with their names
  var governorateNames = {
    "TN.AR": "Ariana",
    "TN.BJ": "Béja",
    "TN.BA": "Ben Arous",
    "TN.BI": "Bizerte",
    "TN.GB": "Gabès",
    "TN.GF": "Gafsa",
    "TN.JE": "Jendouba",
    "TN.KR": "Kairouan",
    "TN.KS": "Kasserine",
    "TN.KB": "Kébili",
    "TN.KF": "Kef",
    "TN.MH": "Mahdia",
    "TN.MN": "Manouba",
    "TN.ME": "Médenine",
    "TN.MO": "Monastir",
    "TN.NB": "Nabeul",
    "TN.SF": "Sfax",
    "TN.SB": "Sidi Bouzid",
    "TN.SL": "Siliana",
    "TN.SO": "Sousse",
    "TN.TA": "Tataouine",
    "TN.TO": "Tozeur",
    "TN.TU": "Tunis",
    "TN.ZA": "Zaghouan",
  }

  for (var i = 0, len = features.length; i < len; i++) {
    var feature = features[i]
    if (feature["properties"]) {
      var id = feature["properties"][chart.geoIdField()]
      var name = governorateNames[id] || id

      data.push({
        id: id,
        name: name,
        value: 20, // Default value for blue color
        clicked: false,
      })
    }
  }
  return data
}
