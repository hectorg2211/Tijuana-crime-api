const express = require('express')
const xlsx = require('xlsx')
const path = require('path')
const cors = require('cors')

const app = express()
const port = 3000

// Enable CORS for all routes
app.use(cors())

// Load Excel file and parse data
const workbook = xlsx.readFile(path.join(__dirname, 'data.xlsx'))
const sheetName = workbook.SheetNames[0]
const sheet = workbook.Sheets[sheetName]
const data = xlsx.utils.sheet_to_json(sheet)

// Cache for colonia coordinates
const cache = {}

const boundingBox = '-117.165,32.470,-116.935,32.550' // Set this to the bounding box of Tijuana

// Function to fetch latitude and longitude for a colonia
// Function to fetch latitude and longitude for a colonia
async function fetchCoordinates(colonia) {
  // Check if the colonia is already cached
  if (cache[colonia]) {
    console.log(`Cache hit for colonia: ${colonia}`, cache[colonia]) // Log on cache hit
    return cache[colonia] // Return cached coordinates
  }

  console.log(`Cache miss for colonia: ${colonia}`) // Log on cache miss

  // Fetch from the API if not cached
  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      colonia
    )} TIJUANA.json?access_token=pk.eyJ1IjoiaGVjdG9yZzIyMTEiLCJhIjoiY20ydzV6NGhsMDNkbDJrb29sZ241Mmd5ayJ9.ykVFrfTWM8pfZCVN3VHfCQ&bbox=${boundingBox}`
  )

  const json = await response.json()
  if (json.features && json.features.length > 0) {
    const coordinates = json.features[0].center // [longitude, latitude]
    cache[colonia] = coordinates // Store in cache
    console.log(`Fetched coordinates for colonia: ${colonia}`, coordinates) // Log fetched coordinates
    // console.log('Current cache:', cache) // Log current state of cache
    return coordinates
  }

  // Return nulls if no coordinates found
  cache[colonia] = [null, null] // Store null in cache
  console.log(`No coordinates found for colonia: ${colonia}. Caching as [null, null].`)
  // console.log('Current cache:', cache) // Log current state of cache
  return [null, null]
}

// Enrich data function
async function enrichData() {
  const promises = {}

  const enrichedData = await Promise.all(
    data.map(async item => {
      const colonia = item['COLONIA DEL HECHO']
      if (colonia && colonia !== '.') {
        // Check if there's already a promise for this colonia
        if (!promises[colonia]) {
          promises[colonia] = fetchCoordinates(colonia) // Store the promise in the object
        }
        const [longitude, latitude] = await promises[colonia] // Wait for the promise to resolve
        return { ...item, latitude, longitude } // Add lat/lon to item
      }
      return { ...item, latitude: null, longitude: null } // Handle missing colonia
    })
  )

  return enrichedData // Return enriched data
}

// Set enriched data to be used in the GET endpoint
let enrichedData = []

// Enrich the data before handling requests
enrichData()
  .then(data => {
    enrichedData = data
    console.log('Data enriched with coordinates')
    console.log('Cache:', cache)
  })
  .catch(error => {
    console.error('Error enriching data:', error)
  })

app.get('/api/data', (req, res) => {
  const { delito, clasificacion, colonia } = req.query

  let filteredData = enrichedData
  if (delito) {
    filteredData = filteredData.filter(d => d['DELITO'].toLowerCase() === delito.toLowerCase())
  }
  if (clasificacion) {
    filteredData = filteredData.filter(d => d['CLASIFICACION DEL DELITO'].toLowerCase() === clasificacion.toLowerCase())
  }
  if (colonia) {
    filteredData = filteredData.filter(d => d['COLONIA DEL HECHO'].toLowerCase() === colonia.toLowerCase())
  }

  res.json(filteredData)
})

app.listen(port, () => {
  console.log(`API is running at http://localhost:${port}`)
})
