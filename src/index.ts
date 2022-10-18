import Cors from "cors"
import * as Dotenv from "dotenv"
import Express from "express"

import { weatherRouter } from "./routes"

Dotenv.config()

const port = 7070
const openWeatherMapsKey = process.env.OPEN_WEATHER_MAPS_KEY || ""
const isDev = process.env.NODE_ENV === "development"

const app = Express()

if (isDev) {
  // i _really_ hate if statements; they're no good
  app.use(
    Cors({
      origin: ["http://localhost:*"],
    })
  )
}

app.use(Express.static("public"))

app.get("/", (req, res) => {
  res.send("timothy.pew.com")
  // res.sendFile("index.html", { root: "public" })
})

app.use("/api/weather", weatherRouter(openWeatherMapsKey))

app.listen(port, () => {
  console.log(`Server listening on port ${port}.`)
})
