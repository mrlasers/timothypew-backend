import Cors from 'cors'
import * as Dotenv from 'dotenv'
import Express from 'express'

import { weatherRouter } from './routes'

Dotenv.config()

const port = 7070
const openWeatherMapsKey = process.env.OPEN_WEATHER_MAPS_KEY || ""
const isDev = process.env.NODE_ENV === "development"

console.log("isDev", isDev)

const app = Express()

if (isDev) {
  console.log("enabling cors...")
  // i _really_ hate if statements; they're no good
  app.use(
    Cors({
      origin: ["http://localhost:5173"],
    })
  )
}

app.get("/", (req, res) => {
  // res.send("timothy.pew.com")
  res.sendFile("index.html", { root: "public" })
})

app.get("/ping", Cors(), (req, res) => res.json("pong"))

app.use("/api/weather", weatherRouter(openWeatherMapsKey))

app.use("/css", Express.static("public"))

app.listen(port, () => {
  console.log(`Server listening on port ${port}.`)
})
