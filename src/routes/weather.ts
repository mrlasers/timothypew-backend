import Axios from "axios"
import * as Cors from "cors"
import * as Dotenv from "dotenv"
import { Request, Response, Router } from "express"
import * as E from "fp-ts/Either"
import { flow, identity, Lazy, pipe } from "fp-ts/lib/function"
import * as TE from "fp-ts/TaskEither"
import * as D from "io-ts/Decoder"

import { ifThenElse } from "../lib"
import { MrError } from "../types"

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

export function weatherRouter(appid: string) {
  const weatherRouter = Router()

  weatherRouter.get("/forecast/:zip", (req: Request, res: Response) => {
    return pipe(
      // should probably check that this is a 5-digit number
      req.params.zip,
      (zip) =>
        ifThenElse(zips[zip], TE.right, () => getZipCodeLocation(zip, appid)),
      TE.bindTo("location"),
      TE.bind("forecast", ({ location }) =>
        getForecastFromLocation(location, appid)
      )
    )()
      .then(
        E.fold(
          () => res.status(401).json("BAD_REQUEST"),
          ({ location, forecast }) => {
            // we'll encapsulate this or something later if it looks like we need to do that
            zips[location.zip] = location
            return res.send(forecast)
          }
        )
      )
      .catch((err) => res.status(500).json("INTERNAL_ERROR"))
  })

  return weatherRouter
}
