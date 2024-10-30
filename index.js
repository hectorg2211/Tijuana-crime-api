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

app.get('/api/data', (req, res) => {
  const { delito, clasificacion, colonia } = req.query

  let filteredData = data
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
