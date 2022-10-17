import Axios from "axios"
import * as Dotenv from "dotenv"
import Express from "express"
import * as E from "fp-ts/Either"
import { flow, identity, pipe } from "fp-ts/lib/function"
import * as TE from "fp-ts/TaskEither"
import * as D from "io-ts/Decoder"

import { MrError } from "./types"

Dotenv.config()

const app = Express()
const port = 7070

const openWeatherMapsKey = process.env.OPEN_WEATHER_MAPS_KEY

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

app.get("/", (req, res) => {
  res.send(`"Hello."`)
})

app.get("/weather/forecast/:zip", (req, res) => {
  const { zip } = req.params

  pipe(
    zips[zip]
      ? TE.right(zips[zip])
      : pipe(
          axiosGet(
            `http://api.openweathermap.org/geo/1.0/zip?zip=${"98366"}&appid=${openWeatherMapsKey}`
          ),
          TE.chain(
            flow(
              GeoResponse.decode,
              E.mapLeft(flow(D.draw, MrError.of("GEO_RESPONSE_DECODE_ERROR"))),
              TE.fromEither
            )
          )
        ),
    TE.bindTo("location"),
    TE.bind("forecast", ({ location: { lat, lon } }) =>
      axiosGet(
        `http://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${openWeatherMapsKey}`
      )
    )
  )()
    .then(
      E.fold(
        () => res.status(401).send("oops, you oopsied"),
        ({ location, forecast }) => {
          zips[zip] = location
          return res.send(forecast)
        }
      )
    )
    .catch((err) => res.status(500).send("oops, errr!"))

  //   return pipe(
  //     zips[zip],
  //     TE.fromNullable(
  //       Axios.get(
  //         `http://api.openweathermap.org/geo/1.0/zip?zip=${"98366"}&appid=${openWeatherMapsKey}`
  //       ).then(({ data }) => data)
  //     ),
  //     TE.map()
  //   )

  //   // const result = zips[zip]
  //   //   ? Promise.resolve(zips[zip])
  //   // :

  //   // return result.catch((err) => res.status(500).send(err))
})

app.listen(port, () => {
  console.log(`Server listening on port ${port}.`)
})
