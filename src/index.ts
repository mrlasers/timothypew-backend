import Axios from "axios"
import Cors from "cors"
import * as Dotenv from "dotenv"
import Express from "express"
import * as E from "fp-ts/Either"
import { flow, identity, Lazy, pipe } from "fp-ts/lib/function"
import * as TE from "fp-ts/TaskEither"
import * as Fs from "fs/promises"
import * as D from "io-ts/Decoder"

import { ifThenElse } from "./lib"
import { MrError } from "./types"

Dotenv.config()

const port = 7070
const openWeatherMapsKey = process.env.OPEN_WEATHER_MAPS_KEY || ""
const isDev = process.env.NODE_ENV === "development"

// if (!openWeatherMapsKey) {
//   console.log("Exiting with error: missing env var OPEN_WEATHER_MAPS_KEY")
//   Fs.writeFile("error_log", "OPEN_WEATHER_MAPS_KEY env variable wasn't set")
//   process.exit(1)
// }

const app = Express()

app.use(Express.static("public"))

// app.use(
//   Cors({
//     origin: [/timothypew\.com$/, /localhost$/],
//   })
// )

export const GeoResponse = D.struct({
  zip: D.string,
  name: D.string,
  lat: D.number,
  lon: D.number,
  country: D.string,
})

export type GeoResponse = D.TypeOf<typeof GeoResponse>

const zips: { [k in string]: GeoResponse } = {}

const axiosGet = (url: string) =>
  TE.tryCatch(
    () => Axios.get(url).then(({ data }) => data),
    MrError.of("AXIOS_GET_ERROR")
  )

const getZipCodeLocation = (zip: string, appid: string) =>
  pipe(
    axiosGet(
      `http://api.openweathermap.org/geo/1.0/zip?zip=${zip}&appid=${appid}`
    ),
    TE.chain(
      flow(
        GeoResponse.decode,
        E.mapLeft(flow(D.draw, MrError.of("GEO_RESPONSE_DECODE_ERROR"))),
        TE.fromEither
      )
    )
  )

const getForecastFromLocation = ({ lat, lon }: GeoResponse, appid: string) => {
  return axiosGet(
    `http://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${appid}`
  )
}

app.get("/", (req, res) => {
  res.sendFile("timothy.html", { root: "public" })
})

app.get("/weather/forecast/:zip", (req, res) => {
  return pipe(
    // should probably check that this is a 5-digit number
    req.params.zip,
    (zip) =>
      ifThenElse(zips[zip], TE.right, () =>
        getZipCodeLocation(zip, openWeatherMapsKey)
      ),
    TE.bindTo("location"),
    TE.bind("forecast", ({ location }) =>
      getForecastFromLocation(location, openWeatherMapsKey)
    )
  )()
    .then(
      E.fold(
        () => res.status(401).send("BAD_REQUEST"),
        ({ location, forecast }) => {
          // we'll encapsulate this or something later if it looks like we need to do that
          zips[location.zip] = location
          return res.send(forecast)
        }
      )
    )
    .catch((err) => res.status(500).send("INTERNAL_ERROR"))
})

app.listen(port, () => {
  console.log(`Server listening on port ${port}.`)
})
