import { resolve } from 'dns'
import dotenv from 'dotenv'
dotenv.config()

import readline from "readline"

import chalk from "chalk"

import open from "open"

//funcion mostrar mapa

function generarHTML(ciudad, pais, lat, lon, temp, sensacion, humedad, viento, descripcion) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Clima - ${ciudad}</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #1a1a2e; color: white; font-family: sans-serif; height: 100vh; display: flex; flex-direction: column; }
    #info { padding: 1.5rem 2rem; display: flex; align-items: center; gap: 2rem; }
    #info h1 { font-size: 1.5rem; margin-right: auto; }
    #info span { font-size: 1rem; color: #aaa; }
    #mapa { flex: 1; }
  </style>
</head>
<body>
  <div id="info">
    <h1>📍 ${ciudad}, ${pais}</h1>
    <span>🌡️ ${temp}°C (sensación ${sensacion}°C)</span>
    <span>💧 ${humedad}%</span>
    <span>💨 ${viento} m/s</span>
    <span>${descripcion}</span>
  </div>
  <div id="mapa"></div>
  <script>
    const mapa = L.map('mapa').setView([${lat}, ${lon}], 5)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(mapa)
    L.marker([${lat}, ${lon}])
      .addTo(mapa)
      .bindPopup('<b>${ciudad}, ${pais}</b><br>${temp}°C — ${descripcion}')
      .openPopup()
  </script>
</body>
</html>`
}

async function mostrarMapa(ciudad, pais, lat, lon, temp, sensacion, humedad, viento, descripcion) {
  const fs = await import("fs")
  const html = generarHTML(ciudad, pais, lat, lon, temp, sensacion, humedad, viento, descripcion)
  fs.writeFileSync("mapa.html", html)
  await open("mapa.html")
}


//funcion colores segun temperatura
function colorTemp(temp) {
  if (temp <= 0)  return chalk.blueBright(`${temp}°C`)
  if (temp <= 10) return chalk.blue(`${temp}°C`)
  if (temp <= 20) return chalk.cyan(`${temp}°C`)
  if (temp <= 28) return chalk.green(`${temp}°C`)
  if (temp <= 35) return chalk.yellow(`${temp}°C`)
  return chalk.red(`${temp}°C`)
}

//armo la funcion asyncronica para traer 
async function obtenerClima (){

const geoUser= process.env.GEONAMES_USER
  const geoUrl = `http://api.geonames.org/searchJSON?featureClass=P&maxRows=100&startRow=${Math.floor(Math.random() * 5000)}&username=${geoUser}`

  const geoRespuesta = await fetch(geoUrl)
  const geoDatos = await geoRespuesta.json()

  const ciudades = geoDatos.geonames
  const ciudad = ciudades[Math.floor(Math.random() * ciudades.length)]
  const nombreCiudad = ciudad.name
  const pais = ciudad.countryName
  const lat = ciudad.lat
  const lon = ciudad.lng

  const key= process.env.OPENWEATHER_KEY
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${key}&units=metric&lang=es`

  const respuesta= await fetch(url)
  const datos= await respuesta.json()
  // A veces OpenWeather no conoce ciudades muy chicas, manejamos ese caso
  if (datos.cod === "404") {
    console.log(chalk.yellow(`\n⚠️  ${nombreCiudad} (${pais}) no encontrada en OpenWeather, buscando otra...\n`))
    return obtenerClima()
  }

  const temp = datos.main.temp
  const sensacion = datos.main.feels_like
  const humedad = datos.main.humidity
  const viento = datos.wind.speed
  const descripcion = datos.weather[0].description

  await mostrarMapa(nombreCiudad, pais, lat, lon, temp, sensacion, humedad, viento, descripcion)


  console.log("======================")
  console.log(`📍 ${nombreCiudad}, ${pais}`)
  console.log(`🌡️  ${colorTemp(temp)}  (sensación ${colorTemp(sensacion)})`)
  console.log(`💧 Humedad: ${humedad}%`)
  console.log(`💨 Viento: ${viento} m/s`)
  console.log(`    ${descripcion}`)
  console.log("======================")
  
}

//Funcion para loopear la consulta
function preguntar(rl){
    return new Promise ((resolve) => {
        rl.question ("¿Otra ciudad? (s/n) ", (respuesta) => {
            resolve(respuesta.trim().toLowerCase())
        })
    })
}

//Loop principal
async function main(){
    const rl= readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })

    await obtenerClima()

    let continuar=true
    while (continuar){
        const respuesta = await preguntar(rl)
        if (respuesta === "s"){
            await obtenerClima()
        } 
        else {
            console.log("👋¡Hasta luego!")
            rl.close()
            break
        }
    }
}

main()
