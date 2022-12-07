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
const port = 7070
const openWeatherMapsKey = process.env.OPEN_WEATHER_MAPS_KEY || ""

const DONT_SEND = true

// CONFIGURATOR FOR SENDGRID
const configureSendGrid = ({
  sendGrid,
  env,
  config,
}: {
  sendGrid: SGMail.MailService //{ setApiKey: (key: string) => void },
  env: { [k in string]?: string }
  config?: {
    subject?: (contact: Contact) => string
    logger?: { log: (...msg: any[]) => void; error: (...msg: any[]) => void }
  }
}): ((
  contact: Contact,
) => TE.TaskEither<string, [SGMail.ClientResponse, {}]>) =>
  pipe(
    env.SENDGRID_API_KEY,
    E.fromNullable("SENDGRID_API_KEY env variable not set"),
    E.map((key) => sendGrid.setApiKey(key)),
    E.bind("from", () =>
      pipe(
        env.MY_FROM_EMAIL,
        E.fromNullable("MY_FROM_EMAIL env variable not set"),
      ),
    ),
    E.bind("to", () =>
      pipe(env.MY_TO_EMAIL, E.fromNullable("MY_TO_EMAIL env variable not set")),
    ),
    E.fold(
      (err) => (_) => {
        config?.logger?.error(err)
        return TE.left(err)
      },
      ({ to, from }) =>
        (contact) => {
          const subject =
            config?.subject?.(contact) || "Message received at TimothyPew.com"

          const message = {
            to: to,
            from: from,
            subject: subject,
            text: contact.message,
            html: contact.message
              .split(/[\r\n]+/)
              .map((line) => `<p>${line}</p>`)
              .join(""),
          }

          config?.logger?.log(message)

          return TE.tryCatch(
            () => sendGrid.send(message),
            (err) => String(err),
          )
        },
    ),
  )

// CONFIGURED SENDGRID SENDER
const sendEmail = configureSendGrid({
  sendGrid: SGMail,
  env: process.env,
})

const app = Express()

app.use(BodyParser.urlencoded({ extended: true }))

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
  pipe(Contact.decode(req.body), TE.fromEither, TE.chainW(sendEmail))()
    .then((_) => res.redirect("/thanks.html"))
    .catch((_) => res.redirect("/404.html"))
})

app.use("/api/weather", weatherRouter(openWeatherMapsKey))

app.all("*", (req: Express.Request, res: Express.Response) => {
  res.sendFile("404.html", { root: "public/content" })
})

app.listen(port, () => {
  console.log(`Server listening on port ${port}.`)
})
