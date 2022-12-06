import * as BodyParser from "body-parser"
import * as Cors from "cors"
import * as Dotenv from "dotenv"
import * as Express from "express"
import * as E from "fp-ts/Either"
import { flow, pipe } from "fp-ts/lib/function"
import * as O from "fp-ts/Option"
import * as TE from "fp-ts/TaskEither"
import * as D from "io-ts/Decoder"

import * as SGMail from "@sendgrid/mail"

// import * as ServeStatic from "serve-static"
import { weatherRouter } from "./routes"

Dotenv.config()

// read our sgmail envs and set api key
const mailEnvs = pipe(
  process.env.SENDGRID_API_KEY,
  TE.fromNullable("SENDGRID_API_KEY environment variable not set"),
  TE.map((key) => SGMail.setApiKey(key)),
  TE.bindTo("_api_key"),
  TE.bind("from", () =>
    pipe(
      process.env.MY_FROM_EMAIL,
      TE.fromNullable("MY_FROM_EMAIL env variable not set")
    )
  ),
  TE.bind("to", () =>
    pipe(
      process.env.MY_TO_EMAIL,
      TE.fromNullable("MY_TO_EMAIL env variable not set")
    )
  )
)

const sendEmail = (contact: Contact) => {
  return pipe(
    mailEnvs,
    TE.map(({ from, to }) => {
      return {
        to: to,
        from: from,
        subject: "Message received at TimothyPew.com",
        text: contact.message,
        html: contact.message
          .split(/[\r\n]+/)
          .map((line) => `<p>${line}</p>`)
          .join(""),
      }
    }),
    TE.chainW((msg) =>
      TE.tryCatch(
        () => SGMail.send(msg),
        (reason) => new Error(String(reason))
      )
    )
  )
}

const port = 7070
const openWeatherMapsKey = process.env.OPEN_WEATHER_MAPS_KEY || ""
const isDev = process.env.NODE_ENV === "development"

console.log("isDev", isDev)

const app = Express()

app.use(BodyParser.urlencoded({ extended: true }))

if (isDev) {
  console.log("enabling cors...")
  // i _really_ hate if statements; they're no good
  app.use(
    Cors({
      origin: ["http://localhost:5173"],
    })
  )
}

const staticFiles: Parameters<typeof Express.static>[] = [
  ["public/content", { extensions: ["html"], fallthrough: true }],
  ["public/styles", { extensions: ["css"] }],
  ["public/scripts", { extensions: ["js"] }],
  ["public/images", { extensions: ["jpg", "jpeg", "gif", "png", "webp"] }],
]

staticFiles.map(([path, opts]) => app.use(Express.static(path, opts)))

// root route
app.get("/", (req: Express.Request, res: Express.Response) => {
  res.sendFile("index.html", { root: "public/content" })
  // res.redirect("index.html")
})

// contact
const Contact = D.struct({
  name: D.string,
  email: D.string,
  message: D.string,
})

type Contact = D.TypeOf<typeof Contact>

app.post("/contact", (req: Express.Request, res: Express.Response) => {
  pipe(Contact.decode(req.body), TE.fromEither, TE.chainW(sendEmail))().then(
    (result) => console.log("sendgrid complete: ", result)
  )
  // console.log(req.params)
  // res.sendFile(`${req.params.file}.html`, { root: "public" })
  console.log(Contact.decode(req.body))
  res.redirect("/thanks.html")
})

app.get("/ping", Cors(), (req: Express.Request, res: Express.Response) =>
  res.json("pong")
)

app.use("/api/weather", weatherRouter(openWeatherMapsKey))

app.all("*", (req: Express.Request, res: Express.Response) => {
  res.sendFile("404.html", { root: "public/content" })
  // res.sendFile("404.html", { root: "public/content" })
})

app.listen(port, () => {
  console.log(`Server listening on port ${port}.`)
})
